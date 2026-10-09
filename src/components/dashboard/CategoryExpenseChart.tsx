import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatCompactINR } from '../../utils/currency';
import { formatMonth, getCurrentMonthYear } from '../../utils/date';
import { AnimatedNumber } from '../common/AnimatedNumber';

const PALETTE_FALLBACK = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#F43F5E', // Rose Crimson
  '#0D9488', // Teal
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#64748B', // Slate
];
 
interface CategoryTooltipProps {
  active?: boolean;
  payload?: any[];
  totalExpense?: number;
}

const CategoryTooltip: React.FC<CategoryTooltipProps> = ({ active, payload, totalExpense = 0 }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const pct = totalExpense > 0 ? (data.spent / totalExpense) * 100 : 0;
    return (
      <div className="bg-surface/95 p-3 rounded-xl shadow-xl border border-line text-xs">
        <p className="font-bold text-ink-1 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color || '#3B82F6' }} />
          {data.category}
        </p>
        <p className="font-numeric text-ink-2 font-semibold mt-1" data-money="true">
          {formatINR(data.spent)} ({pct.toFixed(1)}%)
        </p>
        {data.budget > 0 && (
          <p className="font-numeric text-ink-3 text-xs mt-0.5" data-money="true">
            Budget: {formatINR(data.budget)} ({data.percentUsed.toFixed(0)}% used)
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const CategoryExpenseChart: React.FC = () => {
  const {
    transactions,
    categories,
    budgets,
    categorySpendingThisMonth,
    currentMonthExpense,
  } = useFinance();

  const currentMonthKey = useMemo(() => getCurrentMonthYear().key, []);
  const lastMonthKey = useMemo(() => {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);
    monthSet.add(lastMonthKey);

    (transactions || []).forEach(t => {
      if (t.date && /^\d{4}-\d{2}/.test(t.date)) {
        monthSet.add(t.date.substring(0, 7));
      }
    });

    return Array.from(monthSet).sort().reverse();
  }, [currentMonthKey, lastMonthKey, transactions]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);

  // Calculate category spending and total for selectedMonthKey
  const { activeMonthExpense, expenseCategories } = useMemo(() => {
    if (selectedMonthKey === currentMonthKey) {
      const safeSpending = Array.isArray(categorySpendingThisMonth) ? categorySpendingThisMonth : [];
      const safeExpense = Number.isFinite(currentMonthExpense) && currentMonthExpense > 0 ? currentMonthExpense : 0;
      const list = safeSpending.filter(c => Number.isFinite(c.spent) && c.spent > 0);
      return {
        activeMonthExpense: safeExpense,
        expenseCategories: list,
      };
    }

    const monthTxs = (transactions || []).filter(
      t => t.date && t.date.startsWith(selectedMonthKey) && t.type === 'debit'
    );
    const totalExp = monthTxs.reduce(
      (sum, t) => sum + (Number.isFinite(t.amount) ? t.amount : 0),
      0
    );

    const spendMap: Record<string, number> = {};
    monthTxs.forEach(t => {
      spendMap[t.category] = (spendMap[t.category] || 0) + (Number.isFinite(t.amount) ? t.amount : 0);
    });

    const budgetMap = new Map((budgets || []).map(b => [b.category.toLowerCase(), b.monthlyLimit]));
    const categoryInfoMap = new Map((categories || []).map(c => [c.name.toLowerCase(), c]));

    const list = Object.entries(spendMap)
      .map(([categoryName, spent]) => {
        const budget = budgetMap.get(categoryName.toLowerCase()) || 0;
        const catInfo = categoryInfoMap.get(categoryName.toLowerCase());
        const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
        return {
          category: categoryName,
          spent,
          budget,
          percentUsed,
          color: catInfo?.color || '#64748b',
          icon: catInfo?.icon || 'Tag',
        };
      })
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    return {
      activeMonthExpense: totalExp,
      expenseCategories: list,
    };
  }, [
    selectedMonthKey,
    currentMonthKey,
    categorySpendingThisMonth,
    currentMonthExpense,
    transactions,
    budgets,
    categories,
  ]);

  const otherCategories = expenseCategories.slice(5);
  const otherSpent = otherCategories.reduce(
    (sum, c) => sum + (Number.isFinite(c.spent) ? c.spent : 0),
    0
  );
  const otherPct = activeMonthExpense > 0 ? (otherSpent / activeMonthExpense) * 100 : 0;

  // Month-over-Month comparison
  const momComparison = useMemo(() => {
    if (selectedMonthKey !== lastMonthKey) return null;
    const diff = currentMonthExpense - activeMonthExpense;
    const pctDiff = activeMonthExpense > 0 ? (Math.abs(diff) / activeMonthExpense) * 100 : 0;
    return {
      diff,
      pctDiff,
      isLowerThisMonth: diff < 0,
    };
  }, [selectedMonthKey, lastMonthKey, currentMonthExpense, activeMonthExpense]);

  const isCurrentMonth = selectedMonthKey === currentMonthKey;
  const isLastMonth = selectedMonthKey === lastMonthKey;

  const monthLabel = isCurrentMonth
    ? "This month's"
    : isLastMonth
    ? "Last month's"
    : formatMonth(selectedMonthKey);

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-6 shadow-xs border border-line flex flex-col h-full">
      {/* Header with Title and Month Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-ink-1">
              Spending by category
            </h3>
            {isLastMonth && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-tint text-primary border border-primary/25 animate-scale-in">
                Last Month
              </span>
            )}
            {!isCurrentMonth && !isLastMonth && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-tint text-primary border border-primary/20 animate-scale-in">
                {formatMonth(selectedMonthKey, { shortYear: true })}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-3 mt-0.5">
            {monthLabel} debits breakdown • {formatMonth(selectedMonthKey)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {/* Quick Month Toggle Controls */}
          <div className="inline-flex items-center p-0.5 bg-sunken rounded-xl border border-line text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedMonthKey(currentMonthKey)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                isCurrentMonth
                  ? 'bg-surface text-primary shadow-xs font-bold'
                  : 'text-ink-3 hover:text-ink-1'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonthKey(lastMonthKey)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                isLastMonth
                  ? 'bg-surface text-primary shadow-xs font-bold'
                  : 'text-ink-3 hover:text-ink-1'
              }`}
            >
              Last Month
            </button>
          </div>

          {availableMonths.length > 2 && (
            <div className="relative inline-block max-w-[120px] shrink-0">
              <select
                value={selectedMonthKey}
                onChange={e => setSelectedMonthKey(e.target.value)}
                aria-label="Select spending month"
                className="w-full bg-sunken text-xs text-ink-2 font-medium px-2 py-1 rounded-xl border border-line focus:outline-none focus:text-ink-1 cursor-pointer truncate"
              >
                {availableMonths.map(ym => (
                  <option key={ym} value={ym} className="bg-surface text-ink-1">
                    {ym === currentMonthKey
                      ? `This (${formatMonth(ym, { shortYear: true })})`
                      : ym === lastMonthKey
                      ? `Last (${formatMonth(ym, { shortYear: true })})`
                      : formatMonth(ym, { shortYear: true })}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span data-money="true" className="font-numeric text-xs font-bold text-ink-1 bg-sunken px-2.5 py-1 rounded-xl border border-line shrink-0">
            {formatINR(activeMonthExpense)}
          </span>
        </div>
      </div>

      {/* Month-over-Month comparison highlight if viewing last month */}
      {momComparison && (
        <div className="mb-3 px-3 py-1.5 rounded-xl bg-sunken border border-line text-xs text-ink-2 flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-ink-3">Month-over-month trend:</span>
          <span className="font-semibold truncate">
            {momComparison.diff === 0 ? (
              'Equal to this month'
            ) : momComparison.isLowerThisMonth ? (
              <span className="text-positive">
                This month is <span data-money="true">{formatINR(Math.abs(momComparison.diff))}</span> ({momComparison.pctDiff.toFixed(0)}%) lower
              </span>
            ) : (
              <span className="text-negative">
                This month is <span data-money="true">{formatINR(momComparison.diff)}</span> ({momComparison.pctDiff.toFixed(0)}%) higher
              </span>
            )}
          </span>
        </div>
      )}

      {expenseCategories.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-ink-3">
          <p className="text-xs">No expenses logged for {formatMonth(selectedMonthKey)}.</p>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setSelectedMonthKey(currentMonthKey)}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Return to This Month
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
          {/* Donut Chart */}
          <div className="w-full sm:w-1/2 h-[200px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  key={selectedMonthKey}
                  data={expenseCategories}
                  dataKey="spent"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {expenseCategories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || PALETTE_FALLBACK[index % PALETTE_FALLBACK.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CategoryTooltip totalExpense={activeMonthExpense} />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xs uppercase font-medium text-ink-3">Total</span>
              <span className="font-numeric text-xs font-bold text-ink-1">
                <AnimatedNumber value={activeMonthExpense} formatter={formatCompactINR} animateOnMount={true} />
              </span>
            </div>
          </div>

          {/* Top categories legend list */}
          <div className="w-full sm:w-1/2 space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {expenseCategories.slice(0, 5).map((cat, idx) => {
              const pct = activeMonthExpense > 0 ? (cat.spent / activeMonthExpense) * 100 : 0;
              const swatch = cat.color || PALETTE_FALLBACK[idx % PALETTE_FALLBACK.length];
              return (
                <div
                  key={cat.category}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: swatch }} />
                    <span className="font-medium text-ink-2 truncate">
                      {cat.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 font-numeric">
                    <span className="font-semibold text-ink-1">
                      {formatINR(cat.spent)}
                    </span>
                    <span className="text-xs text-ink-3 w-9 text-right font-medium">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}

            {otherCategories.length > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-line">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-400 dark:bg-slate-500" />
                  <span className="font-medium text-ink-3 truncate">
                    Other ({otherCategories.length})
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 font-numeric">
                  <span className="font-semibold text-ink-2">
                    {formatINR(otherSpent)}
                  </span>
                  <span className="text-xs text-ink-3 w-9 text-right font-medium">
                    {otherPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
