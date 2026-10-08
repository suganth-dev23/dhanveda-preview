import React from 'react';
import { AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ProgressBar } from '../common/ProgressBar';
import { Money } from '../ui/Money';

export const BudgetHealthWidget: React.FC = () => {
  const { categorySpendingThisMonth, setCurrentView } = useFinance();

  const safeSpending = Array.isArray(categorySpendingThisMonth) ? categorySpendingThisMonth : [];
  const budgetedCategories = safeSpending.filter(c => Number.isFinite(c.budget) && c.budget > 0);

  const overBudgetCategories = budgetedCategories.filter(c => (c.spent || 0) > c.budget);
  const nearBudgetCategories = budgetedCategories.filter(c => (c.spent || 0) <= c.budget && (c.percentUsed || 0) >= 80);

  const totalBudget = budgetedCategories.reduce((acc, c) => acc + (Number.isFinite(c.budget) ? c.budget : 0), 0);
  const totalSpent = budgetedCategories.reduce((acc, c) => acc + (Number.isFinite(c.spent) ? c.spent : 0), 0);
  const overallPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-6 shadow-xs border border-line flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-ink-1">
              Budget watchlist
            </h3>
            <p className="text-xs text-ink-3">
              {budgetedCategories.length} categories budgeted this month
            </p>
          </div>

          <button
            onClick={() => setCurrentView('budgets')}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 min-h-[44px]"
          >
            <span>Manage</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alerts if any */}
        {budgetedCategories.length > 0 && (
          overBudgetCategories.length > 0 ? (
            <div className="mb-4 p-3 bg-negative-tint border border-negative/30 rounded-xl flex items-start gap-2.5 animate-shake-then-flash">
              <AlertCircle className="w-4 h-4 text-negative shrink-0 mt-0.5" />
              <div className="text-xs text-negative">
                <span className="font-semibold">{overBudgetCategories.length} category exceeded: </span>
                {overBudgetCategories.map(c => c.category).join(', ')}
              </div>
            </div>
          ) : nearBudgetCategories.length > 0 ? (
            <div className="mb-4 p-3 bg-sunken dark:bg-sunken/30 border border-warning/30 dark:border-warning/30 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-warning dark:text-warning">
                <span className="font-semibold">{nearBudgetCategories.length} categories near ceiling: </span>
                {nearBudgetCategories.map(c => c.category).join(', ')}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-positive-tint border border-positive/30 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-positive" />
              <span className="text-xs font-medium text-positive">
                All categories within healthy limits
              </span>
            </div>
          )
        )}

        {/* Budget Progress items */}
        {budgetedCategories.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-ink-3 mb-2">No category budgets established yet.</p>
            <button
              onClick={() => setCurrentView('budgets')}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center min-h-[44px]"
            >
              Set category limits →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {budgetedCategories.slice(0, 4).map(cat => {
              const remaining = cat.budget - cat.spent;
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-ink-1 dark:text-slate-200">{cat.category}</span>
                    <span className="font-numeric text-ink-3 inline-flex items-center gap-1">
                      <Money value={cat.spent} size="xs" />
                      <span className="text-ink-3">/</span>
                      <Money value={cat.budget} size="xs" />
                      {remaining > 0 ? (
                        <span className="text-ink-3 text-xs hidden sm:inline ml-1 font-normal">
                          (<Money value={remaining} size="xs" /> left)
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <ProgressBar
                    value={cat.spent}
                    max={cat.budget}
                    alertThresholds
                    glowOnMilestone
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalBudget > 0 && (
        <div className="pt-3.5 mt-4 border-t border-line flex items-center justify-between text-xs">
          <span className="text-ink-3">Monthly budget total</span>
          <span className="font-numeric font-semibold text-ink-1 dark:text-slate-200 inline-flex items-center gap-1">
            <Money value={totalSpent} size="xs" />
            <span className="text-ink-3 font-normal">/</span>
            <Money value={totalBudget} size="xs" />
            <span className="text-ink-3 font-normal">({overallPct}%)</span>
          </span>
        </div>
      )}
    </div>
  );
};
