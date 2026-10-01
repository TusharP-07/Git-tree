create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  github_id text not null unique,
  github_login text not null,
  email text,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_user_id_idx on public.sessions(user_id);
create index sessions_expires_at_idx on public.sessions(expires_at);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
