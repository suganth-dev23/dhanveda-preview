import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Tags,
  ShieldCheck,
  Settings,
  Sparkles,
  Sun,
  Moon,
  CalendarClock,
  Trophy,
  PieChart,
  TrendingUp,
  Target,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { useFinanceUi, AppView } from '../../context/FinanceContext';
import { useOverlayTransition } from '../../hooks/useOverlayTransition';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DrawerSection {
  title: string;
  items: { id: AppView; label: string; desc: string; icon: React.ElementType; fullWidth?: boolean }[];
}

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: 'Money',
    items: [
      { id: 'budgets', label: 'Budgets', desc: 'Category limits', icon: PieChart },
      { id: 'recurring', label: 'Recurring Payments', desc: 'Bills & EMIs', icon: CalendarClock },
      { id: 'categories', label: 'Categories', desc: 'Tags & colors', icon: Tags },
    ],
  },
  {
    title: 'Grow',
    items: [
      { id: 'investments', label: 'Investments', desc: 'Portfolio & assets', icon: TrendingUp },
      { id: 'dreams', label: 'Goals & Dreams', desc: 'Target milestones', icon: Target },
      { id: 'emergency', label: 'Emergency Fund', desc: 'Safety runway', icon: ShieldCheck },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'ai', label: 'AI Health Summary', desc: 'Smart advisor', icon: Sparkles },
      { id: 'badges', label: 'Achievements', desc: 'Milestones & XP', icon: Trophy },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'import', label: 'Import Statement', desc: 'PDF & CSV bank statements', icon: FileSpreadsheet },
      { id: 'settings', label: 'Settings', desc: 'Drive Sync & Backup', icon: Settings },
    ],
  },
];

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({ isOpen, onClose }) => {
  const { currentView, setCurrentView, darkMode, setDarkMode } = useFinanceUi();
  const [searchQuery, setSearchQuery] = useState('');

  const { shouldRender, isAnimatingIn } = useOverlayTransition({
    isOpen,
    onClose,
    duration: 250,
  });

  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    isActive: Boolean(shouldRender && isAnimatingIn),
    onEscape: onClose,
  });

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
    setSearchQuery('');
  } else if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
  }

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return DRAWER_SECTIONS;
    return DRAWER_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.desc.toLowerCase().includes(query)
      ),
    })).filter((section) => section.items.length > 0);
  }, [searchQuery]);

  if (!shouldRender || typeof document === 'undefined') return null;

  const handleSelect = (view: AppView) => {
    setCurrentView(view);
    onClose();
  };

  const drawerContent = (
    <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-200 ease-out ${
          isAnimatingIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer with slide-up transition */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`relative bg-surface rounded-t-2xl p-4 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-line shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto transition-transform duration-250 ease-out transform will-change-transform ${
          isAnimatingIn ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag Pill */}
        <div aria-hidden="true" className="w-10 h-1 rounded-full bg-line-input/40 mx-auto mb-1" />

        <div className="flex items-center justify-between pb-2 border-b border-line">
          <div>
            <h3 id="drawer-title" className="font-bold text-ink-1 text-sm sm:text-base">
              Explore &amp; Planning
            </h3>
            <p className="text-xs text-ink-3">All wealth, budgeting and configuration tools</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-1.5 rounded-xl text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search views..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search views"
            className="w-full pl-9 pr-8 py-2 bg-sunken border border-line rounded-xl text-xs sm:text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-1 p-0.5 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filteredSections.length === 0 ? (
          <div className="py-8 text-center text-ink-3 text-sm">
            No matching views
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSections.map((section) => (
              <div key={section.title || 'misc'}>
                {section.title && (
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3 px-1 mb-1.5">
                    {section.title}
                  </h4>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        aria-label={item.label}
                        aria-current={currentView === item.id ? 'page' : undefined}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition-colors press ${
                          item.fullWidth ? 'col-span-2' : ''
                        } ${
                          isActive
                            ? 'bg-primary-tint text-primary border border-primary/30'
                            : 'bg-sunken text-ink-1 border border-line hover:bg-line/50'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-primary/20 text-primary'
                              : 'bg-surface text-ink-2 shadow-2xs'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold leading-tight truncate">{item.label}</span>
                          <span className="block text-xs text-ink-3 leading-tight truncate mt-0.5">{item.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-line flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-3">Theme</span>
          <button
            type="button"
            onClick={() => setDarkMode((prev: boolean) => !prev)}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sunken hover:bg-line text-xs font-semibold text-ink-2 transition-colors press"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-reward" /> : <Moon className="w-3.5 h-3.5 text-ink-2" />}
            <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};
