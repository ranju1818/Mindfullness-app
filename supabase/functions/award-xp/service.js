export const XP_CONFIG = { meditation_5: 15, meditation_10: 20, meditation_15: 25, meditation_20: 30, breathwork: 15, wisdom: 5, rak: 25 };

export async function awardXpViaRpc(client, params) {
  const xpEarned = XP_CONFIG[params.activityType];
  const completedDay = new Date().toISOString().slice(0, 10);
  const { data, error } = await client.rpc('award_xp_atomic', {
    p_user_id: params.userId,
    p_activity_type: params.activityType,
    p_duration_sec: params.durationSec,
    p_idempotency_key: params.idempotencyKey,
    p_xp_earned: xpEarned,
    p_completed_day: completedDay,
    p_metadata: params.metadata ?? {},
  });

  if (error || !data?.[0]) throw new Error(error?.message ?? 'Failed to award XP');
  return { xpEarned, row: data[0] };
}
