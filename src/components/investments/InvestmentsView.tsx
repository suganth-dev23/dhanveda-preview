import React, { useState, useMemo } from 'react';
import {
 Plus,
 TrendingUp,
 Edit3,
 Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Investment } from '../../types/finance';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { EmptyState } from '../common/EmptyState';
import { InvestmentModal } from './InvestmentModal';
import { PortfolioAllocationChart } from './PortfolioAllocationChart';
import { INDIAN_WEALTH_PALETTE } from '../../constants/theme';
import { useStaggerChildren } from '../../hooks/useStaggerChildren';
import { Button, Card, Money, Stat } from '../ui';

function calculateCAGR(investedAmount: number, currentValue: number, years: number): number | null {
 if (!Number.isFinite(investedAmount) || !Number.isFinite(currentValue) || !Number.isFinite(years)) return null;
 if (investedAmount <= 0 || currentValue <= 0 || years <= 0) return null;
 try {
 const cagr = Math.pow(currentValue / investedAmount, 1 / years) - 1;
 return Number.isFinite(cagr) ? cagr * 100 : null;
 } catch {
 return null;
 }
}

export const InvestmentsView: React.FC = () => {
 const { containerRef: assetGridRef, getChildStyle } = useStaggerChildren(50);
 const {
 investments,
 totalInvestmentValue,
 totalInvestedAmount,
 totalInvestmentGainLoss,
 totalInvestmentGainLossPct,
 deleteInvestment,
 } = useFinance();

 const safeTotalValue = Number.isFinite(totalInvestmentValue) ? totalInvestmentValue : 0;
 const safeTotalInvested = Number.isFinite(totalInvestedAmount) ? totalInvestedAmount : 0;
 const safeTotalGainLoss = Number.isFinite(totalInvestmentGainLoss) ? totalInvestmentGainLoss : 0;
 const safeTotalGainLossPct = Number.isFinite(totalInvestmentGainLossPct) ? totalInvestmentGainLossPct : 0;

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
 const [filterType, setFilterType] = useState<string>('all');

 const totalMonthlySIP = useMemo(() => {
 return investments.reduce((sum, i) => sum + (Number.isFinite(i.sipAmount) && i.sipAmount ? i.sipAmount : 0), 0);
 }, [investments]);

 const filteredList = useMemo(() => {
 if (filterType === 'all') return investments;
 return investments.filter(i => i.type.toLowerCase() === filterType.toLowerCase());
 }, [investments, filterType]);

 const handleOpenAdd = () => {
 setSelectedInvestment(null);
 setIsModalOpen(true);
 };

 const handleEdit = (inv: Investment) => {
 setSelectedInvestment(inv);
 setIsModalOpen(true);
 };

 const CATEGORY_COLORS = INDIAN_WEALTH_PALETTE;

 // Asset allocation segments
 const assetSegments = useMemo(() => {
 const map: Record<string, { value: number; invested: number; count: number }> = {};
 investments.forEach(i => {
 if (!map[i.type]) {
 map[i.type] = { value: 0, invested: 0, count: 0 };
 }
 const val = Number.isFinite(i.currentValue) ? i.currentValue : 0;
 const inv = Number.isFinite(i.investedAmount) ? i.investedAmount : 0;
 map[i.type].value += val;
 map[i.type].invested += inv;
 map[i.type].count += 1;
 });

 const total = safeTotalValue > 0 ? safeTotalValue : 1;
 return Object.entries(map).map(([type, data]) => {
 const gain = data.value - data.invested;
 const gainPct = data.invested > 0 ? (gain / data.invested) * 100 : 0;
 const safeGainPct = Number.isFinite(gainPct) ? gainPct : 0;
 return {
 type,
 value: data.value,
 invested: data.invested,
 gain,
 gainPct: safeGainPct,
 count: data.count,
 percentage: safeTotalValue > 0 ? (data.value / total) * 100 : 0,
 color: CATEGORY_COLORS[type] || '#64748b',
 };
 }).sort((a, b) => b.value - a.value);
 }, [investments, safeTotalValue, CATEGORY_COLORS]);

 return (
 <div className="space-y-6 max-w-7xl mx-auto pb-16">
 {/* Portfolio Hero Card: Mineral Card with Gold Valuation Highlight */}
 <Card variant="hero" padding="none" className="rounded-2xl text-ink-1 p-4 sm:p-8">
 <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
 <TrendingUp className="h-4 w-4" />
 </span>
 <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
 PORTFOLIO WEALTH &amp; ASSETS
 </span>
 </div>
 <p className="text-xs text-ink-3 mb-1">
 Current Valuation &amp; Capital Aggregate
 </p>
 <div className="flex flex-wrap items-baseline gap-3">
 <h2 className="text-3xl sm:text-4xl font-black font-numeric tracking-tight text-ink-1">
 <AnimatedNumber value={safeTotalValue} animateOnMount={true} />
 </h2>
 <span
 className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-numeric ${
 safeTotalGainLoss >= 0
 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20'
 : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/20'
 }`}
 >
 {safeTotalGainLoss >= 0 ? '+' : ''}<AnimatedNumber value={safeTotalGainLoss} animateOnMount={true} /> ({safeTotalGainLossPct >= 0 ? '+' : ''}{safeTotalGainLossPct.toFixed(1)}%)
 </span>
 </div>
 <p className="mt-2 text-xs text-ink-3">
 Invested: <span className="font-semibold font-numeric text-ink-1"><AnimatedNumber value={safeTotalInvested} animateOnMount={true} /></span> • Monthly SIPs: <span className="font-semibold font-numeric text-reward dark:text-reward"><AnimatedNumber value={totalMonthlySIP} animateOnMount={true} /></span>
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <Button
 variant="primary"
 size="md"
 onClick={handleOpenAdd}
 leftIcon={<Plus className="h-4 w-4 stroke-[2.5]" />}
 >
 Add Holding
 </Button>
 </div>
 </div>

 {/* 4-column summary strip */}
 <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-line">
 <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
 <Stat
 label="Invested Capital"
 value={safeTotalInvested}
 moneyProps={{ tone: 'neutral', size: 'lg' }}
 />
 </Card>

 <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
 <Stat
 label="Total Returns"
 value={safeTotalGainLoss}
 moneyProps={{
 tone: safeTotalGainLoss >= 0 ? 'positive' : 'negative',
 sign: 'always',
 size: 'lg',
 }}
 delta={safeTotalGainLossPct}
 />
 </Card>

 <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
 <Stat
 label="Monthly SIPs"
 value={totalMonthlySIP}
 moneyProps={{ tone: 'neutral', size: 'lg' }}
 />
 </Card>

 <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
 <Stat
 label="Total Holdings"
 value={String(investments.length)}
 />
 </Card>
 </div>

 {/* Horizontal Asset Allocation Bar */}
 {investments.length > 0 && (
 <div className="mt-6 pt-5 border-t border-line relative z-10">
 <div className="flex items-center justify-between text-xs text-ink-3 mb-2.5 font-medium">
 <span>Asset Allocation Breakdown</span>
 <span>{investments.length} Total Holdings</span>
 </div>

 {/* Segmented bar */}
 <div
 className="h-3 w-full rounded-full bg-sunken overflow-hidden flex gap-0.5 p-0.5 border border-line"
 role="progressbar"
 aria-label="Portfolio asset allocation breakdown"
 aria-valuenow={100}
 aria-valuemin={0}
 aria-valuemax={100}
 >
 {assetSegments.map(seg => (
 <div
 key={seg.type}
 style={{ width: `${Math.max(seg.percentage, 2)}%`, backgroundColor: seg.color }}
 className="h-full rounded-full transition-[width] duration-500"
 title={`${seg.type}: ${seg.percentage.toFixed(1)}%`}
 />
 ))}
 </div>

 {/* Chips legend */}
 <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3.5 text-xs">
 {assetSegments.map(seg => (
 <button
 key={seg.type}
 onClick={() => setFilterType(filterType === seg.type ? 'all' : seg.type)}
 className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
 >
 <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
 <span className="font-medium text-ink-2">{seg.type}</span>
 <span className="font-numeric text-ink-3 text-xs">{seg.percentage.toFixed(1)}%</span>
 </button>
 ))}
 </div>
 </div>
 )}
 </Card>

 {investments.length === 0 ? (
 <EmptyState
 icon={TrendingUp}
 title="No investment holdings recorded"
 description="Track your Indian mutual funds, equities, fixed deposits, gold, and PPF assets in one consolidated ledger."
 actionLabel="Add First Holding"
 onAction={handleOpenAdd}
 />
 ) : (
 <>
 {/* Asset Category Cards Grid */}
 {assetSegments.length > 0 && (
 <div className="space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 Asset Class Allocation
 </h3>
 <p className="text-xs text-ink-3">
 Holdings distribution across Indian mutual funds, equities, FDs, and gold
 </p>
 </div>
 <span className="text-xs font-semibold text-ink-3">
 {assetSegments.length} asset classes
 </span>
 </div>

 <div ref={assetGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {assetSegments.map((seg, idx) => (
 <Card
 key={seg.type}
 variant="interactive"
 padding="md"
 style={getChildStyle(idx)}
 onClick={() => setFilterType(filterType === seg.type ? 'all' : seg.type)}
 className={`rounded-2xl transition-[transform,box-shadow,border-color] duration-200 animate-slide-up ${
 filterType === seg.type
 ? '!border-reward ring-1 ring-reward/40 shadow-sm'
 : ''
 }`}
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <span className="text-xs font-medium text-ink-3">
 {seg.type}
 </span>
 <span
 className="w-2.5 h-2.5 rounded-full"
 style={{ backgroundColor: seg.color }}
 />
 </div>

 <div className="mt-2">
 <Money value={seg.value} size="lg" />
 </div>

 <div className="flex items-center justify-between mt-2 pt-2 border-t border-line text-xs">
 <span className="text-ink-3 font-medium">
 {seg.count} {seg.count === 1 ? 'holding' : 'holdings'}
 </span>
 <span
 className={`font-semibold font-numeric ${
 seg.gain >= 0 ? 'text-positive' : 'text-negative'
 }`}
 >
 {seg.gain >= 0 ? '+' : ''}{seg.gainPct.toFixed(1)}%
 </span>
 </div>
 </Card>
 ))}
 </div>
 </div>
 )}

 {/* Donut Chart View (Collapsible / Secondary) */}
 {investments.length > 0 && <PortfolioAllocationChart investments={investments} />}

 {/* Holdings List with Filters */}
 {investments.length === 0 ? (
 <div className="text-center py-16 bg-surface rounded-2xl border border-dashed border-line p-8">
 <div className="w-12 h-12 rounded-full bg-primary-tint flex items-center justify-center mx-auto text-reward">
 <TrendingUp className="w-6 h-6" />
 </div>
 <h3 className="mt-3 text-base font-bold text-ink-1">No investment holdings logged yet</h3>
 <p className="text-xs text-ink-3 mt-1 max-w-sm mx-auto">
 Track your Mutual Funds, Indian Equities, Fixed Deposits, Gold/SGB, EPF/PPF, or NPS in one place.
 </p>
 <Button
 variant="primary"
 size="sm"
 onClick={handleOpenAdd}
 className="mt-4"
 >
 Add Your First Holding
 </Button>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h3 className="text-lg font-bold text-ink-1 tracking-tight">
 All Holdings
 </h3>
 <p className="text-xs text-ink-3">
 Track performance, SIP schedules, and valuations across brokers
 </p>
 </div>
 <div className="flex items-center gap-2 self-start sm:self-auto">
 <label className="text-xs text-ink-3 font-medium">Filter:</label>
 <select
 value={filterType}
 onChange={e => setFilterType(e.target.value)}
 className="py-1.5 px-3 bg-sunken border border-line rounded-xl text-xs font-semibold text-ink-1 focus:outline-none"
 >
 <option value="all">All Asset Classes</option>
 <option value="Mutual Funds">Mutual Funds</option>
 <option value="Stocks">Stocks</option>
 <option value="Fixed Deposit (FD)">Fixed Deposit (FD)</option>
 <option value="Gold / SGB">Gold / SGB</option>
 <option value="PPF / EPF">PPF / EPF</option>
 <option value="Crypto">Crypto</option>
 </select>
 </div>
 </div>

 <Card variant="surface" padding="lg" className="rounded-2xl overflow-hidden">

 {/* Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-line text-xs font-medium text-ink-3">
 <th className="py-3 px-4">Scheme / Asset</th>
 <th className="py-3 px-4">Asset Class</th>
 <th className="py-3 px-4">Platform</th>
 <th className="py-3 px-4 text-right">Invested</th>
 <th className="py-3 px-4 text-right">Current Value</th>
 <th className="py-3 px-4 text-right">Gain / Loss</th>
 <th className="py-3 px-4 text-center">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-line text-sm">
 {filteredList.map(inv => {
 const safeInv = Number.isFinite(inv.investedAmount) ? inv.investedAmount : 0;
 const safeVal = Number.isFinite(inv.currentValue) ? inv.currentValue : 0;
 const gain = safeVal - safeInv;
 const gainPct = safeInv > 0 ? (gain / safeInv) * 100 : 0;
 const safeGainPct = Number.isFinite(gainPct) ? gainPct : 0;
 const isProfitable = gain >= 0;

 // Safe CAGR calculation if holding date is recorded (min 90 days)
 let cagrPct: number | null = null;
 if (inv.lastUpdated && safeInv > 0 && safeVal > 0) {
 const updatedTime = new Date(inv.lastUpdated).getTime();
 if (!isNaN(updatedTime)) {
 const daysHeld = Math.max(1, (new Date().getTime() - updatedTime) / (1000 * 60 * 60 * 24));
 if (daysHeld >= 90) {
 cagrPct = calculateCAGR(safeInv, safeVal, daysHeld / 365.25);
 }
 }
 }

 return (
 <tr key={inv.id} className="hover:bg-sunken/60 transition-colors">
 <td className="py-3.5 px-4 font-semibold text-ink-1">
 <div>
 <p>{inv.name}</p>
 {inv.sipAmount && (
 <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium font-numeric">
 SIP: <Money value={inv.sipAmount} size="xs" tone="positive" />/mo {inv.sipDay ? `(Day ${inv.sipDay})` : ''}
 </p>
 )}
 </div>
 </td>

 <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-ink-2">
 <span className="px-2.5 py-1 rounded-full bg-sunken text-ink-2">
 {inv.type}
 </span>
 </td>

 <td className="py-3.5 px-4 whitespace-nowrap text-xs text-ink-3">
 {inv.platform || '—'}
 </td>

 <td className="py-3.5 px-4 text-right whitespace-nowrap font-semibold font-numeric text-ink-2">
 <Money value={safeInv} size="sm" tone="neutral" />
 </td>

 <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold font-numeric text-ink-1">
 <Money value={safeVal} size="sm" tone="neutral" />
 </td>

 <td className="py-3.5 px-4 text-right whitespace-nowrap font-numeric">
 <div className="flex flex-col items-end gap-0.5">
 <span
 className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-semibold ${
 isProfitable
 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
 : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
 }`}
 >
 {isProfitable ? '+' : ''}{safeGainPct.toFixed(1)}% (<Money value={gain} sign="always" tone={isProfitable ? 'positive' : 'negative'} size="xs" />)
 </span>
 {cagrPct !== null && (
 <span className="text-xs text-ink-3 font-medium">
 CAGR: {cagrPct >= 0 ? '+' : ''}{cagrPct.toFixed(1)}% p.a.
 </span>
 )}
 </div>
 </td>

 <td className="py-3.5 px-4 text-center whitespace-nowrap">
 <div className="flex items-center justify-center gap-1.5">
 <button
 onClick={() => handleEdit(inv)}
 className="flex h-8 w-8 items-center justify-center rounded-xl border border-line text-ink-3 hover:bg-sunken hover:text-ink-1 transition-colors"
 title="Edit Valuation"
 >
 <Edit3 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => {
 if (window.confirm(`Delete holding "${inv.name}"?`)) {
 deleteInvestment(inv.id);
 }
 }}
 className="flex h-8 w-8 items-center justify-center rounded-xl border border-line text-ink-3 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
 title="Delete Holding"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </Card>
 </div>
 )}
 </>
 )}

 <InvestmentModal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 initialInvestment={selectedInvestment}
 />
 </div>
 );
};
