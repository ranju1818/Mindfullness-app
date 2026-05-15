-- Add idempotency support to prevent duplicate XP awards on retried requests.
alter table if exists public.practice_sessions
  add column if not exists idempotency_key text;

update public.practice_sessions
set idempotency_key = coalesce(idempotency_key, gen_random_uuid()::text)
where idempotency_key is null;

alter table public.practice_sessions
  alter column idempotency_key set not null;

create unique index if not exists practice_sessions_user_id_idempotency_key_uidx
  on public.practice_sessions (user_id, idempotency_key);
