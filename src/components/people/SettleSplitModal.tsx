import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useFinance } from '../../context/FinanceContext';
import { Contact, Transaction, SplitEntry } from '../../types/finance';
import { Money } from '../ui';
import { formatDate, getTodayString, sanitizeDateString } from '../../utils/date';
import { roundCurrency } from '../../utils/currency';
import {
  Link as LinkIcon,
  Unlink,
  Search,
  Check,
  Receipt,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { useSubmitOnce } from '../../hooks/useSubmitOnce';
import { MAX_AMOUNT, MIN_AMOUNT, MIN_DATE_STRING, getMaxDateString, isValidAmount, isValidDate, roundMoney } from '../../utils/validation';

interface SettleSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  transaction: Transaction;
  splitEntry: SplitEntry;
}

export const SettleSplitModal: React.FC<SettleSplitModalProps> = ({
  isOpen,
  onClose,
  contact,
  transaction,
  splitEntry,
}) => {
  const {
    transactions,
    settlements,
    settleSplitEntry,
  } = useFinance();

  const [settledAmount, setSettledAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayString());
  const [note, setNote] = useState<string>('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'exact' | 'credits'>('all');
  const { isSubmitting, startSubmit, reset } = useSubmitOnce();
  const prevIsOpenRef = useRef(false);

  // Existing settlement for this split entry if any
  const existingSettlement = useMemo(() => {
    return settlements.find(
      s => s.sourceTransactionId === transaction.id && s.sourceSplitEntryId === splitEntry.id
    );
  }, [settlements, transaction.id, splitEntry.id]);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }
    const isOpening = isOpen && !prevIsOpenRef.current;
    if (isOpening) {
      reset();
    }
    const initialAmt = splitEntry.settledAmount !== undefined && splitEntry.settledAmount > 0
      ? splitEntry.settledAmount
      : splitEntry.amount;

    const linkedId = splitEntry.linkedTransactionId || existingSettlement?.linkedTransactionId || null;
    const linkedTx = linkedId ? transactions.find(t => t.id === linkedId) : null;

    setSettledAmount(initialAmt.toString());
    setDate(linkedTx?.date || existingSettlement?.date || transaction.date || getTodayString());
    setNote(existingSettlement?.note || `Repayment for "${transaction.description}"`);
    setSelectedTxId(linkedId);
    setSearchQuery('');
    setFilterMode('all');
    prevIsOpenRef.current = isOpen;
  }, [isOpen, splitEntry, existingSettlement, transaction, transactions, reset]);

  // Expected type: if they owe me, bank repayment is a credit
  const expectedTxType = splitEntry.direction === 'they_owe_me' ? 'credit' : 'debit';
  const parsedSettledAmount = roundCurrency(parseFloat(settledAmount) || 0);
  const remainingAfterSettlement = Math.max(0, roundCurrency(splitEntry.amount - parsedSettledAmount));

  // Count how many times each transaction is linked across all settlements
  const txUsageCountMap = useMemo(() => {
    const map = new Map<string, number>();
    settlements.forEach(s => {
      if (s.linkedTransactionId) {
        map.set(s.linkedTransactionId, (map.get(s.linkedTransactionId) || 0) + 1);
      }
    });
    return map;
  }, [settlements]);

  // Candidate transactions for repayment (NEVER arbitrarily block or hide)
  const candidateTransactions = useMemo(() => {
    const targetDate = new Date(date).getTime();

    const candidates = transactions.filter(t => {
      // Avoid linking the split expense transaction to itself
      if (t.id === transaction.id) return false;

      // Filter tabs
      if (filterMode === 'credits' && t.type !== expectedTxType) return false;
      if (filterMode === 'exact' && Math.abs(t.amount - parsedSettledAmount) > 0.01) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesRef = t.referenceId && t.referenceId.toLowerCase().includes(q);
        const matchesAmount = t.amount !== undefined && t.amount.toString().includes(q);
        const matchesDate = (t.date || '').includes(q);
        if (!matchesDesc && !matchesRef && !matchesAmount && !matchesDate) return false;
      }

      return true;
    });

    // Score & Sort: Same direction first, Exact amount first, Date proximity
    return candidates.sort((a, b) => {
      const aTypeMatch = a.type === expectedTxType ? 1 : 0;
      const bTypeMatch = b.type === expectedTxType ? 1 : 0;
      if (aTypeMatch !== bTypeMatch) return bTypeMatch - aTypeMatch;

      const aExact = Math.abs(a.amount - parsedSettledAmount) < 0.01 ? 1 : 0;
      const bExact = Math.abs(b.amount - parsedSettledAmount) < 0.01 ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      const aDateDiff = Math.abs(new Date(a.date).getTime() - targetDate);
      const bDateDiff = Math.abs(new Date(b.date).getTime() - targetDate);
      return aDateDiff - bDateDiff;
    });
  }, [transactions, transaction.id, expectedTxType, filterMode, parsedSettledAmount, date, searchQuery]);

  const handleSelectTransaction = (tx: Transaction) => {
    setSelectedTxId(tx.id);
    setDate(tx.date); // Auto-sync settlement date with transaction date!
  };

  const selectedTransaction = useMemo(() => {
    if (!selectedTxId) return null;
    return transactions.find(t => t.id === selectedTxId) || null;
  }, [selectedTxId, transactions]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startSubmit()) return;

    if (parsedSettledAmount <= 0 || !isValidAmount(parsedSettledAmount)) {
      alert(`Please enter a valid settlement amount between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }

    if (parsedSettledAmount > roundCurrency(splitEntry.amount) + 0.01) {
      alert(`Settled amount (₹${parsedSettledAmount}) cannot exceed the owed share (₹${splitEntry.amount})`);
      reset();
      return;
    }

    const sanitizedDate = sanitizeDateString(date) || getTodayString();
    if (!isValidDate(sanitizedDate)) {
      alert(`Please enter a valid date between ${MIN_DATE_STRING} and ${getMaxDateString()}`);
      reset();
      return;
    }

    settleSplitEntry(transaction.id, splitEntry.id, {
      settled: true,
      settledAmount: roundMoney(parsedSettledAmount),
      linkedTransactionId: selectedTxId || undefined,
      note: note.trim(),
      date: sanitizedDate,
    });

    onClose();
  };

  const handleUnsettle = () => {
    if (window.confirm(`Mark this split expense for "${transaction.description}" as unsettled?`)) {
      settleSplitEntry(transaction.id, splitEntry.id, { settled: false });
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Connect Repayment: ${transaction.description}`}
      subtitle={`Manage settlement and connect bank transaction for ${contact.name}`}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Original Split Expense Summary Card */}
        <div className="p-3.5 rounded-2xl bg-sunken border border-line flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-primary-tint text-primary flex-shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-ink-1 truncate">
                {transaction.description}
              </p>
              <p className="text-xs text-ink-3">
                {formatDate(transaction.date)} • Total Bill: <Money value={transaction.amount} size="xs" />
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <Money
              value={splitEntry.amount}
              size="sm"
              tone={splitEntry.direction === 'they_owe_me' ? 'positive' : 'negative'}
            />
            <p className="text-xs font-bold text-ink-3">
              {splitEntry.direction === 'they_owe_me' ? 'They Owe' : 'You Owe'}
            </p>
          </div>
        </div>

        {/* Settled Amount Input + Partial Remaining Helper */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3">
              Settlement Amount (₹) *
            </label>
            <button
              type="button"
              onClick={() => setSettledAmount(splitEntry.amount.toString())}
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5"
            >
              <span>Full (</span><Money value={splitEntry.amount} size="xs" /><span>)</span>
            </button>
          </div>

          <div className="relative rounded-xl shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-3 font-bold text-lg">
              ₹
            </div>
            <input
              type="number"
              step="0.01"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              inputMode="decimal"
              required
              value={settledAmount}
              onChange={e => setSettledAmount(e.target.value)}
              placeholder="0.00"
              className="font-numeric tabular-nums w-full rounded-xl border border-line bg-sunken pl-8 pr-4 py-2.5 text-ink-1 font-bold text-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {remainingAfterSettlement > 0.01 && (
            <div className="mt-2 p-2.5 rounded-xl bg-sunken/50 border border-warning/30 flex items-center gap-2 text-xs text-warning dark:text-warning font-numeric">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
              <span>
                Partial settlement: <strong className="font-extrabold"><Money value={remainingAfterSettlement} size="xs" /></strong> will stay open as pending balance for {contact.name}.
              </span>
            </div>
          )}
        </div>

        {/* Date & Note Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-3">
                Settlement Date *
              </label>
              {selectedTransaction && selectedTransaction.date !== date && (
                <button
                  type="button"
                  onClick={() => setDate(selectedTransaction.date)}
                  className="text-xs font-bold font-numeric text-primary hover:underline"
                  title="Use transaction date"
                >
                  Use tx date ({formatDate(selectedTransaction.date)})
                </button>
              )}
            </div>
            <input
              type="date"
              min={MIN_DATE_STRING}
              max={getMaxDateString()}
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="font-numeric tabular-nums w-full rounded-xl border border-line bg-sunken px-3.5 py-2 text-xs font-medium text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Paid via GPay UPI"
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2 text-xs font-medium text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Bank Repayment Transaction Connection */}
        <div className="pt-2 border-t border-line space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-primary" />
              <span>Connect Bank Transaction (Repayment)</span>
            </span>

            {selectedTxId && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Connected</span>
              </span>
            )}
          </div>

          {selectedTransaction ? (
            /* Selected Transaction Banner */
            <div className="p-3.5 rounded-2xl bg-sunken border border-line shadow-xs flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-ink-1 truncate">
                    {selectedTransaction.description}
                  </p>
                  <p className="text-xs text-ink-3">
                    {formatDate(selectedTransaction.date)} • {selectedTransaction.paymentMethod} •{' '}
                    <Money value={selectedTransaction.amount} size="sm" tone="positive" />
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTxId(null)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface text-ink-2 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors border border-line shadow-xs"
              >
                <Unlink className="w-3 h-3" />
                <span>Change / Unlink</span>
              </button>
            </div>
          ) : (
            /* Transaction Search and Candidate List */
            <div className="p-3 bg-sunken rounded-2xl border border-line space-y-2.5">
              {/* Search & Filter Tabs */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search bank transactions by merchant or amount..."
                    className="w-full pl-8 pr-3 py-1.5 bg-surface border border-line rounded-xl text-xs font-medium text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 bg-sunken p-0.5 rounded-xl text-xs font-bold self-start sm:self-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-1 rounded-xl transition-colors ${
                      filterMode === 'all'
                        ? 'bg-surface text-ink-1 shadow-xs'
                        : 'text-ink-3'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('exact')}
                    className={`font-numeric px-2 py-1 rounded-xl transition-colors ${
                      filterMode === 'exact'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-ink-3'
                    }`}
                  >
                    Exact (<Money value={parsedSettledAmount} size="xs" />)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('credits')}
                    className={`px-2 py-1 rounded-xl transition-colors ${
                      filterMode === 'credits'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-ink-3'
                    }`}
                  >
                    Incoming Credits
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {candidateTransactions.length === 0 ? (
                  <p className="text-xs text-ink-3 py-4 text-center italic">
                    No matching bank transactions found. You can still confirm settlement without linking.
                  </p>
                ) : (
                  candidateTransactions.slice(0, 20).map(tx => {
                    const isExact = Math.abs(tx.amount - parsedSettledAmount) < 0.01;
                    const usageCount = txUsageCountMap.get(tx.id) || 0;

                    return (
                      <div
                        key={tx.id}
                        onClick={() => handleSelectTransaction(tx)}
                        className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 text-xs ${
                          isExact
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/80'
                            : 'bg-surface border-line hover:border-line'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-ink-1 truncate">
                              {tx.description}
                            </span>
                            {isExact && (
                              <span className="px-1.5 py-0.2 rounded text-xs font-extrabold bg-emerald-600 text-white">
                                Exact Match
                              </span>
                            )}
                            {usageCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-sunken text-ink-2 flex items-center gap-0.5">
                                <Layers className="w-2.5 h-2.5" />
                                <span>Linked to {usageCount} split{usageCount > 1 ? 's' : ''}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink-3 mt-0.5 font-numeric">
                            {formatDate(tx.date)} • {tx.paymentMethod} • {tx.type === 'credit' ? 'Income Credit' : 'Expense Debit'}
                            {tx.referenceId ? ` • Ref: ${tx.referenceId}` : ''}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <Money
                            value={tx.amount}
                            size="sm"
                            tone={tx.type === 'credit' ? 'positive' : 'neutral'}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-line gap-2">
          <div>
            {splitEntry.settled && (
              <button
                type="button"
                onClick={handleUnsettle}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Mark this split as unsettled"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Mark Unsettled</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-on-primary shadow-md shadow-xs transition-colors active:scale-95 ${
                isSubmitting ? 'bg-ink-3/40 cursor-not-allowed opacity-50' : 'bg-primary hover:opacity-95'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{selectedTxId ? 'Confirm Settlement & Link' : 'Confirm Settlement'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
