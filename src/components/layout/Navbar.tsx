import React, { useState, useEffect } from 'react';
import {
  Plus,
  Sparkles,
  Sun,
  Moon,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { getCurrentMonthYear } from '../../utils/date';
import { StreakBanner } from '../common/StreakBanner';
import { VIEW_TITLES } from '../../constants/viewTitles';

export { VIEW_TITLES };

interface NavbarProps {
  onOpenAddTx: () => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddTx,
  onOpenCommandPalette,
}) => {
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

  const [isPrivacy, setIsPrivacy] = useState(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem('dhanveda_privacy') === 'on'
  );

  useEffect(() => {
    const handlePrivacyChange = () => {
      setIsPrivacy(
        typeof window !== 'undefined' &&
          localStorage.getItem('dhanveda_privacy') === 'on'
      );
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
      className="sticky top-0 z-20 bg-surface/95 border-b border-line px-4 sm:px-8 py-4 flex items-center justify-between gap-4 transition-colors"
    >
      {/* Zone 1: Title & Unboxed Date Context */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-ink-1 tracking-tight leading-none truncate">
            {meta.title}
          </h1>
          <span
            className="hidden sm:inline text-xs text-ink-3"
            aria-hidden="true"
          >
            ·
          </span>
          <span className="hidden sm:inline text-xs font-medium text-ink-3 whitespace-nowrap">
            {monthName} {year}
          </span>
        </div>
        <p className="hidden md:block text-xs font-medium text-ink-3 mt-1 truncate">
          {meta.subtitle}
        </p>
      </div>

      {/* Zone 2 & 3: Search / Command Palette Trigger & Workspace Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Command Palette Search Trigger (Cmd+K) */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open Command Palette (Cmd+K)"
            title="Search transactions, jump to views, or quick log (⌘K)"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sunken hover:bg-line/70 border border-line text-xs text-ink-2 transition-colors press cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline font-medium">Search or Jump</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] font-bold text-ink-3 font-numeric">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Google Drive Sync Status Button */}
        {isDriveConnected ? (
          <button
            onClick={() => triggerSync(true)}
            title={
              syncStatus === 'syncing'
                ? 'Syncing with Google Drive...'
                : 'Google Drive Synced. Click to sync now.'
            }
            aria-label={
              syncStatus === 'syncing'
                ? 'Syncing with Google Drive'
                : 'Google Drive sync status'
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sunken hover:bg-line text-xs font-medium transition-colors press cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                syncStatus === 'syncing'
                  ? 'text-primary animate-spin'
                  : syncStatus === 'error'
                  ? 'text-negative'
                  : 'text-positive'
              }`}
            />
            <span className="hidden md:inline text-ink-2">
              {syncStatus === 'syncing' ? 'Syncing...' : 'Drive Synced'}
            </span>
          </button>
        ) : null}

        {/* Month Flow Summary with AnimatedCurrency */}
        <div className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-sunken border border-line text-xs font-numeric tabular-nums">
          <span className="text-ink-3">
            In:{' '}
            <AnimatedCurrency
              value={currentMonthIncome}
              compact
              className="font-bold text-positive"
            />
          </span>
          <span className="text-ink-3" aria-hidden="true">
            ·
          </span>
          <span className="text-ink-3">
            Out:{' '}
            <AnimatedCurrency
              value={currentMonthExpense}
              compact
              className="font-bold text-ink-1"
            />
          </span>
        </div>

        {/* Daily Streak Indicator */}
        <StreakBanner compact={true} />

        {/* Privacy Mode Toggle */}
        <button
          type="button"
          onClick={togglePrivacy}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors press cursor-pointer"
          title={
            isPrivacy
              ? 'Disable privacy mode'
              : 'Enable privacy mode (blur amounts)'
          }
          aria-label={
            isPrivacy
              ? 'Disable privacy mode'
              : 'Enable privacy mode (blur amounts)'
          }
        >
          {isPrivacy ? (
            <EyeOff className="w-4 h-4 text-reward" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>

        {/* AI Quick Button */}
        {currentView !== 'ai' && (
          <button
            onClick={() => setCurrentView('ai')}
            aria-label="AI Health Summary"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-reward bg-reward-tint hover:bg-reward-fill/20 border border-reward/30 transition-colors press cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-reward" />
            <span>AI Health</span>
          </button>
        )}

        {/* Add Transaction Button (Tablet only, desktop uses Sidebar CTA) */}
        <button
          onClick={onOpenAddTx}
          aria-label="Add Transaction"
          className="hidden sm:flex lg:hidden items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-xs sm:text-sm shadow-xs transition-colors press cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>

        {/* Mobile Theme Toggle */}
        <button
          onClick={() => setDarkMode(prev => !prev)}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-ink-3 hover:bg-sunken transition-colors press cursor-pointer"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-reward" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};
