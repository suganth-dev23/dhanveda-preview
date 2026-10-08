import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { IconRenderer } from '../common/IconRenderer';
import { Money } from '../ui/Money';

import { Transaction } from '../../types/finance';
import { useStaggerChildren } from '../../hooks/useStaggerChildren';

interface RecentTransactionsProps {
  onEditTransaction?: (tx: Transaction) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ onEditTransaction }) => {
  const { transactions, categories, contacts, setCurrentView } = useFinance();
  const { containerRef, getChildStyle } = useStaggerChildren(40);

  // Sort descending (newest transaction first)
  const recentList = useMemo(() => {
    return [...(transactions || [])]
      .sort((a, b) => {
        const dA = a.date || '';
        const dB = b.date || '';
        if (dB !== dA) return dB.localeCompare(dA);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      })
      .slice(0, 6);
  }, [transactions]);

  const categoryMap = useMemo(() => {
    return new Map((categories || []).map(c => [(c.name || '').toLowerCase(), c]));
  }, [categories]);

  const contactMap = useMemo(() => {
    return new Map((contacts || []).map(c => [c.id, c]));
  }, [contacts]);

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-6 shadow-xs border border-line flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-ink-1">
              Recent Transactions
            </h3>
            <p className="text-xs text-ink-3">Latest entries across all accounts</p>
          </div>
          <button
            onClick={() => setCurrentView('transactions')}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 min-h-[44px]"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentList.length === 0 ? (
          <p className="text-xs text-ink-3 py-6 text-center">No transactions found.</p>
        ) : (
          <div ref={containerRef} className="divide-y divide-line">
            {recentList.map((tx, idx) => {
              const isCredit = tx.type === 'credit';
              const catInfo = categoryMap.get((tx.category || '').toLowerCase());
              const hasSplits = Array.isArray(tx.splitWith) && tx.splitWith.length > 0;
              let splitBadgeText = '';
              let isSplitSettled = false;
              let isTheyOweMe = true;
              let splitTooltip = '';

              if (hasSplits) {
                const splits = tx.splitWith!;
                if (splits.length === 1) {
                  const split = splits[0];
                  const personName = split.contactId
                    ? contactMap.get(split.contactId)?.name || 'Contact'
                    : split.label || 'Unnamed Person';
                  isSplitSettled = split.settled;
                  isTheyOweMe = split.direction === 'they_owe_me';
                  const statusLabel = split.settled ? 'settled' : isTheyOweMe ? 'owed' : 'due';
                  splitBadgeText = `Split · ${formatINR(split.amount)} ${statusLabel}`;
                  splitTooltip = `Split with ${personName} · ${formatINR(split.amount)} (${statusLabel})`;
                } else {
                  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
                  isSplitSettled = splits.every(s => s.settled);
                  splitBadgeText = `Split (${splits.length}) · ${formatINR(totalSplit)} ${
                    isSplitSettled ? 'settled' : 'owed'
                  }`;
                  splitTooltip = splits
                    .map(
                      s =>
                        `${
                          s.contactId
                            ? contactMap.get(s.contactId)?.name || 'Contact'
                            : s.label || 'Unnamed'
                        }: ${formatINR(s.amount)}`
                    )
                    .join(' • ');
                }
              }

              return (
                <div
                  key={tx.id}
                  style={getChildStyle(idx)}
                  onClick={() => onEditTransaction?.(tx)}
                  className={`py-3 flex items-center justify-between gap-3 rounded-2xl px-2 -mx-2 transition-colors animate-slide-up ${
                    onEditTransaction
                      ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-sunken/60 press'
                      : ''
                  }`}
                  role={onEditTransaction ? 'button' : undefined}
                  tabIndex={onEditTransaction ? 0 : undefined}
                  onKeyDown={e => {
                    if (onEditTransaction && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onEditTransaction(tx);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${catInfo?.color || '#64748b'}18`,
                        color: catInfo?.color || '#64748b',
                      }}
                    >
                      <IconRenderer name={catInfo?.icon || 'Tag'} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-ink-1 truncate">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-ink-3 mt-0.5">
                        <span>
                          {formatDate(tx.date)} • {tx.paymentMethod}
                          {tx.person ? ` • with ${tx.person}` : ''}
                        </span>
                        {hasSplits && (
                          <span
                            title={splitTooltip || undefined}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium font-numeric ${
                              isSplitSettled
                                ? 'bg-sunken text-ink-3 line-through'
                                : isTheyOweMe
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            }`}
                          >
                            {splitBadgeText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <Money
                      value={tx.amount}
                      tone={isCredit ? 'income' : 'expense'}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
