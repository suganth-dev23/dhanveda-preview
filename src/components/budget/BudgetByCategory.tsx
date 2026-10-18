import React, { useState, useMemo } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowUpDown, PieChart, X } from 'lucide-react';
import {
  BudgetCategoryItem,
  BudgetFilterMode,
  BudgetSortOrder,
} from '../../types/finance';
import { useBudgetCategoriesSelector } from '../../hooks/useFinanceData';
import { SPRING_FLUID } from '../../lib/motion-tokens';
import { SegmentedPill, SegmentedPillOption } from '../ui/SegmentedPill';
import { BudgetCategoryRow } from './BudgetCategoryRow';
import { EmptyState } from '../common/EmptyState';

export interface BudgetByCategoryProps {
  selectedCategory?: string | null;
  onSelectCategory?: (categoryName: string | null) => void;
  onEditCategoryBudget?: (item: BudgetCategoryItem) => void;
  onDeleteCategoryBudget?: (item: BudgetCategoryItem) => void;
  onRebalanceCategory?: (item: BudgetCategoryItem, overrunAmount: number) => void;
  onOpenAddBudget?: () => void;
  daysPassed?: number;
  totalDays?: number;
  layout?: 'grid' | 'list';
}

const SORT_OPTIONS: { value: BudgetSortOrder; label: string }[] = [
  { value: 'utilization', label: 'Sort: Utilization %' },
  { value: 'spent', label: 'Sort: Highest Spend' },
  { value: 'allocated', label: 'Sort: Budget Limit' },
  { value: 'name', label: 'Sort: A–Z' },
];

/**
 * Complete Budget by Category module with Framer Motion `<LayoutGroup>` and `<AnimatePresence mode="popLayout">`
 * resolving instantaneous row teleportation on sort/filter (defect BC-04).
 */
export const BudgetByCategory: React.FC<BudgetByCategoryProps> = React.memo(
  ({
    selectedCategory = null,
    onSelectCategory,
    onEditCategoryBudget,
    onDeleteCategoryBudget,
    onRebalanceCategory,
    onOpenAddBudget,
    daysPassed = 1,
    totalDays = 30,
    layout = 'grid',
  }) => {
    const [filter, setFilter] = useState<BudgetFilterMode>('all');
    const [sortBy, setSortBy] = useState<BudgetSortOrder>('utilization');

    const { allItems, items, summary } = useBudgetCategoriesSelector(filter, sortBy);

    const filterOptions = useMemo<SegmentedPillOption<BudgetFilterMode>[]>(
      () => [
        { value: 'all', label: 'All', badge: allItems.length },
        { value: 'over', label: 'Over Budget', badge: summary.overBudgetCount },
        { value: 'warning', label: 'Near Ceiling', badge: summary.nearLimitCount },
        { value: 'healthy', label: 'On Track', badge: summary.healthyCount },
      ],
      [allItems.length, summary.overBudgetCount, summary.nearLimitCount, summary.healthyCount]
    );

    const handleRowSelect = (categoryName: string) => {
      if (!onSelectCategory) return;
      if (selectedCategory === categoryName) {
        onSelectCategory(null);
      } else {
        onSelectCategory(categoryName);
      }
    };

    if (allItems.length === 0) {
      return (
        <EmptyState
          icon={PieChart}
          title="No category budgets defined"
          description="Set spending caps for categories like Dining, Groceries, Shopping or Fuel to stay in total control."
          actionLabel="Create Your First Budget"
          onAction={onOpenAddBudget}
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Filter Pills & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <SegmentedPill
              options={filterOptions}
              value={filter}
              onChange={setFilter}
              layoutId="budget-category-filter-pill"
              ariaLabel="Filter budget categories"
            />
            {selectedCategory && (
              <button
                type="button"
                onClick={() => onSelectCategory?.(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary-tint text-primary text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Highlighting: {selectedCategory}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-ink-3" />
            <select
              aria-label="Sort budget categories"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as BudgetSortOrder)}
              className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-1 focus:border-primary cursor-pointer"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtered Empty State */}
        {items.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-line bg-sunken/40 text-center space-y-2">
            <p className="text-sm font-semibold text-ink-1">
              No categories match this filter
            </p>
            <p className="text-xs text-ink-3">
              Try switching back to All categories to view your active limits.
            </p>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Show all {allItems.length} categories →
            </button>
          </div>
        ) : (
          <LayoutGroup id={`budget-category-group-${layout}`}>
            <motion.div
              layout
              transition={SPRING_FLUID}
              className={
                layout === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5'
                  : 'space-y-3'
              }
            >
              <AnimatePresence mode="popLayout">
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={SPRING_FLUID}
                  >
                    <BudgetCategoryRow
                      item={item}
                      isSelected={selectedCategory === item.name}
                      daysPassed={daysPassed}
                      totalDays={totalDays}
                      onSelectCategory={onSelectCategory ? handleRowSelect : undefined}
                      onRebalance={onRebalanceCategory}
                      onEdit={onEditCategoryBudget}
                      onDelete={onDeleteCategoryBudget}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        )}
      </div>
    );
  }
);

BudgetByCategory.displayName = 'BudgetByCategory';
