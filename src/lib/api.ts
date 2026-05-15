import { supabase } from './supabase';

type AwardXpPayload = {
  activityType: string;
  durationSec: number;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

type AwardXpResponse = {
  success: boolean;
  idempotentReplay: boolean;
  xpEarned: number;
  user: {
    xpTotal: number;
    level: number;
    streakCurrent: number;
    streakLongest: number;
    graceDaysRemaining: number;
    progressTier: string;
  };
};

export async function awardXp(payload: AwardXpPayload): Promise<AwardXpResponse> {
  const { data, error } = await supabase.functions.invoke('award-xp', { body: payload });
  if (error) throw error;
  return data as AwardXpResponse;
}
