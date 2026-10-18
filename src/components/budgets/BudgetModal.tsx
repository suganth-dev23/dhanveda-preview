import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { useFinance } from '../../context/FinanceContext';
import { Budget } from '../../types/finance';
import { formatINR, numberToWordsINR } from '../../utils/currency';
import { useSubmitOnce } from '../../hooks/useSubmitOnce';
import { MAX_AMOUNT, MIN_AMOUNT, isValidAmount, roundMoney } from '../../utils/validation';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBudget?: Budget | null;
}

interface BudgetFormProps {
  initialBudget?: Budget | null;
  onClose: () => void;
}

const PRESET_LIMITS = [3000, 5000, 8000, 10000, 15000, 20000, 25000, 50000];

const BudgetForm: React.FC<BudgetFormProps> = ({
  initialBudget,
  onClose,
}) => {
  const { categories, budgets, setBudgetForCategory } = useFinance();

  // Set of category names that already have an active budget
  const existingBudgetCategories = useMemo(() => {
    return new Set(budgets.map(b => b.category.toLowerCase()));
  }, [budgets]);

  const defaultCategory = useMemo(() => {
    if (initialBudget) return initialBudget.category;
    const unbudgeted = categories.find(c => !existingBudgetCategories.has(c.name.toLowerCase()));
    return unbudgeted ? unbudgeted.name : (categories[0]?.name || 'Food & Dining');
  }, [initialBudget, categories, existingBudgetCategories]);

  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const [limitAmount, setLimitAmount] = useState<string>(initialBudget ? initialBudget.monthlyLimit.toString() : '10000');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isSubmitting, startSubmit, reset } = useSubmitOnce();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!startSubmit()) return;

    const num = parseFloat(limitAmount);
    if (isNaN(num) || !isValidAmount(num)) {
      setErrorMessage(`Please enter a positive monthly budget limit between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }

    // Guard against duplicate budget for the same category when creating new
    if (!initialBudget) {
      const isDuplicate = budgets.some(
        b => b.category.toLowerCase() === selectedCategory.toLowerCase()
      );
      if (isDuplicate) {
        setErrorMessage(`A budget for "${selectedCategory}" already exists. Please choose a different category or edit the existing budget.`);
        reset();
        return;
      }
    }

    setBudgetForCategory(selectedCategory, roundMoney(num));
    onClose();
  };

  const parsedLimit = parseFloat(limitAmount) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Category select */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Category *
          </label>
          <select
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setErrorMessage(null);
            }}
            disabled={!!initialBudget}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            {categories.map(c => {
              const alreadyHasBudget = !initialBudget && existingBudgetCategories.has(c.name.toLowerCase());
              return (
                <option key={c.id} value={c.name} disabled={alreadyHasBudget}>
                  {c.name} {alreadyHasBudget ? '(Budget already set)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Limit Amount */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Monthly Limit (INR ₹) *
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
              value={limitAmount}
              onChange={e => {
                setLimitAmount(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="e.g. 12000"
              className="w-full rounded-xl border border-line bg-surface pl-8 pr-4 py-2.5 text-ink-1 font-bold text-lg font-numeric focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          {parsedLimit > 0 && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium italic">
              {numberToWordsINR(parsedLimit)} / month
            </p>
          )}
        </div>

        {/* Quick presets */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Quick INR Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_LIMITS.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setLimitAmount(preset.toString());
                  setErrorMessage(null);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-sunken hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-ink-2 hover:text-emerald-700 transition-colors font-numeric border border-line"
              >
                {formatINR(preset)}
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
              isSubmitting ? 'bg-ink-3/40 cursor-not-allowed opacity-50' : 'bg-primary hover:opacity-95 shadow-xs active:scale-95'
            }`}
          >
            Save Budget
          </button>
        </div>
      </form>
  );
};

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  initialBudget,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialBudget ? 'Update Monthly Budget' : 'Set Category Budget'}
      subtitle="Establish a spending limit to keep your monthly cash flow disciplined"
    >
      {isOpen && (
        <BudgetForm
          key={initialBudget?.id || 'new'}
          initialBudget={initialBudget}
          onClose={onClose}
        />
      )}
    </Modal>
  );
};
