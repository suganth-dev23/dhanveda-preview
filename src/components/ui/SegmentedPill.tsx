import React from 'react';
import { motion } from 'framer-motion';
import { SPRING_SNAPPY } from '../../lib/motion-tokens';

export interface SegmentedPillOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  title?: string;
}

export interface SegmentedPillProps<T extends string> {
  options: SegmentedPillOption<T>[];
  value: T;
  onChange: (nextValue: T) => void;
  layoutId: string;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

/**
 * Shared-element segmented control powered by Framer Motion `layoutId` and `SPRING_SNAPPY` (~140ms).
 * Implements Gestalt Common Fate & Object Permanence so active tab indicators physically glide
 * across options rather than unmounting and teleporting.
 */
export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = 'sm',
  className = '',
  ariaLabel,
}: SegmentedPillProps<T>) {
  const paddingClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center p-1 rounded-xl bg-sunken border border-line select-none ${className}`}
    >
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={option.title || option.label}
            onClick={() => onChange(option.value)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 ${paddingClasses} rounded-lg font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              isActive
                ? 'text-ink-1 dark:text-ink-1'
                : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING_SNAPPY}
                className="absolute inset-0 -z-10 rounded-lg bg-surface dark:bg-line shadow-xs border border-line/60"
              />
            )}
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`font-numeric tabular-nums text-[11px] font-bold px-1.5 py-0.2 rounded-md ${
                  isActive
                    ? 'bg-primary-tint text-primary'
                    : 'bg-line/70 text-ink-3'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
