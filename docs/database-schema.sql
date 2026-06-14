-- ArKey Supabase database schema
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vault (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  account_name text,
  group_name text not null default 'General',
  encrypted_data text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.authenticators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer text not null,
  account_name text not null,
  encrypted_secret text not null,
  digits integer not null default 6 check (digits between 6 and 8),
  period integer not null default 30 check (period between 15 and 90),
  algorithm text not null default 'SHA-1' check (algorithm in ('SHA-1', 'SHA-256', 'SHA-512')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('vault', 'authenticator')),
  title text not null,
  payload jsonb not null,
  password_hash text,
  max_views integer check (max_views is null or max_views > 0),
  view_count integer not null default 0,
  expires_at timestamptz,
  format text not null default 'json',
  created_at timestamptz not null default now()
);

create table if not exists public.pastes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  content_type text not null default 'text' check (content_type in ('text', 'markdown', 'html', 'json')),
  password_hash text,
  max_views integer check (max_views is null or max_views > 0),
  view_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vault
  add column if not exists account_name text,
  add column if not exists group_name text not null default 'General';

create index if not exists vault_user_id_created_at_idx
  on public.vault(user_id, created_at desc);

create index if not exists authenticators_user_id_updated_at_idx
  on public.authenticators(user_id, updated_at desc);

create index if not exists share_links_user_id_created_at_idx
  on public.share_links(user_id, created_at desc);

create index if not exists pastes_user_id_created_at_idx
  on public.pastes(user_id, created_at desc);

alter table public.users enable row level security;
alter table public.vault enable row level security;
alter table public.authenticators enable row level security;
alter table public.share_links enable row level security;
alter table public.pastes enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can upsert own profile" on public.users;
create policy "Users can upsert own profile"
  on public.users for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own vault entries" on public.vault;
create policy "Users can read own vault entries"
  on public.vault for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own vault entries" on public.vault;
create policy "Users can create own vault entries"
  on public.vault for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own vault entries" on public.vault;
create policy "Users can update own vault entries"
  on public.vault for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own vault entries" on public.vault;
create policy "Users can delete own vault entries"
  on public.vault for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own authenticators" on public.authenticators;
create policy "Users can read own authenticators"
  on public.authenticators for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own authenticators" on public.authenticators;
create policy "Users can create own authenticators"
  on public.authenticators for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own authenticators" on public.authenticators;
create policy "Users can update own authenticators"
  on public.authenticators for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own authenticators" on public.authenticators;
create policy "Users can delete own authenticators"
  on public.authenticators for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can create own share links" on public.share_links;
create policy "Users can create own share links"
  on public.share_links for insert
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read share links" on public.share_links;
create policy "Anyone can read share links"
  on public.share_links for select
  using (true);

drop policy if exists "Users can create own pastes" on public.pastes;
create policy "Users can create own pastes"
  on public.pastes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read pastes" on public.pastes;
create policy "Anyone can read pastes"
  on public.pastes for select
  using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists authenticators_set_updated_at on public.authenticators;
create trigger authenticators_set_updated_at
  before update on public.authenticators
  for each row
  execute function public.set_updated_at();

drop trigger if exists pastes_set_updated_at on public.pastes;
create trigger pastes_set_updated_at
  before update on public.pastes
  for each row
  execute function public.set_updated_at();

create or replace function public.increment_share_view(share_id uuid)
returns table(view_count integer)
language sql
security definer
set search_path = public
as $$
  update public.share_links
  set view_count = public.share_links.view_count + 1
  where id = share_id
  returning public.share_links.view_count;
$$;

create or replace function public.increment_paste_view(paste_id uuid)
returns table(view_count integer)
language sql
security definer
set search_path = public
as $$
  update public.pastes
  set view_count = public.pastes.view_count + 1
  where id = paste_id
  returning public.pastes.view_count;
$$;

grant execute on function public.increment_share_view(uuid) to anon, authenticated;
grant execute on function public.increment_paste_view(uuid) to anon, authenticated;
