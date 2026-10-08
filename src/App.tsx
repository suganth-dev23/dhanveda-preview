import React, { useState, useEffect, Suspense, lazy } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { GamificationProvider } from './context/GamificationContext';
import { ToastProvider } from './components/common/ToastProvider';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { VIEW_TITLES } from './constants/viewTitles';
import { MobileNav } from './components/layout/MobileNav';
import { MobileMoreDrawer } from './components/layout/MobileMoreDrawer';
import { TransactionModal } from './components/transactions/TransactionModal';
import { ViewSkeleton } from './components/common/ViewSkeleton';
import { ViewTransition } from './components/common/ViewTransition';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { exportRawIndexedDBData } from './utils/recordValidation';
import { AlertTriangle, Download, RefreshCw, X } from 'lucide-react';
import type { Transaction } from './types/finance';

import { DashboardView } from './components/dashboard/DashboardView';
const TransactionListView = lazy(() =>
  import('./components/transactions/TransactionListView').then(m => ({ default: m.TransactionListView }))
);
const PeopleView = lazy(() =>
  import('./components/people/PeopleView').then(m => ({ default: m.PeopleView }))
);
const BudgetsView = lazy(() =>
  import('./components/budgets/BudgetsView').then(m => ({ default: m.BudgetsView }))
);
const RecurringPaymentsView = lazy(() =>
  import('./components/recurring/RecurringPaymentsView').then(m => ({ default: m.RecurringPaymentsView }))
);
const CategoriesView = lazy(() =>
  import('./components/categories/CategoriesView').then(m => ({ default: m.CategoriesView }))
);
const EmergencyFundView = lazy(() =>
  import('./components/emergency/EmergencyFundView').then(m => ({ default: m.EmergencyFundView }))
);
const InvestmentsView = lazy(() =>
  import('./components/investments/InvestmentsView').then(m => ({ default: m.InvestmentsView }))
);
const DreamsView = lazy(() =>
  import('./components/dreams/DreamsView').then(m => ({ default: m.DreamsView }))
);
const AIHealthSummaryView = lazy(() =>
  import('./components/ai/AIHealthSummaryView').then(m => ({ default: m.AIHealthSummaryView }))
);
const StatementImportView = lazy(() =>
  import('./components/import/StatementImportView').then(m => ({ default: m.StatementImportView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView }))
);
const BadgeShowcase = lazy(() =>
  import('./components/gamification/BadgeShowcase').then(m => ({ default: m.BadgeShowcase }))
);
import { BadgePopup } from './components/gamification/BadgePopup';

const MainContent: React.FC = () => {
  const {
    currentView,
    unreadableRecordCount,
    isUnreadableBannerDismissed,
    dismissUnreadableBanner,
    saveError,
    retrySave,
    clearSaveError,
    crossTabStale,
    dismissCrossTabStale,
  } = useFinance();
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);

  useEffect(() => {
    const title = VIEW_TITLES[currentView]?.title || 'DhanVeda';
    document.title = `${title} — INR Personal Finance & Wealth Tracker`;
  }, [currentView]);

  const handleOpenAddTx = () => {
    setEditingTx(null);
    setIsAddTxOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setIsAddTxOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-app dark:bg-app text-ink-1 transition-colors">
      {/* Desktop Sidebar */}
      <Sidebar onOpenAddTx={handleOpenAddTx} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full pb-20 lg:pb-8 overflow-x-clip">
        {/* Top Navbar */}
        <Navbar onOpenAddTx={handleOpenAddTx} />

        {/* Dynamic Lazy-Loaded View Router */}
        <main className="flex-1 px-4 sm:px-8 py-6 w-full max-w-full overflow-x-clip">
          {unreadableRecordCount > 0 && !isUnreadableBannerDismissed && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-ink-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-1">
                    {unreadableRecordCount} {unreadableRecordCount === 1 ? 'record' : 'records'} could not be read
                  </p>
                  <p className="text-xs text-ink-3">
                    Malformed records are safely kept in storage and omitted from views. You can export raw data anytime.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => exportRawIndexedDBData()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export raw data
                </button>
                <button
                  type="button"
                  onClick={dismissUnreadableBanner}
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors cursor-pointer"
                  aria-label="Dismiss unreadable records warning"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {crossTabStale && (
            <div
              role="status"
              className="mb-6 p-4 rounded-2xl bg-primary-tint border border-primary/30 text-ink-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-primary text-on-primary shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-1">
                    Data changed in another tab
                  </p>
                  <p className="text-xs text-ink-3">
                    A transaction or record was modified in another window. Refresh to load latest data.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:opacity-95 text-on-primary text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={dismissCrossTabStale}
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors cursor-pointer"
                  aria-label="Dismiss cross-tab notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {saveError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-ink-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-up"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-1">
                    Some changes could not be saved (storage full or blocked)
                  </p>
                  <p className="text-xs text-ink-3">
                    Your data is still in memory; don't close this tab until storage is free.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={retrySave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={clearSaveError}
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors cursor-pointer"
                  aria-label="Dismiss save error warning"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <ViewTransition viewKey={currentView}>
            <AppErrorBoundary
              key={currentView}
              fallbackTitle={`${VIEW_TITLES[currentView]?.title || 'View'} encountered an error`}
            >
              <Suspense fallback={<ViewSkeleton view={currentView} />}>
                {currentView === 'dashboard' && (
                  <DashboardView
                    onOpenAddTx={handleOpenAddTx}
                    onEditTransaction={handleEditTx}
                  />
                )}
                {currentView === 'transactions' && (
                  <TransactionListView
                    onOpenAddModal={handleOpenAddTx}
                    onEditTransaction={handleEditTx}
                  />
                )}
                {currentView === 'people' && <PeopleView />}
                {currentView === 'budgets' && <BudgetsView />}
                {currentView === 'recurring' && <RecurringPaymentsView />}
                {currentView === 'categories' && <CategoriesView />}
                {currentView === 'emergency' && <EmergencyFundView />}
                {currentView === 'investments' && <InvestmentsView />}
                {currentView === 'dreams' && <DreamsView />}
                {currentView === 'ai' && <AIHealthSummaryView />}
                {currentView === 'import' && <StatementImportView />}
                {currentView === 'settings' && <SettingsView />}
                {currentView === 'badges' && <BadgeShowcase />}
              </Suspense>
            </AppErrorBoundary>
          </ViewTransition>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        onOpenMore={() => setIsMoreDrawerOpen(true)}
        onOpenAddTx={handleOpenAddTx}
      />

      {/* Mobile More Drawer */}
      <MobileMoreDrawer
        isOpen={isMoreDrawerOpen}
        onClose={() => setIsMoreDrawerOpen(false)}
      />

      {/* Global Add/Edit Transaction Modal */}
      <TransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        initialTransaction={editingTx}
      />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <GamificationProvider>
        <ToastProvider>
          <MainContent />
          <BadgePopup />
        </ToastProvider>
      </GamificationProvider>
    </FinanceProvider>
  );
}
