import React, { useMemo, useRef, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { CashflowPoint, ChartViewMode } from '../../types/finance';
import { formatCompactINR } from '../../utils/currency';
import { CustomChartTooltip } from './CustomChartTooltip';

export interface VisibleCashflowSeries {
  inflow: boolean;
  outflow: boolean;
  net: boolean;
}

export interface CashflowTrajectoryChartProps {
  data: CashflowPoint[];
  mode: ChartViewMode;
  selectedCategory?: string | null;
  heightClassName?: string;
  visibleSeries?: VisibleCashflowSeries;
  onHoverPoint?: (point: CashflowPoint | null) => void;
}

// Stable static object references prevent stroke-dasharray resets and unnecessary Recharts diffs
const CHART_MARGIN = { top: 18, right: 16, left: 4, bottom: 6 } as const;
const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0];
const X_AXIS_TICK = { fill: '#64748B', fontSize: 11, fontWeight: 500 } as const;
const Y_AXIS_TICK = { fill: '#64748B', fontSize: 11, fontWeight: 500 } as const;
const INITIAL_DIMENSION = { width: 640, height: 300 } as const;
const DEFAULT_VISIBLE_SERIES: VisibleCashflowSeries = {
  inflow: true,
  outflow: true,
  net: true,
};

const Y_AXIS_DOMAIN: [
  (dataMin: number) => number,
  (dataMax: number) => number,
] = [
  (dataMin: number) => Math.min(0, Number.isFinite(dataMin) ? Math.floor(dataMin * 1.08) : 0),
  (dataMax: number) => Math.max(1000, Number.isFinite(dataMax) ? Math.ceil(dataMax * 1.08) : 1000),
];

const TOOLTIP_CURSOR = {
  stroke: '#06B6D4',
  strokeWidth: 1.5,
  strokeDasharray: '4 4',
  fill: 'rgba(6, 182, 212, 0.06)',
} as const;

const TOOLTIP_WRAPPER_STYLE: React.CSSProperties = {
  zIndex: 50,
  pointerEvents: 'none',
  outline: 'none',
};

const NET_LINE_DOT = {
  r: 3.5,
  fill: '#06B6D4',
  stroke: '#FFFFFF',
  strokeWidth: 1.5,
} as const;
const NET_LINE_ACTIVE_DOT = {
  r: 6,
  fill: '#06B6D4',
  stroke: '#FFFFFF',
  strokeWidth: 2.5,
} as const;

const INFLOW_LINE_DOT = {
  r: 3.5,
  fill: '#10B981',
  stroke: '#FFFFFF',
  strokeWidth: 1.5,
} as const;
const INFLOW_ACTIVE_DOT = {
  r: 6,
  fill: '#10B981',
  stroke: '#FFFFFF',
  strokeWidth: 2.5,
} as const;

const OUTFLOW_LINE_DOT = {
  r: 3.5,
  fill: '#F43F5E',
  stroke: '#FFFFFF',
  strokeWidth: 1.5,
} as const;
const OUTFLOW_ACTIVE_DOT = {
  r: 6,
  fill: '#F43F5E',
  stroke: '#FFFFFF',
  strokeWidth: 2.5,
} as const;

const CATEGORY_LINE_DOT = {
  r: 4,
  fill: '#F59E0B',
  stroke: '#FFFFFF',
  strokeWidth: 1.5,
} as const;
const CATEGORY_ACTIVE_DOT = {
  r: 6,
  fill: '#F59E0B',
  stroke: '#FFFFFF',
  strokeWidth: 2.5,
} as const;

const yTickFormatter = (val: number): string => {
  if (!Number.isFinite(val) || val === 0) return '₹0';
  const sign = val < 0 ? '-' : '';
  return `${sign}${formatCompactINR(Math.abs(val))}`;
};

