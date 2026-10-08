import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, SplitEntry, OwedDirection } from '../../types/finance';
import { formatINR, roundCurrency } from '../../utils/currency';
import { Money } from '../ui';
import { useSubmitOnce } from '../../hooks/useSubmitOnce';
import { MAX_AMOUNT, MIN_AMOUNT, isValidAmount, roundMoney } from '../../utils/validation';

interface EditSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  splitEntry: SplitEntry | null;
}

export const EditSplitModal: React.FC<EditSplitModalProps> = ({
  isOpen,
  onClose,
  transaction,
  splitEntry,
}) => {
  const {
    contacts,
    updateTransaction,
    settlements,
    updateSettlement,
    recordSettlement,
    deleteSettlement,
  } = useFinance();

  const [contactId, setContactId] = useState<string>('');
  const [direction, setDirection] = useState<OwedDirection>('they_owe_me');
  const [amount, setAmount] = useState<string>('');
  const [isSettled, setIsSettled] = useState<boolean>(false);
  const { isSubmitting, startSubmit, reset } = useSubmitOnce();
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }
    const isOpening = isOpen && !prevIsOpenRef.current;
    if (isOpening) {
      reset();
    }
    if (splitEntry && isOpen) {
      setContactId(splitEntry.contactId || '');
      setDirection(splitEntry.direction);
      setAmount(splitEntry.amount.toString());
      setIsSettled(splitEntry.settled);
    }
    prevIsOpenRef.current = isOpen;
  }, [splitEntry, isOpen, reset]);

  if (!transaction || !splitEntry) return null;

  const otherSplitsTotal = roundCurrency(
    (transaction.splitWith || [])
      .filter(s => s.id !== splitEntry.id)
      .reduce((sum, s) => sum + s.amount, 0)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startSubmit()) return;

    const rawAmount = parseFloat(amount);
    if (isNaN(rawAmount) || !isValidAmount(rawAmount)) {
      alert(`Please enter a valid split amount between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }
    const parsedAmount = roundMoney(rawAmount);

    const totalSplits = roundCurrency(otherSplitsTotal + parsedAmount);
    if (totalSplits > roundCurrency(transaction.amount) + 0.01) {
      alert(
        `Total splits (${formatINR(totalSplits)}) cannot exceed total transaction amount of ${formatINR(transaction.amount)}`
      );
      reset();
      return;
    }

    if (!transaction.splitWith) return;

    const updatedSplits = transaction.splitWith.map(s =>
      s.id === splitEntry.id
        ? {
            ...s,
            contactId: contactId || undefined,
            label: contactId ? undefined : s.label || 'Unnamed Person',
            amount: parsedAmount,
            direction,
            settled: isSettled,
            settledAmount: isSettled ? parsedAmount : undefined,
          }
        : s
    );

    updateTransaction(transaction.id, { splitWith: updatedSplits });

    // Sync settlement record
    const existingSettlement = settlements.find(
      s => s.sourceTransactionId === transaction.id && s.sourceSplitEntryId === splitEntry.id
    );

    if (isSettled) {
      if (contactId) {
        if (existingSettlement) {
          updateSettlement(existingSettlement.id, {
            amount: parsedAmount,
            contactId,
            direction,
          });
        } else {
          recordSettlement(
            contactId,
            parsedAmount,
            `Settlement for "${transaction.description}"`,
            transaction.date,
            transaction.id,
            splitEntry.id,
            undefined,
            direction
          );
        }
      }
    } else {
      if (existingSettlement) {
        deleteSettlement(existingSettlement.id);
      }
    }

    onClose();
  };

  const handleRemoveSplit = () => {
    if (window.confirm('Remove this split entry from the transaction?')) {
      if (!transaction.splitWith) return;
      const updatedSplits = transaction.splitWith.filter(s => s.id !== splitEntry.id);
      updateTransaction(transaction.id, {
        splitWith: updatedSplits.length > 0 ? updatedSplits : undefined,
      });

      const existingSettlement = settlements.find(
        s => s.sourceTransactionId === transaction.id && s.sourceSplitEntryId === splitEntry.id
      );
      if (existingSettlement) {
        deleteSettlement(existingSettlement.id);
      }

      onClose();
    }
  };

  const parsedAmount = roundCurrency(parseFloat(amount) || 0);
  const yourShare = Math.max(0, roundCurrency(transaction.amount - otherSplitsTotal - parsedAmount));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Split / IOU"
      subtitle={`Transaction: ${transaction.description} (${formatINR(transaction.amount)})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Person
          </label>
          <select
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm font-semibold text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">(Unnamed Person / Label)</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Direction Toggle */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Direction
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-sunken rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setDirection('they_owe_me')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                direction === 'they_owe_me'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-ink-2 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              They Owe Me
            </button>
            <button
              type="button"
              onClick={() => setDirection('i_owe_them')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                direction === 'i_owe_them'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-ink-2 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              I Owe Them
            </button>
          </div>
        </div>

        {/* Split Amount */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Owed Amount (₹) *
          </label>
          <input
            type="number"
            step="0.01"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            inputMode="decimal"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="font-numeric tabular-nums w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm font-bold text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <div className="mt-1 text-xs text-ink-3 flex items-center gap-1.5 flex-wrap">
            <span>Total transaction:</span>
            <Money value={transaction.amount} size="xs" />
            <span>·</span>
            <span>Your share:</span>
            <Money value={yourShare} size="xs" tone="neutral" />
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-sunken rounded-2xl border border-line">
          <span className="text-xs font-bold text-ink-2">
            Settlement Status
          </span>
          <button
            type="button"
            onClick={() => setIsSettled(!isSettled)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              isSettled
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-warning-tint text-warning dark:bg-sunken/60 dark:text-warning'
            }`}
          >
            {isSettled ? 'Settled' : 'Pending'}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleRemoveSplit}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
          >
            Remove Split
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-2 hover:bg-sunken transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-on-primary shadow-md shadow-xs active:scale-95 transition-colors ${
                isSubmitting ? 'bg-ink-3/40 cursor-not-allowed opacity-50' : 'bg-primary hover:opacity-95'
              }`}
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
