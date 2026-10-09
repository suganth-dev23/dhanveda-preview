import React from 'react';
import { ShieldCheck, TrendingUp, TrendingDown, Minus, ArrowRight, Award } from 'lucide-react';
import { useGamification } from '../../context/GamificationContext';
import { useFinance } from '../../context/FinanceContext';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress';

export const HealthGauge: React.FC = () => {
 const { healthScore, unlockedCount, badges } = useGamification();
 const { setCurrentView } = useFinance();

 const {
 overallScore,
 grade,
 savingsScore,
 budgetScore,
 emergencyScore,
 debtScore,
 consistencyScore,
 trend,
 } = healthScore;

 // Arc math: Radius = 85, Center = (120, 120)
 // Half-circle arc length = PI * 85 ~= 267.04
 const ARC_LENGTH = 267.04;
 const { displayPercent } = useAnimatedProgress(overallScore, { animateOnMount: true });
 const rawScore = Number.isFinite(displayPercent) ? displayPercent : (Number.isFinite(overallScore) ? overallScore : 0);
 const clampedScore = Math.min(100, Math.max(0, rawScore));
 const strokeOffset = Number.isFinite(clampedScore)
   ? Math.max(0, ARC_LENGTH - (ARC_LENGTH * clampedScore) / 100)
   : ARC_LENGTH;

 const statusColor =
 grade === 'Excellent'
 ? 'text-reward bg-amber-500/10 border-amber-500/20'
 : grade === 'Good'
 ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
 : grade === 'Fair'
 ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20'
 : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20';

 const statusLabel =
 grade === 'Excellent'
 ? 'Prime Financial Health'
 : grade === 'Good'
 ? 'Strong Financial Health'
 : grade === 'Fair'
 ? 'Moderate Cushion'
 : 'Requires Attention';

 // 5 Health Pillars configuration
 const pillars = [
 {
 label: 'Savings Rate',
 score: savingsScore,
 max: 25,
 unit: '% monthly saved',
 color: 'bg-emerald-500',
 },
 {
 label: 'Budget Adherence',
 score: budgetScore,
 max: 25,
 unit: 'category discipline',
 color: 'bg-amber-500',
 },
 {
 label: 'Emergency Reserve',
 score: emergencyScore,
 max: 20,
 unit: 'months liquid buffer',
 color: 'bg-sky-500',
 },
 {
 label: 'Debt & Liabilities',
 score: debtScore,
 max: 15,
 unit: 'net peer IOUs',
 color: 'bg-indigo-500',
 },
 {
 label: 'Logging Consistency',
 score: consistencyScore,
 max: 15,
 unit: 'daily active streak',
 color: 'bg-reward-fill',
 },
 ];

 return (
 <div className="relative overflow-hidden rounded-2xl bg-surface border border-line p-4 sm:p-7 shadow-xs">
 {/* Top hairline */}
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />

 {/* Header */}
 <div className="flex items-center justify-between gap-4 mb-4">
 <div>
 <div className="flex items-center gap-2 mb-1.5">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-reward border border-amber-500/20">
 <ShieldCheck className="w-3 h-3" /> Financial Pulse
 </span>
 <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${statusColor}`}>
 Grade {grade}
 </span>
 </div>
 <h3 className="text-lg sm:text-xl font-bold text-ink-1 tracking-tight">
 Financial Health Index
 </h3>
 <p className="text-xs text-ink-3">
 Real-time deterministic score calculated across 5 fiscal pillars
 </p>
 </div>

 <button
 onClick={() => setCurrentView('badges')}
 className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-reward dark:text-reward hover:underline"
 >
 <span>Vault ({unlockedCount}/{badges.length})</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>

 {/* Gauge and Center Visual */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
 <div className="lg:col-span-5 flex flex-col items-center justify-center">
 <div className="relative w-56 h-36 flex items-center justify-center">
 <svg viewBox="0 0 240 140" className="w-full h-full overflow-visible">
 <defs>
 <linearGradient id="healthGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
 <stop offset="0%" stopColor="#F43F5E" />
 <stop offset="35%" stopColor="#F59E0B" />
 <stop offset="70%" stopColor="#10B981" />
 <stop offset="100%" stopColor="#F5B742" />
 </linearGradient>
 </defs>

 {/* Background Track Arc */}
 <path
 d="M 35 120 A 85 85 0 0 1 205 120"
 fill="none"
 stroke="currentColor"
 strokeWidth="14"
 strokeLinecap="round"
 className="text-sunken"
 />

 {/* Active Metric Gradient Arc */}
 <path
 d="M 35 120 A 85 85 0 0 1 205 120"
 fill="none"
 stroke="url(#healthGaugeGrad)"
 strokeWidth="14"
 strokeLinecap="round"
 strokeDasharray={ARC_LENGTH}
 strokeDashoffset={strokeOffset}
 opacity={clampedScore > 0 ? 1 : 0}
 />

 {/* Glowing Endpoint Indicator Bead on the Arc Track */}
 {(() => {
 const safeFraction = Number.isFinite(clampedScore) ? clampedScore / 100 : 0;
 const rad = Math.PI * (1 - safeFraction);
 const indX = Number.isFinite(120 + 85 * Math.cos(rad)) ? Number((120 + 85 * Math.cos(rad)).toFixed(2)) : 35;
 const indY = Number.isFinite(120 - 85 * Math.sin(rad)) ? Number((120 - 85 * Math.sin(rad)).toFixed(2)) : 120;
 return (
 <g transform={`translate(${indX}, ${indY})`}>
 <circle
 cx="0"
 cy="0"
 r="8"
 className="fill-surface stroke-reward"
 strokeWidth="2.5"
 />
 <circle
 cx="0"
 cy="0"
 r="3.5"
 className="fill-reward"
 />
 </g>
 );
 })()}
 </svg>

 {/* Score Number Cleanly Centered Inside Arc Cavity */}
 <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-center pointer-events-none">
 <div className="flex items-baseline gap-1">
 <span className={`font-numeric text-3xl sm:text-4xl font-black ${
 grade === 'Needs Attention'
 ? 'text-rose-700 dark:text-rose-300'
 : grade === 'Fair'
 ? 'text-amber-700 dark:text-amber-300'
 : 'text-ink-1'
 }`}>
 <AnimatedNumber
 value={overallScore}
 format={n => Math.round(n).toString()}
 />
 </span>
 <span className="text-xs font-bold text-ink-3 font-numeric">/100</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 mt-1">
 <span className="text-xs font-bold text-ink-1 dark:text-slate-200">
 {statusLabel}
 </span>
 <div className="flex items-center gap-0.5 text-xs font-semibold text-ink-3">
 {trend === 'up' ? (
 <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
 <TrendingUp className="w-3 h-3 mr-0.5" /> Improving
 </span>
 ) : trend === 'down' ? (
 <span className="text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center font-bold animate-pulse-danger-infinite">
 <TrendingDown className="w-3 h-3 mr-0.5" /> Softening
 </span>
 ) : (
 <span className="flex items-center">
 <Minus className="w-3 h-3 mr-0.5" /> Stable
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Right: 5 Pillar breakdown */}
 <div className="lg:col-span-7 space-y-2.5">
 {pillars.map(pillar => {
 const safePillarScore = Number.isFinite(pillar.score) ? pillar.score : 0;
 const safeMax = Number.isFinite(pillar.max) && pillar.max > 0 ? pillar.max : 1;
 const pct = Math.max(0, Math.min(100, Math.round((safePillarScore / safeMax) * 100)));
 return (
 <div key={pillar.label} className="space-y-1">
 <div className="flex justify-between items-center text-xs">
 <span className="font-medium text-ink-2">
 {pillar.label}
 </span>
 <div className="flex items-center gap-1.5 font-numeric">
 <span className="font-bold text-ink-1">
 {pillar.score}
 </span>
 <span className="text-ink-3">/ {pillar.max}</span>
 <span className="text-xs text-ink-3 font-normal">
 ({pct}%)
 </span>
 </div>
 </div>

 <div
 className="h-1.5 w-full bg-sunken rounded-full overflow-hidden"
 role="progressbar"
 aria-valuenow={pillar.score}
 aria-valuemin={0}
 aria-valuemax={pillar.max}
 aria-label={`${pillar.label} score: ${pillar.score} out of ${pillar.max}`}
 >
 <div
 className={`h-full rounded-full transition-[width] duration-700 ease-out ${pillar.color}`}
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Footer link to Badges & Dynamic Advice */}
 {(() => {
 const isDeclining = trend === 'down' || grade === 'Needs Attention';
 const adviceTip =
 budgetScore < 15
 ? 'Alert: Spending exceeding category limits is weighing down your score. Review your active budget caps.'
 : savingsScore < 12
 ? 'Tip: Monthly savings rate is under pressure. Lowering discretionary spend will boost your score.'
 : debtScore < 10
 ? 'Tip: Outstanding peer split balances are pending. Settle balances to recover points.'
 : consistencyScore < 8
 ? 'Tip: Daily logging momentum slowed down. Record today’s activity to restore consistency.'
 : 'Score softening this week — review recent expenses and budget caps to return to prime grade.';

 return (
 <div className="mt-5 pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center gap-2 text-xs">
 {isDeclining ? (
 <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
 <TrendingDown className="w-4 h-4 shrink-0 text-rose-500" />
 <span>{adviceTip}</span>
 </span>
 ) : (
 <span className="flex items-center gap-2 text-ink-3">
 <Award className="w-4 h-4 shrink-0 text-reward" />
 <span>Keep your savings rate above 20% &amp; maintain category budgets to reach Level 90+ score.</span>
 </span>
 )}
 </div>

 <button
 onClick={() => setCurrentView('badges')}
 className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sunken hover:bg-line text-xs font-semibold text-ink-1 dark:text-slate-200 transition-colors self-start sm:self-auto shrink-0"
 >
 <span>Achievement Vault</span>
 <ArrowRight className="w-3.5 h-3.5" />
 </button>
 </div>
 );
 })()}
 </div>
 );
};
