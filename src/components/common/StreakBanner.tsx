import React from 'react';
import { Flame, Trophy, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useGamification } from '../../context/GamificationContext';
import { useFinance } from '../../context/FinanceContext';
import { AnimatedNumber } from './AnimatedNumber';
import { getTodayString } from '../../utils/date';

interface StreakBannerProps {
 compact?: boolean;
}

export const StreakBanner: React.FC<StreakBannerProps> = ({ compact = false }) => {
 const { streak, levelInfo } = useGamification();
 const { setCurrentView } = useFinance();
 const isLoggedToday = streak.lastActiveDate === getTodayString();

 const isTitan = streak.currentStreak >= 30;
 const isHabit = streak.currentStreak >= 7;
 const isSpark = streak.currentStreak >= 3;
 const isStreakBroken = streak.currentStreak === 0 || (streak.longestStreak > 2 && streak.currentStreak <= 1 && !isLoggedToday);

 const streakTierLabel = isStreakBroken
 ? 'Streak Interrupted'
 : isTitan
 ? 'Titan Discipline'
 : isHabit
 ? 'Habit Formed'
 : isSpark
 ? 'Momentum Building'
 : 'Day Initiator';

 if (compact) {
 return (
 <button
 type="button"
 onClick={() => setCurrentView('badges')}
 aria-label={`Current streak: ${streak.currentStreak} days. Best: ${streak.longestStreak} days. View Achievements.`}
  className={`group flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-xl border transition-colors duration-200 cursor-pointer ${
  isStreakBroken
    ? 'bg-sunken border-line text-ink-3 hover:bg-line'
    : isHabit
    ? 'bg-reward-tint border-reward/30 text-reward hover:bg-reward-tint/80'
    : 'bg-sunken border-line text-ink-2 hover:bg-line'
  }`}
  title={`Current streak: ${streak.currentStreak} days. Best: ${streak.longestStreak} days. Click to view Achievements.`}
  >
  <Flame
    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
    isStreakBroken
      ? 'text-ink-3 animate-desaturate-pulse opacity-60'
      : isTitan
      ? 'text-reward animate-flame-flicker fill-reward'
      : isHabit
      ? 'text-reward animate-flame-flicker fill-reward/60'
      : 'text-reward'
    }`}
  />
 <span className="font-numeric font-bold text-xs sm:text-sm">
 {streak.currentStreak}d
 </span>
 <span className="hidden sm:inline text-xs font-medium opacity-80">
 streak
 </span>
 </button>
 );
 }

 return (
 <div
 role="button"
 tabIndex={0}
 onClick={() => setCurrentView('badges')}
 onKeyDown={(e) => {
   if (e.key === 'Enter' || e.key === ' ') {
     e.preventDefault();
     setCurrentView('badges');
   }
 }}
 aria-label={`Current streak: ${streak.currentStreak} days. Best: ${streak.longestStreak} days. View Achievements.`}
 className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-[transform,box-shadow,background-color] duration-200 cursor-pointer shadow-xs hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
 isStreakBroken
 ? 'bg-surface border-line hover:border-amber-500/30'
 : isTitan
 ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/40 ring-1 ring-amber-500/20'
 : isHabit
 ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30'
 : 'bg-sunken border-line hover:border-amber-500/30'
 }`}
 >
 {/* Background glow decoration */}
 <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none group-hover:bg-amber-500/15 transition-colors" />

 <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 {/* Left: Flame and Numbers */}
 <div className="flex items-center gap-3.5">
 <div
 className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105 ${
 isStreakBroken
 ? 'bg-sunken text-ink-3 border border-line'
 : isTitan
 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-xs'
 : isHabit
 ? 'bg-amber-500/20 text-reward border border-amber-500/30'
 : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
 }`}
 >
 <Flame
 className={`w-6 h-6 ${
 isStreakBroken
 ? 'text-ink-3 fill-slate-300 dark:fill-slate-600 animate-desaturate-pulse opacity-60'
 : isTitan
 ? 'fill-slate-950 animate-flame-flicker'
 : isHabit
 ? 'fill-amber-500/40 animate-flame-flicker'
 : 'animate-flame-flicker'
 }`}
 />
 </div>

 <div>
 <div className="flex items-center gap-2">
 <span className={`text-xs font-bold uppercase tracking-wider ${
 isStreakBroken ? 'text-ink-3' : 'text-amber-700 dark:text-reward'
 }`}>
 {streakTierLabel}
 </span>
 <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-sunken text-ink-2">
 <Trophy className="w-2.5 h-2.5 text-amber-500" />
 Best: {streak.longestStreak}d
 </span>
 </div>

 <div className="flex items-baseline gap-2 mt-0.5">
 <span className="text-2xl sm:text-3xl font-black font-numeric tracking-tight text-ink-1">
 <AnimatedNumber
 value={streak.currentStreak}
 format={n => Math.round(n).toString()}
 />
 </span>
 <span className="text-xs font-semibold text-ink-3">
 {streak.currentStreak === 1 ? 'day logging streak' : 'days logging streak'}
 </span>
 </div>
 </div>
 </div>

 {/* Right: Daily status & Level Info */}
 <div className="flex items-center gap-3 self-start sm:self-center">
 <div className="text-left sm:text-right">
 <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold">
 {isLoggedToday ? (
 <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
 <CheckCircle2 className="w-3.5 h-3.5" />
 Logged today
 </span>
 ) : isStreakBroken ? (
 <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
 <AlertCircle className="w-3.5 h-3.5" />
 Streak broken · Log today
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-amber-600 dark:text-reward">
 <AlertCircle className="w-3.5 h-3.5" />
 Active today needed
 </span>
 )}
 </div>
 <p className="text-xs text-ink-3 mt-0.5">
 Level {levelInfo.level} • {levelInfo.xpToNext} XP to Lv.{levelInfo.level + 1}
 </p>
 </div>

 <div className="hidden xs:flex h-9 w-9 rounded-xl bg-sunken items-center justify-center text-ink-3 group-hover:text-reward transition-colors">
 <Sparkles className="w-4 h-4" />
 </div>
 </div>
 </div>
 </div>
 );
};
