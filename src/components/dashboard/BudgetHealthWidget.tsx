import React, { useState, useCallback } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { BudgetCategoryItem } from '../../types/finance';
import { useBudgetCategoriesSelector } from '../../hooks/useFinanceData';
import { BudgetCategoryRow } from '../budget/BudgetCategoryRow';
import { RebalanceBudgetModal } from '../budget/RebalanceBudgetModal';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { useToast } from '../../context/ToastContext';

export interface BudgetHealthWidgetProps {
  selectedCategory?: string | null;
  onSelectCategory?: (categoryName: string | null) => void;
}

export const BudgetHealthWidget: React.FC<BudgetHealthWidgetProps> = React.memo(
  ({ selectedCategory = null, onSelectCategory }) => {
    const { setCurrentView, setBudgetForCategory } = useFinance();
    const { showToast } = useToast();
    const { allItems, items, summary } = useBudgetCategoriesSelector('all', 'utilization');
    const [rebalanceTarget, setRebalanceTarget] = useState<BudgetCategoryItem | null>(null);

    const topItems = items.slice(0, 4);

    const handleToggleCategory = useCallback(
      (catName: string) => {
        if (!onSelectCategory) return;
        onSelectCategory(selectedCategory === catName ? null : catName);
      },
      [onSelectCategory, selectedCategory]
    );

    const handleApplyRebalance = useCallback(
      (
        targetCategoryName: string,
        newTargetLimit: number,
        donorCategoryName?: string,
        newDonorLimit?: number
      ) => {
        setBudgetForCategory(targetCategoryName, newTargetLimit);
        if (donorCategoryName && typeof newDonorLimit === 'number') {
          setBudgetForCategory(donorCategoryName, newDonorLimit);
          showToast(
            'success',
            'Budget rebalanced from surplus',
            `Transferred surplus from ${donorCategoryName} to ${targetCategoryName}.`
          );
        } else {
          showToast(
            'success',
            'Budget ceiling updated',
            `Raised ${targetCategoryName} monthly limit.`
          );
        }
      },
      [setBudgetForCategory, showToast]
    );

    return (
      <div className="bg-surface rounded-2xl p-4 sm:p-6 shadow-xs border border-line flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-ink-1">
                Budget by category
              </h3>
              <p className="text-xs text-ink-3">
                {allItems.length} categories budgeted · Click row to filter chart
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentView('budgets')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 min-h-[44px] cursor-pointer"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Perceptual Status Summary Banner */}
          {allItems.length > 0 && (
            summary.overBudgetCount > 0 ? (
              <div className="mb-4 p-3 bg-[#D93025]/10 border border-[#D93025]/30 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#D93025] shrink-0 mt-0.5" />
                <div className="text-xs text-[#D93025]">
                  <span className="font-semibold">
                    {summary.overBudgetCount}{' '}
                    {summary.overBudgetCount === 1 ? 'category' : 'categories'} over limit
                  </span>{' '}
                  · Click rebalance to cover from surplus
                </div>
              </div>
            ) : summary.nearLimitCount > 0 ? (
              <div className="mb-4 p-3 bg-[#FA903E]/10 border border-[#FA903E]/30 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FA903E] shrink-0 mt-0.5" />
                <div className="text-xs text-[#FA903E]">
                  <span className="font-semibold">
                    {summary.nearLimitCount}{' '}
                    {summary.nearLimitCount === 1 ? 'category' : 'categories'} approaching ceiling
                  </span>{' '}
                  (75%–99% utilized)
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-[#81C995]/15 border border-[#81C995]/30 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#81C995]" />
                <span className="text-xs font-medium text-[#0B7A55] dark:text-[#81C995]">
                  All categories within healthy limits
                </span>
              </div>
            )
          )}

          {/* Budget Category Rows */}
          {allItems.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-ink-3 mb-2">
                No category budgets established yet.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('budgets')}
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center min-h-[44px] cursor-pointer"
              >
                Set category limits →
              </button>
            </div>
          ) : (
            <LayoutGroup id="dashboard-budget-watchlist">
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {topItems.map(cat => (
                    <BudgetCategoryRow
                      key={cat.id}
                      item={cat}
                      compact
                      isSelected={selectedCategory === cat.name}
                      onSelectCategory={onSelectCategory ? handleToggleCategory : undefined}
                      onRebalance={item => setRebalanceTarget(item)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>
          )}
        </div>

        {summary.totalAllocated > 0 && (
          <div className="pt-3.5 mt-4 border-t border-line flex items-center justify-between text-xs font-numeric tabular-nums">
            <span className="text-ink-3">Monthly budget total</span>
            <span className="font-semibold text-ink-1 inline-flex items-center gap-1">
              <AnimatedCurrency value={summary.totalSpent} />
              <span className="text-ink-3 font-normal">/</span>
              <AnimatedCurrency value={summary.totalAllocated} />
              <span className="text-ink-3 font-normal">
                ({summary.aggregateMetrics.displayPercent}%)
              </span>
            </span>
          </div>
        )}

        <RebalanceBudgetModal
          isOpen={Boolean(rebalanceTarget)}
          onClose={() => setRebalanceTarget(null)}
          targetCategory={rebalanceTarget}
          allCategories={allItems}
          onApplyRebalance={handleApplyRebalance}
        />
      </div>
    );
  }
);

BudgetHealthWidget.displayName = 'BudgetHealthWidget';
