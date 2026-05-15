import { create } from 'zustand';
import type { ConsentStatus, ProgressTier } from '../types/gamification';

type GameState = {
  xpTotal: number;
  level: number;
  streakCurrent: number;
  streakLongest: number;
  graceDaysRemaining: number;
  progressTier: ProgressTier;
  consentStatus: ConsentStatus;
  applyPatch: (patch: Partial<GameState>) => void;
};

export const useGameStore = create<GameState>((set) => ({
  xpTotal: 0,
  level: 1,
  streakCurrent: 0,
  streakLongest: 0,
  graceDaysRemaining: 2,
  progressTier: 'root',
  consentStatus: 'pending',
  applyPatch: (patch) => set((state) => ({ ...state, ...patch })),
}));
