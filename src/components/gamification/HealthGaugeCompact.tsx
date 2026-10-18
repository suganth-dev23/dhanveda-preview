import React from 'react';
import { ShieldCheck, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { useGamification } from '../../context/GamificationContext';
import { useFinance } from '../../context/FinanceContext';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress';

export const HealthGaugeCompact: React.FC = () => {
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

  const { displayPercent, isAnimating } = useAnimatedProgress(overallScore, { animateOnMount: true });
  const rawScore = Number.isFinite(displayPercent) ? displayPercent : (Number.isFinite(overallScore) ? overallScore : 0);
  const clampedScore = Math.min(100, Math.max(0, rawScore));

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const statusColor =
    grade === 'Excellent'
      ? 'text-reward bg-amber-500/10 border-amber-500/20'
      : grade === 'Good'
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : grade === 'Fair'
      ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';

  const pillars = [
    { label: 'Savings', score: savingsScore, max: 25, color: 'bg-emerald-500' },
    { label: 'Budget', score: budgetScore, max: 25, color: 'bg-amber-500' },
    { label: 'Reserve', score: emergencyScore, max: 20, color: 'bg-sky-500' },
    { label: 'Debt', score: debtScore, max: 15, color: 'bg-indigo-500' },
    { label: 'Streak', score: consistencyScore, max: 15, color: 'bg-reward-fill' },
  ];

  return (
    <button
      type="button"
      aria-label={`Financial Health Score: ${Math.round(overallScore)} out of 100, Grade ${grade}. Tap to view badges.`}
      onClick={() => setCurrentView('badges')}
      className="group lift press w-full text-left relative overflow-hidden rounded-2xl bg-surface border border-line p-3.5 shadow-xs cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-reward/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Gold hairline */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />

      {/* Row 1: Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-reward border border-amber-500/20 shrink-0">
            <ShieldCheck className="w-2.5 h-2.5" /> Pulse
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold border shrink-0 ${statusColor}`}>
            {grade}
          </span>
        </div>
        <span className="flex items-center gap-0.5 text-xs font-semibold text-ink-3 shrink-0">
          Vault ({unlockedCount ?? 0}/{(badges?.length ?? 0)})
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      {/* Row 2: Horizontal Score Bar + Number + Trend */}
      <div className="flex items-center gap-3 mb-3">
        {/* Horizontal gradient bar matching HealthGauge gold terminus */}
        <div
          className="flex-1 h-2.5 bg-sunken rounded-full overflow-hidden relative"
          role="progressbar"
          aria-valuenow={Math.round(overallScore)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall financial health score"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 via-emerald-500 to-reward-fill transition-[width] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden shadow-[0_0_8px_rgba(245,183,66,0.35)]"
            style={{ width: isMounted ? `${clampedScore}%` : '0%' }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-full" />
            {isAnimating && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer pointer-events-none" />
            )}
          </div>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span className="font-numeric text-xl font-black text-ink-1">
            <AnimatedNumber value={overallScore} format={n => Math.round(n).toString()} />
          </span>
          <span className="text-xs font-bold text-ink-3 font-numeric">/100</span>
        </div>
        {/* Trend indicator */}
        <div
          className="shrink-0"
          title={`Trend: ${trend === 'up' ? 'Improving' : trend === 'down' ? 'Softening' : 'Stable'}`}
        >
          {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" aria-label="Improving" />}
          {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-500 animate-pulse-danger-infinite" aria-label="Softening" />}
          {trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-ink-3" aria-label="Stable" />}
        </div>
      </div>

      {/* Row 3: Compact 5-Pillar Mini-Bars */}
      <div className="space-y-1.5">
        {pillars.map((p, idx) => {
          const safeScore = Number.isFinite(p.score) ? p.score : 0;
          const safeMax = Number.isFinite(p.max) && p.max > 0 ? p.max : 1;
          const pct = Math.max(0, Math.min(100, Math.round((safeScore / safeMax) * 100)));
          return (
            <div key={p.label} className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-3 w-12 shrink-0 truncate">
                {p.label}
              </span>
              <div
                className="flex-1 h-1 bg-sunken rounded-full overflow-hidden relative"
                role="progressbar"
                aria-valuenow={safeScore}
                aria-valuemin={0}
                aria-valuemax={safeMax}
                aria-label={`${p.label} score: ${safeScore} out of ${safeMax}`}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width] relative overflow-hidden ${p.color}`}
                  style={{
                    width: isMounted ? `${pct}%` : '0%',
                    transitionDelay: `${idx * 40}ms`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-full" />
                </div>
              </div>
              <span className="text-xs font-numeric font-bold text-ink-2 w-8 text-right shrink-0">
                {safeScore}/{safeMax}
              </span>
            </div>
          );
        })}
      </div>
    </button>
  );
};
