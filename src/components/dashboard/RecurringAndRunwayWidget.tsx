import React from 'react';
import {
  Repeat,
  Flame,
  Sparkles,
  TrendingUp,
  X,
  ArrowRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useRecurringTransactions } from '../../hooks/useRecurringTransactions';
import { useCashFlowRunway } from '../../hooks/useCashFlowRunway';
import { Money } from '../ui/Money';

export const CashFlowRunwayCard: React.FC = () => {
  const { transactions, totalBalance } = useFinance();
  const runway = useCashFlowRunway(transactions || [], totalBalance || 0);

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-line shadow-xs flex flex-col justify-between h-full space-y-4">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-1">
                Cash-Flow Runway
              </h3>
              <p className="text-xs text-ink-3">Net monthly burn & longevity</p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              runway.status === 'sustainable' || runway.status === 'abundant'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : runway.status === 'healthy'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                : runway.status === 'moderate'
                ? 'bg-sunken text-warning dark:bg-sunken/60 dark:text-warning'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
            }`}
          >
            {runway.statusLabel}
          </span>
        </div>

        {/* Big Metric Display */}
        <div className="bg-sunken rounded-2xl p-4 border border-line">
          <span className="text-xs font-medium text-ink-3">
            Estimated liquid longevity
          </span>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-numeric text-ink-1 tracking-tight">
              {runway.runwayMonths === Infinity
                ? 'Sustainable'
                : `${(Number.isFinite(runway.runwayMonths) ? runway.runwayMonths : 0).toFixed(1)} mos`}
            </span>
            {runway.runwayMonths === Infinity && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold font-numeric bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Money value={runway.netMonthlyCashFlow} tone="positive" size="xs" sign="always" />/mo surplus
              </span>
            )}
          </div>
          <p className="text-xs text-ink-3 mt-1.5">
            Zero-income baseline runway:{' '}
            <span className="font-semibold font-numeric text-ink-2">
              {runway.expenseOnlyRunwayMonths} months
            </span>
          </p>
        </div>
      </div>

      {/* Burn Rate Sub-Stats */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
        <div>
          <span className="text-xs text-ink-3 font-medium">Avg monthly spend</span>
          <div className="mt-0.5">
            <Money value={runway.averageMonthlyExpense} tone="expense" size="sm" />
          </div>
        </div>
        <div>
          <span className="text-xs text-ink-3 font-medium">Avg monthly inflow</span>
          <div className="mt-0.5">
            <Money value={runway.averageMonthlyIncome} tone="positive" size="sm" sign="always" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const RecurringBillsCard: React.FC = () => {
  const { transactions, notRecurringTxIds, toggleNotRecurring, setCurrentView } = useFinance();

  const {
    recurringExpenses = [],
    recurringIncomes = [],
    totalMonthlyRecurringExpenses = 0,
  } = useRecurringTransactions(transactions || [], notRecurringTxIds);

  const totalStreamCount = (recurringExpenses?.length || 0) + (recurringIncomes?.length || 0);

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-6 border border-line shadow-xs flex flex-col justify-between h-full space-y-4">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sunken flex items-center justify-center text-ink-2">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-1">
                Detected Recurring & Bills
              </h3>
              <p className="text-xs text-ink-3">
                Auto-clustered (28–32 day cycle)
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-ink-3">Fixed monthly: </span>
            <Money value={totalMonthlyRecurringExpenses} size="sm" />
          </div>
        </div>

        {totalStreamCount === 0 ? (
          <div className="text-center py-7 bg-sunken rounded-2xl border border-dashed border-line p-4">
            <Sparkles className="w-5 h-5 text-ink-3 mx-auto mb-2" />
            <p className="text-xs font-semibold text-ink-2">
              No repeating monthly subscriptions detected yet
            </p>
            <p className="text-xs text-ink-3 mt-0.5 max-w-xs mx-auto">
              As you log recurring expenses over 28-32 day cycles, they will automatically appear here.
            </p>
            <button
              onClick={() => setCurrentView('recurring')}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-ink-3 hover:underline"
            >
              <span>Manage Declared Fixed Bills & EMIs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {recurringExpenses.map(item => (
              <div
                key={item.clusterId}
                className="flex items-center justify-between p-3 rounded-2xl bg-sunken border border-line hover:border-slate-300 dark:hover:border-line transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-line text-ink-2 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-1 truncate">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-ink-3">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>Every ~{item.intervalDays}d</span>
                      <span>•</span>
                      <span>Next: {item.nextEstimatedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <Money value={item.averageAmount} tone="expense" size="sm" />
                  <button
                    onClick={() => {
                      if (item.transactionIds && item.transactionIds.length > 0) {
                        toggleNotRecurring(item.transactionIds);
                      }
                    }}
                    className="p-2 -m-1 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-ink-3 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium gap-0.5 transition-colors"
                    title="Mark this transaction as not recurring"
                    aria-label="Mark this transaction as not recurring"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Not recurring</span>
                  </button>
                </div>
              </div>
            ))}

            {recurringIncomes.map(item => (
              <div
                key={item.clusterId}
                className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/30 hover:border-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink-1 truncate">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-ink-3">
                      <span>Salary / Inflow</span>
                      <span>•</span>
                      <span>Every ~{item.intervalDays}d</span>
                      <span>•</span>
                      <span>Next: {item.nextEstimatedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <Money value={item.averageAmount} tone="income" size="sm" />
                  <button
                    onClick={() => {
                      if (item.transactionIds && item.transactionIds.length > 0) {
                        toggleNotRecurring(item.transactionIds);
                      }
                    }}
                    className="p-2 -m-1 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-ink-3 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium gap-0.5 transition-colors"
                    title="Mark this transaction as not recurring"
                    aria-label="Mark this transaction as not recurring"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Not recurring</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalStreamCount > 0 && (
        <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-ink-3">
          <span>{totalStreamCount} {totalStreamCount === 1 ? 'stream' : 'streams'} detected</span>
          <button
            onClick={() => setCurrentView('recurring')}
            className="text-ink-3 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Declared Bills</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
