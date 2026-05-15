import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const XP_CONFIG: Record<string, number> = { meditation_5: 15, meditation_10: 20, meditation_15: 25, meditation_20: 30, breathwork: 15, wisdom: 5, rak: 25 };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: 'Invalid JSON body' }, 400);
  const { activityType, durationSec, idempotencyKey, metadata = {} } = body;
  if (typeof activityType !== 'string' || !(activityType in XP_CONFIG)) return json({ error: 'Invalid activityType' }, 400);
  if (typeof durationSec !== 'number' || durationSec <= 0) return json({ error: 'Invalid durationSec' }, 400);
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) return json({ error: 'Invalid idempotencyKey' }, 400);
  const xpEarned = XP_CONFIG[activityType];
  const completedDay = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc('award_xp_atomic', {
    p_user_id: userData.user.id,
    p_activity_type: activityType,
    p_duration_sec: durationSec,
    p_idempotency_key: idempotencyKey,
    p_xp_earned: xpEarned,
    p_completed_day: completedDay,
    p_metadata: metadata,
  });
  if (error || !data?.[0]) {
    const status = error?.message?.toLowerCase().includes('consent required') ? 403 : 500;
    return json({ error: error?.message ?? 'Failed to award XP' }, status);
  }
  const row = data[0];
  return json({
    success: true,
    idempotentReplay: row.idempotent_replay,
    xpEarned,
    user: {
      xpTotal: row.xp_total,
      level: row.level,
      streakCurrent: row.streak_current,
      streakLongest: row.streak_longest,
      graceDaysRemaining: row.grace_days_remaining,
      progressTier: row.progress_tier,
    },
  });
});
