// netlify/functions/auth.js
// ─── 인증 API (/api/auth) ────────────────────────────────────────
// POST /api/auth?action=register  → 회원가입
// POST /api/auth?action=login     → 로그인
// POST /api/auth?action=logout    → 로그아웃
// GET  /api/auth?action=me        → 내 정보

const {
  getSupabase, checkEnv, signToken, hashPassword, verifyPassword,
  ok, err, preflight, requireAuth, setCookieHeader,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  // ── 환경변수 체크 ────────────────────────────────────────────────
  const envErr = checkEnv();
  if (envErr) return envErr;

  const action = event.queryStringParameters?.action;

  // ── 전체 try-catch로 예기치 못한 에러 포착 ──────────────────────
  try {
    const sb = getSupabase();

    // ── 회원가입 ──────────────────────────────────────────────────
    if (event.httpMethod === 'POST' && action === 'register') {
      const body = JSON.parse(event.body || '{}');
      const { username, password, display_name } = body;

      if (!username || username.length < 3) return err('아이디는 3자 이상이어야 합니다');
      if (!password || password.length < 4)  return err('비밀번호는 4자 이상이어야 합니다');
      if (!display_name?.trim())             return err('닉네임을 입력해주세요');

      // 아이디 중복 확인
      const { data: existing } = await sb
        .from('users').select('id').eq('username', username).maybeSingle();
      if (existing) return err('이미 사용 중인 아이디입니다');

      const hue = Math.abs(username.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360;
      const { data: user, error: dbErr } = await sb.from('users').insert({
        username,
        hashed_password: hashPassword(password),
        display_name: display_name.trim(),
        status_message: '',
        avatar_color: `hsl(${hue}, 60%, 55%)`,
      }).select('id, username, display_name, status_message, avatar_color').single();

      if (dbErr) return err('회원가입 실패: ' + dbErr.message, 500);

      const token = signToken({
        id: user.id, username: user.username,
        display_name: user.display_name, avatar_color: user.avatar_color,
      });
      return ok(
        { message: '회원가입 성공', token, user },
        { 'Set-Cookie': setCookieHeader('chat_token', token) }
      );
    }

    // ── 로그인 ────────────────────────────────────────────────────
    if (event.httpMethod === 'POST' && action === 'login') {
      const { username, password } = JSON.parse(event.body || '{}');
      if (!username || !password) return err('아이디와 비밀번호를 입력해주세요');

      const { data: user, error: dbErr } = await sb
        .from('users')
        .select('id, username, hashed_password, display_name, status_message, avatar_color')
        .eq('username', username)
        .maybeSingle();

      if (dbErr) return err('DB 오류: ' + dbErr.message, 500);
      if (!user || !verifyPassword(password, user.hashed_password))
        return err('아이디 또는 비밀번호가 잘못되었습니다', 401);

      const token = signToken({
        id: user.id, username: user.username,
        display_name: user.display_name, avatar_color: user.avatar_color,
      });
      const { hashed_password, ...safe } = user;
      return ok(
        { message: '로그인 성공', token, user: safe },
        { 'Set-Cookie': setCookieHeader('chat_token', token) }
      );
    }

    // ── 로그아웃 ──────────────────────────────────────────────────
    if (event.httpMethod === 'POST' && action === 'logout') {
      return ok({ message: '로그아웃 완료' }, { 'Set-Cookie': 'chat_token=; Max-Age=0; Path=/' });
    }

    // ── 내 정보 ───────────────────────────────────────────────────
    if (event.httpMethod === 'GET' && action === 'me') {
      const { user, error: authErr } = await requireAuth(event);
      if (authErr) return authErr;

      const { data, error: dbErr } = await sb
        .from('users')
        .select('id, username, display_name, status_message, avatar_color')
        .eq('id', user.id)
        .maybeSingle();

      if (dbErr) return err('DB 오류: ' + dbErr.message, 500);
      if (!data)  return err('사용자를 찾을 수 없습니다', 404);
      return ok(data);
    }

    return err('잘못된 요청입니다', 404);

  } catch (e) {
    console.error('[auth] 처리 중 오류:', e);
    return err('서버 내부 오류가 발생했습니다: ' + e.message, 500);
  }
};
