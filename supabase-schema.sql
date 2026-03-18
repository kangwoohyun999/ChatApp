-- ================================================================
-- ChatApp Supabase 스키마
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요
-- ================================================================

-- ── 사용자 테이블 ─────────────────────────────────────────────────
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  username        text unique not null,
  hashed_password text not null,
  display_name    text not null,
  status_message  text not null default '',
  avatar_color    text not null default 'hsl(220,60%,55%)',
  created_at      timestamptz default now()
);

-- ── 채팅방 테이블 ─────────────────────────────────────────────────
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by text not null,
  created_at timestamptz default now()
);

-- ── 채팅방 메시지 테이블 ─────────────────────────────────────────
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms(id) on delete cascade,
  sender_id    text not null,
  sender_name  text not null,
  sender_color text not null default 'hsl(220,60%,55%)',
  content      text not null,
  created_at   timestamptz default now()
);

-- ── DM 테이블 ────────────────────────────────────────────────────
create table if not exists public.direct_messages (
  id           uuid primary key default gen_random_uuid(),
  dm_key       text not null,        -- "user1__user2" (정렬된 쌍)
  sender_id    text not null,
  sender_name  text not null,
  sender_color text not null default 'hsl(220,60%,55%)',
  receiver_id  text not null,
  content      text not null,
  created_at   timestamptz default now()
);

-- ── 인덱스 ───────────────────────────────────────────────────────
create index if not exists idx_messages_room_id    on public.messages(room_id);
create index if not exists idx_messages_created_at on public.messages(created_at);
create index if not exists idx_dm_key              on public.direct_messages(dm_key);
create index if not exists idx_dm_created_at       on public.direct_messages(created_at);

-- ── Realtime 활성화 ──────────────────────────────────────────────
-- Supabase 대시보드 → Database → Replication 에서
-- messages, direct_messages 테이블 Realtime 활성화 필요

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.direct_messages;

-- ── RLS 비활성화 (Service Key 사용하므로 불필요) ─────────────────
alter table public.users           disable row level security;
alter table public.rooms           disable row level security;
alter table public.messages        disable row level security;
alter table public.direct_messages disable row level security;

-- ── 기본 채팅방 ──────────────────────────────────────────────────
insert into public.rooms (name, created_by) values
  ('일반', 'system'),
  ('자유', 'system'),
  ('공지', 'system')
on conflict do nothing;
