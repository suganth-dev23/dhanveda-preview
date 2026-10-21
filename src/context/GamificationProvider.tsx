import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { Badge, StreakData, FinancialHealthScore, GamificationState } from '../types/finance';
import { ALL_BADGES, BadgeEvaluationContext } from '../constants/badges';
import { calculateFinancialHealthScore } from '../utils/scoreCalculator';
import { getGamificationState, saveGamificationState } from '../utils/db';
import { getTodayString } from '../utils/date';
import { useFinance } from './FinanceContext';
import { GamificationContext, LevelInfo } from './GamificationContextDefs';

const LEVEL_THRESHOLDS = [0, 250, 600, 1200, 2000, 3000, 4500, 6500, 9000, 12000];

function calculateLevelInfo(totalXP: number): LevelInfo {
 let level = 1;
 for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
 if (totalXP >= LEVEL_THRESHOLDS[i]) {
 level = i + 1;
 } else {
 break;
 }
 }
 const currentBase = LEVEL_THRESHOLDS[level - 1] || 0;
 const nextBase = LEVEL_THRESHOLDS[level] || currentBase + 2500;
 const progress = Math.min(100, Math.max(0, Math.round(((totalXP - currentBase) / (nextBase - currentBase)) * 100)));
 return { level, progress, xpToNext: Math.max(0, nextBase - totalXP) };
}

