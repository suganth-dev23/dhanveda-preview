import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Trash2, ArrowRightLeft } from 'lucide-react';
import { BudgetCategoryItem } from '../../types/finance';
import { computeBudgetMetrics } from '../../utils/math';
import { SPRING_FLUID, SPRING_BOUNCY } from '../../lib/motion-tokens';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { IconRenderer } from '../common/IconRenderer';

export interface BudgetCategoryRowProps {
  item: BudgetCategoryItem;
  isSelected?: boolean;
  compact?: boolean;
  daysPassed?: number;
  totalDays?: number;
  onSelectCategory?: (categoryName: string) => void;
  onRebalance?: (item: BudgetCategoryItem, overrunAmount: number) => void;
  onEdit?: (item: BudgetCategoryItem) => void;
  onDelete?: (item: BudgetCategoryItem) => void;
}

/**
 * Tactile, GPU-composited Budget Category Row resolving defects BC-01 through BC-05:
 * - BC-01: Progress fills animate strictly via GPU `scaleX` with `originX: 0` (never CSS `width`).
 * - BC-02: Over-budget states render a Split-Track Overrun bar strictly inside the 100% track.
 * - BC-03: Zero-allocation guard via `computeBudgetMetrics` prevents `NaN%` / `Infinity%`.
 * - BC-04: `layout="position"` enables smooth FLIP reordering inside `<LayoutGroup>`.
 * - BC-05: Uses integer-rounded `<AnimatedCurrency />` with `tabular-nums`.
 */
export const BudgetCategoryRow: React.FC<BudgetCategoryRowProps> = React.memo(
  ({
    item,
    isSelected = false,
    compact = false,
    daysPassed = 1,
    totalDays = 30,
    onSelectCategory,
    onRebalance,
    onEdit,
    onDelete,
  }) => {
    const metrics = useMemo(
      () => computeBudgetMetrics(item.allocated, item.spent),
      [item.allocated, item.spent]
    );

    const projectedSpend = useMemo(() => {
      const safeDays = Math.max(1, daysPassed);
      return Math.round((item.spent / safeDays) * totalDays);
    }, [item.spent, daysPassed, totalDays]);

    const isPacingFast =
      !metrics.isOverBudget &&
      item.allocated > 0 &&
      projectedSpend > item.allocated &&
      daysPassed >= 3;

    return (
      <motion.div
        layout="position"
        transition={SPRING_FLUID}
        whileHover={{ y: -1.5 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onSelectCategory?.(item.name)}
        className={`group rounded-2xl border bg-surface transition-colors ${
          onSelectCategory ? 'cursor-pointer' : ''
        } ${compact ? 'p-3.5' : 'p-4 sm:p-5'} ${
          isSelected
            ? 'border-primary ring-2 ring-primary/25'
            : metrics.isOverBudget
            ? 'border-[#D93025]/45 hover:border-[#D93025]/80'
            : metrics.isNearLimit
            ? 'border-[#FA903E]/45 hover:border-[#FA903E]/80'
            : 'border-line hover:border-primary/40'
        }`}
      >
        {/* Top Row: Category Identity + Spent / Allocated */}
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {!compact && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${item.color || '#10b981'}1F`,
                  color: item.color || '#10b981',
                }}
              >
                <IconRenderer name={item.icon || 'Tag'} className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-ink-1 truncate">
                  {item.name}
                </span>
                <span className="text-xs text-ink-3" aria-hidden="true">
                  ·
                </span>
                <span
                  className="font-numeric tabular-nums text-xs font-bold"
                  style={{ color: metrics.statusColor }}
                >
                  {metrics.displayPercent}%
                </span>
              </div>
              {!compact && (
                <p className="text-xs text-ink-3 font-numeric tabular-nums mt-0.5">
                  Spent{' '}
                  <AnimatedCurrency
                    value={item.spent}
                    className="font-bold text-ink-1"
                  />{' '}
                  of <AnimatedCurrency value={item.allocated} />
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {compact ? (
              <div className="text-right text-xs text-ink-3 font-numeric tabular-nums">
                <AnimatedCurrency
                  value={item.spent}
                  className="font-bold text-ink-1"
                />
                <span className="mx-1 text-ink-3">/</span>
                <AnimatedCurrency value={item.allocated} />
              </div>
            ) : (
              <>
                {onEdit && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink-3 hover:bg-sunken hover:text-ink-1 transition-colors cursor-pointer"
                    title={`Edit ${item.name} budget`}
                    aria-label={`Edit ${item.name} budget`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink-3 hover:text-negative hover:bg-negative-tint transition-colors cursor-pointer"
                    title={`Remove ${item.name} budget`}
                    aria-label={`Remove ${item.name} budget`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* GPU-Composited Progress Track (Never animates CSS width - fixes BC-01 & BC-02) */}
        <div
          role="progressbar"
          aria-valuenow={metrics.displayPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${item.name} budget utilization`}
          className="relative h-2.5 w-full overflow-hidden rounded-full bg-sunken contain-paint"
        >
          {!metrics.isOverBudget ? (
            <motion.div
              className="h-full w-full rounded-full will-change-transform"
              style={{ originX: 0, backgroundColor: metrics.statusColor }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: metrics.clampedRatio }}
              transition={SPRING_FLUID}
            />
          ) : (
            <div className="flex h-full w-full items-center">
              <div
                className="h-full overflow-hidden"
                style={{ flexGrow: metrics.baseSplitRatio, flexBasis: 0 }}
              >
                <motion.div
                  className="h-full w-full bg-[#1A73E8] will-change-transform"
                  style={{ originX: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={SPRING_FLUID}
                />
              </div>
              <div
                className="z-10 h-full w-0.5 shrink-0 bg-surface"
                title="Original 100% Budget Ceiling"
              />
              <div
                className="h-full overflow-hidden"
                style={{ flexGrow: metrics.overrunSplitRatio, flexBasis: 0 }}
              >
                <motion.div
                  className="h-full w-full bg-[#D93025] will-change-transform"
                  style={{ originX: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={SPRING_BOUNCY}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status & Constructive Rebalance Action */}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-3 font-numeric tabular-nums">
          {metrics.isOverBudget ? (
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <span className="font-semibold text-[#D93025]">
                Over budget by <AnimatedCurrency value={metrics.overrunAmount} />
              </span>
              {onRebalance && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onRebalance(item, metrics.overrunAmount);
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Rebalance surplus</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between w-full gap-2">
              <span>
                <AnimatedCurrency
                  value={metrics.remainingAmount}
                  className="font-semibold text-ink-2"
                />{' '}
                remaining
              </span>
              {isPacingFast ? (
                <span
                  className="font-medium text-[#FA903E]"
                  title={`Projected spend by month-end: ₹${projectedSpend}`}
                >
                  Pacing high · Proj <AnimatedCurrency value={projectedSpend} compact />
                </span>
              ) : metrics.isNearLimit ? (
                <span className="font-medium text-[#FA903E]">Near ceiling</span>
              ) : (
                <span className="font-medium text-[#81C995]">On track</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

BudgetCategoryRow.displayName = 'BudgetCategoryRow';
