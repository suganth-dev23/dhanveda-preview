import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, useRef } from 'react';
import {
  Search,
  Download,
  Plus,
  Receipt,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, TransactionType, Category, Contact } from '../../types/finance';
import { getMonthName, getMonthKey, getTodayString } from '../../utils/date';
import { escapeCsvField } from '../../utils/csv';
import { useStaggerChildren } from '../../hooks/useStaggerChildren';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWindowVirtualizer } from '../../hooks/useWindowVirtualizer';
import { Button, Card, Money, Stat } from '../ui';
import { TransactionTableRow, TransactionCardRow } from './TransactionRow';
import { useToast } from '../../context/ToastContext';

interface TransactionListViewProps {
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

type GroupByMode = 'none' | 'month' | 'year';

interface TransactionGroupCardProps {
  group: {
    groupKey: string;
    title: string;
    items: Transaction[];
    groupIn: number;
    groupOut: number;
    groupNet: number;
  };
  groupBy: GroupByMode;
  isDesktop: boolean;
  selectedTxIds: Set<string>;
  highlightedTxId: string | null;
  deletingTxIds: Set<string>;
  categoryMap: Map<string, Category>;
  contactMap: Map<string, Contact>;
  filteredTransactionsLength: number;
  onToggleSelect: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string, description: string) => void;
  onToggleSelectAll: () => void;
  getChildStyle: (index: number) => React.CSSProperties;
}

