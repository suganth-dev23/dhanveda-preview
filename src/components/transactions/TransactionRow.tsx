import React from 'react';
import {
  CheckSquare,
  Square,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Transaction, Category, Contact, SplitEntry } from '../../types/finance';
import { formatDate } from '../../utils/date';
import { formatINR } from '../../utils/currency';
import { IconRenderer } from '../common/IconRenderer';
import { Money } from '../ui/Money';
import { getCategoryBadgeStyle } from '../../constants/categoryTheme';

export interface TransactionRowProps {
  tx: Transaction;
  catInfo?: Category;
  contactMap?: Map<string, Contact>;
  isSelected: boolean;
  isHighlighted: boolean;
  isDeleting: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string, description: string) => void;
  style?: React.CSSProperties;
}

export interface SplitDetailsBadgeProps {
  splits: SplitEntry[];
  contactMap?: Map<string, Contact>;
}

export const SplitDetailsBadge: React.FC<SplitDetailsBadgeProps> = React.memo(function SplitDetailsBadge({
  splits,
  contactMap,
}: SplitDetailsBadgeProps) {
  if (!splits || splits.length === 0) return null;

  if (splits.length === 1) {
    const split = splits[0];
    const personName = split.contactId
      ? contactMap?.get(split.contactId)?.name || 'Contact'
      : split.label || 'Unnamed Person';
    const isSettled = split.settled;
    const isTheyOweMe = split.direction === 'they_owe_me';

    return (
      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium font-numeric ${
            isSettled
              ? 'bg-sunken text-ink-3 line-through'
              : isTheyOweMe
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          Split with {personName} · <Money value={split.amount} size="xs" className="inline text-inherit font-medium" /> {split.settled ? '(Settled)' : isTheyOweMe ? 'owed' : 'you owe'}
        </span>
      </div>
    );
  }

  const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
  const isSettled = splits.every(s => s.settled);
  const tooltip = splits
    .map(
      s =>
        `${
          s.contactId
            ? contactMap?.get(s.contactId)?.name || 'Contact'
            : s.label || 'Unnamed'
        }: ${formatINR(s.amount)}`
    )
    .join(' • ');

  return (
    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
      <span
        title={tooltip}
        className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium font-numeric ${
          isSettled
            ? 'bg-sunken text-ink-3 line-through'
            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}
      >
        Split with {splits.length} people · <Money value={totalSplit} size="xs" className="inline text-inherit font-medium" /> owed{' '}
        {isSettled ? '(Settled)' : ''}
      </span>
    </div>
  );
});
SplitDetailsBadge.displayName = 'SplitDetailsBadge';

/**
 * Desktop table row component for a single transaction.
 * Memoized with React.memo to prevent re-renders when other rows or state update.
 */
export const TransactionTableRow: React.FC<TransactionRowProps> = React.memo(function TransactionTableRow({
  tx,
  catInfo,
  contactMap,
  isSelected,
  isHighlighted,
  isDeleting,
  onToggleSelect,
  onEdit,
  onDelete,
  style,
}: TransactionRowProps) {
  const isCredit = tx.type === 'credit';

  return (
    <tr
      style={style}
      className={`hover:bg-sunken/70 transition-colors duration-200 animate-slide-up ${
        isDeleting
          ? 'opacity-0 -translate-x-4 pointer-events-none'
          : isHighlighted
          ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/15'
          : isSelected
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
          : ''
      }`}
    >
      <td className="py-3.5 px-4 text-center">
        <button
          type="button"
          onClick={() => onToggleSelect(tx.id)}
          className="text-ink-3 hover:text-ink-1"
          aria-label={isSelected ? `Deselect transaction ${tx.description}` : `Select transaction ${tx.description}`}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      </td>

      {/* Date */}
      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-ink-3 font-medium font-numeric">
        {formatDate(tx.date)}
      </td>

      {/* Description */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${catInfo?.color || '#64748b'}18`,
              color: catInfo?.color || '#64748b',
            }}
          >
            <IconRenderer name={catInfo?.icon || 'Tag'} className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-ink-1 leading-tight">
              {tx.description}
            </p>
            {tx.referenceId && (
              <p className="text-xs text-ink-3 font-numeric mt-0.5">
                Ref: {tx.referenceId}
              </p>
            )}
            {Array.isArray(tx.splitWith) && tx.splitWith.length > 0 && (
              <SplitDetailsBadge splits={tx.splitWith} contactMap={contactMap} />
            )}
          </div>
        </div>
      </td>

      {/* Person (Plain label) */}
      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-ink-2 font-medium">
        {tx.person ? (
          <span className="font-medium text-ink-2">{tx.person}</span>
        ) : (
          <span className="text-ink-3">—</span>
        )}
      </td>

      {/* Category Badge */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
          style={getCategoryBadgeStyle(catInfo?.color)}
        >
          {tx.category}
        </span>
      </td>

      {/* Payment Method */}
      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-ink-2 font-medium">
        <span className="px-2 py-0.5 rounded-md bg-sunken text-ink-2 font-medium">
          {tx.paymentMethod}
        </span>
      </td>

      {/* Amount */}
      <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold">
        <Money
          value={tx.amount}
          tone={isCredit ? 'income' : 'expense'}
          size="sm"
        />
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 whitespace-nowrap text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(tx)}
            className="p-1.5 rounded-xl text-ink-3 hover:text-ink-1 hover:bg-sunken transition-colors"
            title="Edit transaction"
            aria-label={`Edit ${tx.description}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(tx.id, tx.description)}
            className="p-1.5 rounded-xl text-ink-3 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors press"
            title="Delete transaction"
            aria-label={`Delete ${tx.description}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});
TransactionTableRow.displayName = 'TransactionTableRow';

/**
 * Mobile card row component for a single transaction.
 * Memoized with React.memo to prevent re-renders when other cards or state update.
 */
export const TransactionCardRow: React.FC<TransactionRowProps> = React.memo(function TransactionCardRow({
  tx,
  catInfo,
  contactMap,
  isSelected,
  isHighlighted,
  isDeleting,
  onToggleSelect,
  onEdit,
  onDelete,
  style,
}: TransactionRowProps) {
  const isCredit = tx.type === 'credit';

  return (
    <div
      role="row"
      style={style}
      className={`animate-slide-up transition-[transform,opacity] duration-200 overflow-hidden ${
        isDeleting ? 'opacity-0 -translate-x-4 max-h-0' : 'max-h-36'
      }`}
    >
      <div
        className={`p-4 flex items-center justify-between gap-3 transition-colors duration-200 ${
          isHighlighted
            ? 'animate-pulse-success ring-2 ring-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl'
            : isSelected
            ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
            : ''
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onToggleSelect(tx.id)}
            className="text-ink-3 hover:text-ink-1 shrink-0"
            aria-label={isSelected ? `Deselect transaction ${tx.description}` : `Select transaction ${tx.description}`}
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>

          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${catInfo?.color || '#64748b'}20`,
              color: catInfo?.color || '#64748b',
            }}
          >
            <IconRenderer name={catInfo?.icon || 'Tag'} className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <p className="font-bold text-sm text-ink-1 truncate">
              {tx.description}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={getCategoryBadgeStyle(catInfo?.color)}
              >
                {tx.category}
              </span>
              {tx.person && (
                <span className="px-1.5 py-0.2 rounded-md bg-sunken border border-line text-xs text-ink-2 font-medium">
                  {tx.person}
                </span>
              )}
              <span className="text-xs text-ink-3 font-numeric">
                {formatDate(tx.date)}
              </span>
            </div>
            {Array.isArray(tx.splitWith) && tx.splitWith.length > 0 && (
              <SplitDetailsBadge splits={tx.splitWith} contactMap={contactMap} />
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <Money
            value={tx.amount}
            tone={isCredit ? 'income' : 'expense'}
            size="sm"
          />
          <div className="flex items-center justify-end gap-1 mt-1">
            <button
              type="button"
              onClick={() => onEdit(tx)}
              className="p-1 rounded-xl text-ink-3 hover:text-ink-1"
              title="Edit"
              aria-label={`Edit ${tx.description}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(tx.id, tx.description)}
              className="p-1 rounded-xl text-ink-3 hover:text-rose-600 press"
              title="Delete"
              aria-label={`Delete ${tx.description}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
TransactionCardRow.displayName = 'TransactionCardRow';