/**
 * Rebuilt Hybrid Cashflow Visualization Engine:
 * - Multi-color SVG <linearGradient> area fills (<Area baseValue={0}>) for Inflow (Emerald #10B981),
 *   Outflow (Coral-Rose #F43F5E), Net Cashflow (Electric Cyan-Cobalt #06B6D4 -> #2563EB), and Category Spend (Amber #F59E0B).
 * - Vertical gradient-filled rounded bars in Bar and Combined modes.
 * - Hybrid animation: 0ms instant first-frame mount, followed by post-hydration 260ms SVG reveal and
 *   Framer Motion SPRING_FLUID stage transitions when switching chart modes.
 * - Index-throttled crosshair hover callback (`onHoverPoint`) for 60fps header scrubbing.
 */
export const CashflowTrajectoryChart: React.FC<CashflowTrajectoryChartProps> = React.memo(
  ({
    data,
    mode,
    selectedCategory = null,
    heightClassName = 'h-[280px] sm:h-[320px]',
    visibleSeries = DEFAULT_VISIBLE_SERIES,
    onHoverPoint,
  }) => {
    const lastHoveredIndexRef = useRef<number | null>(null);

    const chartData = useMemo(() => {
      if (!Array.isArray(data)) return [];
      return data.map(pt => ({
        ...pt,
        inflow: Number.isFinite(pt.inflow) ? pt.inflow : 0,
        outflow: Number.isFinite(pt.outflow) ? pt.outflow : 0,
        netCashflow: Number.isFinite(pt.netCashflow) ? pt.netCashflow : 0,
        categoryOutflow:
          typeof pt.categoryOutflow === 'number' && Number.isFinite(pt.categoryOutflow)
            ? pt.categoryOutflow
            : 0,
      }));
    }, [data]);

    const handleMouseMove = useCallback(
      (state: any) => {
        if (!onHoverPoint) return;
        const idx =
          typeof state?.activeTooltipIndex === 'number'
            ? state.activeTooltipIndex
            : null;
        if (idx !== null && idx >= 0 && idx < chartData.length) {
          if (lastHoveredIndexRef.current !== idx) {
            lastHoveredIndexRef.current = idx;
            onHoverPoint(chartData[idx]);
          }
        }
      },
      [chartData, onHoverPoint]
    );

    const handleMouseLeave = useCallback(() => {
      if (!onHoverPoint) return;
      if (lastHoveredIndexRef.current !== null) {
        lastHoveredIndexRef.current = null;
        onHoverPoint(null);
      }
    }, [onHoverPoint]);

    const showBars = mode === 'bar' || mode === 'combined';
    const showNetArea = (mode === 'line' || mode === 'combined') && visibleSeries.net;
    const showLineInflowOutflow = mode === 'line';

    return (
      <div className={`${heightClassName} w-full select-none`}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={100}
          minHeight={100}
          initialDimension={INITIAL_DIMENSION}
          debounce={16}
        >
          <ComposedChart
            data={chartData}
            margin={CHART_MARGIN}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Multi-Stop Area Gradients for Line & Combined Modes */}
              <linearGradient id="dvInflowAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.32} />
                <stop offset="65%" stopColor="#059669" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>

              <linearGradient id="dvOutflowAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.28} />
                <stop offset="65%" stopColor="#E11D48" stopOpacity={0.07} />
                <stop offset="100%" stopColor="#E11D48" stopOpacity={0.0} />
              </linearGradient>

              <linearGradient id="dvNetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.34} />
                <stop offset="60%" stopColor="#2563EB" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.0} />
              </linearGradient>

              <linearGradient id="dvCategoryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.34} />
                <stop offset="70%" stopColor="#D97706" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#D97706" stopOpacity={0.0} />
              </linearGradient>

              {/* Vertical Bar Gradients for Bar & Combined Modes */}
              <linearGradient id="dvInflowBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.82} />
              </linearGradient>

              <linearGradient id="dvOutflowBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.75} />
              </linearGradient>

              <linearGradient id="dvCategoryBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#D97706" stopOpacity={0.82} />
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
              tick={X_AXIS_TICK}
              dy={8}
            />
            <YAxis
              width={54}
              domain={Y_AXIS_DOMAIN}
              axisLine={false}
              tickLine={false}
              tick={Y_AXIS_TICK}
              tickFormatter={yTickFormatter}
            />
            <ReferenceLine
              y={0}
              stroke="#64748B"
              strokeOpacity={0.55}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Tooltip
              content={<CustomChartTooltip selectedCategory={selectedCategory} />}
              cursor={TOOLTIP_CURSOR}
              wrapperStyle={TOOLTIP_WRAPPER_STYLE}
              isAnimationActive={false}
            />

            {/* Bar Series: Rendered in 'bar' and 'combined' modes with rich vertical gradients */}
            {showBars && visibleSeries.inflow && (
              <Bar
                key="bar-inflow"
                dataKey="inflow"
                name="Inflow"
                fill="url(#dvInflowBarGrad)"
                stroke="#10B981"
                strokeWidth={0.5}
                radius={BAR_RADIUS}
                maxBarSize={26}
                isAnimationActive={false}
              />
            )}
            {showBars && visibleSeries.outflow && (
              <Bar
                key="bar-outflow"
                dataKey="outflow"
                name="Outflow"
                fill="url(#dvOutflowBarGrad)"
                stroke="#6366F1"
                strokeWidth={0.5}
                radius={BAR_RADIUS}
                maxBarSize={26}
                isAnimationActive={false}
              />
            )}
            {showBars && selectedCategory && (
              <Bar
                key="bar-category"
                dataKey="categoryOutflow"
                name={`${selectedCategory} Spend`}
                fill="url(#dvCategoryBarGrad)"
                stroke="#F59E0B"
                strokeWidth={0.5}
                radius={BAR_RADIUS}
                maxBarSize={22}
                isAnimationActive={false}
              />
            )}

            {/* Colored Area & Line Series for Inflow/Outflow in 'line' mode */}
            {showLineInflowOutflow && visibleSeries.inflow && (
              <Area
                key="area-inflow"
                type="monotone"
                baseValue={0}
                dataKey="inflow"
                name="Inflow"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#dvInflowAreaGrad)"
                fillOpacity={1}
                dot={INFLOW_LINE_DOT}
                activeDot={INFLOW_ACTIVE_DOT}
                isAnimationActive={false}
              />
            )}
            {showLineInflowOutflow && visibleSeries.outflow && (
              <Area
                key="area-outflow"
                type="monotone"
                baseValue={0}
                dataKey="outflow"
                name="Outflow"
                stroke="#F43F5E"
                strokeWidth={2.5}
                fill="url(#dvOutflowAreaGrad)"
                fillOpacity={1}
                dot={OUTFLOW_LINE_DOT}
                activeDot={OUTFLOW_ACTIVE_DOT}
                isAnimationActive={false}
              />
            )}
            {showLineInflowOutflow && selectedCategory && (
              <Area
                key="area-category"
                type="monotone"
                baseValue={0}
                dataKey="categoryOutflow"
                name={`${selectedCategory} Spend`}
                stroke="#F59E0B"
                strokeWidth={2.5}
                fill="url(#dvCategoryAreaGrad)"
                fillOpacity={1}
                dot={CATEGORY_LINE_DOT}
                activeDot={CATEGORY_ACTIVE_DOT}
                isAnimationActive={false}
              />
            )}

            {/* Primary Net Cashflow Trajectory Curve with Luminous Cyan-Cobalt Area Under-Fill */}
            {showNetArea && (
              <Area
                key="area-net"
                type="monotone"
                baseValue={0}
                dataKey="netCashflow"
                name="Net Cashflow"
                stroke="#06B6D4"
                strokeWidth={2.75}
                fill="url(#dvNetAreaGrad)"
                fillOpacity={1}
                dot={NET_LINE_DOT}
                activeDot={NET_LINE_ACTIVE_DOT}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

CashflowTrajectoryChart.displayName = 'CashflowTrajectoryChart';
