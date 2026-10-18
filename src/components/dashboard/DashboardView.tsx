import React, { useState, useCallback, useMemo } from 'react';
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
import { CashFlowChart } from './CashFlowChart';
import { CategoryExpenseChart } from './CategoryExpenseChart';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { BudgetHealthWidget } from './BudgetHealthWidget';
import { RecentTransactions } from './RecentTransactions';
import { AIInsightsWidget } from './AIInsightsWidget';
import { CashFlowRunwayCard, RecurringBillsCard } from './RecurringAndRunwayWidget';
import { OwedSummaryWidget } from './OwedSummaryWidget';
import { SetupChecklistCard } from './SetupChecklistCard';
import { Button, Card, Money, Stat, AnimatedCurrency, SegmentedPill, SegmentedPillOption } from '../ui';
import { HealthGauge } from '../gamification/HealthGauge';
import { HealthGaugeCompact } from '../gamification/HealthGaugeCompact';
import { DashboardShell, DashboardSection } from './DashboardShell';
import { QuickLogAndAnomalyWidget } from './QuickLogAndAnomalyWidget';
import { CashflowCalendarHeatmap } from './CashflowCalendarHeatmap';
import { LazyInView } from '../common/LazyInView';

interface DashboardViewProps {
  onOpenAddTx: () => void;
  onEditTransaction?: (tx: Transaction) => void;
}

type MobileDashboardTab = 'overview' | 'commitments';

