// netlify/functions/rooms.js
// ─── 채팅방 API (/api/rooms) ─────────────────────────────────────
// GET  /api/rooms                        → 전체 채팅방 목록
// POST /api/rooms                        → 채팅방 생성
// GET  /api/rooms?room_id=X&action=msgs  → 메시지 조회

const { getSupabase, checkEnv, ok, err, preflight, requireAuth } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const envErr = checkEnv();
  if (envErr) return envErr;

  const { user, error: authErr } = await requireAuth(event);
  if (authErr) return authErr;

  try {
    const sb = getSupabase();
    const qs = event.queryStringParameters || {};

    // ── 메시지 목록 ───────────────────────────────────────────────
    if (event.httpMethod === 'GET' && qs.action === 'msgs' && qs.room_id) {
      const { data, error: dbErr } = await sb.from('messages')
        .select('id, room_id, sender_id, sender_name, sender_color, content, created_at')
        .eq('room_id', qs.room_id)
        .order('created_at', { ascending: true })
        .limit(100);
      if (dbErr) return err(dbErr.message, 500);
      return ok(data || []);
    }

    // ── 채팅방 목록 ───────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const { data, error: dbErr } = await sb.from('rooms')
        .select('id, name, created_by, created_at')
        .order('created_at', { ascending: true });
      if (dbErr) return err(dbErr.message, 500);
      return ok(data || []);
    }

    // ── 채팅방 생성 ───────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const { name } = JSON.parse(event.body || '{}');
      if (!name?.trim())           return err('채팅방 이름을 입력해주세요');
      if (name.trim().length > 30) return err('채팅방 이름은 30자 이하로 입력해주세요');

      const { data: room, error: dbErr } = await sb.from('rooms').insert({
        name: name.trim(),
        created_by: user.username,
      }).select('id, name, created_by, created_at').single();

      if (dbErr) return err(dbErr.message, 500);
      return ok(room);
    }

    return err('잘못된 요청입니다', 404);
  } catch (e) {
    console.error('[rooms] 처리 중 오류:', e);
    return err('서버 내부 오류: ' + e.message, 500);
  }
};
