import React, { useState, useMemo, useCallback } from 'react';
import { Waves, BarChart3, Layers, X, Crosshair } from 'lucide-react';
import { CashflowPoint, ChartViewMode, TimeframeWindow } from '../../types/finance';
import { useCashflowTrajectorySelector } from '../../hooks/useFinanceData';
import {
  CashflowTrajectoryChart,
  VisibleCashflowSeries,
} from '../charts/CashflowTrajectoryChart';
import { SegmentedPill, SegmentedPillOption } from '../ui/SegmentedPill';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { formatCompactINR } from '../../utils/currency';

export interface CashFlowChartProps {
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  defaultTimeframe?: TimeframeWindow;
  defaultMode?: ChartViewMode;
}

const TIMEFRAME_OPTIONS: SegmentedPillOption<TimeframeWindow>[] = [
  { value: '3M', label: '3M', title: 'Last 3 Months' },
  { value: '6M', label: '6M', title: 'Last 6 Months' },
  { value: '1Y', label: '1Y', title: 'Last 12 Months' },
  { value: 'ALL', label: 'ALL', title: 'Full Historical Trajectory' },
];

const MODE_OPTIONS: SegmentedPillOption<ChartViewMode>[] = [
  {
    value: 'combined',
    label: 'Combined',
    icon: <Layers className="w-3.5 h-3.5" />,
    title: 'Gradient Bars + Net Cashflow Area Trajectory',
  },
  {
    value: 'bar',
    label: 'Bar',
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    title: 'Monthly Inflow vs Outflow Gradient Bars',
  },
  {
    value: 'line',
    label: 'Line',
    icon: <Waves className="w-3.5 h-3.5" />,
    title: 'Multi-Color Gradient Area & Line Trajectories',
  },
];

