import type { ProgressTier } from '../types/gamification';
export const CHAKRA_THRESHOLDS: Array<{ tier: ProgressTier; minXP: number }> = [
  { tier: 'root', minXP: 0 },
  { tier: 'sacral', minXP: 500 },
  { tier: 'solar', minXP: 1500 },
  { tier: 'heart', minXP: 3500 },
  { tier: 'throat', minXP: 7000 },
  { tier: 'third_eye', minXP: 13000 },
  { tier: 'crown', minXP: 25000 },
];
export function xpRequiredForLevel(level: number): number { return level * level * 50; }
export function progressTierForXP(xp: number): ProgressTier {
  let tier: ProgressTier = 'root';
  for (const rule of CHAKRA_THRESHOLDS) if (xp >= rule.minXP) tier = rule.tier;
  return tier;
}
