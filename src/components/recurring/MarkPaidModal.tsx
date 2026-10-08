import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Receipt } from 'lucide-react';
import { Modal } from '../common/Modal';
import { RecurringPayment, PaymentMethod } from '../../types/finance';
import { numberToWordsINR } from '../../utils/currency';
import { Money } from '../ui';
import { formatDate, getTodayString, sanitizeDateString } from '../../utils/date';
import { useSubmitOnce } from '../../hooks/useSubmitOnce';
import { MAX_AMOUNT, MIN_AMOUNT, MIN_DATE_STRING, getMaxDateString, isValidAmount, isValidDate, roundMoney } from '../../utils/validation';

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: RecurringPayment | null;
  targetDueDate: string;
  onConfirm: (
    paymentId: string,
    dueDate: string,
    actualAmount: number,
    createTransaction: boolean,
    paymentMethod?: PaymentMethod,
    paidDate?: string
  ) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Bank Transfer',
  'Cash',
  'Cheque',
  'Wallet',
  'Other',
];

export const MarkPaidModal: React.FC<MarkPaidModalProps> = ({
  isOpen,
  onClose,
  payment,
  targetDueDate,
  onConfirm,
}) => {
  const [amountStr, setAmountStr] = useState<string>('');
  const [recordInLedger, setRecordInLedger] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paidDate, setPaidDate] = useState<string>(getTodayString());
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
    if (payment) {
      setAmountStr(payment.amount.toString());
      setRecordInLedger(Boolean(payment.autoLogTransaction));
      setPaymentMethod(payment.paymentMethod || 'UPI');
      setPaidDate(getTodayString());
    }
    prevIsOpenRef.current = isOpen;
  }, [payment, targetDueDate, isOpen, reset]);

  if (!payment) return null;

  const parsedAmount = parseFloat(amountStr) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startSubmit()) return;

    if (parsedAmount <= 0 || !isValidAmount(parsedAmount)) {
      alert(`Please enter a valid payment amount between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }

    const sanitizedPaidDate = sanitizeDateString(paidDate) || getTodayString();
    if (!isValidDate(sanitizedPaidDate)) {
      alert(`Please enter a valid payment date between ${MIN_DATE_STRING} and ${getMaxDateString()}`);
      reset();
      return;
    }

    onConfirm(payment.id, targetDueDate, roundMoney(parsedAmount), recordInLedger, paymentMethod, sanitizedPaidDate);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Payment as Paid"
      subtitle={`Record payment for ${payment.name} — Due ${formatDate(targetDueDate)}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Commitment Summary Card */}
        <div className="rounded-xl border border-line bg-sunken p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink-1 leading-tight">
                  {payment.name}
                </h4>
                <p className="text-xs text-ink-3">
                  {payment.category} • {payment.frequency.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-ink-3">Scheduled</span>
              <div>
                <Money value={payment.amount} size="sm" tone="neutral" />
              </div>
            </div>
          </div>
        </div>

        {/* Due Date Indicator */}
        <div className="flex items-center justify-between rounded-xl bg-sunken px-3.5 py-2.5 text-xs text-ink-2 border border-line">
          <span className="font-medium">Cycle Due Date</span>
          <span className="font-bold text-ink-1 font-numeric">
            {formatDate(targetDueDate)}
          </span>
        </div>

        {/* Actual Amount Paid */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Actual Paid Amount (INR ₹) *
          </label>
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
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              placeholder="e.g. 2500"
              className="w-full rounded-xl border border-line bg-sunken pl-8 pr-4 py-2.5 text-ink-1 font-bold text-lg font-numeric focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          {parsedAmount > 0 && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium italic">
              {numberToWordsINR(parsedAmount)}
            </p>
          )}
        </div>

        {/* Payment Date & Method Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Payment Date
            </label>
            <input
              type="date"
              min={MIN_DATE_STRING}
              max={getMaxDateString()}
              required
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2 text-sm text-ink-1 font-numeric focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2 text-sm text-ink-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transaction Ledger Record Toggle */}
        <div className="rounded-xl border border-line bg-sunken p-3.5 transition-colors">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recordInLedger}
              onChange={e => setRecordInLedger(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-ink-1 flex items-center gap-1.5">
                Record as Debit in Transactions ledger
              </span>
              <p className="text-xs text-ink-3 mt-0.5">
                Automatically logs a ₹{parsedAmount.toLocaleString('en-IN')} debit dated {paidDate} under category{' '}
                <span className="font-semibold text-ink-2">{payment.category}</span> via{' '}
                <span className="font-semibold text-ink-2">{paymentMethod}</span>.
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 rounded-xl text-on-primary px-5 py-2.5 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors active:scale-95 ${
              isSubmitting ? 'bg-ink-3/40 cursor-not-allowed opacity-50' : 'bg-primary hover:opacity-95'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirm Payment</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
