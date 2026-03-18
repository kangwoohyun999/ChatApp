// netlify/functions/messages.js
// ─── 메시지 전송 API (/api/messages) ────────────────────────────
// POST /api/messages                     → 채팅방 메시지 전송
// POST /api/messages?type=dm             → DM 전송
// GET  /api/messages?type=dm&with=USER   → DM 내역 조회

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

    // ── DM 내역 조회 ──────────────────────────────────────────────
    if (event.httpMethod === 'GET' && qs.type === 'dm') {
      const other = qs.with;
      if (!other) return err('상대방 username이 필요합니다');
      const key = [user.username, other].sort().join('__');
      const { data, error: dbErr } = await sb.from('direct_messages')
        .select('id, sender_id, sender_name, sender_color, receiver_id, content, created_at')
        .eq('dm_key', key)
        .order('created_at', { ascending: true })
        .limit(100);
      if (dbErr) return err(dbErr.message, 500);
      return ok(data || []);
    }

    // ── DM 전송 ───────────────────────────────────────────────────
    if (event.httpMethod === 'POST' && qs.type === 'dm') {
      const { receiver, content } = JSON.parse(event.body || '{}');
      if (!receiver || !content?.trim()) return err('수신자와 내용을 입력해주세요');
      if (content.length > 2000) return err('메시지는 2000자 이하로 입력해주세요');

      const dm_key = [user.username, receiver].sort().join('__');
      const { data: msg, error: dbErr } = await sb.from('direct_messages').insert({
        dm_key,
        sender_id:    user.username,
        sender_name:  user.display_name,
        sender_color: user.avatar_color,
        receiver_id:  receiver,
        content:      content.trim(),
      }).select('id, sender_id, sender_name, sender_color, receiver_id, content, created_at').single();

      if (dbErr) return err(dbErr.message, 500);
      return ok(msg);
    }

    // ── 채팅방 메시지 전송 ────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      const { room_id, content } = JSON.parse(event.body || '{}');
      if (!room_id)              return err('room_id가 필요합니다');
      if (!content?.trim())      return err('메시지 내용을 입력해주세요');
      if (content.length > 2000) return err('메시지는 2000자 이하로 입력해주세요');

      const { data: room } = await sb.from('rooms').select('id').eq('id', room_id).maybeSingle();
      if (!room) return err('채팅방을 찾을 수 없습니다', 404);

      const { data: msg, error: dbErr } = await sb.from('messages').insert({
        room_id,
        sender_id:    user.username,
        sender_name:  user.display_name,
        sender_color: user.avatar_color,
        content:      content.trim(),
      }).select('id, room_id, sender_id, sender_name, sender_color, content, created_at').single();

      if (dbErr) return err(dbErr.message, 500);
      return ok(msg);
    }

    return err('잘못된 요청입니다', 404);
  } catch (e) {
    console.error('[messages] 처리 중 오류:', e);
    return err('서버 내부 오류: ' + e.message, 500);
  }
};
