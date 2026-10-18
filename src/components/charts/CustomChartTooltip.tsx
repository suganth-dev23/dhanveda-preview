import React from 'react';
import { formatINR } from '../../utils/currency';
import { roundINR } from '../../utils/math';

export interface CustomChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    stroke?: string;
    fill?: string;
    dataKey?: string;
    payload?: {
      id?: string;
      label?: string;
      inflow?: number;
      outflow?: number;
      netCashflow?: number;
      cumulative?: number;
      categoryOutflow?: number;
    };
  }>;
  label?: string;
  selectedCategory?: string | null;
}

/**
 * Memoized high-frame-rate Recharts tooltip (fixes CF-05).
 * Never mutates parent React state on mouse move and renders with strict `tabular-nums`.
 */
export const CustomChartTooltip: React.FC<CustomChartTooltipProps> = React.memo(
  ({ active, payload, label, selectedCategory }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const pointData = payload[0]?.payload;
    const netValue = pointData?.netCashflow;
    const cumulativeValue = pointData?.cumulative;

    return (
      <div className="bg-surface/95 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-line text-xs space-y-2 min-w-[205px] pointer-events-none select-none">
        <div className="flex items-center justify-between border-b border-line/70 pb-1.5 gap-3">
          <span className="font-bold text-ink-1">{label}</span>
          {pointData?.id && (
            <span className="font-numeric tabular-nums text-[11px] text-ink-3">
              {pointData.id}
            </span>
          )}
        </div>

        <div className="space-y-1.5 pt-0.5">
          {payload.map(entry => {
            const rawVal = typeof entry.value === 'number' ? roundINR(entry.value) : 0;
            const swatchColor = entry.color || entry.stroke || entry.fill || '#1A73E8';
            return (
              <div
                key={String(entry.dataKey || entry.name)}
                className="flex items-center justify-between gap-4"
              >
                <span className="flex items-center gap-2 text-ink-2 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: swatchColor }}
                  />
                  <span>{entry.name}</span>
                </span>
                <span
                  data-money="true"
                  className={`font-bold font-numeric tabular-nums ${
                    rawVal < 0 ? 'text-negative' : 'text-ink-1'
                  }`}
                >
                  {rawVal < 0 ? `-${formatINR(Math.abs(rawVal))}` : formatINR(rawVal)}
                </span>
              </div>
            );
          })}
        </div>

        {typeof cumulativeValue === 'number' && (
          <div className="pt-1.5 border-t border-line/70 flex items-center justify-between gap-4 text-[11px]">
            <span className="text-ink-3 font-medium">Running Trajectory</span>
            <span
              data-money="true"
              className={`font-semibold font-numeric tabular-nums ${
                cumulativeValue >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {cumulativeValue >= 0
                ? `+${formatINR(roundINR(cumulativeValue))}`
                : `-${formatINR(Math.abs(roundINR(cumulativeValue)))}`}
            </span>
          </div>
        )}

        {selectedCategory && typeof netValue === 'number' && (
          <div className="pt-1 text-[11px] text-ink-3">
            Filtered highlight: <span className="font-semibold text-ink-1">{selectedCategory}</span>
          </div>
        )}
      </div>
    );
  }
);

CustomChartTooltip.displayName = 'CustomChartTooltip';
