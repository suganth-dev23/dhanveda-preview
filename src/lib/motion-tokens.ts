import type { Transition, Variants } from 'framer-motion';

/**
 * Canonical Spring Physics Token Matrix for DhanVeda
 * Governed by Hooke's Law with viscous damping: F = -kx - cv = m(d^2x/dt^2)
 */

/**
 * ~140ms settling time.
 * Target: Segmented control pills (Bar/Line toggle, Timeframe tabs), checkbox ticks, button tap recovery.
 */
export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.7,
} as const;

/**
 * ~280ms settling time.
 * Target: Budget category progress bar scaleX fills, card layout reordering (layout="position"), modal/drawer expansion.
 */
export const SPRING_FLUID: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
  mass: 0.9,
} as const;

/**
 * ~380ms settling time.
 * Target: Split-track overrun excess indicator, category pill hover elevation, milestone celebrations.
 */
export const SPRING_BOUNCY: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 20,
  mass: 0.8,
} as const;

/**
 * ~450ms settling time.
 * Target: Odometer number counters (useSpring + useTransform), KPI hero balance updates.
 */
export const SPRING_COUNTER = {
  stiffness: 180,
  damping: 26,
  mass: 1.1,
} as const;

/**
 * Global Dashboard Macro-to-Micro Entrance Choreography Variants (Phase 4)
 */
export const STAGGER_CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const STAGGER_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING_FLUID,
  },
};
