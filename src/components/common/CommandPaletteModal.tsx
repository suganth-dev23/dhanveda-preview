import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
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
  Users,
  Trophy,
  UploadCloud,
  Plus,
  Moon,
  Sun,
  Eye,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFinance, AppView } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { Transaction } from '../../types/finance';
import { DEFAULT_UPI_PRESETS } from '../../constants/quickLogPresets';
import { getTodayString, formatDate } from '../../utils/date';
import { formatINR } from '../../utils/currency';
import { SPRING_FLUID } from '../../lib/motion-tokens';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddTx: () => void;
  onEditTransaction?: (tx: Transaction) => void;
}

interface CommandItem {
  id: string;
  group: 'Quick Actions' | '1-Tap UPI Log' | 'Navigate Views' | 'Transactions';
  label: string;
  subtitle?: string;
  icon: React.ElementType;
  rightText?: string;
  onSelect: () => void;
}

const VIEW_COMMANDS: { id: AppView; label: string; subtitle: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Go to Dashboard', subtitle: 'Overview, Cashflow Trajectory & Calendar Heatmap', icon: LayoutDashboard },
  { id: 'transactions', label: 'Go to Transactions', subtitle: 'Full searchable ledger & filters', icon: Receipt },
  { id: 'budgets', label: 'Go to Budgets', subtitle: 'Category limits, split-track overruns & rebalance', icon: PieChart },
  { id: 'investments', label: 'Go to Investments & SIP Simulator', subtitle: '25-year compounding scrubber & portfolio', icon: TrendingUp },
  { id: 'recurring', label: 'Go to Recurring Payments', subtitle: 'Subscriptions, EMIs & bill schedule', icon: CalendarClock },
  { id: 'people', label: 'Go to People & Splits', subtitle: 'Shared expenses, IOUs & settlements', icon: Users },
  { id: 'dreams', label: 'Go to Goals & Dreams', subtitle: 'Target milestones & savings progress', icon: Target },
  { id: 'emergency', label: 'Go to Emergency Fund', subtitle: 'Liquid safety runway & deposits', icon: ShieldCheck },
  { id: 'categories', label: 'Go to Categories', subtitle: 'Custom expense & income categories', icon: Tags },
  { id: 'import', label: 'Go to Statement Import', subtitle: 'Import bank CSV or PDF statements', icon: UploadCloud },
  { id: 'ai', label: 'Go to AI Health Summary', subtitle: 'Personalized Indian financial advisor report', icon: Sparkles },
  { id: 'badges', label: 'Go to Achievements', subtitle: 'Unlocked badges, XP & streaks', icon: Trophy },
  { id: 'settings', label: 'Go to Settings', subtitle: 'Google Drive sync, backup & preferences', icon: Settings },
];

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenAddTx,
  onEditTransaction,
}) => {
  const {
    transactions,
    setCurrentView,
    darkMode,
    setDarkMode,
    addTransaction,
    deleteTransaction,
  } = useFinance();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const commands = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: CommandItem[] = [];

    // 1. Quick Actions
    const quickActions: CommandItem[] = [
      {
        id: 'act-add-tx',
        group: 'Quick Actions',
        label: 'Add New Transaction',
        subtitle: 'Open full expense, income, or split form',
        icon: Plus,
        rightText: 'New',
        onSelect: () => {
          onClose();
          onOpenAddTx();
        },
      },
      {
        id: 'act-toggle-theme',
        group: 'Quick Actions',
        label: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        subtitle: 'Toggle workspace visual theme',
        icon: darkMode ? Sun : Moon,
        rightText: 'Theme',
        onSelect: () => {
          setDarkMode(prev => !prev);
          onClose();
        },
      },
      {
        id: 'act-toggle-privacy',
        group: 'Quick Actions',
        label: 'Toggle Privacy Mode (Blur Amounts)',
        subtitle: 'Hide or reveal currency figures on screen',
        icon: Eye,
        rightText: 'Privacy',
        onSelect: () => {
          try {
            const current = localStorage.getItem('dhanveda_privacy') === 'on';
            const next = !current;
            localStorage.setItem('dhanveda_privacy', next ? 'on' : 'off');
            if (next) {
              document.documentElement.setAttribute('data-privacy', 'on');
            } else {
              document.documentElement.removeAttribute('data-privacy');
            }
            window.dispatchEvent(new CustomEvent('dhanveda-privacy-change'));
          } catch {}
          onClose();
        },
      },
    ];

    for (const item of quickActions) {
      if (
        !q ||
        item.label.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
      ) {
        list.push(item);
      }
    }

    // 2. 1-Tap UPI Quick-Log Presets
    for (const preset of DEFAULT_UPI_PRESETS) {
      const searchTarget = `${preset.label} ${preset.category} ${preset.amount} upi quick log`.toLowerCase();
      if (!q || searchTarget.includes(q)) {
        list.push({
          id: `cmd-${preset.id}`,
          group: '1-Tap UPI Log',
          label: `Quick Log: ${preset.label}`,
          subtitle: `Instant UPI debit in ${preset.category}`,
          icon: Zap,
          rightText: formatINR(preset.amount),
          onSelect: () => {
            const created = addTransaction({
              date: getTodayString(),
              amount: preset.amount,
              type: 'debit',
              category: preset.category,
              paymentMethod: 'UPI',
              description: preset.description,
              source: 'manual',
            });
            showToast(
              'success',
              `Logged ₹${preset.amount} · ${preset.label}`,
              `${preset.category} via UPI`,
              4500,
              {
                label: 'Undo',
                onClick: () => deleteTransaction(created.id),
              }
            );
            onClose();
          },
        });
      }
    }

    // 3. Navigate Views
    for (const v of VIEW_COMMANDS) {
      if (
        !q ||
        v.label.toLowerCase().includes(q) ||
        v.subtitle.toLowerCase().includes(q)
      ) {
        list.push({
          id: `nav-${v.id}`,
          group: 'Navigate Views',
          label: v.label,
          subtitle: v.subtitle,
          icon: v.icon,
          rightText: 'Jump',
          onSelect: () => {
            setCurrentView(v.id);
            onClose();
          },
        });
      }
    }

    // 4. Matching Transactions (up to 8 results)
    const safeTxs = Array.isArray(transactions) ? transactions : [];
    const matchingTxs = safeTxs
      .filter(tx => {
        if (!q) return false;
        const target = `${tx.description || ''} ${tx.category || ''} ${tx.person || ''} ${tx.amount} ${tx.paymentMethod}`.toLowerCase();
        return target.includes(q);
      })
      .slice(0, 8);

    for (const tx of matchingTxs) {
      list.push({
        id: `tx-${tx.id}`,
        group: 'Transactions',
        label: tx.description || tx.category,
        subtitle: `${formatDate(tx.date)} · ${tx.category} · ${tx.paymentMethod}`,
        icon: Receipt,
        rightText: `${tx.type === 'credit' ? '+' : '-'}${formatINR(tx.amount)}`,
        onSelect: () => {
          onClose();
          if (onEditTransaction) {
            onEditTransaction(tx);
          } else {
            setCurrentView('transactions');
          }
        },
      });
    }

    return list;
  }, [
    query,
    darkMode,
    transactions,
    onClose,
    onOpenAddTx,
    setDarkMode,
    addTransaction,
    deleteTransaction,
    showToast,
    setCurrentView,
    onEditTransaction,
  ]);

  const clampedIndex = Math.min(
    Math.max(0, activeIndex),
    Math.max(0, commands.length - 1)
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (commands.length > 0 ? (prev + 1) % commands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev =>
        commands.length > 0 ? (prev - 1 + commands.length) % commands.length : 0
      );
    } else if (e.key === 'Enter' && commands[clampedIndex]) {
      e.preventDefault();
      commands[clampedIndex].onSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-24 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={SPRING_FLUID}
            onKeyDown={handleKeyDown}
            className="relative z-10 w-full max-w-xl rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
              <Search className="w-4 h-4 text-primary shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search transactions, jump to views, or run 1-tap UPI log..."
                className="w-full bg-transparent text-sm text-ink-1 placeholder:text-ink-3 focus:outline-none focus:shadow-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setActiveIndex(0);
                  }}
                  className="p-1 rounded-lg text-ink-3 hover:text-ink-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-sunken border border-line text-[10px] font-bold text-ink-3">
                ESC
              </span>
            </div>

            {/* Results List */}
            <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              {commands.length === 0 ? (
                <div className="py-10 text-center text-xs text-ink-3">
                  No matching commands or transactions found for &ldquo;{query}&rdquo;.
                </div>
              ) : (
                commands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isFocused = idx === clampedIndex;
                  const showGroupHeader =
                    idx === 0 || commands[idx - 1].group !== cmd.group;

                  return (
                    <React.Fragment key={cmd.id}>
                      {showGroupHeader && (
                        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-3">
                          {cmd.group}
                        </div>
                      )}
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={cmd.onSelect}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          isFocused
                            ? 'bg-primary-tint text-ink-1'
                            : 'text-ink-2 hover:bg-sunken'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`p-2 rounded-lg shrink-0 ${
                              isFocused
                                ? 'bg-primary text-on-primary'
                                : 'bg-sunken text-ink-3'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink-1 truncate">
                              {cmd.label}
                            </p>
                            {cmd.subtitle && (
                              <p className="text-[11px] text-ink-3 truncate">
                                {cmd.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 font-numeric tabular-nums text-xs font-semibold text-ink-2">
                          {cmd.rightText && <span>{cmd.rightText}</span>}
                          <ArrowRight
                            className={`w-3.5 h-3.5 transition-transform ${
                              isFocused ? 'translate-x-0.5 text-primary' : 'text-ink-3/50'
                            }`}
                          />
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>

            {/* Footer Hints */}
            <div className="px-4 py-2.5 border-t border-line bg-sunken/60 flex items-center justify-between text-[11px] text-ink-3">
              <span>Use ↑↓ arrows to navigate · Enter to execute</span>
              <span className="font-semibold text-ink-2">⌘K / Ctrl+K</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
