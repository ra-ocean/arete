-- Areté — skema Supabase. Jalankan sekali di SQL Editor.
-- Aman dijalankan ulang: semuanya memakai if not exists / or replace.

create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  name        text,
  launch_date date,
  created_at  timestamptz default now()
);

-- Satu baris per hari. payload jsonb, bukan kolom per metrik, supaya
-- menambah field baru tidak butuh migrasi skema.
create table if not exists logs (
  user_id    uuid not null references auth.users on delete cascade,
  day        date not null,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Sesi latihan dipisah per hari DAN per jenis. Kalau digabung jadi satu
-- gumpalan, satu hari yang berbeda di dua alat akan membuat seluruh riwayat
-- menang atau kalah sekaligus.
-- kind: 'arete' sesi yang disusun app, 'coach' sesi bersama coach, 'abs' perut harian.
create table if not exists sessions (
  user_id    uuid not null references auth.users on delete cascade,
  day        date not null,
  kind       text not null,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);

-- Sasaran, profil, inventaris alat, dan gerakan buatan sendiri.
create table if not exists settings (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table logs     enable row level security;
alter table sessions enable row level security;
alter table settings enable row level security;

-- Yang mengunci data adalah baris di bawah ini, bukan kerahasiaan anon key.
-- Postgres sendiri yang menolak baris milik user lain.
drop policy if exists "profil sendiri"      on profiles;
drop policy if exists "catatan sendiri"     on logs;
drop policy if exists "sesi sendiri"        on sessions;
drop policy if exists "pengaturan sendiri"  on settings;

create policy "profil sendiri" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "catatan sendiri" on logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sesi sendiri" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pengaturan sendiri" on settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists logs_user_day     on logs (user_id, day desc);
create index if not exists sessions_user_day on sessions (user_id, day desc);
