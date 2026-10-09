import React from 'react';
import {
  CheckSquare,
  Square,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { StagedTransaction, Category, PaymentMethod } from '../../types/finance';
import { roundCurrency } from '../../utils/currency';

interface ReviewStagingTableProps {
  stagedList: StagedTransaction[];
  categories: Category[];
  onToggleSelect: (tempId: string) => void;
  onToggleSelectAll: () => void;
  onUpdateRow: (tempId: string, updated: Partial<StagedTransaction>) => void;
  onRemoveRow: (tempId: string) => void;
  onExcludeDuplicates: () => void;
  onInvertAllTypes?: () => void;
  onRemoveSelected?: () => void;
  onBulkSetCategory?: (categoryName: string) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Bank Transfer',
  'Cash',
  'Cheque',
  'Other',
];

export const ReviewStagingTable: React.FC<ReviewStagingTableProps> = ({
  stagedList,
  categories,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateRow,
  onRemoveRow,
  onExcludeDuplicates,
  onInvertAllTypes,
  onRemoveSelected,
  onBulkSetCategory,
}) => {
  const selectedCount = stagedList.filter(t => t.selected).length;
  const duplicateCount = stagedList.filter(t => t.isDuplicate).length;

  const handleBulkRemove = () => {
    if (selectedCount === 0) return;
    onRemoveSelected?.();
  };

  const handleBulkCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val || selectedCount === 0) return;
    onBulkSetCategory?.(val);
    e.target.value = '';
  };

  const handleToggleAll = () => {
    if (stagedList.length === 0) return;
    onToggleSelectAll();
  };

  const handleDeselectDuplicates = () => {
    if (duplicateCount === 0) return;
    onExcludeDuplicates();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Stats & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-sunken rounded-2xl border border-line">
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="text-ink-2">
            Total Parsed: <span className="font-bold font-numeric text-ink-1">{stagedList.length}</span>
          </div>
          <div className="w-px h-3 bg-line" />
          <div className="text-emerald-600 dark:text-emerald-400 font-bold font-numeric">
            {selectedCount} selected for import
          </div>
          {duplicateCount > 0 && (
            <>
              <div className="w-px h-3 bg-line" />
              <div className="text-rose-500 font-bold flex items-center gap-1 font-numeric">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{duplicateCount} duplicates detected</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk Category Change on Selection */}
          {onBulkSetCategory && (
            <div className="relative">
              <select
                disabled={selectedCount === 0}
                onChange={handleBulkCategoryChange}
                defaultValue=""
                className={`py-1.5 pl-2.5 pr-6 rounded-xl text-xs font-bold border transition-colors ${
                  selectedCount > 0
                    ? 'bg-surface text-ink-1 border-line cursor-pointer'
                    : 'bg-sunken text-ink-3 border-line opacity-50 cursor-not-allowed'
                }`}
                title={selectedCount === 0 ? 'Select rows to assign category in bulk' : `Assign category to ${selectedCount} selected rows`}
              >
                <option value="" disabled>
                  Set Category ({selectedCount})
                </option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bulk Delete Selected */}
          {onRemoveSelected && (
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleBulkRemove}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                selectedCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border-rose-200/80 cursor-pointer'
                  : 'bg-sunken text-ink-3 border-line opacity-50 cursor-not-allowed'
              }`}
              title={selectedCount === 0 ? 'Select rows to exclude in bulk' : `Exclude ${selectedCount} selected rows`}
            >
              Exclude Selected ({selectedCount})
            </button>
          )}

          {onInvertAllTypes && (
            <button
              type="button"
              onClick={onInvertAllTypes}
              className="px-3 py-1.5 rounded-xl bg-sunken hover:bg-line text-ink-2 hover:text-ink-1 text-xs font-bold transition-colors border border-line"
              title="Invert income (credit) and expense (debit) for all transactions if the bank statement columns were reversed"
            >
              Flip Income / Expense
            </button>
          )}

          {duplicateCount > 0 && (
            <button
              type="button"
              onClick={handleDeselectDuplicates}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors border border-rose-200/80 dark:border-rose-900/50"
            >
              Deselect All {duplicateCount} Duplicates
            </button>
          )}
        </div>
      </div>

      {/* Staging Table */}
      <div className="overflow-x-auto border border-line rounded-2xl bg-surface shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-sunken text-xs font-bold text-ink-3 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-ink-3 hover:text-slate-600 dark:hover:text-slate-200"
                  title={selectedCount === stagedList.length && stagedList.length > 0 ? 'Deselect all' : 'Select all'}
                >
                  {selectedCount === stagedList.length && stagedList.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3">Description / Narration</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Category (Auto-Suggested)</th>
              <th className="py-3 px-3">Method</th>
              <th className="py-3 px-3 text-right">Amount (₹)</th>
              <th className="py-3 px-3 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-xs">
            {stagedList.map(row => {
              return (
                <tr
                  key={row.tempId}
                  className={`hover:bg-sunken/80 transition-colors ${
                    row.isDuplicate ? 'bg-sunken/30 dark:bg-sunken/20' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleSelect(row.tempId)}
                      className="text-ink-3 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {row.selected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>

                  {/* Date Input */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <input
                      type="date"
                      value={row.date}
                      onChange={e => onUpdateRow(row.tempId, { date: e.target.value })}
                      className="py-1 px-2 bg-sunken border border-line rounded-xl text-xs text-ink-1 font-numeric focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Description Input */}
                  <td className="py-3 px-3 min-w-[200px]">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => onUpdateRow(row.tempId, { description: e.target.value })}
                        className="w-full py-1 px-2 bg-sunken border border-line rounded-xl text-xs font-semibold text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {row.isDuplicate && (
                        <p className="text-xs text-ink-3 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{row.duplicateReason}</span>
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Type Select */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <select
                      value={row.type}
                      onChange={e => onUpdateRow(row.tempId, { type: e.target.value as any })}
                      className={`py-1 px-2 rounded-xl text-xs font-bold border transition-colors ${
                        row.type === 'credit'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                      }`}
                    >
                      <option value="debit">Debit (Expense)</option>
                      <option value="credit">Credit (Income)</option>
                    </select>
                  </td>

                  {/* Category Dropdown */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <select
                      value={row.category}
                      onChange={e => onUpdateRow(row.tempId, { category: e.target.value })}
                      className="py-1 px-2 bg-sunken border border-line rounded-xl text-xs font-medium text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Payment Method */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <select
                      value={row.paymentMethod}
                      onChange={e => onUpdateRow(row.tempId, { paymentMethod: e.target.value as PaymentMethod })}
                      className="py-1 px-2 bg-sunken border border-line rounded-xl text-xs text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Amount Input: prevents <= 0 and NaN */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={row.amount}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          onUpdateRow(row.tempId, { amount: roundCurrency(val) });
                        }
                      }}
                      onBlur={e => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || val <= 0) {
                          onUpdateRow(row.tempId, { amount: row.amount > 0 ? roundCurrency(row.amount) : 1 });
                        }
                      }}
                      className="font-numeric tabular-nums w-24 py-1 px-2 text-right font-bold bg-sunken border border-line rounded-xl text-xs text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </td>

                  {/* Remove row */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.tempId)}
                      className="p-1 rounded text-ink-3 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Exclude Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
