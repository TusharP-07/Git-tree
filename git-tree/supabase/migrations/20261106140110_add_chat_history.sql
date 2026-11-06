create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  repo text not null,
  user_id text not null,
  messages jsonb not null,
  created_at timestamptz default now()
);

alter table public.chat_history enable row level security;

create index if not exists idx_chat_history_lookup
  on public.chat_history (owner, repo, user_id);
