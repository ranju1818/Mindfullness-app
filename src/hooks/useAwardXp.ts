import { useState } from 'react';
import { awardXp } from '../lib/api';
import { useGameStore } from '../store/useGameStore';

export function useAwardXp() {
  const applyPatch = useGameStore((s) => s.applyPatch);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeActivity(activityType: string, durationSec: number) {
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey = `${activityType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await awardXp({ activityType, durationSec, idempotencyKey });
      applyPatch({
        xpTotal: result.user.xpTotal,
        level: result.user.level,
        streakCurrent: result.user.streakCurrent,
        streakLongest: result.user.streakLongest,
        graceDaysRemaining: result.user.graceDaysRemaining,
        progressTier: result.user.progressTier as any,
      });
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to award XP');
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { completeActivity, loading, error };
}
