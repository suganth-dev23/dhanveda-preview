import React, { useMemo, useState, useCallback } from 'react';
import {
  Zap,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { detectSpendingAnomalies, roundINR } from '../../utils/math';
import { getTodayString } from '../../utils/date';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { Card } from '../ui';
import { SPRING_SNAPPY } from '../../lib/motion-tokens';
import { DEFAULT_UPI_PRESETS, QuickLogPresetItem } from '../../constants/quickLogPresets';

export interface QuickLogAndAnomalyWidgetProps {
  onSelectCategoryFilter?: (category: string) => void;
  onOpenFullAddModal?: () => void;
}

/**
 * Combined 1-Tap UPI Quick-Log Bar & Smart Spending Spike / Anomaly Detector.
 */
export const QuickLogAndAnomalyWidget: React.FC<QuickLogAndAnomalyWidgetProps> = React.memo(
  ({ onSelectCategoryFilter, onOpenFullAddModal }) => {
    const {
      transactions,
      budgets,
      addTransaction,
      deleteTransaction,
      setCurrentView,
    } = useFinance();
    const { showToast } = useToast();

    const [customNote, setCustomNote] = useState('');
    const [customAmount, setCustomAmount] = useState('');

    const anomalies = useMemo(
      () => detectSpendingAnomalies(transactions, budgets),
      [transactions, budgets]
    );

    const handleQuickLog = useCallback(
      (preset: QuickLogPresetItem) => {
        const created = addTransaction({
          date: getTodayString(),
          amount: preset.amount,
          type: 'debit',
          category: preset.category,
          paymentMethod: 'UPI',
          description: preset.description,
          source: 'manual',
        });

        showToast(
          'success',
          `Logged ₹${preset.amount} · ${preset.label}`,
          `${preset.category} via UPI`,
          4500,
          {
            label: 'Undo',
            onClick: () => {
              deleteTransaction(created.id);
            },
          }
        );
      },
      [addTransaction, deleteTransaction, showToast]
    );

    const handleCustomQuickAdd = (e: React.FormEvent) => {
      e.preventDefault();
      const parsed = roundINR(Number(customAmount));
      if (!Number.isFinite(parsed) || parsed <= 0) return;

      const label = customNote.trim() || 'Quick UPI Spend';
      const created = addTransaction({
        date: getTodayString(),
        amount: parsed,
        type: 'debit',
        category: 'Food & Dining',
        paymentMethod: 'UPI',
        description: label,
        source: 'manual',
      });

      setCustomAmount('');
      setCustomNote('');

      showToast(
        'success',
        `Logged ₹${parsed.toLocaleString('en-IN')} · ${label}`,
        'Quick UPI entry recorded',
        4500,
        {
          label: 'Undo',
          onClick: () => {
            deleteTransaction(created.id);
          },
        }
      );
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: 1-Tap UPI Quick-Log Presets & Instant Entry */}
        <Card
          variant="surface"
          padding="none"
          className="lg:col-span-7 rounded-2xl p-4 sm:p-6 border border-line flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-tint text-primary">
                    <Zap className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-base font-bold text-ink-1">
                    1-Tap UPI quick log
                  </h3>
                </div>
                <p className="text-xs text-ink-3 mt-0.5">
                  Tap any frequent preset to log an instant today UPI debit with 1-click Undo
                </p>
              </div>

              {onOpenFullAddModal && (
                <button
                  type="button"
                  onClick={onOpenFullAddModal}
                  className="text-xs font-semibold text-primary hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Full form →
                </button>
              )}
            </div>

            {/* Preset Buttons Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-3">
              {DEFAULT_UPI_PRESETS.map(preset => {
                const Icon = preset.icon;
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING_SNAPPY}
                    onClick={() => handleQuickLog(preset)}
                    className="group p-3 rounded-xl border border-line bg-sunken/70 hover:bg-surface hover:border-primary/50 text-left flex flex-col justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="p-1.5 rounded-lg bg-surface text-primary border border-line/60">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-numeric tabular-nums text-xs font-extrabold text-ink-1">
                        ₹{preset.amount}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-1 truncate">
                        {preset.label}
                      </p>
                      <p className="text-[10px] text-ink-3 truncate">
                        {preset.category}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Instant Custom UPI Micro-Form */}
          <form
            onSubmit={handleCustomQuickAdd}
            className="mt-4 pt-3.5 border-t border-line flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <input
              type="text"
              placeholder="Custom UPI note (e.g. Coconut water, Parking)..."
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              className="flex-1 rounded-xl border border-line bg-sunken/60 px-3 py-2 text-xs text-ink-1 placeholder:text-ink-3 focus:bg-surface focus:border-primary"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                placeholder="₹ Amount"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-28 rounded-xl border border-line bg-sunken/60 px-3 py-2 text-xs font-numeric tabular-nums font-bold text-ink-1 placeholder:text-ink-3 focus:bg-surface focus:border-primary"
              />
              <button
                type="submit"
                disabled={!customAmount || Number(customAmount) <= 0}
                className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold disabled:opacity-40 hover:opacity-95 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Log</span>
              </button>
            </div>
          </form>
        </Card>

        {/* Right 5 Cols: Smart Spending Spike & Anomaly Detector */}
        <Card
          variant="surface"
          padding="none"
          className="lg:col-span-5 rounded-2xl p-4 sm:p-6 border border-line flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FA903E]/15 text-[#FA903E]">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-base font-bold text-ink-1">
                    Spending spike radar
                  </h3>
                </div>
                <p className="text-xs text-ink-3 mt-0.5">
                  Automated velocity comparison vs. 3-month baseline
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('budgets')}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Budgets →
              </button>
            </div>

            {anomalies.length === 0 ? (
              <div className="p-5 rounded-xl bg-[#81C995]/10 border border-[#81C995]/30 flex items-center gap-3 mt-3">
                <CheckCircle2 className="w-5 h-5 text-[#81C995] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-ink-1">
                    No abnormal spending spikes detected
                  </p>
                  <p className="text-[11px] text-ink-3 mt-0.5">
                    Your current monthly category velocity is tracking within normal historical bounds.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 mt-2">
                {anomalies.map(anomaly => {
                  const isAlert = anomaly.severity === 'alert';
                  return (
                    <div
                      key={anomaly.id}
                      onClick={() => onSelectCategoryFilter?.(anomaly.category)}
                      className={`p-3 rounded-xl border transition-colors ${
                        onSelectCategoryFilter ? 'cursor-pointer' : ''
                      } ${
                        isAlert
                          ? 'bg-[#D93025]/10 border-[#D93025]/30 hover:border-[#D93025]/60'
                          : 'bg-[#FA903E]/10 border-[#FA903E]/30 hover:border-[#FA903E]/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isAlert ? 'text-[#D93025]' : 'text-[#FA903E]'
                            }`}
                          />
                          <span className="text-xs font-bold text-ink-1 truncate">
                            {anomaly.title}
                          </span>
                        </div>
                        <span className="font-numeric tabular-nums text-xs font-bold text-ink-1 shrink-0">
                          <AnimatedCurrency value={anomaly.amount} compact />
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-ink-3">
                        <span className="truncate">{anomaly.description}</span>
                        {onSelectCategoryFilter && (
                          <span className="inline-flex items-center gap-0.5 text-primary font-semibold shrink-0">
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[11px] text-ink-3">
            <span>Click any alert to cross-filter the Cashflow Trajectory chart</span>
          </div>
        </Card>
      </div>
    );
  }
);

QuickLogAndAnomalyWidget.displayName = 'QuickLogAndAnomalyWidget';
