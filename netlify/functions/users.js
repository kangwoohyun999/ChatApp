// netlify/functions/users.js
// ─── 사용자 API (/api/users) ─────────────────────────────────────
// GET /api/users               → 전체 사용자 목록
// PUT /api/users?action=profile → 프로필 수정

const { getSupabase, signToken, ok, err, preflight, requireAuth, setCookieHeader } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const { user, error } = await requireAuth(event);
  if (error) return error;

  const sb = getSupabase();
  const action = event.queryStringParameters?.action;

  // ── 프로필 수정 ─────────────────────────────────────────────────
  if (event.httpMethod === 'PUT' && action === 'profile') {
    const { display_name, status_message } = JSON.parse(event.body || '{}');
    if (!display_name?.trim()) return err('닉네임을 입력해주세요');

    const { error: dbErr } = await sb.from('users')
      .update({ display_name: display_name.trim(), status_message: status_message || '' })
      .eq('id', user.id);
    if (dbErr) return err(dbErr.message, 500);

    // 새 토큰 발급 (display_name 업데이트 반영)
    const newToken = signToken({
      id: user.id,
      username: user.username,
      display_name: display_name.trim(),
      avatar_color: user.avatar_color,
    });
    return ok(
      { message: '프로필 업데이트 완료', token: newToken },
      { 'Set-Cookie': setCookieHeader('chat_token', newToken) }
    );
  }

  // ── 사용자 목록 ─────────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const { data, error: dbErr } = await sb.from('users')
      .select('id, username, display_name, status_message, avatar_color')
      .order('display_name', { ascending: true });
    if (dbErr) return err(dbErr.message, 500);
    return ok(data || []);
  }

  return err('잘못된 요청입니다', 404);
};
