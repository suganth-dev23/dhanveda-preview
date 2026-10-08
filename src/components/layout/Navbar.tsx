import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Sun, Moon, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Money } from '../ui/Money';
import { getCurrentMonthYear } from '../../utils/date';
import { StreakBanner } from '../common/StreakBanner';

interface NavbarProps {
  onOpenAddTx: () => void;
}

import { VIEW_TITLES } from '../../constants/viewTitles';
export { VIEW_TITLES };

export const Navbar: React.FC<NavbarProps> = ({ onOpenAddTx }) => {
  const {
    currentView,
    setCurrentView,
    darkMode,
    setDarkMode,
    currentMonthIncome,
    currentMonthExpense,
    syncStatus,
    isDriveConnected,
    triggerSync,
  } = useFinance();
  const { monthName, year } = getCurrentMonthYear();
  const meta = VIEW_TITLES[currentView] || { title: 'DhanVeda', subtitle: '' };

  const [isPrivacy, setIsPrivacy] = useState(() => typeof window !== 'undefined' && localStorage.getItem('dhanveda_privacy') === 'on');

  useEffect(() => {
    const handlePrivacyChange = () => {
      setIsPrivacy(typeof window !== 'undefined' && localStorage.getItem('dhanveda_privacy') === 'on');
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dhanveda_privacy') {
        const on = e.newValue === 'on';
        setIsPrivacy(on);
        if (on) {
          document.documentElement.setAttribute('data-privacy', 'on');
        } else {
          document.documentElement.removeAttribute('data-privacy');
        }
      }
    };
    window.addEventListener('dhanveda-privacy-change', handlePrivacyChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('dhanveda-privacy-change', handlePrivacyChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const togglePrivacy = () => {
    const next = !isPrivacy;
    setIsPrivacy(next);
    try {
      if (next) {
        localStorage.setItem('dhanveda_privacy', 'on');
        document.documentElement.setAttribute('data-privacy', 'on');
      } else {
        localStorage.setItem('dhanveda_privacy', 'off');
        document.documentElement.removeAttribute('data-privacy');
      }
      window.dispatchEvent(new CustomEvent('dhanveda-privacy-change'));
    } catch {}
  };

  return (
    <header
      role="banner"
      aria-label="Main Header"
      className="sticky top-0 z-20 bg-surface/95 border-b border-line px-4 sm:px-8 py-4 flex items-center justify-between transition-colors"
    >
      {/* Title info */}
      <div>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-ink-1 tracking-tight leading-none truncate max-w-[180px] sm:max-w-none">
            {meta.title}
          </h1>
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sunken text-ink-2 border border-line">
            {monthName} {year}
          </span>
        </div>
        <p className="hidden md:block text-xs font-medium text-ink-3 mt-1">
          {meta.subtitle}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2.5">
        {/* Google Drive Sync Status Button */}
        {isDriveConnected ? (
          <button
            onClick={() => triggerSync(true)}
            title={syncStatus === 'syncing' ? 'Syncing with Google Drive...' : 'Google Drive Synced. Click to sync now.'}
            aria-label={syncStatus === 'syncing' ? 'Syncing with Google Drive' : 'Google Drive sync status'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sunken hover:bg-line text-xs font-medium transition-colors press"
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : syncStatus === 'error' ? (
              <span className="w-2 h-2 rounded-full bg-negative"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-positive"></span>
            )}
            <span className="hidden md:inline text-ink-2">
              {syncStatus === 'syncing' ? 'Syncing...' : 'Drive Synced'}
            </span>
          </button>
        ) : null}

        {/* Month flow pill */}
        <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-sunken border border-line text-xs">
          <div className="flex items-center gap-1">
            <span className="text-ink-3">In:</span>
            <Money value={currentMonthIncome} tone="positive" size="xs" sign="always" />
          </div>
          <div className="w-px h-3 bg-line"></div>
          <div className="flex items-center gap-1">
            <span className="text-ink-3">Out:</span>
            <Money value={currentMonthExpense} tone="expense" size="xs" sign="always" />
          </div>
        </div>

        {/* Daily Streak Indicator */}
        <StreakBanner compact={true} />

        {/* Privacy Mode Toggle */}
        <button
          type="button"
          onClick={togglePrivacy}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors press"
          title={isPrivacy ? 'Disable privacy mode' : 'Enable privacy mode (blur amounts)'}
          aria-label={isPrivacy ? 'Disable privacy mode' : 'Enable privacy mode (blur amounts)'}
        >
          {isPrivacy ? <EyeOff className="w-4 h-4 text-reward" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* AI Quick Button */}
        {currentView !== 'ai' && (
          <button
            onClick={() => setCurrentView('ai')}
            aria-label="AI Health Summary"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-reward bg-reward-tint hover:bg-reward-fill/20 border border-reward/30 transition-colors press"
          >
            <Sparkles className="w-3.5 h-3.5 text-reward" />
            <span>AI Health</span>
          </button>
        )}

        {/* Add Transaction Button (Tablet only, desktop uses Sidebar CTA to prevent duplication) */}
        <button
          onClick={onOpenAddTx}
          aria-label="Add Transaction"
          className="hidden sm:flex lg:hidden items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-xs sm:text-sm shadow-xs transition-colors press"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>

        {/* Mobile Theme Toggle */}
        <button
          onClick={() => setDarkMode(prev => !prev)}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl text-ink-3 hover:bg-sunken transition-colors press"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-reward" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
