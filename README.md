# ChatApp — Netlify + Supabase 🚀

실시간 채팅 웹앱 | Netlify Functions (서버리스) + Supabase Realtime

---

## 아키텍처

```
브라우저 (HTML/JS)
    │
    ├─ REST API ──→ Netlify Functions (Node.js 서버리스)
    │                   auth.js      ← 로그인/회원가입
    │                   rooms.js     ← 채팅방 CRUD
    │                   messages.js  ← 메시지 전송/조회
    │                   users.js     ← 사용자/프로필
    │
    └─ Realtime ──→ Supabase Realtime (WebSocket)
                        messages 테이블 INSERT 구독
                        direct_messages 테이블 INSERT 구독
```

---

## 배포 순서

### STEP 1 — Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) → New Project
2. 대시보드 → **SQL Editor** → `supabase-schema.sql` 전체 복사 후 실행
3. **Settings → API** 에서 아래 두 값 복사:
   - `URL` → `SUPABASE_URL`
   - `anon public` 키 → `SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_KEY`
4. **Database → Replication** → `messages`, `direct_messages` 테이블 Realtime ON

### STEP 2 — GitHub에 올리기

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR/chatapp.git
git push -u origin main
```

### STEP 3 — Netlify 배포

1. [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. GitHub 저장소 선택
3. Build settings는 자동 감지됨 (`netlify.toml` 기반)
4. **Site settings → Environment variables** 에 아래 4개 추가:

| 변수명 | 값 |
|--------|-----|
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` (anon key) |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role key) |
| `JWT_SECRET` | 랜덤 문자열 32자↑ (예: `openssl rand -base64 32`) |

5. **Deploy site** 클릭 → 자동 배포

### STEP 4 — 도메인 확인

배포 완료 후 `https://your-app.netlify.app` 으로 접속!

---

## 로컬 개발

```bash
# 의존성 설치
npm install

# .env 파일 생성
cp .env.example .env
# .env 에 환경변수 입력

# Netlify CLI로 로컬 실행
npm run dev
# → http://localhost:8888
```

### .env.example
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET=your-secret-key
```

---

## 파일 구조

```
chatapp-netlify/
├── netlify.toml              # Netlify 설정 (빌드/리다이렉트/Functions)
├── package.json
├── supabase-schema.sql       # DB 스키마 (Supabase에서 실행)
├── scripts/
│   └── inject-env.js         # 빌드 시 환경변수 HTML 주입
├── public/
│   └── index.html            # SPA 프론트엔드
└── netlify/
    └── functions/
        ├── _utils.js          # 공통 유틸 (Supabase, JWT, 응답 헬퍼)
        ├── auth.js            # POST /api/auth (로그인/회원가입/로그아웃)
        ├── rooms.js           # GET/POST /api/rooms
        ├── messages.js        # POST /api/messages
        └── users.js           # GET/PUT /api/users
```

---

## 주요 기능

- ✅ 회원가입 / 로그인 / 자동 로그인 (JWT localStorage)
- ✅ 채팅방 실시간 메시지 (Supabase Realtime)
- ✅ 1:1 DM 실시간 수신 (Supabase Realtime)
- ✅ DM 미읽음 배지 + 토스트 알림
- ✅ 사용자/방 검색
- ✅ 채팅방 생성
- ✅ 프로필 편집 (닉네임, 상태메시지)
- ✅ 다크/라이트 모드 (설정 저장)
- ✅ 낙관적 UI (전송 즉시 표시)

---

## Netlify Functions 엔드포인트

| Method | URL | 기능 |
|--------|-----|------|
| POST | `/api/auth?action=login` | 로그인 |
| POST | `/api/auth?action=register` | 회원가입 |
| POST | `/api/auth?action=logout` | 로그아웃 |
| GET  | `/api/auth?action=me` | 내 정보 |
| GET  | `/api/rooms` | 채팅방 목록 |
| POST | `/api/rooms` | 채팅방 생성 |
| GET  | `/api/rooms?room_id=X&action=msgs` | 메시지 목록 |
| POST | `/api/messages` | 채팅방 메시지 전송 |
| POST | `/api/messages?type=dm` | DM 전송 |
| GET  | `/api/messages?type=dm&with=USER` | DM 내역 |
| GET  | `/api/users` | 사용자 목록 |
| PUT  | `/api/users?action=profile` | 프로필 수정 |
