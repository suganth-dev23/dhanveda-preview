import { createContext, useContext } from 'react';
import { Badge, StreakData, FinancialHealthScore } from '../types/finance';

export interface LevelInfo {
  level: number;
  progress: number; // 0 - 100%
  xpToNext: number;
}

export interface GamificationContextType {
  streak: StreakData;
  badges: Badge[];
  unlockedBadges: Badge[];
  unlockedCount: number;
  totalXP: number;
  levelInfo: LevelInfo;
  healthScore: FinancialHealthScore;
  evaluateBadges: () => void;
  recordActivity: () => void;
}

export const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};
