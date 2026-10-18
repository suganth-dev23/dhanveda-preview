import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Waves, BarChart3 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR, formatCompactINR } from '../../utils/currency';
import { getRelativeMonthsList } from '../../utils/date';

const CashFlowTooltip: React.FC<any> = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface/85 backdrop-blur-md p-3.5 rounded-xl shadow-xl border border-line/80 text-xs space-y-2 animate-scale-in min-w-[180px]">
        <p className="font-bold text-ink-1 border-b border-line/60 pb-1.5">
          {label}
        </p>
        <div className="space-y-1.5 pt-0.5">
          {payload.map((item: any) => {
            const swatchColor = item.color || item.stroke || item.fill;
            return (
              <div key={item.name} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-ink-2 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full ring-2"
                    style={{
                      backgroundColor: swatchColor,
                      borderColor: swatchColor,
                      boxShadow: `0 0 6px ${swatchColor}66`,
                    }}
                  />
                  <span>{item.name}</span>
                </span>
                <span className="font-bold font-numeric text-ink-1" data-money="true">
                  {formatINR(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const CashFlowChart: React.FC = () => {
  const { transactions, darkMode } = useFinance();
  const [chartMode, setChartMode] = useState<'wave' | 'bars'>('wave');

  const chartData = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    const months = getRelativeMonthsList(6); // last 6 months

    return months.map(m => {
      const monthTxs = list.filter(t => t.date && t.date.startsWith(m.key));
      const income = monthTxs
        .filter(t => t.type === 'credit')
        .reduce((a, b) => a + (Number.isFinite(b.amount) ? b.amount : 0), 0);
      const expense = monthTxs
        .filter(t => t.type === 'debit')
        .reduce((a, b) => a + (Number.isFinite(b.amount) ? b.amount : 0), 0);
      const net = income - expense;

      return {
        monthKey: m.key,
        name: m.label,
        Income: income,
        Expenses: expense,
        NetSavings: net,
      };
    });
  }, [transactions]);

  const hasActivity = useMemo(() => {
    return (
      Array.isArray(transactions) &&
      transactions.length > 0 &&
      chartData.some(d => d.Income > 0 || d.Expenses > 0)
    );
  }, [transactions, chartData]);

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-6 shadow-xs border border-line flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-ink-1 flex items-center gap-2">
            <span>Cash flow trajectory</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-positive-tint text-positive">
              6 Months
            </span>
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            {chartMode === 'wave'
              ? 'Net liquid savings velocity'
              : 'Income vs Expenses vs Net Savings in INR'}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center p-1 bg-sunken rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setChartMode('wave')}
            className={`flex items-center justify-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl text-xs font-semibold transition-colors ${
              chartMode === 'wave'
                ? 'bg-surface dark:bg-line text-primary shadow-xs'
                : 'text-ink-3 hover:text-ink-1'
            }`}
            title="Minimalist Wave Flow"
          >
            <Waves className="w-4 h-4" />
            <span className="hidden sm:inline">Wave</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bars')}
            className={`flex items-center justify-center gap-1 px-3 py-2 min-h-[44px] min-w-[44px] rounded-xl text-xs font-semibold transition-colors ${
              chartMode === 'bars'
                ? 'bg-surface dark:bg-line text-primary shadow-xs'
                : 'text-ink-3 hover:text-ink-1'
            }`}
            title="Comparison Bars"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Bars</span>
          </button>
        </div>
      </div>

      {!hasActivity ? (
        <div className="w-full h-[260px] sm:h-[300px] flex flex-col items-center justify-center text-center p-6 bg-sunken/40 rounded-2xl border border-dashed border-line text-ink-3">
          <Waves className="w-10 h-10 stroke-1 text-ink-3/40 mb-2.5" />
          <p className="text-sm font-semibold text-ink-2">No cash flow activity yet</p>
          <p className="text-xs text-ink-3 max-w-xs mt-1">
            Log your income and expenses to visualize your 6-month cash flow trajectory.
          </p>
        </div>
      ) : (
        <div
          className="w-full h-[260px] sm:h-[300px] min-h-[260px] sm:min-h-[300px] chart-enter-fade"
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
            {chartMode === 'wave' ? (
              <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldCashFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.12)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                />
                <YAxis
                  width={45}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickFormatter={value => formatCompactINR(value)}
                />
                <Tooltip content={<CashFlowTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  formatter={value => <span className="text-ink-2 font-medium">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="NetSavings"
                  name="Net Savings"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#emeraldCashFlow)"
                  dot={{
                    r: 3.5,
                    fill: '#10b981',
                    strokeWidth: 2,
                    stroke: darkMode ? '#0B0E14' : '#FFFFFF',
                  }}
                  activeDot={{
                    r: 5,
                    fill: '#10B981',
                  }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="Income"
                  name="Income"
                  stroke="#059669"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: '#059669' }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="Expenses"
                  name="Expenses"
                  stroke="#F43F5E"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: '#F43F5E' }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.12)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                />
                <YAxis
                  width={45}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickFormatter={value => formatCompactINR(value)}
                />
                <Tooltip content={<CashFlowTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                  formatter={value => <span className="text-ink-2 font-medium">{value}</span>}
                />
                <Bar
                  dataKey="Income"
                  name="Income"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  minPointSize={3}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="Expenses"
                  name="Expenses"
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  minPointSize={3}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="NetSavings"
                  name="Net Savings"
                  stroke="#F5B742"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: '#F5B742',
                  }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
