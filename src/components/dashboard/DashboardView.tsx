import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  UploadCloud,
  Sparkles,
  Users,
  CalendarClock,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction } from '../../types/finance';
const CashFlowChart = React.lazy(() => import('./CashFlowChart').then(m => ({ default: m.CashFlowChart })));
const CategoryExpenseChart = React.lazy(() => import('./CategoryExpenseChart').then(m => ({ default: m.CategoryExpenseChart })));
import { BudgetHealthWidget } from './BudgetHealthWidget';
import { RecentTransactions } from './RecentTransactions';
import { AIInsightsWidget } from './AIInsightsWidget';
import { CashFlowRunwayCard, RecurringBillsCard } from './RecurringAndRunwayWidget';
import { OwedSummaryWidget } from './OwedSummaryWidget';
import { SetupChecklistCard } from './SetupChecklistCard';
import { Button, Card, Money, Stat } from '../ui';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { LazyInView } from '../common/LazyInView';
import { HealthGauge } from '../gamification/HealthGauge';
import { HealthGaugeCompact } from '../gamification/HealthGaugeCompact';
import { useStaggerChildren } from '../../hooks/useStaggerChildren';

interface DashboardViewProps {
  onOpenAddTx: () => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenAddTx, onEditTransaction }) => {
  const { containerRef: summaryStripRef, getChildStyle: getSummaryStyle } = useStaggerChildren(50);
  const [mobileTab, setMobileTab] = useState<'overview' | 'commitments'>('overview');

  const handleTabChange = (tab: 'overview' | 'commitments') => {
    setMobileTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const {
    transactions,
    totalBalance,
    totalNetWorth,
    peerBalanceSummary,
    totalInvestmentValue,
    totalInvestmentGainLoss,
    totalInvestmentGainLossPct,
    emergencyFund,
    emergencyFundRunwayMonths,
    currentMonthIncome,
    currentMonthExpense,
    currentMonthNet,
    currentMonthSavingsRate,
    setCurrentView,
    resetToDemoData,
  } = useFinance();

  const safeGainLoss = Number.isFinite(totalInvestmentGainLoss) ? totalInvestmentGainLoss : 0;
  const safeGainLossPct = Number.isFinite(totalInvestmentGainLossPct) ? totalInvestmentGainLossPct : 0;
  const safeSavingsRate = Number.isFinite(currentMonthSavingsRate) ? currentMonthSavingsRate : 0;
  const safeRunwayMonths = Number.isFinite(emergencyFundRunwayMonths)
    ? `${emergencyFundRunwayMonths.toFixed(1)} mos`
    : emergencyFundRunwayMonths === Infinity
    ? '∞ mos'
    : '0.0 mos';

  return (
    <div className="space-y-6">
      {/* Welcome Banner when starting fresh (Mineral Card with Gold Accent) */}
      {transactions.length === 0 && (
        <Card variant="surface" padding="none" className="relative overflow-hidden rounded-2xl border-primary/30 p-6 sm:p-8 text-ink-1 shadow-md">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
          <div className="max-w-2xl space-y-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint border border-primary/25 text-xs font-extrabold uppercase tracking-wider text-primary dark:text-primary">
              <Sparkles className="w-3.5 h-3.5 text-primary dark:text-primary" />
              <span>Clean Slate Ready</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-ink-1">
              Welcome to your personal INR Wealth Tracker
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Start building your financial ledger. Log your monthly income, set category budgets, track investments, or import your bank &amp; UPI statement.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={onOpenAddTx}
                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              >
                Add First Transaction
              </Button>

              <Button
                variant="secondary"
                onClick={() => setCurrentView('import')}
                leftIcon={<UploadCloud className="w-4 h-4 text-reward" />}
              >
                Import Statement (CSV/PDF)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Load sample Indian demo dataset (Swiggy, Zepto, HDFC Salary, SIPs, Goals)?')) {
                    resetToDemoData();
                  }
                }}
                className="text-xs text-ink-3 hover:text-ink-1 hover:bg-sunken"
              >
                Load Demo Dataset
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Setup Checklist Card */}
      <SetupChecklistCard onOpenAddTx={onOpenAddTx} />

      {/* LEVEL 1: THE MASTER WEALTH LEDGER ANCHOR */}
      <Card
        variant="hero"
        padding="none"
        className={`rounded-2xl p-4 sm:p-8 ${
          mobileTab !== 'overview' ? 'hidden sm:block' : ''
        }`}
      >
        {/* Suvarna gold accent hairline at top edge */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />

        {/* Master Header: Net Worth & Action Cluster */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
                TOTAL NET WORTH
              </span>
            </div>
            <p className="hidden sm:block text-xs text-ink-3 mb-1">
              Consolidated Personal Wealth (Assets &minus; Liabilities)
            </p>

            <div className="mt-1">
              <div className="flex flex-wrap items-baseline gap-3 mt-0.5">
                <h2 className="font-numeric text-2xl sm:text-5xl font-extrabold tracking-tight text-ink-1 dark:text-slate-50">
                  <AnimatedNumber value={totalNetWorth} showDirection={false} animateOnMount={true} />
                </h2>
                <span
                  className={`font-numeric text-xs font-semibold px-2.5 py-1 rounded-md ${
                    currentMonthNet >= 0
                      ? 'bg-positive-tint text-positive border border-positive/20'
                      : 'bg-negative-tint text-negative border border-negative/20'
                  }`}
                >
                  <Money value={currentMonthNet} size="xs" sign="always" className="text-inherit font-semibold" /> cashflow this month
                </span>
              </div>
              <p className="hidden sm:flex text-xs text-ink-3 mt-2 items-center gap-2 flex-wrap">
                <span>Monthly savings rate:</span>
                <span className="font-numeric font-bold text-ink-1 dark:text-slate-200">
                  {safeSavingsRate.toFixed(1)}%
                </span>
                <span className="text-ink-4 dark:text-ink-3" aria-hidden="true">•</span>
                <button
                  type="button"
                  onClick={() => setCurrentView('people')}
                  className="hover:underline text-indigo-600 dark:text-indigo-400 font-medium"
                >
                  {peerBalanceSummary.displayText}
                </button>
              </p>
            </div>
          </div>

          {/* Action Cluster (Desktop: secondary Split bill action, primary Add is in Sidebar) */}
          <div className="hidden sm:flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentView('people')}
              leftIcon={<Users className="w-4 h-4 text-primary" />}
            >
              Split bill
            </Button>
          </div>
        </div>

        {/* Integrated Flow & Asset Shelves */}
        <div ref={summaryStripRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 sm:mt-7 sm:pt-6 border-t border-line">
          <Card
            variant="sunken"
            padding="sm"
            style={getSummaryStyle(0)}
            onClick={() => setCurrentView('transactions')}
            className="animate-slide-up cursor-pointer hover:bg-line/60 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:shadow-sm"
          >
            <Stat
              label="Bank & Cash"
              icon={<span className="text-xs text-positive font-bold">Liquid</span>}
              value={<Money value={totalBalance} size="2xl" />}
              sub={<><Money value={currentMonthIncome} tone="positive" size="xs" sign="always" /> in this mo</>}
            />
          </Card>

          <Card
            variant="sunken"
            padding="sm"
            style={getSummaryStyle(1)}
            onClick={() => setCurrentView('transactions')}
            className="animate-slide-up cursor-pointer hover:bg-line/60 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:shadow-sm"
          >
            <Stat
              label="Monthly spend"
              icon={<span className="text-xs text-ink-3 font-bold">↓</span>}
              value={<Money value={currentMonthExpense} size="2xl" tone="expense" />}
              sub="Debits & UPI"
            />
          </Card>

          <Card
            variant="sunken"
            padding="sm"
            style={getSummaryStyle(2)}
            onClick={() => setCurrentView('investments')}
            className="animate-slide-up cursor-pointer hover:bg-line/60 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:shadow-sm"
          >
            <Stat
              label="Invested assets"
              icon={
                <span className="text-xs font-numeric font-bold text-reward dark:text-reward">
                  {safeGainLoss >= 0 ? '+' : ''}{safeGainLossPct.toFixed(1)}%
                </span>
              }
              value={<Money value={totalInvestmentValue} size="2xl" />}
              sub="MF, Stocks, Gold, FDs"
            />
          </Card>

          <Card
            variant="sunken"
            padding="sm"
            style={getSummaryStyle(3)}
            onClick={() => setCurrentView('emergency')}
            className="animate-slide-up cursor-pointer hover:bg-line/60 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:shadow-sm"
          >
            <Stat
              label="Liquid runway"
              icon={<span className="text-xs font-semibold text-ink-3">{emergencyFund.targetMonths}m goal</span>}
              value={safeRunwayMonths}
              sub={<><Money value={emergencyFund.currentSaved} size="xs" /> saved</>}
            />
          </Card>
        </div>
      </Card>

      {/* MOBILE SEGMENTED VIEW SWITCHER (sm:hidden) - Sticky beneath top navbar */}
      <div className="sm:hidden sticky top-14 z-20 -mx-4 px-4 py-2 bg-app transition-colors">
        <div className="flex items-center p-1 rounded-2xl bg-sunken border border-line text-xs font-bold shadow-xs">
          <button
            type="button"
            onClick={() => handleTabChange('overview')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 min-h-[44px] rounded-xl transition-colors ${
              mobileTab === 'overview'
                ? 'bg-surface dark:bg-line text-ink-1 dark:text-reward shadow-xs'
                : 'text-ink-3 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('commitments')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 min-h-[44px] rounded-xl transition-colors ${
              mobileTab === 'commitments'
                ? 'bg-surface dark:bg-line text-ink-1 dark:text-reward shadow-xs'
                : 'text-ink-3 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Commitments</span>
          </button>
        </div>
      </div>

      {/* MOBILE CONTENT ACCORDING TO ACTIVE SEGMENT */}
      <div className="sm:hidden space-y-4">
        {mobileTab === 'overview' && (
          <>
            <LazyInView minHeight={260}>
              <React.Suspense fallback={null}>
                <CashFlowChart />
              </React.Suspense>
            </LazyInView>
            <LazyInView minHeight={260}>
              <React.Suspense fallback={null}>
                <CategoryExpenseChart />
              </React.Suspense>
            </LazyInView>
            <HealthGaugeCompact />
            <BudgetHealthWidget />
            <RecentTransactions onEditTransaction={onEditTransaction} />
          </>
        )}
        {mobileTab === 'commitments' && (
          <>
            <CashFlowRunwayCard />
            <RecurringBillsCard />
            <OwedSummaryWidget />
            <AIInsightsWidget />
          </>
        )}
      </div>

      {/* DESKTOP CONTENT (ALL LEVELS IN COMPREHENSIVE GRID) */}
      <div className="hidden sm:block space-y-6">
        {/* LEVEL 2: CASH FLOW VELOCITY & CATEGORY ALLOCATION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <LazyInView minHeight={300}>
              <React.Suspense fallback={null}>
                <CashFlowChart />
              </React.Suspense>
            </LazyInView>
          </div>
          <div className="lg:col-span-5">
            <LazyInView minHeight={300}>
              <React.Suspense fallback={null}>
                <CategoryExpenseChart />
              </React.Suspense>
            </LazyInView>
          </div>
        </div>

        {/* FINANCIAL HEALTH INDEX & 5 PILLARS GAUGE */}
        <div>
          <HealthGauge />
        </div>

        {/* LEVEL 3: OPERATIONAL ACTIVITY & BUDGET HEALTH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7">
            <RecentTransactions onEditTransaction={onEditTransaction} />
          </div>
          <div className="lg:col-span-5">
            <BudgetHealthWidget />
          </div>
        </div>

        {/* LEVEL 4: FINANCIAL COMMITMENTS & OBLIGATIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          <CashFlowRunwayCard />
          <RecurringBillsCard />
          <OwedSummaryWidget />
        </div>

        {/* LEVEL 5: AI FINANCIAL HEALTH ASSISTANT */}
        <div>
          <AIInsightsWidget />
        </div>
      </div>
    </div>
  );
};
