import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Investment } from '../../types/finance';
import { formatINR, formatCompactINR } from '../../utils/currency';
import { INDIAN_WEALTH_PALETTE } from '../../constants/theme';

interface PortfolioAllocationChartProps {
 investments: Investment[];
}

const TYPE_COLORS = INDIAN_WEALTH_PALETTE;

const AllocationTooltip: React.FC<any> = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-sunken p-3 rounded-xl shadow-xl border border-slate-700 dark:border-line text-xs font-numeric">
        <p className="font-bold text-white flex items-center gap-2 font-sans">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          {data.name}
        </p>
        <p className="text-slate-300 font-semibold mt-1">
          Valuation: {formatINR(data.value)} ({data.percentage.toFixed(1)}%)
        </p>
        <p className="text-ink-3 text-xs mt-0.5">
          Invested: {formatINR(data.invested)}
        </p>
      </div>
    );
  }
  return null;
};

export const PortfolioAllocationChart: React.FC<PortfolioAllocationChartProps> = ({ investments }) => {
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

 return Object.entries(map).map(([type, stats]) => ({
 name: type,
 value: stats.value,
 invested: stats.invested,
 color: TYPE_COLORS[type] || '#64748B',
 percentage: totalVal > 0 ? (stats.value / totalVal) * 100 : 0,
 })).sort((a, b) => b.value - a.value);
 }, [investments]);

 const totalPortfolioValue = useMemo(() => {
 return investments.reduce((acc, i) => acc + (Number.isFinite(i.currentValue) ? i.currentValue : 0), 0);
 }, [investments]);

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

 {allocationData.length === 0 || totalPortfolioValue <= 0 ? (
 <div className="py-12 text-center text-ink-3 text-xs">
 {allocationData.length === 0 ? 'No investment holdings logged.' : 'Holdings currently valued at ₹0.'}
 </div>
 ) : (
 <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
 <div className="w-full sm:w-1/2 h-[210px] relative flex items-center justify-center">
 <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
 <PieChart>
 <Pie
 data={allocationData}
 dataKey="value"
 nameKey="name"
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={85}
 paddingAngle={3}
 stroke="none"
 animationDuration={500}
 animationEasing="ease-out"
 >
 {allocationData.map(entry => (
 <Cell key={entry.name} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip content={<AllocationTooltip />} />
 </PieChart>
 </ResponsiveContainer>
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
 <span className="text-xs uppercase font-medium text-ink-3">Total Portfolio</span>
 <span className="font-numeric text-sm font-bold text-ink-1">
 {formatCompactINR(totalPortfolioValue)}
 </span>
 </div>
 </div>

 <div className="w-full sm:w-1/2 space-y-2 max-h-52 overflow-y-auto pr-1">
 {allocationData.map(item => (
 <div key={item.name} className="flex items-center justify-between text-xs">
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
