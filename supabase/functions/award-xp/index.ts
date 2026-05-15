import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { checkRateLimit } from './rate-limit.js';
import { awardXpViaRpc, XP_CONFIG } from './service.js';

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);

  const rl = checkRateLimit(`award-xp:${userData.user.id}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return json({ error: 'Rate limit exceeded', retryAfterMs: rl.retryAfterMs }, 429);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: 'Invalid JSON body' }, 400);
  const { activityType, durationSec, idempotencyKey, metadata = {} } = body;
  if (typeof activityType !== 'string' || !(activityType in XP_CONFIG)) return json({ error: 'Invalid activityType' }, 400);
  if (typeof durationSec !== 'number' || durationSec <= 0) return json({ error: 'Invalid durationSec' }, 400);
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) return json({ error: 'Invalid idempotencyKey' }, 400);

  try {
    const { xpEarned, row } = await awardXpViaRpc(supabase as any, {
      userId: userData.user.id,
      activityType,
      durationSec,
      idempotencyKey,
      metadata: metadata as Record<string, unknown>,
    });

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to award XP';
    const status = msg.toLowerCase().includes('consent required') ? 403 : 500;
    return json({ error: msg }, status);
  }
});
