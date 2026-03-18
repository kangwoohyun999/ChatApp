#!/usr/bin/env node
// scripts/inject-env.js
// Netlify 빌드 시 환경변수를 index.html에 주입
// netlify.toml의 [build] command에 추가해서 사용

const fs   = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const SUPA_URL  = process.env.SUPABASE_URL  || '';
const SUPA_ANON = process.env.SUPABASE_ANON_KEY || '';

// 환경변수 플레이스홀더 치환
html = html
  .replace("'__SUPABASE_URL__'", `'${SUPA_URL}'`)
  .replace("'__SUPABASE_ANON_KEY__'", `'${SUPA_ANON}'`);

// dist 폴더에 출력
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, '../public/index.html'), path.join(distDir, 'index.html'));

// 환경변수가 설정된 버전을 dist에 저장
fs.writeFileSync(path.join(distDir, 'index.html'), html);
console.log('✅ 환경변수 주입 완료');
console.log('  SUPABASE_URL:', SUPA_URL ? '✓ 설정됨' : '⚠ 미설정');
console.log('  SUPABASE_ANON_KEY:', SUPA_ANON ? '✓ 설정됨' : '⚠ 미설정');
