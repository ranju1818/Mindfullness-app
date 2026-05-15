-- ZenQuest initial schema (Phase 1 baseline)
create extension if not exists pgcrypto;
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_config jsonb not null default '{}'::jsonb,
  xp_total integer not null default 0,
  level integer not null default 1,
  streak_current integer not null default 0,
  streak_longest integer not null default 0,
  grace_days_remaining integer not null default 2,
  progress_tier text not null default 'root',
  consent_status text not null default 'pending',
  consent_given_at timestamptz,
  consent_withdrawn_at timestamptz,
  consent_version text,
  last_session_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  idempotency_key text not null,
  type text not null,
  sub_type text,
  duration_sec integer not null check (duration_sec > 0),
  xp_earned integer not null check (xp_earned >= 0),
  completed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create unique index if not exists idx_practice_sessions_user_idempo on practice_sessions(user_id, idempotency_key);
create index if not exists idx_practice_sessions_user_completed on practice_sessions(user_id, completed_at desc);
create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  module text not null,
  title text not null,
  description text,
  duration_sec integer,
  audio_url text,
  difficulty text,
  required_level integer not null default 1,
  is_premium boolean not null default false,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);
create index if not exists idx_content_items_lookup on content_items(type, module, locale, required_level);
create table if not exists rak_prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  difficulty text,
  created_at timestamptz not null default now()
);
create table if not exists rak_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  rak_id uuid not null references rak_prompts(id),
  notes text,
  is_share_opt_in boolean not null default false,
  visibility text not null default 'private',
  moderation_status text not null default 'not_submitted',
  completed_at timestamptz not null default now()
);
create table if not exists privacy_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  job_type text not null check (job_type in ('export','delete')),
  status text not null default 'queued',
  retries integer not null default 0,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();
