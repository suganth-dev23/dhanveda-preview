import React, { useState, useEffect, useRef } from 'react';
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress';

interface ProgressBarProps {
  value: number; // Current value
  max: number; // Max / Target value
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  alertThresholds?: boolean; // Changes color automatically (green < 80%, amber 80-100%, rose > 100%)
  showMilestones?: boolean; // Subtle 25/50/75% notches
  glowOnMilestone?: boolean; // Pulse glow when crossing 50% or 100%
  animateOnMount?: boolean;
  ariaLabel?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  color,
  size = 'md',
  showPercentage = false,
  alertThresholds = false,
  showMilestones = false,
  glowOnMilestone = false,
  animateOnMount = true,
  ariaLabel,
  className = '',
}) => {
  const safeMax = max > 0 ? max : 1;
  const rawPercentage = (value / safeMax) * 100;
  const clampedPercentage = Math.min(Math.max(rawPercentage, 0), 100);
  const { displayPercent, isAnimating } = useAnimatedProgress(clampedPercentage, { animateOnMount });

  const firedMilestones = useRef<Set<number>>(new Set());
  const [glowClass, setGlowClass] = useState('');

  useEffect(() => {
    // Reset milestones when progress drops back below thresholds (Finding 25)
    if (displayPercent < 50) {
      firedMilestones.current.delete(50);
      firedMilestones.current.delete(100);
    } else if (displayPercent < 100) {
      firedMilestones.current.delete(100);
    }

    if (!glowOnMilestone) return;

    if (displayPercent >= 100 && !firedMilestones.current.has(100)) {
      firedMilestones.current.add(100);
      firedMilestones.current.add(50);
      const targetGlow = (alertThresholds && rawPercentage > 100) ? 'animate-pulse-danger' : 'animate-pulse-gold';
      const raf = requestAnimationFrame(() => setGlowClass(targetGlow));
      const timer = setTimeout(() => setGlowClass(''), 1200);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    } else if (displayPercent >= 50 && !firedMilestones.current.has(50)) {
      firedMilestones.current.add(50);
      const raf = requestAnimationFrame(() => setGlowClass('animate-pulse-success'));
      const timer = setTimeout(() => setGlowClass(''), 1000);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    }
  }, [displayPercent, glowOnMilestone, alertThresholds, rawPercentage]);

  // Determine bar color
  let barColorClass = color || 'bg-emerald-500';
  if (alertThresholds) {
    if (rawPercentage > 100) {
      barColorClass = 'bg-rose-500 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:14px_14px]';
    } else if (rawPercentage >= 80) {
      barColorClass = 'bg-primary';
    } else {
      barColorClass = 'bg-emerald-500';
    }
  }

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1 text-ink-2 font-numeric">
          <span>{rawPercentage.toFixed(1)}%</span>
          {rawPercentage > 100 && (
            <span className="text-rose-500 font-bold">Over limit (+{(rawPercentage - 100).toFixed(0)}%)</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clampedPercentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || 'Progress'}
        className={`relative w-full bg-sunken border border-transparent dark:border-line rounded-full overflow-hidden contain-paint ${heightClasses} ${glowClass}`}
      >
        {showMilestones && (
          <div className="absolute inset-0 pointer-events-none z-10 flex">
            <div className="absolute top-0 bottom-0 w-[1px] bg-slate-300/60 dark:bg-slate-700/60" style={{ left: '25%' }} />
            <div className="absolute top-0 bottom-0 w-[1px] bg-slate-300/60 dark:bg-slate-700/60" style={{ left: '50%' }} />
            <div className="absolute top-0 bottom-0 w-[1px] bg-slate-300/60 dark:bg-slate-700/60" style={{ left: '75%' }} />
          </div>
        )}
        {/* Compositor-driven scaleX eliminates per-frame layout recalculation (D.3 / Finding 9) */}
        <div
          className={`${heightClasses} rounded-full ${barColorClass} w-full origin-left will-change-transform relative overflow-hidden ${
            displayPercent > 0
              ? rawPercentage > 100
                ? 'shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                : rawPercentage >= 80
                ? 'shadow-[0_0_10px_rgba(43,79,216,0.35)]'
                : 'shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : ''
          }`}
          style={{
            transform: `scaleX(${displayPercent / 100})`,
            ...(color && !alertThresholds ? { backgroundColor: color } : {}),
          }}
        >
          {/* Luminous sheen across the bar */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

          {/* Shimmer sweep while animating */}
          {isAnimating && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer pointer-events-none" />
          )}
        </div>
      </div>
    </div>
  );
};
