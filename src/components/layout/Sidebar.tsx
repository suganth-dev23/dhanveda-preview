import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  CalendarClock,
  Tags,
  ShieldCheck,
  TrendingUp,
  Target,
  Sparkles,
  Settings,
  Moon,
  Sun,
  Plus,
  Users,
  Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFinance, AppView } from '../../context/FinanceContext';
import { useGamification } from '../../context/GamificationContext';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { useAnimatedProgress } from '../../hooks/useAnimatedProgress';
import { SPRING_SNAPPY } from '../../lib/motion-tokens';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Money',
    items: [
      { id: 'transactions', label: 'Transactions', icon: Receipt },
      { id: 'budgets', label: 'Budgets', icon: PieChart },
      { id: 'recurring', label: 'Recurring Payments', icon: CalendarClock },
      { id: 'categories', label: 'Categories', icon: Tags },
    ],
  },
  {
    title: 'People',
    items: [{ id: 'people', label: 'People & Splits', icon: Users }],
  },
  {
    title: 'Grow',
    items: [
      { id: 'investments', label: 'Investments', icon: TrendingUp },
      { id: 'dreams', label: 'Goals & Dreams', icon: Target },
      { id: 'emergency', label: 'Emergency Fund', icon: ShieldCheck },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'badges', label: 'Achievements', icon: Trophy },
      { id: 'ai', label: 'AI Health Summary', icon: Sparkles },
    ],
  },
];

