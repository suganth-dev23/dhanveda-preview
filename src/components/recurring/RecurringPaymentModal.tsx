import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useFinance } from '../../context/FinanceContext';
import { RecurringPayment, RecurrenceFrequency, PaymentMethod } from '../../types/finance';
import { numberToWordsINR } from '../../utils/currency';
import { getTodayString, getCurrentDayOfMonth, sanitizeDateString } from '../../utils/date';
import { useSubmitOnce } from '../../hooks/useSubmitOnce';
import { MAX_AMOUNT, MIN_AMOUNT, MIN_DATE_STRING, getMaxDateString, isValidAmount, isValidDate, roundMoney } from '../../utils/validation';
import { useToast } from '../../context/ToastContext';

interface RecurringPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPayment?: RecurringPayment | null;
  onSave: (paymentData: Omit<RecurringPayment, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface RecurringPaymentFormProps {
  initialPayment?: RecurringPayment | null;
  onClose: () => void;
  onSave: (paymentData: Omit<RecurringPayment, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const FREQUENCIES: { label: string; value: RecurrenceFrequency }[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly (Fortnightly)', value: 'bi-weekly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
];

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

const RecurringPaymentForm: React.FC<RecurringPaymentFormProps> = ({
  initialPayment,
  onClose,
  onSave,
}) => {
  const { categories } = useFinance();
  const { showToast } = useToast();

  const [name, setName] = useState<string>(initialPayment?.name || '');
  const [amountStr, setAmountStr] = useState<string>(initialPayment ? initialPayment.amount.toString() : '');
  const [category, setCategory] = useState<string>(initialPayment?.category || categories[0]?.name || 'Bills & Utilities');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(initialPayment?.frequency || 'monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(() => initialPayment?.dayOfMonth || getCurrentDayOfMonth());
  const [startDate, setStartDate] = useState<string>(initialPayment?.startDate || getTodayString());
  const [endDate, setEndDate] = useState<string>(initialPayment?.endDate || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPayment?.paymentMethod || 'UPI');
  const [autoLogTransaction, setAutoLogTransaction] = useState<boolean>(initialPayment ? initialPayment.autoLogTransaction : true);
  const [notes, setNotes] = useState<string>(initialPayment?.notes || '');
  const { isSubmitting, startSubmit, reset } = useSubmitOnce();

  const parsedAmount = parseFloat(amountStr) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startSubmit()) return;

    if (!name.trim()) {
      showToast('danger', 'Missing Title', 'Please enter a commitment title (e.g., Netflix, Rent, SIP)');
      reset();
      return;
    }
    if (parsedAmount <= 0 || !isValidAmount(parsedAmount)) {
      showToast('danger', 'Invalid Amount', `Please enter a valid amount between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }

    const sanitizedStart = sanitizeDateString(startDate) || getTodayString();
    if (!isValidDate(sanitizedStart)) {
      showToast('danger', 'Invalid Date', `Please enter a valid start date between ${MIN_DATE_STRING} and ${getMaxDateString()}`);
      reset();
      return;
    }

    let sanitizedEnd: string | undefined = undefined;
    if (endDate && endDate.trim()) {
      const sanitized = sanitizeDateString(endDate);
      if (!sanitized || !isValidDate(sanitized)) {
        showToast('danger', 'Invalid End Date', `Please enter a valid end date between ${MIN_DATE_STRING} and ${getMaxDateString()}`);
        reset();
        return;
      }
      sanitizedEnd = sanitized;
    }

    onSave({
      name: name.trim(),
      amount: roundMoney(parsedAmount),
      category: category || categories[0]?.name || 'Bills & Utilities',
      frequency,
      dayOfMonth: (frequency !== 'weekly' && frequency !== 'bi-weekly') ? dayOfMonth : undefined,
      startDate: sanitizedStart,
      endDate: sanitizedEnd,
      isActive: initialPayment ? initialPayment.isActive : true,
      paymentMethod,
      autoLogTransaction,
      notes: notes.trim() ? notes.trim() : undefined,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {/* Commitment Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Commitment Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. House Rent, Netflix 4K, Zerodha Nifty SIP, JioFiber"
            className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Amount & Frequency row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Amount (INR ₹) *
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
                placeholder="e.g. 15000"
                className="w-full rounded-xl border border-line bg-sunken pl-8 pr-4 py-2.5 text-ink-1 font-bold text-lg font-numeric focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            {parsedAmount > 0 && (
              <p className="mt-1 text-xs text-ink-3 font-medium italic">
                {numberToWordsINR(parsedAmount)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Frequency *
            </label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as RecurrenceFrequency)}
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {FREQUENCIES.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Day of Month & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {frequency !== 'weekly' && frequency !== 'bi-weekly' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
                Due Day of Month (1 - 31) *
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={dayOfMonth}
                  onChange={e => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)))}
                  className="w-24 rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 font-numeric font-bold focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <span className="text-xs text-ink-3">
                  {dayOfMonth >= 29 ? 'Auto short-month protected' : 'e.g. 5th of every month'}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
                Recurrence Cycle
              </label>
              <p className="text-xs text-ink-3 py-2.5">
                {frequency === 'weekly' ? 'Calculated weekly from start date' : 'Calculated every 14 days from start date'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {categories.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Start Date & End Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Start Date *
            </label>
            <input
              type="date"
              min={MIN_DATE_STRING}
              max={getMaxDateString()}
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 font-numeric focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              End Date (Optional)
            </label>
            <input
              type="date"
              min={startDate || MIN_DATE_STRING}
              max={getMaxDateString()}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              placeholder="Leave empty for ongoing"
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 font-numeric focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Payment Method & Auto-Log Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-line bg-sunken p-3 flex items-center">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoLogTransaction}
                onChange={e => setAutoLogTransaction(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-reward focus:ring-primary dark:border-slate-600 dark:bg-slate-700"
              />
              <div className="flex-1">
                <span className="text-xs font-semibold text-ink-1 leading-tight block">
                  Auto-log to ledger when paid
                </span>
                <span className="text-xs text-ink-3 leading-tight block mt-0.5">
                  Pre-selects transaction entry on payment
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Notes / Account Ref (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Consumer ID 10928374, HDFC Auto-Debit, 1-year prepaid plan"
            className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2 text-sm text-ink-1 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Actions */}
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
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-on-primary shadow-sm transition-colors active:scale-95 ${
              isSubmitting ? 'bg-ink-3/40 cursor-not-allowed opacity-50' : 'bg-primary hover:opacity-95'
            }`}
          >
            {initialPayment ? 'Update Commitment' : 'Add Commitment'}
          </button>
        </div>
      </form>
  );
};

export const RecurringPaymentModal: React.FC<RecurringPaymentModalProps> = ({
  isOpen,
  onClose,
  initialPayment,
  onSave,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialPayment ? 'Edit Recurring Payment' : 'New Recurring Payment'}
      subtitle="Declare a fixed recurring expense, subscription, EMI, or SIP for automatic tracking"
      maxWidth="2xl"
    >
      {isOpen && (
        <RecurringPaymentForm
          key={initialPayment?.id || 'new'}
          initialPayment={initialPayment}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
};
