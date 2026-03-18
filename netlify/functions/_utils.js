// netlify/functions/_utils.js
// ─── 공통 유틸리티 (모든 Function이 공유) ───────────────────────

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ── HTTP 응답 헬퍼 (getSupabase보다 먼저 선언) ───────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

function ok(data, extra = {}) {
  return { statusCode: 200, headers: { ...CORS, ...extra }, body: JSON.stringify(data) };
}

function err(msg, code = 400, extra = {}) {
  return { statusCode: code, headers: { ...CORS, ...extra }, body: JSON.stringify({ error: msg }) };
}

function preflight() {
  return { statusCode: 204, headers: CORS, body: '' };
}

// ── Supabase 클라이언트 ──────────────────────────────────────────
// throw 하지 않고 null 반환 → 각 핸들러에서 checkEnv()로 먼저 검사
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// 환경변수 미설정 시 503 응답 반환 (null이면 설정 안 된 것)
function checkEnv() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return err(
      'Supabase 환경변수가 설정되지 않았습니다. ' +
      'Netlify 대시보드 → Site settings → Environment variables 에서 ' +
      'SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET 을 설정해주세요.',
      503
    );
  }
  return null;
}

// ── JWT ──────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES = '7d';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

function getTokenFromEvent(event) {
  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const cookies = parseCookies(event.headers['cookie'] || '');
  return cookies['chat_token'] || null;
}

// ── 비밀번호 ─────────────────────────────────────────────────────
function hashPassword(pw)           { return bcrypt.hashSync(pw, 10); }
function verifyPassword(pw, hashed) { return bcrypt.compareSync(pw, hashed); }

// ── 쿠키 파서 ────────────────────────────────────────────────────
function parseCookies(str) {
  return Object.fromEntries(
    str.split(';')
       .map(c => c.trim().split('=').map(s => { try { return decodeURIComponent(s); } catch { return s; } }))
       .filter(([k]) => k)
  );
}

function setCookieHeader(name, value, days = 7) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; HttpOnly; SameSite=Lax`;
}

// ── 인증 미들웨어 ─────────────────────────────────────────────────
async function requireAuth(event) {
  const token = getTokenFromEvent(event);
  if (!token) return { error: err('로그인이 필요합니다', 401) };
  const payload = verifyToken(token);
  if (!payload) return { error: err('유효하지 않은 토큰입니다', 401) };
  return { user: payload };
}

module.exports = {
  getSupabase, checkEnv, signToken, verifyToken, getTokenFromEvent,
  hashPassword, verifyPassword,
  ok, err, preflight, setCookieHeader, requireAuth, parseCookies,
};
