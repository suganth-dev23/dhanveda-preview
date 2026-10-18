import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Investment } from '../../types/finance';
import { formatINR, formatCompactINR } from '../../utils/currency';
import { INDIAN_WEALTH_PALETTE } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AnimatedNumber } from '../common/AnimatedNumber';

interface PortfolioAllocationChartProps {
  investments: Investment[];
}

const TYPE_COLORS = INDIAN_WEALTH_PALETTE;

interface PortfolioTooltipProps {
  active?: boolean;
  payload?: any[];
}

const PortfolioTooltip: React.FC<PortfolioTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const swatchColor = data.color || '#3B82F6';
    const gainLoss = data.value - data.invested;
    const gainPct = data.invested > 0 ? (gainLoss / data.invested) * 100 : 0;
    const isGain = gainLoss >= 0;

    return (
      <div className="bg-surface/85 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-line/80 text-xs space-y-2 animate-scale-in min-w-[190px]">
        <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-1.5">
          <div className="flex items-center gap-2 truncate">
            <span
              className="w-2.5 h-2.5 rounded-full ring-2 shrink-0"
              style={{
                backgroundColor: swatchColor,
                borderColor: swatchColor,
                boxShadow: `0 0 6px ${swatchColor}66`,
              }}
            />
            <span className="font-bold text-ink-1 truncate">{data.name}</span>
          </div>
          <span className="text-[11px] font-bold font-numeric px-1.5 py-0.5 rounded bg-sunken text-ink-2 shrink-0">
            {data.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="space-y-1 pt-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-ink-3 text-[11px]">Valuation</span>
            <span className="font-bold font-numeric text-ink-1" data-money="true">
              {formatINR(data.value)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-ink-3 text-[11px]">
            <span>Invested</span>
            <span className="font-numeric" data-money="true">
              {formatINR(data.invested)}
            </span>
          </div>
          {data.invested > 0 && (
            <div className="flex items-baseline justify-between gap-3 text-[11px] pt-1 border-t border-line/40">
              <span className="text-ink-3">Return</span>
              <span className={`font-numeric font-semibold ${isGain ? 'text-positive' : 'text-negative'}`} data-money="true">
                {isGain ? '+' : ''}{formatINR(gainLoss)} ({isGain ? '+' : ''}{gainPct.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const PortfolioAllocationChart: React.FC<PortfolioAllocationChartProps> = ({ investments }) => {
  const reducedMotion = useReducedMotion();
  const totalPortfolioValue = useMemo(() => {
    return investments.reduce((acc, i) => acc + (Number.isFinite(i.currentValue) ? i.currentValue : 0), 0);
  }, [investments]);

  const totalInvestedAmount = useMemo(() => {
    return investments.reduce((acc, i) => acc + (Number.isFinite(i.investedAmount) ? i.investedAmount : 0), 0);
  }, [investments]);

  const useInvestedFallback = totalPortfolioValue <= 0 && totalInvestedAmount > 0;

  const allocationData = useMemo(() => {
    const map: Record<string, { value: number; invested: number }> = {};

    investments.forEach(i => {
      if (!map[i.type]) {
        map[i.type] = { value: 0, invested: 0 };
      }
      const val = Number.isFinite(i.currentValue) ? i.currentValue : 0;
      const inv = Number.isFinite(i.investedAmount) ? i.investedAmount : 0;
      map[i.type].value += val;
      map[i.type].invested += inv;
    });

    const totalVal = investments.reduce((a, b) => a + (Number.isFinite(b.currentValue) ? b.currentValue : 0), 0);
    const totalInv = investments.reduce((a, b) => a + (Number.isFinite(b.investedAmount) ? b.investedAmount : 0), 0);

    return Object.entries(map).map(([type, stats]) => {
      let pct = 0;
      if (totalVal > 0) {
        pct = (stats.value / totalVal) * 100;
      } else if (totalInv > 0) {
        pct = (stats.invested / totalInv) * 100;
      }
      return {
        name: type,
        value: stats.value,
        invested: stats.invested,
        color: TYPE_COLORS[type] || '#64748B',
        percentage: pct,
      };
    }).sort((a, b) => (useInvestedFallback ? b.invested - a.invested : b.value - a.value));
  }, [investments, useInvestedFallback]);

  return (
    <div className="bg-surface rounded-2xl p-6 shadow-xs border border-line flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-ink-1">
            Asset class allocation
          </h3>
          <p className="text-xs text-ink-3">Diversification across Indian wealth buckets</p>
        </div>
      </div>

      {allocationData.length === 0 || (totalPortfolioValue <= 0 && totalInvestedAmount <= 0) ? (
        <div className="py-12 text-center text-ink-3 text-xs">
          {allocationData.length === 0 ? 'No investment holdings logged.' : 'Holdings currently valued at ₹0.'}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
          <div className="w-full sm:w-1/2 flex items-center justify-center">
            <div className="relative w-[210px] h-[210px] flex items-center justify-center shrink-0">
              <ResponsiveContainer width={210} height={210}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey={useInvestedFallback ? "invested" : "value"}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={allocationData.length > 1 ? 3 : 0}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {allocationData.map(entry => (
                      <Cell key={`cell-alloc-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PortfolioTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center total display: perfectly centered inside the 210x210 square */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center select-none">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-3">
                  {useInvestedFallback ? 'Total Invested' : 'Total Portfolio'}
                </span>
                <span className="font-numeric text-sm sm:text-base font-bold text-ink-1 tracking-tight">
                  <AnimatedNumber value={totalPortfolioValue > 0 ? totalPortfolioValue : totalInvestedAmount} formatter={formatCompactINR} duration={350} animateOnMount={true} />
                </span>
              </div>
            </div>
          </div>

          <div className="w-full sm:w-1/2 space-y-2 max-h-52 overflow-y-auto pr-1">
            {allocationData.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs transition-transform duration-150 hover:translate-x-0.5"
                style={reducedMotion ? undefined : { animation: `fade-in 0.3s ease-out ${idx * 0.05}s both` }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-ink-2 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 font-numeric">
                  <span className="font-semibold text-ink-1">
                    {formatINR(item.value)}
                  </span>
                  <span className="text-xs text-ink-3 w-10 text-right font-medium">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