const MOBILE_TAB_OPTIONS: SegmentedPillOption<MobileDashboardTab>[] = [
  {
    value: 'overview',
    label: 'Overview',
    icon: <Wallet className="w-3.5 h-3.5" />,
  },
  {
    value: 'commitments',
    label: 'Commitments',
    icon: <CalendarClock className="w-3.5 h-3.5" />,
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddTx,
  onEditTransaction,
}) => {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const [mobileTab, setMobileTab] = useState<MobileDashboardTab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleTabChange = useCallback((tab: MobileDashboardTab) => {
    setMobileTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearCategory = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const {
    isInitialized,
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
  const safeGainLossPct = Number.isFinite(totalInvestmentGainLossPct)
    ? totalInvestmentGainLossPct
    : 0;
  const safeSavingsRate = Number.isFinite(currentMonthSavingsRate) ? currentMonthSavingsRate : 0;
  const safeRunwayMonths = useMemo(() => {
    if (Number.isFinite(emergencyFundRunwayMonths)) {
      return `${emergencyFundRunwayMonths.toFixed(1)} mos`;
    }
    return emergencyFundRunwayMonths === Infinity ? '∞ mos' : '0.0 mos';
  }, [emergencyFundRunwayMonths]);

  return (
    <DashboardShell className="space-y-6">
      {/* Welcome Banner when starting fresh (guarded by isInitialized to prevent layout shift during DB hydration) */}
      {isInitialized && transactions.length === 0 && (
        <DashboardSection>
          <Card
            variant="surface"
            padding="none"
            className="relative overflow-hidden rounded-2xl border-primary/30 p-6 sm:p-8 text-ink-1 shadow-md"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
            <div className="max-w-2xl space-y-3 relative z-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
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
                    resetToDemoData();
                  }}
                  className="text-xs text-ink-3 hover:text-ink-1 hover:bg-sunken"
                >
                  Load Demo Dataset
                </Button>
              </div>
            </div>
          </Card>
        </DashboardSection>
      )}

      {/* Setup Checklist Card */}
      <DashboardSection>
        <SetupChecklistCard onOpenAddTx={onOpenAddTx} />
      </DashboardSection>

      {/* LEVEL 1: THE MASTER WEALTH LEDGER ANCHOR */}
      <DashboardSection
        className={mobileTab !== 'overview' ? 'hidden sm:block' : ''}
      >
        <Card variant="hero" padding="none" className="rounded-2xl p-4 sm:p-8">
          {/* Suvarna gold accent hairline at top edge */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />

          {/* Master Header: Net Worth & Action Cluster */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
                  <Wallet className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-ink-3">
                  Total Net Worth
                </span>
              </div>
              <p className="hidden sm:block text-xs text-ink-3 mb-1">
                Consolidated Personal Wealth (Assets &minus; Liabilities)
              </p>

              <div className="mt-1">
                <div className="flex flex-wrap items-baseline gap-3 mt-0.5">
                  <h2 className="font-numeric tabular-nums text-2xl sm:text-5xl font-extrabold tracking-tight text-ink-1 dark:text-slate-50">
                    <AnimatedCurrency value={totalNetWorth} />
                  </h2>
                  <span
                    className={`font-numeric tabular-nums text-xs font-semibold ${
                      currentMonthNet >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    <AnimatedCurrency
                      value={currentMonthNet}
                      sign="always"
                      className="font-bold"
                    />{' '}
                    cashflow this month
                  </span>
                </div>
                <p className="hidden sm:flex text-xs text-ink-3 mt-2 items-center gap-2 flex-wrap font-numeric tabular-nums">
                  <span>Monthly savings rate:</span>
                  <span className="font-bold text-ink-1 dark:text-slate-200">
                    {safeSavingsRate.toFixed(1)}%
                  </span>
                  <span className="text-ink-3" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentView('people')}
                    className="hover:underline text-primary font-medium cursor-pointer"
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

          {/* Integrated Flow & Asset Shelves with tactile spring micro-interactions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 sm:mt-7 sm:pt-6 border-t border-line">
            <div>
              <Card
                variant="sunken"
                padding="sm"
                onClick={() => setCurrentView('transactions')}
                className="cursor-pointer hover:bg-line/60 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 h-full"
              >
                <Stat
                  label="Bank & Cash"
                  icon={<span className="text-xs text-positive font-bold">Liquid</span>}
                  value={<AnimatedCurrency value={totalBalance} className="text-2xl sm:text-3xl font-extrabold text-ink-1" />}
                  sub={
                    <>
                      <Money value={currentMonthIncome} tone="positive" size="xs" sign="always" /> in this mo
                    </>
                  }
                />
              </Card>
            </div>

            <div>
              <Card
                variant="sunken"
                padding="sm"
                onClick={() => setCurrentView('transactions')}
                className="cursor-pointer hover:bg-line/60 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 h-full"
              >
                <Stat
                  label="Monthly spend"
                  icon={<span className="text-xs text-ink-3 font-bold">↓</span>}
                  value={<AnimatedCurrency value={currentMonthExpense} className="text-2xl sm:text-3xl font-extrabold text-ink-1" />}
                  sub="Debits & UPI"
                />
              </Card>
            </div>

            <div>
              <Card
                variant="sunken"
                padding="sm"
                onClick={() => setCurrentView('investments')}
                className="cursor-pointer hover:bg-line/60 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 h-full"
              >
                <Stat
                  label="Invested assets"
                  icon={
                    <span className="text-xs font-numeric tabular-nums font-bold text-reward dark:text-reward">
                      {safeGainLoss >= 0 ? '+' : ''}
                      {safeGainLossPct.toFixed(1)}%
                    </span>
                  }
                  value={<AnimatedCurrency value={totalInvestmentValue} className="text-2xl sm:text-3xl font-extrabold text-ink-1" />}
                  sub="MF, Stocks, Gold, FDs"
                />
              </Card>
            </div>

            <div>
              <Card
                variant="sunken"
                padding="sm"
                onClick={() => setCurrentView('emergency')}
                className="cursor-pointer hover:bg-line/60 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 h-full"
              >
                <Stat
                  label="Liquid runway"
                  icon={
                    <span className="text-xs font-semibold text-ink-3 font-numeric tabular-nums">
                      {emergencyFund.targetMonths}m goal
                    </span>
                  }
                  value={<span className="font-numeric tabular-nums">{safeRunwayMonths}</span>}
                  sub={
                    <>
                      <Money value={emergencyFund.currentSaved} size="xs" /> saved
                    </>
                  }
                />
              </Card>
            </div>
          </div>
        </Card>
      </DashboardSection>

      {/* MOBILE SEGMENTED VIEW SWITCHER (sm:hidden) - Shared-element SegmentedPill */}
      <div className="sm:hidden sticky top-14 z-20 -mx-4 px-4 py-2 bg-app transition-colors">
        <SegmentedPill
          options={MOBILE_TAB_OPTIONS}
          value={mobileTab}
          onChange={handleTabChange}
          layoutId="mobile-dashboard-segment"
          size="md"
          className="w-full grid grid-cols-2"
          ariaLabel="Mobile dashboard view mode"
        />
      </div>

      {/* MOBILE CONTENT ACCORDING TO ACTIVE SEGMENT */}
      <div className="sm:hidden space-y-4">
        {isMobile && mobileTab === 'overview' && (
          <>
            <QuickLogAndAnomalyWidget
              onSelectCategoryFilter={setSelectedCategory}
              onOpenFullAddModal={onOpenAddTx}
            />
            <CashFlowChart
              selectedCategory={selectedCategory}
              onClearCategory={handleClearCategory}
            />
            <CategoryExpenseChart />
            <HealthGaugeCompact />
            <BudgetHealthWidget
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            <RecentTransactions onEditTransaction={onEditTransaction} />
          </>
        )}
        {isMobile && mobileTab === 'commitments' && (
          <>
            <CashflowCalendarHeatmap onOpenAddTx={onOpenAddTx} />
            <CashFlowRunwayCard />
            <RecurringBillsCard />
            <OwedSummaryWidget />
            <AIInsightsWidget />
          </>
        )}
      </div>

      {/* DESKTOP CONTENT (ALL LEVELS IN COMPREHENSIVE STAGGERED GRID) */}
      {!isMobile && (
        <div className="hidden sm:block space-y-6">
          {/* LEVEL 1.5: 1-TAP UPI QUICK LOG & SPENDING SPIKE RADAR */}
          <DashboardSection>
            <QuickLogAndAnomalyWidget
              onSelectCategoryFilter={setSelectedCategory}
              onOpenFullAddModal={onOpenAddTx}
            />
          </DashboardSection>

          {/* LEVEL 2: CASH FLOW VELOCITY & CATEGORY ALLOCATION */}
          <DashboardSection className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <CashFlowChart
                selectedCategory={selectedCategory}
                onClearCategory={handleClearCategory}
              />
            </div>
            <div className="lg:col-span-5">
              <CategoryExpenseChart />
            </div>
          </DashboardSection>

          {/* LEVEL 2.5: INTERACTIVE MONTHLY CASHFLOW CALENDAR & BILL HEATMAP */}
          <DashboardSection>
            <LazyInView minHeight={320} rootMargin="250px">
              <CashflowCalendarHeatmap onOpenAddTx={onOpenAddTx} />
            </LazyInView>
          </DashboardSection>

          {/* FINANCIAL HEALTH INDEX & 5 PILLARS GAUGE */}
          <DashboardSection>
            <LazyInView minHeight={220} rootMargin="250px">
              <HealthGauge />
            </LazyInView>
          </DashboardSection>

          {/* LEVEL 3: OPERATIONAL ACTIVITY & BUDGET HEALTH (Cross-linked to CashFlowChart) */}
          <DashboardSection className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7">
              <RecentTransactions onEditTransaction={onEditTransaction} />
            </div>
            <div className="lg:col-span-5">
              <BudgetHealthWidget
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </div>
          </DashboardSection>

          {/* LEVEL 4: FINANCIAL COMMITMENTS & OBLIGATIONS */}
          <LazyInView minHeight={240} rootMargin="250px">
            <DashboardSection className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              <CashFlowRunwayCard />
              <RecurringBillsCard />
              <OwedSummaryWidget />
            </DashboardSection>
          </LazyInView>

          {/* LEVEL 5: AI FINANCIAL HEALTH ASSISTANT */}
          <DashboardSection>
            <LazyInView minHeight={200} rootMargin="250px">
              <AIInsightsWidget />
            </LazyInView>
          </DashboardSection>
        </div>
      )}
    </DashboardShell>
  );
};
