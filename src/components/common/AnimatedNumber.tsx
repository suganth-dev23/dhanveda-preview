import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import { useNumberPop } from '../../hooks/useNumberPop';
import { formatINR } from '../../utils/currency';
import { roundINR } from '../../utils/math';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  formatter?: (n: number) => string;
  prefix?: string;
  className?: string;
  showDirection?: boolean;
  animateOnMount?: boolean;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 450,
  format,
  formatter,
  prefix = '',
  className = '',
  showDirection = false,
  animateOnMount = false,
}) => {
  const formatFn = format || formatter || formatINR;
  const animated = useCountUp(value, { duration, animateOnMount });
  const { popClass, direction } = useNumberPop(value);

  const directionClass =
    showDirection && direction
      ? direction === 'up'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-rose-600 dark:text-rose-400'
      : '';

  return (
    <span
      data-money="true"
      className={`font-numeric tabular-nums transition-colors duration-300 ${directionClass} ${popClass} ${className}`}
    >
      {prefix}
      {formatFn(roundINR(animated))}
    </span>
  );
};
