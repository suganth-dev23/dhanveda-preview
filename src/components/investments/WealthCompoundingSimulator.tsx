import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Calculator, RotateCcw, Sparkles, TrendingUp, Crosshair } from 'lucide-react';

import {
  CompoundingYearPoint,
  computeWealthCompoundingTrajectory,
  roundINR,
} from '../../utils/math';
import { formatCompactINR, formatINR } from '../../utils/currency';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { Card, Button } from '../ui';


export interface WealthCompoundingSimulatorProps {
  portfolioMonthlySIP?: number;
  portfolioCurrentValue?: number;
}

const CHART_MARGIN = { top: 14, right: 16, left: 4, bottom: 8 } as const;
const AXIS_TICK = { fill: '#64748B', fontSize: 11, fontWeight: 500 } as const;
const TOOLTIP_WRAPPER_STYLE: React.CSSProperties = {
  zIndex: 50,
  pointerEvents: 'none',
  outline: 'none',
};

const ASSET_BENCHMARKS = [
  {
    key: 'bankSavings4' as const,
    name: 'Bank Savings (4%)',
    shortLabel: 'Savings · 4%',
    rate: 4,
    color: '#64748B',
    gradId: 'dvSipSavingsGrad',
  },
  {
    key: 'fixedDeposit7' as const,
    name: 'Fixed Deposit (7%)',
    shortLabel: 'FD · 7%',
    rate: 7,
    color: '#8B5CF6',
    gradId: 'dvSipFdGrad',
  },
  {
    key: 'gold9' as const,
    name: 'Sovereign Gold (9%)',
    shortLabel: 'Gold · 9%',
    rate: 9,
    color: '#F59E0B',
    gradId: 'dvSipGoldGrad',
  },
  {
    key: 'sensex12' as const,
    name: 'Sensex Index (12%)',
    shortLabel: 'Sensex · 12%',
    rate: 12,
    color: '#10B981',
    gradId: 'dvSipSensexGrad',
  },
  {
    key: 'equitySIP15' as const,
    name: 'Equity SIP (15%)',
    shortLabel: 'Equity SIP · 15%',
    rate: 15,
    color: '#2563EB',
    gradId: 'dvSipEquityGrad',
  },
] as const;

const CompoundingTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    stroke?: string;
    dataKey?: string;
    payload?: CompoundingYearPoint;
  }>;
  label?: string;
}> = React.memo(({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;

  return (
    <div className="bg-surface/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-line text-xs space-y-2 min-w-[225px] pointer-events-none select-none">
      <div className="flex items-center justify-between border-b border-line/70 pb-1.5 gap-3">
        <span className="font-bold text-ink-1">{label}</span>
        {point && (
          <span className="font-numeric tabular-nums text-[11px] text-ink-3">
            Principal: {formatCompactINR(point.totalInvested)}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {payload.map(item => {
          const val = typeof item.value === 'number' ? roundINR(item.value) : 0;
          const color = item.color || item.stroke || '#2563EB';
          return (
            <div
              key={String(item.dataKey || item.name)}
              className="flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2 text-ink-2 font-medium">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{item.name}</span>
              </span>
              <span
                data-money="true"
                className="font-bold font-numeric tabular-nums text-ink-1"
              >
                {formatINR(val, { compact: true })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

CompoundingTooltip.displayName = 'CompoundingTooltip';

/**
 * Interactive 25-Year SIP & Multi-Asset Wealth Compounding Scrubber
 * Compares Bank Savings (4%), Fixed Deposits (7%), Gold (9%), Sensex (12%), and Equity SIP (15%)
 * with multi-stop SVG gradient area fills and live crosshair year scrubbing.
 */
export const WealthCompoundingSimulator: React.FC<WealthCompoundingSimulatorProps> = React.memo(
  ({ portfolioMonthlySIP = 0, portfolioCurrentValue = 0 }) => {
    const defaultSIP = portfolioMonthlySIP > 0 ? roundINR(portfolioMonthlySIP) : 5000;
    const defaultLumpSum =
      portfolioCurrentValue > 0 ? roundINR(portfolioCurrentValue) : 0;

    const [monthlySIP, setMonthlySIP] = useState<number>(defaultSIP);
    const [initialLumpSum, setInitialLumpSum] = useState<number>(defaultLumpSum);
    const [annualStepUpPct, setAnnualStepUpPct] = useState<number>(0);
    const [horizonYears, setHorizonYears] = useState<number>(25);
    const [hoveredYearPoint, setHoveredYearPoint] = useState<CompoundingYearPoint | null>(null);
    const lastHoverIdxRef = useRef<number | null>(null);

    const handleResetToPortfolio = useCallback(() => {
      setMonthlySIP(portfolioMonthlySIP > 0 ? roundINR(portfolioMonthlySIP) : 5000);
      setInitialLumpSum(
        portfolioCurrentValue > 0 ? roundINR(portfolioCurrentValue) : 0
      );
      setAnnualStepUpPct(0);
      setHorizonYears(25);
    }, [portfolioMonthlySIP, portfolioCurrentValue]);

    const trajectory = useMemo(
      () =>
        computeWealthCompoundingTrajectory({
          monthlySIP,
          initialLumpSum,
          annualStepUpPct,
          horizonYears,
        }),
      [monthlySIP, initialLumpSum, annualStepUpPct, horizonYears]
    );

    const terminalPoint = trajectory[trajectory.length - 1] || {
      year: horizonYears,
      label: `Yr ${horizonYears}`,
      totalInvested: 0,
      bankSavings4: 0,
      fixedDeposit7: 0,
      gold9: 0,
      sensex12: 0,
      equitySIP15: 0,
    };

    const activeDisplayPoint = hoveredYearPoint || terminalPoint;

    const equityVsBankGain = Math.max(
      0,
      activeDisplayPoint.equitySIP15 - activeDisplayPoint.bankSavings4
    );

    const handleChartMouseMove = useCallback(
      (state: any) => {
        const idx =
          typeof state?.activeTooltipIndex === 'number'
            ? state.activeTooltipIndex
            : null;
        if (idx !== null && idx >= 0 && idx < trajectory.length) {
          if (lastHoverIdxRef.current !== idx) {
            lastHoverIdxRef.current = idx;
            setHoveredYearPoint(trajectory[idx]);
          }
        }
      },
      [trajectory]
    );

    const handleChartMouseLeave = useCallback(() => {
      if (lastHoverIdxRef.current !== null) {
        lastHoverIdxRef.current = null;
        setHoveredYearPoint(null);
      }
    }, []);

    const yTickFormatter = useMemo(
      () => (val: number) => {
        if (!Number.isFinite(val) || val === 0) return '₹0';
        return formatCompactINR(val);
      },
      []
    );

    return (
      <Card variant="surface" padding="none" className="rounded-2xl p-5 sm:p-6 border border-line">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-tint text-primary">
                <Calculator className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-base font-bold text-ink-1">
                Interactive SIP &amp; Wealth Compounding Simulator
              </h3>
            </div>
            <p className="text-xs text-ink-3 mt-1">
              Scrub monthly SIP, step-up rate, and horizon to compare Indian asset classes over {horizonYears} years
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetToPortfolio}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Sync with Portfolio
            </Button>
          </div>
        </div>

        {/* Interactive Scrubber Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-5 border-b border-line">
          {/* Monthly SIP Slider */}
          <div className="p-3.5 rounded-xl bg-sunken border border-line/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-2">Monthly SIP</span>
              <span className="font-numeric tabular-nums font-extrabold text-primary text-sm">
                <AnimatedCurrency value={monthlySIP} />
              </span>
            </div>
            <input
              type="range"
              aria-label="Monthly SIP amount"
              min={500}
              max={200000}
              step={500}
              value={monthlySIP}
              onChange={e => setMonthlySIP(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ink-3 font-numeric tabular-nums">
              <span>₹500</span>
              <button
                type="button"
                onClick={() => setMonthlySIP(5000)}
                className="hover:text-primary underline cursor-pointer"
              >
                ₹5k preset
              </button>
              <span>₹2L/mo</span>
            </div>
          </div>

          {/* Initial Lump Sum Slider */}
          <div className="p-3.5 rounded-xl bg-sunken border border-line/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-2">Initial Lump Sum</span>
              <span className="font-numeric tabular-nums font-extrabold text-ink-1 text-sm">
                <AnimatedCurrency value={initialLumpSum} compact />
              </span>
            </div>
            <input
              type="range"
              aria-label="Initial lump sum capital"
              min={0}
              max={2500000}
              step={10000}
              value={initialLumpSum}
              onChange={e => setInitialLumpSum(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ink-3 font-numeric tabular-nums">
              <span>₹0</span>
              <button
                type="button"
                onClick={() => setInitialLumpSum(100000)}
                className="hover:text-primary underline cursor-pointer"
              >
                ₹1L
              </button>
              <span>₹25L</span>
            </div>
          </div>

          {/* Annual Step-Up % Slider */}
          <div className="p-3.5 rounded-xl bg-sunken border border-line/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-2">Annual Step-Up</span>
              <span className="font-numeric tabular-nums font-extrabold text-reward text-sm">
                +{annualStepUpPct}% / yr
              </span>
            </div>
            <input
              type="range"
              aria-label="Annual SIP step up percentage"
              min={0}
              max={25}
              step={1}
              value={annualStepUpPct}
              onChange={e => setAnnualStepUpPct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ink-3 font-numeric tabular-nums">
              <span>0% (Flat)</span>
              <button
                type="button"
                onClick={() => setAnnualStepUpPct(10)}
                className="hover:text-primary underline cursor-pointer"
              >
                10% salary step
              </button>
              <span>25%</span>
            </div>
          </div>

          {/* Horizon Years Slider */}
          <div className="p-3.5 rounded-xl bg-sunken border border-line/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-2">Compounding Horizon</span>
              <span className="font-numeric tabular-nums font-extrabold text-ink-1 text-sm">
                {horizonYears} Years
              </span>
            </div>
            <input
              type="range"
              aria-label="Compounding horizon in years"
              min={5}
              max={30}
              step={1}
              value={horizonYears}
              onChange={e => setHorizonYears(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-ink-3 font-numeric tabular-nums">
              <span>5Y</span>
              <button
                type="button"
                onClick={() => setHorizonYears(25)}
                className="hover:text-primary underline cursor-pointer"
              >
                25Y benchmark
              </button>
              <span>30Y</span>
            </div>
          </div>
        </div>

        {/* 5-Asset Benchmark Comparison Strip (Updates dynamically on chart crosshair hover) */}
        <div className="py-5 border-b border-line">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-numeric tabular-nums font-semibold text-[11px] ${
                  hoveredYearPoint
                    ? 'bg-primary-tint text-primary border border-primary/25'
                    : 'bg-sunken text-ink-2 border border-line'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                {hoveredYearPoint ? hoveredYearPoint.label : `Year ${horizonYears} Terminal`}
              </span>
              <span className="text-xs font-semibold text-ink-2">
                Principal Invested:{' '}
                <AnimatedCurrency
                  value={activeDisplayPoint.totalInvested}
                  compact
                  className="font-extrabold text-ink-1"
                />
              </span>
            </div>

            <span className="text-xs text-ink-3 font-numeric tabular-nums flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-reward" />
              Equity SIP (15%) creates{' '}
              <AnimatedCurrency
                value={equityVsBankGain}
                compact
                className="font-bold text-positive"
              />{' '}
              more wealth than Bank Savings (4%)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ASSET_BENCHMARKS.map(asset => {
              const finalVal = activeDisplayPoint[asset.key];
              const multiple =
                activeDisplayPoint.totalInvested > 0
                  ? (finalVal / activeDisplayPoint.totalInvested).toFixed(1)
                  : '1.0';
              const isHighlight = asset.key === 'equitySIP15';

              return (
                <div
                  key={asset.key}
                  className={`p-3.5 rounded-xl border hover:-translate-y-0.5 transition-all duration-150 ${
                    isHighlight
                      ? 'border-primary/50 bg-primary-tint/35'
                      : 'border-line bg-sunken/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-xs mb-1">
                    <span className="font-semibold text-ink-2 truncate">
                      {asset.shortLabel}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: asset.color }}
                    />
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold font-numeric tabular-nums text-ink-1">
                    <AnimatedCurrency value={finalVal} compact />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-ink-3 font-numeric tabular-nums">
                    <span>{multiple}x capital</span>
                    <span className="inline-flex items-center gap-0.5 text-positive font-semibold">
                      <TrendingUp className="w-3 h-3" />+{asset.rate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-Series Colored Gradient Area Trajectory Visualization */}
        <div className="pt-5">
          <div className="h-[290px] sm:h-[340px] w-full select-none">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={100}
              minHeight={100}
              initialDimension={{ width: 640, height: 320 }}
              debounce={16}
            >
              <ComposedChart
                data={trajectory}
                margin={CHART_MARGIN}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              >
                <defs>
                  <linearGradient id="dvSipEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.32} />
                    <stop offset="65%" stopColor="#06B6D4" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dvSipSensexGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="70%" stopColor="#059669" stopOpacity={0.06} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dvSipGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.22} />
                    <stop offset="75%" stopColor="#D97706" stopOpacity={0.04} />
                    <stop offset="100%" stopColor="#D97706" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dvSipFdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.18} />
                    <stop offset="80%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148, 163, 184, 0.16)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                  dy={8}
                />
                <YAxis
                  width={56}
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                  tickFormatter={yTickFormatter}
                />
                <Tooltip
                  content={<CompoundingTooltip />}
                  wrapperStyle={TOOLTIP_WRAPPER_STYLE}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

                <Line
                  type="monotone"
                  dataKey="totalInvested"
                  name="Principal Invested"
                  stroke="#64748B"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="bankSavings4"
                  name="Bank Savings (4%)"
                  stroke="#64748B"
                  strokeWidth={1.75}
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  baseValue={0}
                  dataKey="fixedDeposit7"
                  name="Fixed Deposit (7%)"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fill="url(#dvSipFdGrad)"
                  fillOpacity={1}
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  baseValue={0}
                  dataKey="gold9"
                  name="Gold / SGB (9%)"
                  stroke="#F59E0B"
                  strokeWidth={2.25}
                  fill="url(#dvSipGoldGrad)"
                  fillOpacity={1}
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  baseValue={0}
                  dataKey="sensex12"
                  name="Sensex Index (12%)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fill="url(#dvSipSensexGrad)"
                  fillOpacity={1}
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  baseValue={0}
                  dataKey="equitySIP15"
                  name="Equity SIP (15%)"
                  stroke="#2563EB"
                  strokeWidth={2.75}
                  fill="url(#dvSipEquityGrad)"
                  fillOpacity={1}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    );
  }
);

WealthCompoundingSimulator.displayName = 'WealthCompoundingSimulator';