const INITIAL_STREAK: StreakData = {
 currentStreak: 0,
 longestStreak: 0,
 lastActiveDate: '',
};

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const {
 transactions,
 budgets,
 categorySpendingThisMonth,
 dreams,
 emergencyFund,
 emergencyFundRunwayMonths,
 investments,
 totalInvestmentValue,
 totalInvestmentGainLoss,
 recurringPaymentLogs,
 settlements,
 isDriveConnected,
 currentMonthSavingsRate,
 totalIOwe,
 totalOwedToMe,
 subscribeFinanceEvent,
 emitFinanceEvent,
 isInitialized,
 } = useFinance();

 const [streak, setStreak] = useState<StreakData>(INITIAL_STREAK);
  const streakRef = useRef<StreakData>(INITIAL_STREAK);
  useLayoutEffect(() => {
    streakRef.current = streak;
  }, [streak]);
 const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>([]);
 const [unlockedBadgeDates, setUnlockedBadgeDates] = useState<Record<string, string>>({});
 const [totalXP, setTotalXP] = useState<number>(0);
 const [isLoaded, setIsLoaded] = useState(false);

 // Synchronous refs to prevent race conditions & re-evaluation loops
 const unlockedBadgeIdsRef = useRef<string[]>([]);
 const unlockedBadgeDatesRef = useRef<Record<string, string>>({});
 const totalXPRef = useRef<number>(0);
 const initialSyncDoneRef = useRef(false);
 const eventDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
 const stateDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
 const evaluateBadgesRef = useRef<((silent?: boolean) => void) | null>(null);

 // Load persisted state from IndexedDB v5
 useEffect(() => {
 async function loadState() {
 try {
 const saved = await getGamificationState();
 if (saved) {
 const loadedStreak = saved.streak || INITIAL_STREAK;
        streakRef.current = loadedStreak;
        setStreak(loadedStreak);
 const ids = saved.unlockedBadgeIds || [];
 const dates = saved.unlockedBadgeDates || {};
 const xp = saved.totalXP || 0;
 setUnlockedBadgeIds(ids);
 unlockedBadgeIdsRef.current = ids;
 setUnlockedBadgeDates(dates);
 unlockedBadgeDatesRef.current = dates;
 setTotalXP(xp);
 totalXPRef.current = xp;
 }
 } catch (err) {
 console.error('[Gamification] Failed loading state from DB:', err);
 } finally {
 setIsLoaded(true);
 }
 }
 loadState();
 }, []);

 // Save changes to IndexedDB
 const persistState = useCallback(async (
 newStreak: StreakData,
 badgeIds: string[],
 badgeDates: Record<string, string>,
 xp: number
 ) => {
 try {
 const levelInfo = calculateLevelInfo(xp);
 const stateToSave: GamificationState = {
 streak: newStreak,
 unlockedBadgeIds: badgeIds,
 unlockedBadgeDates: badgeDates,
 totalXP: xp,
 level: levelInfo.level,
 };
 await saveGamificationState(stateToSave);
 } catch (err) {
 console.error('[Gamification] Error persisting state:', err);
 }
 }, []);

 // Record daily activity & streak calculation
  const recordActivity = useCallback(() => {
    const today = getTodayString();
    const prev = streakRef.current;
    if (prev.lastActiveDate === today) {
      return;
    }

    let nextStreak = prev.currentStreak;
    let continued = false;
    let broken = false;

    if (!prev.lastActiveDate || prev.currentStreak === 0) {
      nextStreak = 1;
      continued = true;
    } else {
      const last = new Date(prev.lastActiveDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        nextStreak += 1;
        continued = true;
      } else if (diffDays > 1) {
        nextStreak = 1;
        broken = true;
      } else if (diffDays <= 0) {
        nextStreak = prev.currentStreak;
      }
    }

    const updatedStreak: StreakData = {
      currentStreak: nextStreak,
      longestStreak: Math.max(nextStreak, prev.longestStreak),
      lastActiveDate: today,
    };

    streakRef.current = updatedStreak;
    setStreak(updatedStreak);

    persistState(updatedStreak, unlockedBadgeIdsRef.current, unlockedBadgeDatesRef.current, totalXPRef.current);

    if (continued && nextStreak > 1) {
      emitFinanceEvent({ type: 'streak_continued', days: nextStreak });
    } else if (broken) {
      emitFinanceEvent({ type: 'streak_broken' });
    }
  }, [persistState, emitFinanceEvent]);

 // Context for badge evaluation
 const evaluationContext = useMemo<BadgeEvaluationContext>(() => ({
 transactions,
 budgets,
 categorySpendingThisMonth,
 dreams,
 emergencyFund,
 emergencyFundRunwayMonths,
 investments,
 totalInvestmentValue,
 totalInvestmentGainLoss,
 recurringPaymentLogs,
 settlements,
 streak,
 isDriveConnected,
 }), [
 transactions,
 budgets,
 categorySpendingThisMonth,
 dreams,
 emergencyFund,
 emergencyFundRunwayMonths,
 investments,
 totalInvestmentValue,
 totalInvestmentGainLoss,
 recurringPaymentLogs,
 settlements,
 streak,
 isDriveConnected,
 ]);

 const suppressCelebrationsUntilRef = useRef<number>(0);

 // Evaluate badges against current financial context
 const evaluateBadges = useCallback((silent = false) => {
 if (!isLoaded || !isInitialized) return;

 const newlyUnlocked: Badge[] = [];
 const currentIds = unlockedBadgeIdsRef.current;
 const updatedBadgeIds = [...currentIds];
 const updatedBadgeDates = { ...unlockedBadgeDatesRef.current };
 let additionalXP = 0;

 ALL_BADGES.forEach(badgeDef => {
 const isAlreadyUnlocked = currentIds.includes(badgeDef.id);
 if (isAlreadyUnlocked) return;
 const evalResult = badgeDef.evaluate(evaluationContext);

 if (evalResult.isUnlocked) {
 const now = new Date().toISOString();
 updatedBadgeIds.push(badgeDef.id);
 updatedBadgeDates[badgeDef.id] = now;
 additionalXP += badgeDef.xp;

 const unlockedBadge: Badge = {
 id: badgeDef.id,
 name: badgeDef.name,
 description: badgeDef.description,
 category: badgeDef.category,
 tier: badgeDef.tier,
 icon: badgeDef.icon,
 xp: badgeDef.xp,
 unlockedAt: now,
 progress: 100,
 };
 newlyUnlocked.push(unlockedBadge);
 }
 });

 if (newlyUnlocked.length > 0) {
 // Synchronously update refs FIRST to prevent duplicate unlocks or loops
 unlockedBadgeIdsRef.current = updatedBadgeIds;
 unlockedBadgeDatesRef.current = updatedBadgeDates;
 const nextXP = totalXPRef.current + additionalXP;
 totalXPRef.current = nextXP;

 // Update React states
 setUnlockedBadgeIds(updatedBadgeIds);
 setUnlockedBadgeDates(updatedBadgeDates);
 setTotalXP(nextXP);

 persistState(streak, updatedBadgeIds, updatedBadgeDates, nextXP);

 // Only emit celebration events for user-initiated actions, never on initial silent hydration or during bulk loads
 const isCelebrationSuppressed = silent || Date.now() < suppressCelebrationsUntilRef.current;
 if (!isCelebrationSuppressed) {
 // Cap celebrations to at most 2 to avoid notification storms
 newlyUnlocked.slice(0, 2).forEach((badge, idx) => {
 setTimeout(() => {
 emitFinanceEvent({ type: 'badge_earned', badge });
 }, idx * 600);
 });
 }
 }
 }, [
 isLoaded,
 isInitialized,
 evaluationContext,
 streak,
 persistState,
 emitFinanceEvent,
 ]);

 useLayoutEffect(() => {
  evaluateBadgesRef.current = evaluateBadges;
 });

 // Subscribe to finance events for reactive evaluation
 useEffect(() => {
 if (!subscribeFinanceEvent) return;

 const unsubscribe = subscribeFinanceEvent((event) => {
 if (event.type === 'bulk_data_loaded') {
 suppressCelebrationsUntilRef.current = Date.now() + 3000;
 evaluateBadgesRef.current?.(true);
 return;
 }

 if (event.type === 'transaction_added') {
 recordActivity();
 }

 // CRITICAL: NEVER re-evaluate on badge_earned or feedback events to prevent infinite loops!
 if (
 event.type === 'badge_earned' ||
 event.type === 'budget_exceeded' ||
 event.type === 'streak_continued' ||
 event.type === 'streak_broken'
 ) {
 return;
 }

 // Debounce badge evaluation for domain mutation events
 if (eventDebounceTimerRef.current) {
 clearTimeout(eventDebounceTimerRef.current);
 }
 eventDebounceTimerRef.current = setTimeout(() => {
 evaluateBadgesRef.current?.(false);
 }, 300);
 });

 return () => {
 unsubscribe();
 if (eventDebounceTimerRef.current) {
 clearTimeout(eventDebounceTimerRef.current);
 }
 };
 }, [subscribeFinanceEvent, recordActivity]);

 // Initial silent badge sync once data is loaded & initialized
 useEffect(() => {
 if (isLoaded && isInitialized && !initialSyncDoneRef.current) {
 initialSyncDoneRef.current = true;
 // Evaluate silently so existing qualifying data doesn't spam celebrations on page load
 evaluateBadgesRef.current?.(true);
 }
 }, [isLoaded, isInitialized]);

 // Reactive badge evaluation when budget counts or goal items change
 useEffect(() => {
 if (!initialSyncDoneRef.current || !isLoaded || !isInitialized) return;

 if (stateDebounceTimerRef.current) {
 clearTimeout(stateDebounceTimerRef.current);
 }
 stateDebounceTimerRef.current = setTimeout(() => {
 evaluateBadgesRef.current?.(false);
 }, 400);

 return () => {
 if (stateDebounceTimerRef.current) {
 clearTimeout(stateDebounceTimerRef.current);
 }
 };
 }, [
 isLoaded,
 isInitialized,
 budgets.length,
 dreams.length,
 emergencyFund.currentSaved,
 investments.length,
 settlements.length,
 recurringPaymentLogs.length,
 isDriveConnected,
 ]);

 // Build full Badge list with live progress and unlock status
 const badges = useMemo<Badge[]>(() => {
 return ALL_BADGES.map(badgeDef => {
 const isUnlocked = unlockedBadgeIds.includes(badgeDef.id);
 const evalResult = isUnlocked
 ? { isUnlocked: true, progress: 100, currentCount: undefined, targetCount: undefined }
 : badgeDef.evaluate(evaluationContext);
 return {
 id: badgeDef.id,
 name: badgeDef.name,
 description: badgeDef.description,
 category: badgeDef.category,
 tier: badgeDef.tier,
 icon: badgeDef.icon,
 xp: badgeDef.xp,
 unlockedAt: unlockedBadgeDates[badgeDef.id],
 progress: isUnlocked ? 100 : Math.min(99, evalResult.progress ?? 0),
 currentCount: evalResult.currentCount,
 targetCount: evalResult.targetCount,
 };
 });
 }, [evaluationContext, unlockedBadgeIds, unlockedBadgeDates]);

 const unlockedBadges = useMemo(() => badges.filter(b => Boolean(b.unlockedAt) || unlockedBadgeIds.includes(b.id)), [badges, unlockedBadgeIds]);

 const levelInfo = useMemo(() => calculateLevelInfo(totalXP), [totalXP]);

 // Financial Health Score calculation
 const previousScoreRef = useRef<number | undefined>(undefined);
 const [scoreTrend, setScoreTrend] = useState<FinancialHealthScore['trend']>('neutral');

 const baseHealthScore = useMemo<FinancialHealthScore>(() => {
 const budgetedCats = categorySpendingThisMonth.filter(c => c.budget > 0);
 const score = calculateFinancialHealthScore({
 monthlySavingsRate: currentMonthSavingsRate,
 budgetedCategories: budgetedCats,
 emergencyFundRunwayMonths,
 totalIOwe,
 totalOwedToMe,
 currentStreak: streak.currentStreak,
 });
 return score;
 }, [
 currentMonthSavingsRate,
 categorySpendingThisMonth,
 emergencyFundRunwayMonths,
 totalIOwe,
 totalOwedToMe,
 streak.currentStreak,
 ]);

 useEffect(() => {
 if (previousScoreRef.current !== undefined) {
  if (baseHealthScore.overallScore > previousScoreRef.current + 1) {
   setScoreTrend('up');
  } else if (baseHealthScore.overallScore < previousScoreRef.current - 1) {
   setScoreTrend('down');
  }
 }
 previousScoreRef.current = baseHealthScore.overallScore;
 }, [baseHealthScore.overallScore]);

 const healthScore = useMemo<FinancialHealthScore>(() => ({
  ...baseHealthScore,
  trend: scoreTrend,
 }), [baseHealthScore, scoreTrend]);

 return (
 <GamificationContext.Provider
 value={{
 streak,
 badges,
 unlockedBadges,
 unlockedCount: unlockedBadges.length,
 totalXP,
 levelInfo,
 healthScore,
 evaluateBadges,
 recordActivity,
 }}
 >
 {children}
 </GamificationContext.Provider>
 );
};
