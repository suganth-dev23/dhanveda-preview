import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useFinance } from '../../context/FinanceContext';
import { DreamGoal } from '../../types/finance';
import { numberToWordsINR } from '../../utils/currency';
import { IconRenderer } from '../common/IconRenderer';
import { AVAILABLE_CATEGORY_ICONS, CATEGORY_COLORS } from '../../constants/categoryTheme';
import { sanitizeDateString } from '../../utils/date';
import { useSubmitOnce } from '../../hooks/useSubmitOnce';
import { MAX_AMOUNT, MIN_AMOUNT, MIN_DATE_STRING, getMaxDateString, isValidAmount, isValidDate, roundMoney } from '../../utils/validation';

interface DreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDream?: DreamGoal | null;
}

interface DreamFormProps {
  initialDream?: DreamGoal | null;
  onClose: () => void;
}

const DreamForm: React.FC<DreamFormProps> = ({
  initialDream,
  onClose,
}) => {
  const { addDream, updateDream } = useFinance();

  const [name, setName] = useState(initialDream?.name || '');
  const [targetAmount, setTargetAmount] = useState(initialDream ? initialDream.targetAmount.toString() : '');
  const [initialSaved, setInitialSaved] = useState(initialDream ? initialDream.currentSaved.toString() : '');
  const [targetDate, setTargetDate] = useState(initialDream?.targetDate || '');
  const category = initialDream?.category || 'Travel';
  const [icon, setIcon] = useState(initialDream?.icon || 'Compass');
  const [color, setColor] = useState(initialDream?.color || '#3b82f6');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(initialDream?.priority || 'medium');
  const [formError, setFormError] = useState<string | null>(null);
  const { isSubmitting, startSubmit, reset } = useSubmitOnce();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!startSubmit()) return;

    if (!name.trim()) {
      setFormError('Please enter a goal name');
      reset();
      return;
    }

    const target = parseFloat(targetAmount);
    if (!targetAmount.trim() || isNaN(target) || !isValidAmount(target)) {
      setFormError(`Target amount must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }

    const saved = initialSaved.trim() ? parseFloat(initialSaved) : 0;
    if (isNaN(saved) || saved < 0 || saved > MAX_AMOUNT) {
      setFormError(`Initial saved amount must be between ₹0 and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }

    let validTargetDate: string | undefined = undefined;
    if (targetDate.trim()) {
      const sanitized = sanitizeDateString(targetDate);
      if (!sanitized || !isValidDate(sanitized)) {
        setFormError(`Please enter a valid target deadline date between ${MIN_DATE_STRING} and ${getMaxDateString()}`);
        reset();
        return;
      }
      validTargetDate = sanitized;
    }

    const roundedTarget = roundMoney(target);
    const roundedSaved = roundMoney(saved);

    if (initialDream) {
      updateDream(initialDream.id, {
        name: name.trim(),
        targetAmount: roundedTarget,
        targetDate: validTargetDate,
        category,
        icon,
        color,
        priority,
      });
    } else {
      addDream({
        name: name.trim(),
        targetAmount: roundedTarget,
        initialSaved: roundedSaved,
        targetDate: validTargetDate,
        category,
        icon,
        color,
        priority,
      });
    }
    onClose();
  };

  const parsedTarget = parseFloat(targetAmount) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {formError}
          </div>
        )}

        {/* Name & Target Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Goal / Dream Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Leh Ladakh Trip, MacBook Pro, House Registry"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Target Amount (INR ₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              inputMode="decimal"
              required
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-bold text-ink-1 font-numeric focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
        {parsedTarget > 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium italic">
            Target: {numberToWordsINR(parsedTarget)}
          </p>
        )}

        {/* Target Date & Initial Saved */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Target Deadline Date (Optional)
            </label>
            <input
              type="date"
              min={MIN_DATE_STRING}
              max={getMaxDateString()}
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {!initialDream && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
                Initial Saved Amount (INR ₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={MAX_AMOUNT}
                inputMode="decimal"
                value={initialSaved}
                onChange={e => setInitialSaved(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-1 font-numeric focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as any)}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority ⚡</option>
            </select>
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Card Accent Color
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Select Goal Icon
          </label>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-36 overflow-y-auto p-2 bg-sunken rounded-xl border border-line">
            {AVAILABLE_CATEGORY_ICONS.map(iconName => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
                  icon === iconName
                    ? 'bg-surface dark:bg-line text-emerald-600 shadow-sm ring-2 ring-emerald-500'
                    : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                <IconRenderer name={iconName} className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-ink-2 hover:bg-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-on-primary transition-colors duration-150 ${
              isSubmitting
                ? 'bg-ink-3/40 cursor-not-allowed opacity-50'
                : 'bg-primary hover:opacity-95 shadow-sm active:scale-95'
            }`}
          >
            {initialDream ? 'Update Goal' : 'Create Goal'}
          </button>
        </div>
      </form>
  );
};

export const DreamModal: React.FC<DreamModalProps> = ({
  isOpen,
  onClose,
  initialDream,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialDream ? 'Edit Dream / Goal' : 'Create New Dream Goal'}
      subtitle="Set a vision with a target date and auto-calculated monthly savings"
      maxWidth="xl"
    >
      {isOpen && (
        <DreamForm
          key={initialDream?.id || 'new'}
          initialDream={initialDream}
          onClose={onClose}
        />
      )}
    </Modal>
  );
};