const TransactionGroupCard: React.FC<TransactionGroupCardProps> = React.memo(function TransactionGroupCard({
  group,
  groupBy,
  isDesktop,
  selectedTxIds,
  highlightedTxId,
  deletingTxIds,
  categoryMap,
  contactMap,
  filteredTransactionsLength,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggleSelectAll,
  getChildStyle,
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const virtualizer = useWindowVirtualizer({
    itemCount: group.items.length,
    estimateHeight: isDesktop ? 52 : 76,
    overscan: 10,
    threshold: 40,
    containerRef,
  });

  const visibleItems = group.items.slice(virtualizer.startIndex, virtualizer.endIndex);

  return (
    <Card
      variant="surface"
      padding="none"
      className="rounded-2xl overflow-hidden"
    >
      {/* Group Header (if grouped) */}
      {groupBy !== 'none' && (
        <div className="bg-sunken px-5 py-3 border-b border-line flex items-center justify-between text-xs font-semibold">
          <span className="text-ink-1">
            {group.title} ({group.items.length})
          </span>
          <div className="flex items-center gap-3 font-numeric font-semibold">
            <Money value={group.groupIn} tone="income" size="xs" sign="always" />
            <span className="text-ink-3">/</span>
            <Money value={group.groupOut} tone="expense" size="xs" sign="always" />
          </div>
        </div>
      )}

      {isDesktop ? (
        /* Desktop Transactions Table */
        <div ref={containerRef} className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-sunken/70 text-xs font-medium text-ink-3">
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    type="button"
                    onClick={onToggleSelectAll}
                    className="text-ink-3 hover:text-ink-1"
                    aria-label="Toggle select all transactions"
                  >
                    {selectedTxIds.size === filteredTransactionsLength && filteredTransactionsLength > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description / Merchant</th>
                <th className="py-3 px-4">Person</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {virtualizer.topSpacerHeight > 0 && (
                <tr style={{ height: virtualizer.topSpacerHeight }} aria-hidden="true">
                  <td colSpan={8} className="p-0 border-0" />
                </tr>
              )}
              {visibleItems.map((tx, idx) => {
                const actualIndex = virtualizer.startIndex + idx;
                return (
                  <TransactionTableRow
                    key={tx.id}
                    tx={tx}
                    catInfo={categoryMap.get(tx.category.toLowerCase())}
                    contactMap={contactMap}
                    isSelected={selectedTxIds.has(tx.id)}
                    isHighlighted={highlightedTxId === tx.id}
                    isDeleting={deletingTxIds.has(tx.id)}
                    onToggleSelect={onToggleSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    style={getChildStyle(Math.min(actualIndex, 15))}
                  />
                );
              })}
              {virtualizer.bottomSpacerHeight > 0 && (
                <tr style={{ height: virtualizer.bottomSpacerHeight }} aria-hidden="true">
                  <td colSpan={8} className="p-0 border-0" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Mobile Cards Feed (matching minimalist mockup) */
        <div ref={containerRef} className="divide-y divide-line">
          {virtualizer.topSpacerHeight > 0 && (
            <div style={{ height: virtualizer.topSpacerHeight }} aria-hidden="true" />
          )}
          {visibleItems.map((tx, idx) => {
            const actualIndex = virtualizer.startIndex + idx;
            return (
              <TransactionCardRow
                key={tx.id}
                tx={tx}
                catInfo={categoryMap.get(tx.category.toLowerCase())}
                contactMap={contactMap}
                isSelected={selectedTxIds.has(tx.id)}
                isHighlighted={highlightedTxId === tx.id}
                isDeleting={deletingTxIds.has(tx.id)}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                style={getChildStyle(Math.min(actualIndex, 15))}
              />
            );
          })}
          {virtualizer.bottomSpacerHeight > 0 && (
            <div style={{ height: virtualizer.bottomSpacerHeight }} aria-hidden="true" />
          )}
        </div>
      )}
    </Card>
  );
});
TransactionGroupCard.displayName = 'TransactionGroupCard';

export const TransactionListView: React.FC<TransactionListViewProps> = React.memo(function TransactionListView({
  onOpenAddModal,
  onEditTransaction,
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { containerRef, getChildStyle } = useStaggerChildren(25);
  const {
    transactions,
    categories,
    contacts,
    deleteTransaction,
    deleteMultipleTransactions,
    captureDeleteSnapshot,
    restoreTransactions,
    subscribeFinanceEvent,
  } = useFinance();
  const { showToast } = useToast();

  // Highlight newly added transaction
  const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null);
  const [deletingTxIds] = useState<Set<string>>(() => new Set());
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  const handleDeleteTransaction = useCallback((txId: string, desc: string) => {
    const txToDelete = transactions.find(t => t.id === txId);
    if (!txToDelete) return;
    if (window.confirm(`Delete transaction "${desc}"?`)) {
      const snapshot = captureDeleteSnapshot(txId);
      deleteTransaction(txId);
      setSelectedTxIds(prev => {
        if (!prev.has(txId)) return prev;
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
      showToast('info', 'Transaction Removed', desc, 5000, {
        label: 'Undo',
        onClick: () => {
          if (snapshot) {
            restoreTransactions([snapshot]);
          }
        },
      });
    }
  }, [transactions, deleteTransaction, captureDeleteSnapshot, restoreTransactions, showToast]);

  useEffect(() => {
    if (!subscribeFinanceEvent) return;
    const unsubscribe = subscribeFinanceEvent((event) => {
      if (event.type === 'transaction_added' && event.tx?.id) {
        setHighlightedTxId(event.tx.id);
        const timer = setTimeout(() => {
          setHighlightedTxId(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, [subscribeFinanceEvent]);

  // Filters & Search with deferred value for high responsiveness
  const [queryInput, setQueryInput] = useState('');
  const deferredSearch = useDeferredValue(queryInput);

  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | TransactionType>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'this_month' | 'last_month' | 'last_3_months' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');

  // Distinct person suggestions across all transactions
  const distinctPersons = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.person && t.person.trim()) {
        set.add(t.person.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [transactions]);

  // Category map for quick color & icon lookup
  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.name.toLowerCase(), c]));
  }, [categories]);

  // Contact map for quick split person lookup
  const contactMap = useMemo(() => {
    return new Map(contacts.map(c => [c.id, c]));
  }, [contacts]);

  // Filtered transactions using deferredSearch
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const searchLower = deferredSearch.trim().toLowerCase();

    return transactions.filter(tx => {
      // 1. Search filter (includes description, person, category, referenceId, amount, splits, tags)
      if (searchLower) {
        const matchesDesc = tx.description.toLowerCase().includes(searchLower);
        const matchesPerson = tx.person?.toLowerCase().includes(searchLower);
        const matchesCat = tx.category.toLowerCase().includes(searchLower);
        const matchesRef = tx.referenceId?.toLowerCase().includes(searchLower);
        const matchesAmount = tx.amount.toString().includes(searchLower);
        const matchesSplits = tx.splitWith?.some(s => {
          const contactName = s.contactId ? contactMap.get(s.contactId)?.name : s.label;
          return (
            contactName?.toLowerCase().includes(searchLower) ||
            s.label?.toLowerCase().includes(searchLower)
          );
        });
        const matchesTags = tx.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matchesDesc && !matchesPerson && !matchesCat && !matchesRef && !matchesAmount && !matchesSplits && !matchesTags) {
          return false;
        }
      }

      // 2. Person filter
      if (selectedPerson === 'none') {
        if (tx.person && tx.person.trim()) return false;
      } else if (selectedPerson !== 'all') {
        if (tx.person?.toLowerCase() !== selectedPerson.toLowerCase()) return false;
      }

      // 3. Category filter
      if (selectedCategory !== 'all' && tx.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // 4. Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false;
      }

      // 5. Payment Method filter
      if (selectedMethod === 'cards') {
        if (tx.paymentMethod !== 'Credit Card' && tx.paymentMethod !== 'Debit Card') {
          return false;
        }
      } else if (selectedMethod !== 'all' && tx.paymentMethod !== selectedMethod) {
        return false;
      }

      // 6. Source filter
      if (selectedSource !== 'all' && tx.source !== selectedSource) {
        return false;
      }

      // 7. Date Range filter
      if (dateRange === 'this_month') {
        const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        if (!tx.date || !tx.date.startsWith(currentMonthKey)) return false;
      } else if (dateRange === 'last_month') {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        if (!tx.date || !tx.date.startsWith(lastMonthKey)) return false;
      } else if (dateRange === 'last_3_months') {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
        const txDate = new Date(tx.date || '');
        if (isNaN(txDate.getTime()) || txDate < threeMonthsAgo) return false;
      } else if (dateRange === 'custom') {
        if (customStartDate && (!tx.date || tx.date < customStartDate)) return false;
        if (customEndDate && (!tx.date || tx.date > customEndDate)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    transactions,
    deferredSearch,
    selectedPerson,
    selectedCategory,
    selectedType,
    selectedMethod,
    selectedSource,
    dateRange,
    customStartDate,
    customEndDate,
    contactMap,
  ]);

  // Quick stats on filtered result
  const filteredIncome = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'credit').reduce((a, b) => a + b.amount, 0);
  }, [filteredTransactions]);

  const filteredExpense = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'debit').reduce((a, b) => a + b.amount, 0);
  }, [filteredTransactions]);

  const filteredNet = filteredIncome - filteredExpense;

  const visibleIds = useMemo(() => new Set(filteredTransactions.map(t => t.id)), [filteredTransactions]);

  // Derive selection bounded to current visible items without cascading effects
  const activeSelectedTxIds = useMemo(() => {
    if (selectedTxIds.size === 0) return selectedTxIds;
    const next = new Set<string>();
    selectedTxIds.forEach(id => {
      if (visibleIds.has(id)) {
        next.add(id);
      }
    });
    return next;
  }, [selectedTxIds, visibleIds]);

  // Selection toggle callbacks (memoized)
  const toggleSelectAll = useCallback(() => {
    setSelectedTxIds(prev => {
      if (prev.size === filteredTransactions.length && filteredTransactions.length > 0) {
        return new Set();
      } else {
        return new Set(filteredTransactions.map(t => t.id));
      }
    });
  }, [filteredTransactions, setSelectedTxIds]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [setSelectedTxIds]);

  const handleEdit = useCallback((tx: Transaction) => {
    onEditTransaction(tx);
  }, [onEditTransaction]);

  const handleBulkDelete = useCallback(() => {
    // Only target selected transactions that match current filter/view
    const targetTxs = transactions.filter(t => activeSelectedTxIds.has(t.id));
    if (targetTxs.length === 0) return;
    const targetIds = targetTxs.map(t => t.id);

    if (window.confirm(`Are you sure you want to delete ${targetIds.length} transaction${targetIds.length > 1 ? 's' : ''}?`)) {
      const snapshots = targetIds
        .map(id => captureDeleteSnapshot(id))
        .filter((s): s is NonNullable<typeof s> => s !== null);

      deleteMultipleTransactions(targetIds);
      setSelectedTxIds(prev => {
        const next = new Set(prev);
        targetIds.forEach(id => next.delete(id));
        return next;
      });

      showToast(
        'info',
        'Transactions Removed',
        `${targetIds.length} transaction${targetIds.length > 1 ? 's' : ''} deleted`,
        5000,
        {
          label: 'Undo',
          onClick: () => {
            if (snapshots.length > 0) {
              restoreTransactions(snapshots);
            }
          },
        }
      );
    }
  }, [transactions, activeSelectedTxIds, captureDeleteSnapshot, deleteMultipleTransactions, restoreTransactions, showToast, setSelectedTxIds]);

  const exportToCSV = useCallback(() => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export.');
      return;
    }
    const headers = ['Date', 'Type', 'Amount (INR)', 'Description', 'Person', 'Category', 'Payment Method', 'Reference ID', 'Source'];

    const rows = filteredTransactions.map(t => [
      escapeCsvField(t.date, false),
      escapeCsvField(t.type, false),
      escapeCsvField(t.amount.toFixed(2), false),
      escapeCsvField(t.description, true),
      escapeCsvField(t.person || '—', true),
      escapeCsvField(t.category, true),
      escapeCsvField(t.paymentMethod, true),
      escapeCsvField(t.referenceId || '—', true),
      escapeCsvField(t.source, true),
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dhanveda_transactions_${getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredTransactions]);

  // Grouping structure
  const groupedTransactions = useMemo(() => {
    if (groupBy === 'none') {
      return [{
        groupKey: 'All',
        title: 'All Transactions',
        items: filteredTransactions,
        groupIn: filteredIncome,
        groupOut: filteredExpense,
        groupNet: filteredNet,
      }];
    }

    const map: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      const key = groupBy === 'month' ? (getMonthKey(t.date) || 'Unknown') : (t.date ? t.date.substring(0, 4) : 'Unknown');
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });

    return Object.entries(map).map(([key, items]) => {
      const title = groupBy === 'month' ? getMonthName(key) : `Year ${key}`;
      const groupIn = items.filter(t => t.type === 'credit').reduce((a, b) => a + b.amount, 0);
      const groupOut = items.filter(t => t.type === 'debit').reduce((a, b) => a + b.amount, 0);

      return {
        groupKey: key,
        title,
        items,
        groupIn,
        groupOut,
        groupNet: groupIn - groupOut,
      };
    });
  }, [filteredTransactions, groupBy, filteredIncome, filteredExpense, filteredNet]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hero Overview: Mineral Card with Gold Ledger Highlight */}
      <Card variant="hero" padding="none" className="rounded-2xl text-ink-1 p-4 sm:p-8">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-reward-fill to-transparent opacity-80" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <Receipt className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-3">
                TRANSACTION JOURNAL & LEDGER
              </span>
            </div>
            <p className="text-xs text-ink-3 mb-1">
              Net Operational Cash Flow
            </p>
            <div className="flex items-baseline gap-3">
              <Money
                value={filteredNet}
                sign="always"
                tone={filteredNet >= 0 ? 'positive' : 'negative'}
                size="display"
              />
              <span
                className={`text-sm font-semibold ${
                  filteredNet >= 0 ? 'text-positive' : 'text-negative'
                }`}
              >
                {filteredNet >= 0 ? 'net positive' : 'net outflow'}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-3">
              {filteredTransactions.length} of {transactions.length} entries matching filters • <Money value={filteredIncome} tone="positive" size="xs" sign="always" /> in / <Money value={filteredExpense} tone="expense" size="xs" sign="always" /> out
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={exportToCSV}
              title="Export filtered transactions to CSV"
              leftIcon={<Download className="h-4 w-4" />}
            >
              <span className="hidden xs:inline">Export CSV</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onOpenAddModal}
              leftIcon={<Plus className="h-4 w-4 stroke-[2.5]" />}
              className="hidden sm:inline-flex"
            >
              New Transaction
            </Button>
          </div>
        </div>

        {/* 4-column summary strip */}
        <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-line">
          <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
            <Stat
              label="Total Inflow"
              value={filteredIncome}
              moneyProps={{ tone: 'positive', sign: 'always', size: 'lg' }}
            />
          </Card>

          <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
            <Stat
              label="Total Outflow"
              value={filteredExpense}
              moneyProps={{ tone: 'expense', sign: 'auto', size: 'lg' }}
            />
          </Card>

          <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
            <Stat
              label="Entries Shown"
              value={String(filteredTransactions.length)}
            />
          </Card>

          <Card variant="sunken" padding="sm" className="rounded-xl sm:rounded-2xl">
            <Stat
              label="Ledger Velocity"
              value={filteredNet}
              moneyProps={{
                tone: filteredNet >= 0 ? 'positive' : 'negative',
                sign: 'always',
                size: 'lg',
              }}
            />
          </Card>
        </div>
      </Card>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink-1 tracking-tight">
            All Transactions
          </h3>
          <p className="text-xs sm:text-xs text-ink-3">
            Search, filter, or group by month &amp; year
          </p>
        </div>
        <span className="text-xs font-semibold text-ink-3">
          {filteredTransactions.length} of {transactions.length} records
        </span>
      </div>

      {/* Filter & Search Bar */}
      <Card variant="surface" padding="none" className="rounded-2xl p-3.5 sm:p-6 space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            placeholder="Search by note, person, merchant, category, or amount..."
            className="w-full pl-10 pr-4 py-2.5 bg-sunken border border-line rounded-2xl text-xs text-ink-1 placeholder-ink-3 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {queryInput && (
            <button
              type="button"
              onClick={() => setQueryInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-3 hover:text-ink-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedType('all');
              setSelectedMethod('all');
            }}
            className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors press ${
              selectedType === 'all' && selectedMethod === 'all'
                ? 'bg-slate-900 text-white dark:bg-sunken dark:text-reward dark:border dark:border-reward/40 shadow-xs'
                : 'bg-sunken text-ink-2 hover:bg-line'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType(selectedType === 'debit' ? 'all' : 'debit')}
            className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors press ${
              selectedType === 'debit'
                ? 'bg-negative text-white shadow-xs'
                : 'bg-sunken text-ink-2 hover:bg-line'
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setSelectedType(selectedType === 'credit' ? 'all' : 'credit')}
            className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors press ${
              selectedType === 'credit'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod(selectedMethod === 'UPI' ? 'all' : 'UPI')}
            className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors press ${
              selectedMethod === 'UPI'
                ? 'bg-slate-900 text-white dark:bg-sunken dark:text-reward dark:border dark:border-reward/40 shadow-xs'
                : 'bg-sunken text-ink-2 hover:bg-line'
            }`}
          >
            UPI
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod(selectedMethod === 'cards' ? 'all' : 'cards')}
            className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors press ${
              selectedMethod === 'cards'
                ? 'bg-slate-900 text-white dark:bg-sunken dark:text-reward dark:border dark:border-reward/40 shadow-xs'
                : 'bg-sunken text-ink-2 hover:bg-line'
            }`}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod(selectedMethod === 'Cash' ? 'all' : 'Cash')}
            className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors press ${
              selectedMethod === 'Cash'
                ? 'bg-slate-900 text-white dark:bg-sunken dark:text-reward dark:border dark:border-reward/40 shadow-xs'
                : 'bg-sunken text-ink-2 hover:bg-line'
            }`}
          >
            Cash
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-2 border-t border-line">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1">
              Timeframe
            </label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="w-full py-1.5 px-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Person Filter */}
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1">
              Person
            </label>
            <select
              value={selectedPerson}
              onChange={e => setSelectedPerson(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
            >
              <option value="all">All People</option>
              {distinctPersons.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="none">Unspecified (—)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as any)}
              className="w-full py-1.5 px-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="debit">Expenses Only</option>
              <option value="credit">Income Only</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1">
              Method
            </label>
            <select
              value={selectedMethod}
              onChange={e => setSelectedMethod(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
            >
              <option value="all">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Wallet">Wallet</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1">
              Source
            </label>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="manual">Manual Entry</option>
              <option value="pdf">PDF Statement</option>
              <option value="csv">CSV Statement</option>
            </select>
          </div>

          {/* Grouping */}
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1">
              Group View
            </label>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as GroupByMode)}
              className="w-full py-1.5 px-2.5 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none"
            >
              <option value="none">Flat List</option>
              <option value="month">Group by Month</option>
              <option value="year">Group by Year</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker when active */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-line text-xs">
            <span className="text-ink-3 font-medium">Custom Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 bg-sunken border border-line rounded-xl text-ink-1 text-xs"
            />
            <span className="text-ink-3">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 bg-sunken border border-line rounded-xl text-ink-1 text-xs"
            />
          </div>
        )}
      </Card>

      {/* Bulk Action Bar when items selected */}
      {activeSelectedTxIds.size > 0 && (
        <Card variant="surface" padding="md" className="rounded-2xl flex items-center justify-between border-line shadow-xl shadow-black/10 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-tint text-reward border border-primary/20">
              {activeSelectedTxIds.size} transaction{activeSelectedTxIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedTxIds(new Set())}
            >
              Deselect All
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Selected
            </Button>
          </div>
        </Card>
      )}

      {/* Grouped or Flat Transaction Tables */}
      {filteredTransactions.length === 0 ? (
        <Card
          variant="surface"
          padding="lg"
          className="rounded-2xl p-12 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-sunken flex items-center justify-center mx-auto text-ink-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-ink-1">
            {transactions.length === 0 ? 'No transactions yet' : 'No transactions match your filters'}
          </h3>
          <p className="text-xs text-ink-3 mt-1 max-w-sm mx-auto">
            {transactions.length === 0
              ? 'Start by recording your first expense or importing a bank statement.'
              : 'Try clearing your search query, adjusting the timeframe, or changing the person/category filter.'}
          </p>
          {transactions.length === 0 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenAddModal}
                leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              >
                Add First Transaction
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div ref={containerRef} className="space-y-6">
          {groupedTransactions.map(group => {
            if (group.items.length === 0) return null;

            return (
              <TransactionGroupCard
                key={group.groupKey}
                group={group}
                groupBy={groupBy}
                isDesktop={isDesktop}
                selectedTxIds={activeSelectedTxIds}
                highlightedTxId={highlightedTxId}
                deletingTxIds={deletingTxIds}
                categoryMap={categoryMap}
                contactMap={contactMap}
                filteredTransactionsLength={filteredTransactions.length}
                onToggleSelect={toggleSelectOne}
                onEdit={handleEdit}
                onDelete={handleDeleteTransaction}
                onToggleSelectAll={toggleSelectAll}
                getChildStyle={getChildStyle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
TransactionListView.displayName = 'TransactionListView';

export default TransactionListView;
