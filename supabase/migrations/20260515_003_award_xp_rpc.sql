create or replace function public.award_xp_atomic(
  p_user_id uuid,
  p_activity_type text,
  p_duration_sec integer,
  p_idempotency_key text,
  p_xp_earned integer,
  p_completed_day date,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  idempotent_replay boolean,
  xp_total integer,
  level integer,
  streak_current integer,
  streak_longest integer,
  grace_days_remaining integer,
  progress_tier text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user users%rowtype;
  v_existing practice_sessions%rowtype;
  v_new_xp integer;
  v_new_level integer;
  v_new_streak integer;
  v_new_longest integer;
  v_new_grace integer;
  v_new_tier text;
  v_diff_days integer;
begin
  select * into v_existing
  from practice_sessions
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    select * into v_user from users where id = p_user_id;
    return query select true, v_user.xp_total, v_user.level, v_user.streak_current, v_user.streak_longest, v_user.grace_days_remaining, v_user.progress_tier;
    return;
  end if;

  select * into v_user from users where id = p_user_id for update;
  if not found then
    raise exception 'User not found';
  end if;
  if v_user.consent_status <> 'granted' then
    raise exception 'Consent required';
  end if;

  v_new_xp := v_user.xp_total + p_xp_earned;
  v_new_level := greatest(1, floor(sqrt(v_new_xp::numeric / 50))::int);

  if v_user.last_session_date is null then
    v_new_streak := 1;
    v_new_grace := v_user.grace_days_remaining;
  else
    v_diff_days := (p_completed_day - v_user.last_session_date);
    if v_diff_days = 0 then
      v_new_streak := v_user.streak_current;
      v_new_grace := v_user.grace_days_remaining;
    elsif v_diff_days = 1 then
      v_new_streak := v_user.streak_current + 1;
      v_new_grace := v_user.grace_days_remaining;
    elsif v_diff_days = 2 and v_user.grace_days_remaining > 0 then
      v_new_streak := v_user.streak_current + 1;
      v_new_grace := v_user.grace_days_remaining - 1;
    else
      v_new_streak := 1;
      v_new_grace := v_user.grace_days_remaining;
    end if;
  end if;

  v_new_longest := greatest(v_user.streak_longest, v_new_streak);

  v_new_tier := case
    when v_new_xp >= 25000 then 'crown'
    when v_new_xp >= 13000 then 'third_eye'
    when v_new_xp >= 7000 then 'throat'
    when v_new_xp >= 3500 then 'heart'
    when v_new_xp >= 1500 then 'solar'
    when v_new_xp >= 500 then 'sacral'
    else 'root'
  end;

  insert into practice_sessions(user_id, idempotency_key, type, duration_sec, xp_earned, completed_at, metadata)
  values (p_user_id, p_idempotency_key, p_activity_type, p_duration_sec, p_xp_earned, now(), p_metadata)
  on conflict (user_id, idempotency_key) do nothing;

  if not found then
    select * into v_user from users where id = p_user_id;
    return query select true, v_user.xp_total, v_user.level, v_user.streak_current, v_user.streak_longest, v_user.grace_days_remaining, v_user.progress_tier;
    return;
  end if;

  update users set
    xp_total = v_new_xp,
    level = v_new_level,
    streak_current = v_new_streak,
    streak_longest = v_new_longest,
    grace_days_remaining = v_new_grace,
    progress_tier = v_new_tier,
    last_session_date = p_completed_day,
    updated_at = now()
  where id = p_user_id;

  return query select false, v_new_xp, v_new_level, v_new_streak, v_new_longest, v_new_grace, v_new_tier;
end;
$$;
