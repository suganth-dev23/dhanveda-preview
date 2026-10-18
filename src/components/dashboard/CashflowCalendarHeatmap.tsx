import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFinance } from '../../context/FinanceContext';
import {
  buildMonthlyCalendarMatrix,
  CalendarDayCell,
} from '../../utils/math';
import { formatDate, getTodayString } from '../../utils/date';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { Card } from '../ui';
import { SPRING_FLUID, SPRING_SNAPPY } from '../../lib/motion-tokens';

export interface CashflowCalendarHeatmapProps {
  onOpenAddTx?: () => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function getInitialYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

/**
 * Interactive Monthly Cashflow Calendar & Bill Heatmap
 * Visualizes daily spending intensity, No-Spend streak days, and scheduled recurring bills
 * with click-to-inspect daily transaction breakdowns.
 */
export const CashflowCalendarHeatmap: React.FC<CashflowCalendarHeatmapProps> = React.memo(
  ({ onOpenAddTx }) => {
    const {
      transactions,
      recurringPayments,
      recurringPaymentLogs,
      setCurrentView,
    } = useFinance();

    const [{ year, month }, setYearMonth] = useState(getInitialYearMonth);
    const [selectedDateStr, setSelectedDateStr] = useState<string>(getTodayString);

    const calendarSummary = useMemo(
      () =>
        buildMonthlyCalendarMatrix(
          year,
          month,
          transactions,
          recurringPayments,
          recurringPaymentLogs
        ),
      [year, month, transactions, recurringPayments, recurringPaymentLogs]
    );

    const selectedCell = useMemo<CalendarDayCell | null>(() => {
      return (
        calendarSummary.cells.find(c => c.dateStr === selectedDateStr) ||
        calendarSummary.cells.find(c => c.isToday) ||
        calendarSummary.cells.find(c => c.isCurrentMonth) ||
        null
      );
    }, [calendarSummary.cells, selectedDateStr]);

    const handlePrevMonth = useCallback(() => {
      setYearMonth(prev => {
        if (prev.month === 0) return { year: prev.year - 1, month: 11 };
        return { year: prev.year, month: prev.month - 1 };
      });
    }, []);

    const handleNextMonth = useCallback(() => {
      setYearMonth(prev => {
        if (prev.month === 11) return { year: prev.year + 1, month: 0 };
        return { year: prev.year, month: prev.month + 1 };
      });
    }, []);

    const handleJumpToday = useCallback(() => {
      const now = new Date();
      setYearMonth({ year: now.getFullYear(), month: now.getMonth() });
      setSelectedDateStr(getTodayString());
    }, []);

    const getCellBackground = (cell: CalendarDayCell) => {
      if (!cell.isCurrentMonth) {
        return 'bg-sunken/30 text-ink-3/40 border-transparent';
      }
      if (cell.dueBills.some(b => b.isOverdue)) {
        return 'bg-[#D93025]/15 border-[#D93025]/40 text-ink-1';
      }
      if (cell.intensityLevel === 4) {
        return 'bg-[#D93025]/20 border-[#D93025]/35 text-ink-1';
      }
      if (cell.intensityLevel === 3) {
        return 'bg-[#FA903E]/20 border-[#FA903E]/35 text-ink-1';
      }
      if (cell.intensityLevel === 2) {
        return 'bg-sunken border-line text-ink-1';
      }
      if (cell.intensityLevel === 1) {
        return 'bg-surface border-line text-ink-1';
      }
      if (cell.isNoSpendDay) {
        return 'bg-[#81C995]/15 border-[#81C995]/30 text-ink-1';
      }
      return 'bg-surface border-line/70 text-ink-2';
    };

    return (
      <Card variant="surface" padding="none" className="rounded-2xl p-4 sm:p-6 border border-line">
        {/* Header & Month Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-tint text-primary">
                <Calendar className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-base font-bold text-ink-1">
                Cashflow calendar &amp; bill heatmap
              </h3>
              <span className="text-xs text-ink-3" aria-hidden="true">
                ·
              </span>
              <span className="text-xs font-semibold text-ink-2 font-numeric tabular-nums">
                {calendarSummary.noSpendDaysCount} no-spend days
              </span>
            </div>
            <p className="text-xs text-ink-3 mt-0.5">
              Daily spending intensity, zero-spend streaks, and scheduled recurring bill due dates
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-line bg-sunken hover:bg-line/70 text-ink-2 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleJumpToday}
              className="px-3 h-9 rounded-xl border border-line bg-surface hover:bg-sunken text-xs font-bold text-ink-1 font-numeric tabular-nums cursor-pointer min-w-[100px]"
            >
              {calendarSummary.monthLabel}
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-line bg-sunken hover:bg-line/70 text-ink-2 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5 border-b border-line text-xs font-numeric tabular-nums">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#81C995] shrink-0" />
            <div>
              <span className="text-ink-3 block text-[11px]">No-Spend Days</span>
              <span className="font-bold text-ink-1">
                {calendarSummary.noSpendDaysCount} days
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="text-ink-3 block text-[11px]">Recurring Bills</span>
              <span className="font-bold text-ink-1">
                {calendarSummary.scheduledBillsCount} due ({calendarSummary.unpaidBillsCount} open)
              </span>
            </div>
          </div>
          <div>
            <span className="text-ink-3 block text-[11px]">Month Inflow</span>
            <AnimatedCurrency
              value={calendarSummary.totalInflow}
              compact
              className="font-bold text-positive"
            />
          </div>
          <div>
            <span className="text-ink-3 block text-[11px]">Month Outflow</span>
            <AnimatedCurrency
              value={calendarSummary.totalOutflow}
              compact
              className="font-bold text-ink-1"
            />
          </div>
        </div>

        {/* Main Split Layout: 7-Column Calendar Grid + Day Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
          {/* Calendar Grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-[11px] font-semibold text-ink-3">
              {WEEKDAYS.map(day => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarSummary.cells.map(cell => {
                const isSelected = selectedCell?.dateStr === cell.dateStr;
                const hasBills = cell.dueBills.length > 0;
                const hasUnpaidBills = cell.dueBills.some(b => !b.isPaid);

                return (
                  <motion.button
                    key={cell.dateStr}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    transition={SPRING_SNAPPY}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`relative min-h-[52px] sm:min-h-[60px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${getCellBackground(
                      cell
                    )} ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary'
                        : cell.isToday
                        ? 'border-primary/70'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`font-numeric tabular-nums text-xs font-bold ${
                          cell.isToday ? 'text-primary underline' : ''
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {hasBills && (
                        <span
                          className={`text-[10px] font-bold px-1 rounded ${
                            hasUnpaidBills
                              ? 'bg-[#FA903E]/25 text-[#FA903E]'
                              : 'bg-[#81C995]/25 text-[#0B7A55] dark:text-[#81C995]'
                          }`}
                          title={`${cell.dueBills.length} recurring bill(s)`}
                        >
                          {cell.dueBills.length}B
                        </span>
                      )}
                    </div>

                    {cell.isCurrentMonth && (
                      <div className="w-full truncate font-numeric tabular-nums text-[10px] leading-tight">
                        {cell.outflow > 0 ? (
                          <span className="font-semibold text-ink-1">
                            -<AnimatedCurrency value={cell.outflow} compact />
                          </span>
                        ) : cell.inflow > 0 ? (
                          <span className="font-semibold text-positive">
                            +<AnimatedCurrency value={cell.inflow} compact />
                          </span>
                        ) : cell.isNoSpendDay ? (
                          <span className="text-[#0B7A55] dark:text-[#81C995] font-medium">
                            ₹0
                          </span>
                        ) : null}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#81C995]/35 border border-[#81C995]/50" />
                  <span>No-Spend Day</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sunken border border-line" />
                  <span>Moderate</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FA903E]/35 border border-[#FA903E]/50" />
                  <span>High Spend</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#D93025]/35 border border-[#D93025]/50" />
                  <span>Spike / Overdue</span>
                </span>
              </div>
            </div>
          </div>

          {/* Selected Day Inspector Panel */}
          <div className="lg:col-span-5">
            <AnimatePresence mode="wait">
              {selectedCell && (
                <motion.div
                  key={selectedCell.dateStr}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={SPRING_FLUID}
                  className="h-full rounded-xl bg-sunken/80 border border-line p-4 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-line pb-2.5">
                      <div>
                        <h4 className="text-sm font-bold text-ink-1">
                          {formatDate(selectedCell.dateStr)}
                        </h4>
                        <p className="text-[11px] text-ink-3">
                          {selectedCell.isNoSpendDay
                            ? 'Zero-spend day · Streak preserved'
                            : `${selectedCell.transactions.length} transactions · ${selectedCell.dueBills.length} bills`}
                        </p>
                      </div>
                      {onOpenAddTx && (
                        <button
                          type="button"
                          onClick={onOpenAddTx}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:opacity-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Log</span>
                        </button>
                      )}
                    </div>

                    {/* Day Inflow / Outflow Summary */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-numeric tabular-nums">
                      <div className="p-2.5 rounded-lg bg-surface border border-line">
                        <span className="text-ink-3 block text-[11px]">Day Inflow</span>
                        <AnimatedCurrency
                          value={selectedCell.inflow}
                          className="font-bold text-positive text-sm"
                        />
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-line">
                        <span className="text-ink-3 block text-[11px]">Day Outflow</span>
                        <AnimatedCurrency
                          value={selectedCell.outflow}
                          className="font-bold text-ink-1 text-sm"
                        />
                      </div>
                    </div>

                    {/* Scheduled Recurring Bills on Selected Day */}
                    {selectedCell.dueBills.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-ink-2">
                          <span>Scheduled Bills Due</span>
                          <button
                            type="button"
                            onClick={() => setCurrentView('recurring')}
                            className="text-primary hover:underline cursor-pointer"
                          >
                            Manage →
                          </button>
                        </div>
                        {selectedCell.dueBills.map(bill => (
                          <div
                            key={bill.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {bill.isPaid ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#81C995] shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-[#FA903E] shrink-0" />
                              )}
                              <span className="font-semibold text-ink-1 truncate">
                                {bill.name}
                              </span>
                            </div>
                            <span className="font-numeric tabular-nums font-bold text-ink-1 shrink-0">
                              <AnimatedCurrency value={bill.amount} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Transactions on Selected Day */}
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-ink-2">
                        Ledger Activity
                      </span>
                      {selectedCell.transactions.length === 0 ? (
                        <div className="p-4 rounded-lg bg-surface/60 border border-dashed border-line text-center text-xs text-ink-3">
                          No transactions logged on this date.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {selectedCell.transactions.map(tx => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-line text-xs gap-2"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-ink-1 truncate">
                                  {tx.description || tx.category}
                                </p>
                                <p className="text-[11px] text-ink-3 truncate">
                                  {tx.category} · {tx.paymentMethod}
                                </p>
                              </div>
                              <span
                                className={`font-numeric tabular-nums font-bold shrink-0 ${
                                  tx.type === 'credit'
                                    ? 'text-positive'
                                    : 'text-ink-1'
                                }`}
                              >
                                <AnimatedCurrency
                                  value={tx.type === 'credit' ? tx.amount : -tx.amount}
                                  sign="always"
                                />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    );
  }
);

CashflowCalendarHeatmap.displayName = 'CashflowCalendarHeatmap';