interface SidebarProps {
  onOpenAddTx: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAddTx }) => {
  const { currentView, setCurrentView, darkMode, setDarkMode, totalBalance } =
    useFinance();
  const { levelInfo, totalXP } = useGamification();
  const { displayPercent: progressPercent } = useAnimatedProgress(
    levelInfo.progress
  );

  const prevXPRef = React.useRef(totalXP);
  const [xpDelta, setXpDelta] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (totalXP > prevXPRef.current) {
      const delta = totalXP - prevXPRef.current;
      setXpDelta(delta);
      const timer = setTimeout(() => setXpDelta(null), 1200);
      prevXPRef.current = totalXP;
      return () => clearTimeout(timer);
    }
    prevXPRef.current = totalXP;
  }, [totalXP]);

  return (
    <aside
      role="navigation"
      aria-label="Desktop Sidebar"
      className="hidden lg:flex flex-col lg:w-20 xl:w-64 border-r border-line bg-surface h-screen sticky top-0 z-30 select-none"
    >
      {/* Brand Header */}
      <div className="p-3 xl:p-6 border-b border-line">
        <div className="flex items-center justify-center xl:justify-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-reward-fill flex items-center justify-center text-ink-1 font-black text-xl shadow-xs border border-reward/30">
            ₹
          </div>
          <div className="hidden xl:block">
            <h1 className="text-lg font-black text-ink-1 leading-none tracking-tight">
              DhanVeda
            </h1>
            <p className="text-xs font-semibold text-reward mt-1">
              INR Wealth &amp; Health
            </p>
          </div>
        </div>

        {/* Quick Balance Preview */}
        <div className="hidden xl:block mt-4 p-3 bg-sunken rounded-xl border border-line">
          <p className="text-xs font-semibold text-ink-3">
            Bank &amp; Cash (Liquid)
          </p>
          <div className="mt-0.5">
            <AnimatedCurrency
              value={totalBalance}
              className="text-base font-extrabold text-ink-1"
            />
          </div>
        </div>

        {/* Gamification Level Status */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCurrentView('badges')}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCurrentView('badges');
            }
          }}
          aria-label={`Level ${levelInfo.level} Wealth Architect. ${levelInfo.xpToNext} XP to Level ${levelInfo.level + 1}. Click to view Achievements.`}
          className="hidden xl:block relative mt-2.5 p-2.5 bg-reward-tint hover:bg-reward-fill/20 rounded-xl border border-reward/20 transition-colors cursor-pointer group press focus:outline-none focus:ring-2 focus:ring-reward"
          title={`Level ${levelInfo.level} Wealth Architect. ${levelInfo.xpToNext} XP to Level ${levelInfo.level + 1}. Click to view Achievements.`}
        >
          {xpDelta !== null && (
            <span className="absolute -top-3 right-3 font-numeric tabular-nums font-black text-xs text-reward animate-xp-float pointer-events-none drop-shadow-xs">
              +{xpDelta} XP
            </span>
          )}
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-extrabold text-xs text-reward flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-reward" /> Level {levelInfo.level}
            </span>
            <span className="font-numeric tabular-nums text-xs text-ink-3 font-semibold">
              {totalXP} XP
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="XP level progress"
            className="h-1.5 w-full bg-line rounded-full overflow-hidden contain-paint"
          >
            <div
              className="h-full w-full bg-reward-fill rounded-full origin-left will-change-transform"
              style={{ transform: `scaleX(${progressPercent / 100})` }}
            />
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="px-2 xl:px-4 pt-4 pb-2 flex justify-center">
        <button
          onClick={onOpenAddTx}
          title="Add Transaction"
          aria-label="Add Transaction"
          className="w-11 h-11 xl:w-full xl:h-auto flex items-center justify-center gap-2 p-0 xl:px-4 xl:py-2.5 rounded-xl bg-primary hover:opacity-95 text-on-primary font-bold text-sm shadow-xs transition-colors press min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden xl:inline">Add Transaction</span>
        </button>
      </div>

      {/* Navigation sections with shared-element layoutId indicator */}
      <nav
        aria-label="Main Navigation"
        className="flex-1 px-2 xl:px-3 py-2 space-y-3 overflow-y-auto"
      >
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.title && (
              <div className="hidden xl:block px-3 py-1 text-xs font-semibold text-ink-3">
                {section.title}
              </div>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isAI = item.id === 'ai';

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative z-10 w-full flex items-center justify-center xl:justify-between px-2 xl:px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 min-h-[38px] cursor-pointer ${
                    isActive
                      ? 'text-primary'
                      : 'text-ink-2 hover:bg-sunken hover:text-ink-1'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-nav-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 -z-10 rounded-xl bg-primary-tint shadow-xs border border-primary/20"
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? 'text-primary'
                          : isAI
                          ? 'text-reward'
                          : 'text-ink-3'
                      }`}
                    />
                    <span className="hidden xl:inline whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {/* Settings item */}
        <div className="pt-2 border-t border-line space-y-0.5">
          <button
            onClick={() => setCurrentView('settings')}
            title="Settings"
            aria-label="Settings"
            aria-current={currentView === 'settings' ? 'page' : undefined}
            className={`relative z-10 w-full flex items-center justify-center xl:justify-between px-2 xl:px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 min-h-[38px] cursor-pointer ${
              currentView === 'settings'
                ? 'text-primary'
                : 'text-ink-2 hover:bg-sunken hover:text-ink-1'
            }`}
          >
            {currentView === 'settings' && (
              <motion.span
                layoutId="sidebar-active-nav-pill"
                transition={SPRING_SNAPPY}
                className="absolute inset-0 -z-10 rounded-xl bg-primary-tint shadow-xs border border-primary/20"
              />
            )}
            <div className="flex items-center gap-3">
              <Settings
                className={`w-4 h-4 shrink-0 ${
                  currentView === 'settings' ? 'text-primary' : 'text-ink-3'
                }`}
              />
              <span className="hidden xl:inline">Settings</span>
            </div>
          </button>
        </div>
      </nav>

      {/* Footer / Theme Toggle */}
      <div className="p-3 xl:p-4 border-t border-line flex items-center justify-center xl:justify-between">
        <div className="hidden xl:flex items-center gap-2 text-xs text-ink-3">
          <span>Local-first storage</span>
        </div>
        <button
          onClick={() => setDarkMode(prev => !prev)}
          className="p-2 rounded-xl text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center press cursor-pointer"
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
    </aside>
  );
};
