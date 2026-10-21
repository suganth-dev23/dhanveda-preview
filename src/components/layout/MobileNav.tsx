import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { useFinanceUi } from '../../context/FinanceContext';

interface MobileNavProps {
  onOpenMore: () => void;
  onOpenAddTx: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMore, onOpenAddTx }) => {
  const { currentView, setCurrentView } = useFinanceUi();

  return (
    <nav
      role="navigation"
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 border-t border-line px-3 py-1.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-between shadow-[0_-8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
    >
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => setCurrentView('dashboard')}
        aria-label="Home"
        aria-current={currentView === 'dashboard' ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-2xl transition-colors duration-150 press ${
          currentView === 'dashboard'
            ? 'text-primary font-bold'
            : 'text-ink-3 font-medium hover:text-ink-1'
        }`}
      >
        <LayoutDashboard
          className={`w-5 h-5 transition-transform ${
            currentView === 'dashboard' ? 'scale-110' : ''
          }`}
        />
        <span className="text-xs mt-0.5 tracking-tight font-medium">Home</span>
      </button>

      {/* 2. History / Transactions */}
      <button
        type="button"
        onClick={() => setCurrentView('transactions')}
        aria-label="History"
        aria-current={currentView === 'transactions' ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-2xl transition-colors duration-150 press ${
          currentView === 'transactions'
            ? 'text-primary font-bold'
            : 'text-ink-3 font-medium hover:text-ink-1'
        }`}
      >
        <Receipt
          className={`w-5 h-5 transition-transform ${
            currentView === 'transactions' ? 'scale-110' : ''
          }`}
        />
        <span className="text-xs mt-0.5 tracking-tight font-medium">History</span>
      </button>

      {/* 3. Center Elevated Quick-Add Action Button */}
      <div className="flex-shrink-0 px-2">
        <button
          type="button"
          onClick={onOpenAddTx}
          aria-label="Add transaction or split bill"
          className="relative -top-3 w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg border-2 border-surface press hover:opacity-95 transition-colors duration-150"
        >
          <Plus className="w-6 h-6 stroke-[2.75]" />
        </button>
      </div>

      {/* 4. Splits & IOUs */}
      <button
        type="button"
        onClick={() => setCurrentView('people')}
        aria-label="Splits"
        aria-current={currentView === 'people' ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-2xl transition-colors duration-150 press ${
          currentView === 'people'
            ? 'text-primary font-bold'
            : 'text-ink-3 font-medium hover:text-ink-1'
        }`}
      >
        <Users
          className={`w-5 h-5 transition-transform ${
            currentView === 'people' ? 'scale-110' : ''
          }`}
        />
        <span className="text-xs mt-0.5 tracking-tight font-medium">Splits</span>
      </button>

      {/* 5. More Drawer */}
      <button
        type="button"
        onClick={onOpenMore}
        aria-label="Open more tools and views"
        aria-haspopup="dialog"
        className="flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-2xl text-ink-3 font-medium hover:text-ink-1 press transition-colors duration-150"
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-xs mt-0.5 tracking-tight font-medium">More</span>
      </button>
    </nav>
  );
};