export const CashFlowChart: React.FC<CashFlowChartProps> = React.memo(
  ({
    selectedCategory = null,
    onClearCategory,
    defaultTimeframe = '6M',
    defaultMode = 'combined',
  }) => {
    const [timeframe, setTimeframe] = useState<TimeframeWindow>(defaultTimeframe);
    const [chartMode, setChartMode] = useState<ChartViewMode>(defaultMode);
    const [hoveredPoint, setHoveredPoint] = useState<CashflowPoint | null>(null);
    const [visibleSeries, setVisibleSeries] = useState<VisibleCashflowSeries>({
      inflow: true,
      outflow: true,
      net: true,
    });

    const { series, hasActivity, isInitialized, summary } = useCashflowTrajectorySelector(
      timeframe,
      selectedCategory
    );

    const handleToggleSeries = useCallback((key: keyof VisibleCashflowSeries) => {
      setVisibleSeries(prev => {
        const next = { ...prev, [key]: !prev[key] };
        if (!next.inflow && !next.outflow && !next.net) {
          return prev; // Always keep at least one series active
        }
        return next;
      });
    }, []);

    const subtitle = useMemo(() => {
      if (selectedCategory) {
        return `Highlighting ${selectedCategory} expenditure against net cashflow`;
      }
      if (chartMode === 'line') {
        return 'Multi-color gradient area curves · Emerald inflow, Coral outflow & Cyan net';
      }
      if (chartMode === 'bar') {
        return 'Monthly Inflow vs Outflow comparison in INR';
      }
      return 'Synchronized Inflow, Outflow & Net Cashflow trajectory';
    }, [chartMode, selectedCategory]);

    // Active crosshair or full window metrics
    const activeInflow = hoveredPoint ? hoveredPoint.inflow : summary.totalInflow;
    const activeOutflow = hoveredPoint ? hoveredPoint.outflow : summary.totalOutflow;
    const activeNet = hoveredPoint ? hoveredPoint.netCashflow : summary.netTotal;
    const activeSavingsRate = useMemo(() => {
      if (activeInflow <= 0) return 0;
      return Math.round(((activeInflow - activeOutflow) / activeInflow) * 100);
    }, [activeInflow, activeOutflow]);

    const outflowSwatchColor = chartMode === 'line' ? '#F43F5E' : '#6366F1';

    return (
      <div className="bg-surface rounded-2xl p-5 sm:p-6 shadow-xs border border-line flex flex-col justify-between h-full">
        <div>
          {/* Top Header & Segmented Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-ink-1">
                  Cashflow trajectory
                </h3>
                <span className="text-xs text-ink-3" aria-hidden="true">
                  ·
                </span>
                <span className="font-numeric tabular-nums text-xs font-semibold text-ink-2">
                  Net:{' '}
                  <AnimatedCurrency
                    value={summary.netTotal}
                    compact
                    sign="always"
                    className={
                      summary.netTotal >= 0 ? 'text-positive font-bold' : 'text-negative font-bold'
                    }
                  />
                </span>
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={onClearCategory}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    title="Clear category filter"
                  >
                    <span>· Filtered: {selectedCategory}</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-ink-3 mt-0.5 truncate">{subtitle}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <SegmentedPill
                options={TIMEFRAME_OPTIONS}
                value={timeframe}
                onChange={setTimeframe}
                layoutId="cashflow-timeframe-pill"
                ariaLabel="Cashflow timeframe window"
              />
              <SegmentedPill
                options={MODE_OPTIONS}
                value={chartMode}
                onChange={setChartMode}
                layoutId="cashflow-mode-pill"
                ariaLabel="Cashflow chart mode"
              />
            </div>
          </div>

          {/* Interactive Crosshair Live Metric Strip */}
          {hasActivity && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-sunken/70 border border-line/80 flex flex-wrap items-center justify-between gap-2 text-xs font-numeric tabular-nums transition-colors">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                    hoveredPoint
                      ? 'bg-primary-tint text-primary border border-primary/25'
                      : 'bg-surface text-ink-2 border border-line'
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  {hoveredPoint ? hoveredPoint.label : `${timeframe} Window`}
                </span>
                {hoveredPoint && selectedCategory && typeof hoveredPoint.categoryOutflow === 'number' && (
                  <span className="text-[11px] font-semibold text-warning">
                    {selectedCategory}: {formatCompactINR(hoveredPoint.categoryOutflow)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span className="text-ink-3">
                  Inflow:{' '}
                  <strong className="text-positive font-bold" data-money="true">
                    {formatCompactINR(activeInflow)}
                  </strong>
                </span>
                <span className="text-ink-3">
                  Outflow:{' '}
                  <strong className="text-negative font-bold" data-money="true">
                    {formatCompactINR(activeOutflow)}
                  </strong>
                </span>
                <span className="text-ink-3">
                  Net:{' '}
                  <strong
                    data-money="true"
                    className={`font-bold ${
                      activeNet >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {activeNet >= 0 ? '+' : '-'}
                    {formatCompactINR(Math.abs(activeNet))}
                  </strong>
                </span>
                <span className="hidden sm:inline text-ink-3">
                  Savings:{' '}
                  <strong
                    className={`font-bold ${
                      activeSavingsRate >= 20
                        ? 'text-positive'
                        : activeSavingsRate >= 0
                        ? 'text-ink-1'
                        : 'text-negative'
                    }`}
                  >
                    {activeSavingsRate}%
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Chart Body: Keep chart mounted during initial DB load to avoid 0px unmount/remount delay */}
          {isInitialized && !hasActivity ? (
            <div className="w-full h-[280px] sm:h-[320px] flex flex-col items-center justify-center text-center p-6 bg-sunken/40 rounded-2xl border border-dashed border-line text-ink-3">
              <Waves className="w-10 h-10 stroke-1 text-ink-3/40 mb-2.5" />
              <p className="text-sm font-semibold text-ink-2">No cash flow activity yet</p>
              <p className="text-xs text-ink-3 max-w-xs mt-1">
                Log your income and expenses to visualize your cash flow trajectory across {timeframe}.
              </p>
            </div>
          ) : (
            <CashflowTrajectoryChart
              data={series}
              mode={chartMode}
              selectedCategory={selectedCategory}
              heightClassName="h-[280px] sm:h-[320px]"
              visibleSeries={visibleSeries}
              onHoverPoint={setHoveredPoint}
            />
          )}
        </div>

        {/* Interactive Series Toggles & Summary Footer Strip */}
        {hasActivity && (
          <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs text-ink-3 font-numeric tabular-nums">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleToggleSeries('inflow')}
                className={`press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                  visibleSeries.inflow
                    ? 'bg-surface border-line text-ink-1 shadow-2xs'
                    : 'bg-sunken/50 border-transparent text-ink-3 opacity-60'
                }`}
                title="Toggle Inflow series visibility"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: '#10B981' }}
                />
                <span>Inflow</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleSeries('outflow')}
                className={`press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                  visibleSeries.outflow
                    ? 'bg-surface border-line text-ink-1 shadow-2xs'
                    : 'bg-sunken/50 border-transparent text-ink-3 opacity-60'
                }`}
                title="Toggle Outflow series visibility"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: outflowSwatchColor }}
                />
                <span>Outflow</span>
              </button>

              {(chartMode === 'line' || chartMode === 'combined') && (
                <button
                  type="button"
                  onClick={() => handleToggleSeries('net')}
                  className={`press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                    visibleSeries.net
                      ? 'bg-surface border-line text-ink-1 shadow-2xs'
                      : 'bg-sunken/50 border-transparent text-ink-3 opacity-60'
                  }`}
                  title="Toggle Net Cashflow curve visibility"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: '#06B6D4' }}
                  />
                  <span>Net Trajectory</span>
                </button>
              )}
            </div>

            <span>
              Window: <strong className="text-ink-2">{series.length} periods</strong>
            </span>
          </div>
        )}
      </div>
    );
  }
);

CashFlowChart.displayName = 'CashFlowChart';
