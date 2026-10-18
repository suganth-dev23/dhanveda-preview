import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress';

export type ProgressTone = 'auto' | 'positive' | 'warning' | 'negative' | 'primary' | 'reward';

export interface ProgressProps {
  value: number; // 0 to 100+
  max?: number;
  tone?: ProgressTone;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'linear' | 'ring';
  showMilestones?: boolean;
  glow?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  tone = 'auto',
  showIcon = false,
  size = 'md',
  className = '',
  type = 'linear',
  showMilestones = false,
  glow = true,
}) => {
  const safeVal = Number.isFinite(value) ? value : 0;
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const rawPercent = safeMax > 0 ? (safeVal / safeMax) * 100 : 0;
  const percent = Number.isFinite(rawPercent) ? rawPercent : 0;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const { displayPercent, isAnimating } = useAnimatedProgress(clampedPercent, { animateOnMount: true });

  // Auto tone calculation:
  // <80% healthy (positive), 80-100% near (warning), >100% over (negative)
  let resolvedTone: ProgressTone = tone;
  if (tone === 'auto') {
    if (percent > 100) resolvedTone = 'negative';
    else if (percent >= 80) resolvedTone = 'warning';
    else resolvedTone = 'positive';
  }

  const toneBgMap: Record<ProgressTone, string> = {
    positive: 'bg-emerald-500 dark:bg-emerald-400',
    warning: 'bg-amber-500 dark:bg-amber-400',
    negative: 'bg-rose-500 dark:bg-rose-400',
    primary: 'bg-primary',
    reward: 'bg-reward-fill',
    auto: 'bg-emerald-500 dark:bg-emerald-400',
  };

  const toneGlowMap: Record<ProgressTone, string> = {
    positive: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]',
    warning: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]',
    negative: 'shadow-[0_0_10px_rgba(244,63,94,0.4)]',
    primary: 'shadow-[0_0_10px_rgba(43,79,216,0.35)]',
    reward: 'shadow-[0_0_10px_rgba(245,183,66,0.45)]',
    auto: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]',
  };

  const ringStrokeMap: Record<ProgressTone, string> = {
    positive: 'var(--positive)',
    warning: 'var(--warning)',
    negative: 'var(--negative)',
    primary: 'var(--primary)',
    reward: 'var(--reward-fill)',
    auto: 'var(--primary)',
  };

  if (type === 'ring') {
    const dim = size === 'sm' ? 40 : size === 'md' ? 56 : 72;
    const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 5 : 6;
    const radius = (dim - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (displayPercent / 100) * circumference;

    return (
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: dim, height: dim }}
      >
        <svg width={dim} height={dim} className="transform -rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-line opacity-60"
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={radius}
            stroke={ringStrokeMap[resolvedTone]}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {showIcon ? (
            resolvedTone === 'negative' ? (
              <AlertCircle className="w-4 h-4 text-negative" />
            ) : resolvedTone === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-warning" />
            ) : (
              <CheckCircle className="w-4 h-4 text-positive" />
            )
          ) : (
            <span className="text-xs font-bold text-ink-1">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      </div>
    );
  }

  const heightClasses = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-3';

  return (
    <div className={`w-full flex items-center gap-2 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`relative w-full bg-sunken rounded-full overflow-hidden contain-paint ${heightClasses}`}
      >
        {/* Subtle milestone notches */}
        {showMilestones && (
          <div className="absolute inset-0 pointer-events-none z-10 flex">
            <div className="absolute top-0 bottom-0 w-[1px] bg-slate-300/60 dark:bg-slate-700/60" style={{ left: '25%' }} />
            <div className="absolute top-0 bottom-0 w-[1px] bg-slate-300/60 dark:bg-slate-700/60" style={{ left: '50%' }} />
            <div className="absolute top-0 bottom-0 w-[1px] bg-slate-300/60 dark:bg-slate-700/60" style={{ left: '75%' }} />
          </div>
        )}

        {/* GPU-accelerated progress fill */}
        <div
          className={`h-full w-full rounded-full origin-left will-change-transform relative overflow-hidden ${toneBgMap[resolvedTone]} ${
            glow && displayPercent > 0 ? toneGlowMap[resolvedTone] : ''
          }`}
          style={{ transform: `scaleX(${displayPercent / 100})` }}
        >
          {/* Luminous sheen across the bar */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

          {/* Shimmer sweep while animating */}
          {isAnimating && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer pointer-events-none" />
          )}
        </div>
      </div>
      {showIcon && (
        <span className="shrink-0">
          {resolvedTone === 'negative' ? (
            <AlertCircle className="w-4 h-4 text-negative" />
          ) : resolvedTone === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-warning" />
          ) : (
            <CheckCircle className="w-4 h-4 text-positive" />
          )}
        </span>
      )}
    </div>
  );
};
