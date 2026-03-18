// netlify/functions/rooms.js
// ─── 채팅방 API (/api/rooms) ─────────────────────────────────────
// GET  /api/rooms                        → 전체 채팅방 목록
// POST /api/rooms                        → 채팅방 생성
// GET  /api/rooms?room_id=X&action=msgs  → 메시지 조회

const { getSupabase, ok, err, preflight, requireAuth } = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const { user, error } = await requireAuth(event);
  if (error) return error;

  const sb   = getSupabase();
  const qs   = event.queryStringParameters || {};
  const action = qs.action;
  const room_id = qs.room_id;

  // ── 메시지 목록 ─────────────────────────────────────────────────
  if (event.httpMethod === 'GET' && action === 'msgs' && room_id) {
    const { data, error: dbErr } = await sb.from('messages')
      .select('id, room_id, sender_id, sender_name, sender_color, content, created_at')
      .eq('room_id', room_id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (dbErr) return err(dbErr.message, 500);
    return ok(data || []);
  }

  // ── 채팅방 목록 ─────────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    const { data, error: dbErr } = await sb.from('rooms')
      .select('id, name, created_by, created_at')
      .order('created_at', { ascending: true });
    if (dbErr) return err(dbErr.message, 500);
    return ok(data || []);
  }

  // ── 채팅방 생성 ─────────────────────────────────────────────────
  if (event.httpMethod === 'POST') {
    const { name } = JSON.parse(event.body || '{}');
    if (!name?.trim()) return err('채팅방 이름을 입력해주세요');
    if (name.trim().length > 30) return err('채팅방 이름은 30자 이하로 입력해주세요');

    const { data: room, error: dbErr } = await sb.from('rooms').insert({
      name: name.trim(),
      created_by: user.username,
    }).select('id, name, created_by, created_at').single();

    if (dbErr) return err(dbErr.message, 500);
    return ok(room);
  }

  return err('잘못된 요청입니다', 404);
};
