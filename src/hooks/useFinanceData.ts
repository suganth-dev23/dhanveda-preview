import { useMemo } from 'react';
import { useFinance, useFinanceData as useContextFinanceData } from '../context/FinanceContext';
import {
  BudgetCategoryItem,
  BudgetFilterMode,
  BudgetSortOrder,
  CashflowPoint,
  TimeframeWindow,
} from '../types/finance';
import {
  buildCashflowSeries,
  computeAggregateBudgetSummary,
  computeBudgetMetrics,
  roundINR,
} from '../utils/math';

export { useContextFinanceData as useFinanceData };

/**
 * Memoized time-series selector for the Cashflow Trajectory Chart.
 * Produces deterministic YYYY-MM `id` keys for Recharts point matching (CF-02),
 * integer-rounded inflows/outflows/netCashflow (including negative J-curve values, CF-04),
 * and optional cross-highlighted category outflow series.
 */
export function useCashflowTrajectorySelector(
  timeframe: TimeframeWindow = '6M',
  selectedCategory: string | null = null
) {
  const { transactions, isInitialized } = useFinance();

  const series = useMemo<CashflowPoint[]>(
    () => buildCashflowSeries(transactions, timeframe, selectedCategory),
    [transactions, timeframe, selectedCategory]
  );

  const hasActivity = useMemo(
    () => series.some(point => point.inflow > 0 || point.outflow > 0),
    [series]
  );

  const summary = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    for (const pt of series) {
      totalInflow += pt.inflow;
      totalOutflow += pt.outflow;
    }
    const netTotal = totalInflow - totalOutflow;
    return {
      totalInflow: roundINR(totalInflow),
      totalOutflow: roundINR(totalOutflow),
      netTotal: roundINR(netTotal),
    };
  }, [series]);

  return {
    series,
    hasActivity,
    isInitialized,
    summary,
  };
}

/**
 * Memoized selector for Budget by Category items, supporting zero-allocation guards,
 * filtering (All / Over Budget / Near Limit / Healthy), and stable sorting without inline JSX array mutation.
 */
export function useBudgetCategoriesSelector(
  filter: BudgetFilterMode = 'all',
  sortBy: BudgetSortOrder = 'utilization'
) {
  const { budgets, categories, categorySpendingThisMonth } = useFinance();

  const rawItems = useMemo<BudgetCategoryItem[]>(() => {
    const safeBudgets = Array.isArray(budgets) ? budgets : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeSpending = Array.isArray(categorySpendingThisMonth) ? categorySpendingThisMonth : [];

    const catLookup = new Map(safeCategories.map(c => [c.name.toLowerCase(), c]));
    const spendLookup = new Map(safeSpending.map(c => [c.category.toLowerCase(), roundINR(c.spent)]));

    return safeBudgets.map(b => {
      const key = b.category.toLowerCase();
      const catMeta = catLookup.get(key);
      const spent = spendLookup.get(key) ?? 0;

      return {
        id: b.id || `cat-${key}`,
        name: b.category,
        allocated: roundINR(b.monthlyLimit),
        spent,
        icon: catMeta?.icon || 'Tag',
        color: catMeta?.color || '#10b981',
      };
    });
  }, [budgets, categories, categorySpendingThisMonth]);

  const aggregateSummary = useMemo(
    () => computeAggregateBudgetSummary(rawItems),
    [rawItems]
  );

  const filteredAndSortedItems = useMemo<BudgetCategoryItem[]>(() => {
    const filtered = rawItems.filter(item => {
      if (filter === 'all') return true;
      const m = computeBudgetMetrics(item.allocated, item.spent);
      if (filter === 'over') return m.isOverBudget;
      if (filter === 'warning') return m.isNearLimit;
      if (filter === 'healthy') return !m.isOverBudget && !m.isNearLimit;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const mA = computeBudgetMetrics(a.allocated, a.spent);
      const mB = computeBudgetMetrics(b.allocated, b.spent);

      if (sortBy === 'utilization') {
        if (mB.utilizationRatio !== mA.utilizationRatio) {
          return mB.utilizationRatio - mA.utilizationRatio;
        }
        return b.spent - a.spent;
      }
      if (sortBy === 'spent') {
        return b.spent - a.spent;
      }
      if (sortBy === 'allocated') {
        return b.allocated - a.allocated;
      }
      return a.name.localeCompare(b.name);
    });
  }, [rawItems, filter, sortBy]);

  return {
    allItems: rawItems,
    items: filteredAndSortedItems,
    summary: aggregateSummary,
  };
}
