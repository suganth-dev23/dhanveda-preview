import React from 'react';
import { formatINR } from '../../utils/currency';
import { roundINR } from '../../utils/math';

export interface AnimatedCurrencyProps {
  value: number;
  className?: string;
  compact?: boolean;
  sign?: 'auto' | 'always' | 'never';
}

function formatSignedINR(
  rounded: number,
  compact: boolean,
  sign: 'auto' | 'always' | 'never'
): string {
  const absFormatted = formatINR(Math.abs(rounded), { compact, showSymbol: true });
  if (sign === 'never' || rounded === 0) return absFormatted;
  if (sign === 'always') {
    return rounded > 0 ? `+${absFormatted}` : `-${absFormatted}`;
  }
  return rounded < 0 ? `-${absFormatted}` : absFormatted;
}

/**
 * Lightweight INR (₹) currency display with tabular-nums and integer rounding.
 * Replaced spring-driven odometer with direct rendering for zero main-thread overhead.
 */
export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = React.memo(
  ({ value, className = '', compact = false, sign = 'auto' }) => {
    const display = formatSignedINR(roundINR(value), compact, sign);
    return (
      <span
        data-money="true"
        className={`font-numeric tabular-nums tracking-tight inline-block ${className}`}
      >
        {display}
      </span>
    );
  }
);

AnimatedCurrency.displayName = 'AnimatedCurrency';
