import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';

export function useHydrateGameState() {
  const applyPatch = useGameStore((s) => s.applyPatch);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || !isMounted) return;

      const { data, error } = await supabase
        .from('users')
        .select('xp_total, level, streak_current, streak_longest, grace_days_remaining, progress_tier, consent_status')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (error || !data || !isMounted) return;

      applyPatch({
        xpTotal: data.xp_total,
        level: data.level,
        streakCurrent: data.streak_current,
        streakLongest: data.streak_longest,
        graceDaysRemaining: data.grace_days_remaining,
        progressTier: data.progress_tier,
        consentStatus: data.consent_status,
      });
    }

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [applyPatch]);
}
