import React, { useState, useCallback } from 'react';
import { Plus, PieChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFinance } from '../../context/FinanceContext';
import { Budget, BudgetCategoryItem } from '../../types/finance';
import { BudgetModal } from './BudgetModal';
import { Button, Card, Stat } from '../ui';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { useBudgetCategoriesSelector } from '../../hooks/useFinanceData';
import { BudgetByCategory } from '../budget/BudgetByCategory';
import { RebalanceBudgetModal } from '../budget/RebalanceBudgetModal';
import { CashFlowChart } from '../dashboard/CashFlowChart';
import { SPRING_FLUID, SPRING_BOUNCY } from '../../lib/motion-tokens';
import { useToast } from '../../context/ToastContext';

function getMonthPacingBaseline(): { currentDay: number; totalDays: number; daysPassed: number } {
  const now = new Date();
  const currentDay = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    currentDay,
    totalDays,
    daysPassed: Math.max(1, currentDay),
  };
}

export const BudgetsView: React.FC = () => {
  const {
    budgets,
    deleteBudget,
    setBudgetForCategory,
  } = useFinance();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [rebalanceTarget, setRebalanceTarget] = useState<BudgetCategoryItem | null>(null);
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  const [{ currentDay, totalDays, daysPassed }] = useState(getMonthPacingBaseline);

  const { allItems, summary } = useBudgetCategoriesSelector('all', 'utilization');

  const {
    totalAllocated,
    totalSpent,
    netVariance,
    aggregateMetrics,
  } = summary;

  const isOverTotal = netVariance < 0;
  const projectedTotalSpend = Math.round((totalSpent / daysPassed) * totalDays);
  const isPacingFast =
    !isOverTotal &&
    totalAllocated > 0 &&
    projectedTotalSpend > totalAllocated &&
    daysPassed >= 3;

  const handleEditItem = useCallback(
    (item: BudgetCategoryItem) => {
      const found = budgets.find(
        b => b.id === item.id || b.category.toLowerCase() === item.name.toLowerCase()
      );
      if (found) {
        setSelectedBudget(found);
        setIsModalOpen(true);
      }
    },
    [budgets]
  );

  const handleDeleteItem = useCallback(
    (item: BudgetCategoryItem) => {
      deleteBudget(item.id);
      if (highlightedCategory === item.name) {
        setHighlightedCategory(null);
      }
      showToast('info', `Removed budget limit for ${item.name}`);
    },
    [deleteBudget, highlightedCategory, showToast]
  );

  const handleOpenAdd = useCallback(() => {
    setSelectedBudget(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenRebalance = useCallback((item: BudgetCategoryItem) => {
    setRebalanceTarget(item);
  }, []);

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
          `Updated ${targetCategoryName} and ${donorCategoryName} limits.`
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hero Overview: Mineral Card with Gold Budget Highlight */}
      <Card variant="hero" padding="none" className="rounded-2xl p-4 sm:p-8">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <PieChart className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-ink-3">
                Monthly Budget Status
              </span>
            </div>
            <p className="text-xs text-ink-3 mb-1">
              {isOverTotal ? 'Total Overrun Deficit' : 'Remaining Spend Allocation'}
            </p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-black font-numeric tabular-nums tracking-tight text-ink-1">
                <AnimatedCurrency value={Math.abs(netVariance)} />
              </h2>
              <span
                className="text-sm font-semibold"
                style={{ color: aggregateMetrics.statusColor }}
              >
                {isOverTotal ? 'over budget' : 'remaining'}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-3 font-numeric tabular-nums">
              <span className="font-semibold text-ink-1">
                {aggregateMetrics.displayPercent}%
              </span>{' '}
              utilized of <AnimatedCurrency value={totalAllocated} className="font-semibold text-ink-2" /> monthly limit ·{' '}
              <span className="font-semibold text-ink-1">{allItems.length}</span> active category limits
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleOpenAdd}
              leftIcon={<Plus className="h-4 w-4 stroke-[2.5]" />}
            >
              Set New Budget
            </Button>
          </div>
        </div>

        {/* GPU-Composited Master Progress Bar with Split-Track Overrun Support */}
        <div className="mt-6 pt-5 border-t border-line">
          <div className="flex justify-between items-center text-xs text-ink-3 mb-2 font-medium font-numeric tabular-nums">
            <span>
              Spent: <AnimatedCurrency value={totalSpent} className="font-bold text-ink-1" />
            </span>
            <span>
              Limit: <AnimatedCurrency value={totalAllocated} className="font-bold text-ink-1" />
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={aggregateMetrics.displayPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall monthly budget utilization"
            className="relative h-3 w-full overflow-hidden rounded-full bg-sunken contain-paint"
          >
            {!aggregateMetrics.isOverBudget ? (
              <motion.div
                className="h-full w-full rounded-full will-change-transform"
                style={{ originX: 0, backgroundColor: aggregateMetrics.statusColor }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: aggregateMetrics.clampedRatio }}
                transition={SPRING_FLUID}
              />
            ) : (
              <div className="flex h-full w-full items-center">
                <div
                  className="h-full overflow-hidden"
                  style={{ flexGrow: aggregateMetrics.baseSplitRatio, flexBasis: 0 }}
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
                  title="Original 100% Budget Limit"
                />
                <div
                  className="h-full overflow-hidden"
                  style={{ flexGrow: aggregateMetrics.overrunSplitRatio, flexBasis: 0 }}
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
        </div>

        {/* 4-column summary strip */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-line">
          <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
            <Stat
              label="Total Allowed"
              value={<AnimatedCurrency value={totalAllocated} compact className="text-lg sm:text-xl font-extrabold text-ink-1" />}
            />
          </Card>
          <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
            <Stat
              label="Actual Spent"
              value={<AnimatedCurrency value={totalSpent} compact className="text-lg sm:text-xl font-extrabold text-ink-1" />}
            />
          </Card>
          <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
            <Stat
              label="Active Caps"
              value={<span className="font-numeric tabular-nums">{allItems.length}</span>}
            />
          </Card>
          <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
            <Stat
              label="Velocity Status"
              value={
                <span
                  className="text-sm sm:text-lg font-bold font-numeric tabular-nums"
                  style={{ color: aggregateMetrics.statusColor }}
                >
                  {isOverTotal
                    ? 'Over Budget'
                    : isPacingFast
                    ? 'Pacing Over'
                    : aggregateMetrics.isNearLimit
                    ? 'Near Ceiling'
                    : 'Safe Velocity'}
                </span>
              }
              sub={
                <span className="text-xs text-ink-3 font-numeric tabular-nums">
                  Day {currentDay}/{totalDays} · Proj: <AnimatedCurrency value={projectedTotalSpend} compact />
                </span>
              }
            />
          </Card>
        </div>
      </Card>

      {/* Cross-Highlighted Cashflow Trajectory when a category is selected */}
      {highlightedCategory && (
        <CashFlowChart
          selectedCategory={highlightedCategory}
          onClearCategory={() => setHighlightedCategory(null)}
        />
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink-1 tracking-tight">
            Budget by Category
          </h3>
          <p className="text-xs text-ink-3">
            GPU-accelerated category limits, split-track overrun indicators, and one-click surplus rebalancing
          </p>
        </div>
      </div>

      {/* Category Budgets Module with LayoutGroup & AnimatePresence */}
      <BudgetByCategory
        selectedCategory={highlightedCategory}
        onSelectCategory={setHighlightedCategory}
        onEditCategoryBudget={handleEditItem}
        onDeleteCategoryBudget={handleDeleteItem}
        onRebalanceCategory={handleOpenRebalance}
        onOpenAddBudget={handleOpenAdd}
        daysPassed={daysPassed}
        totalDays={totalDays}
        layout="grid"
      />

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialBudget={selectedBudget}
      />

      <RebalanceBudgetModal
        isOpen={Boolean(rebalanceTarget)}
        onClose={() => setRebalanceTarget(null)}
        targetCategory={rebalanceTarget}
        allCategories={allItems}
        onApplyRebalance={handleApplyRebalance}
      />
    </div>
  );
};
