import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const XP_CONFIG: Record<string, number> = {
  meditation_5: 15,
  meditation_10: 20,
  meditation_15: 25,
  meditation_20: 30,
  breathwork: 15,
  wisdom: 5,
  rak: 25,
};

const TIER_THRESHOLDS = [
  { tier: 'root', minXP: 0 },
  { tier: 'sacral', minXP: 500 },
  { tier: 'solar', minXP: 1500 },
  { tier: 'heart', minXP: 3500 },
  { tier: 'throat', minXP: 7000 },
  { tier: 'third_eye', minXP: 13000 },
  { tier: 'crown', minXP: 25000 },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function xpRequiredForLevel(level: number): number {
  return level * level * 50;
}

function resolveLevel(totalXP: number): number {
  let level = 1;
  while (totalXP >= xpRequiredForLevel(level + 1)) level += 1;
  return level;
}

function resolveTier(totalXP: number): string {
  let tier = 'root';
  for (const threshold of TIER_THRESHOLDS) {
    if (totalXP >= threshold.minXP) tier = threshold.tier;
  }
  return tier;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON body' }, 400);

  const { activityType, durationSec, idempotencyKey, metadata = {} } = body as Record<string, unknown>;

  if (typeof activityType !== 'string' || !(activityType in XP_CONFIG)) {
    return json({ error: 'Invalid activityType' }, 400);
  }
  if (typeof durationSec !== 'number' || durationSec <= 0) {
    return json({ error: 'Invalid durationSec' }, 400);
  }
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
    return json({ error: 'Invalid idempotencyKey' }, 400);
  }

  const userId = userData.user.id;

  const { data: existingSession } = await supabase
    .from('practice_sessions')
    .select('xp_earned, completed_at')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingSession) {
    const { data: currentUser } = await supabase
      .from('users')
      .select('xp_total, level, streak_current, streak_longest, grace_days_remaining, progress_tier')
      .eq('id', userId)
      .single();

    return json({ success: true, idempotentReplay: true, xpEarned: existingSession.xp_earned, user: currentUser });
  }

  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('xp_total, level, streak_current, streak_longest, grace_days_remaining, progress_tier, consent_status, last_session_date')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) return json({ error: 'User profile not found' }, 404);
  if (profile.consent_status !== 'granted') return json({ error: 'Consent required' }, 403);

  const xpEarned = XP_CONFIG[activityType];
  const newXPTotal = profile.xp_total + xpEarned;
  const newLevel = resolveLevel(newXPTotal);
  const newTier = resolveTier(newXPTotal);

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const lastDate = profile.last_session_date ? new Date(profile.last_session_date) : null;

  let newStreak = profile.streak_current;
  let newGrace = profile.grace_days_remaining;

  if (!lastDate) {
    newStreak = 1;
  } else {
    const lastKey = new Date(lastDate).toISOString().slice(0, 10);
    const diffDays = Math.floor((Date.parse(todayKey) - Date.parse(lastKey)) / 86400000);
    if (diffDays === 0) {
      newStreak = profile.streak_current;
    } else if (diffDays === 1) {
      newStreak = profile.streak_current + 1;
    } else if (diffDays === 2 && profile.grace_days_remaining > 0) {
      newStreak = profile.streak_current + 1;
      newGrace = profile.grace_days_remaining - 1;
    } else {
      newStreak = 1;
    }
  }

  const newLongest = Math.max(profile.streak_longest, newStreak);

  const { error: sessionErr } = await supabase.from('practice_sessions').insert({
    user_id: userId,
    idempotency_key: idempotencyKey,
    type: activityType,
    duration_sec: durationSec,
    xp_earned: xpEarned,
    metadata,
  });

  if (sessionErr) return json({ error: 'Failed to insert session', detail: sessionErr.message }, 500);

  const { error: updateErr } = await supabase
    .from('users')
    .update({
      xp_total: newXPTotal,
      level: newLevel,
      streak_current: newStreak,
      streak_longest: newLongest,
      grace_days_remaining: newGrace,
      progress_tier: newTier,
      last_session_date: todayKey,
      updated_at: now.toISOString(),
    })
    .eq('id', userId);

  if (updateErr) return json({ error: 'Failed to update user', detail: updateErr.message }, 500);

  return json({
    success: true,
    idempotentReplay: false,
    xpEarned,
    user: {
      xpTotal: newXPTotal,
      level: newLevel,
      streakCurrent: newStreak,
      streakLongest: newLongest,
      graceDaysRemaining: newGrace,
      progressTier: newTier,
    },
  });
});
