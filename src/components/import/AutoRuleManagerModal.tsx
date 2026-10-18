import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Category, PaymentMethod } from '../../types/finance';
import {
  AutoRule,
  getCustomAutoRules,
  saveCustomAutoRules,
  suggestCategory,
} from '../../utils/categoryMatcher';
import {
  Sparkles,
  Plus,
  Trash2,
  Code2,
  Tag,
  TestTube2,
  ShieldAlert,
} from 'lucide-react';

interface AutoRuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRulesUpdated?: () => void;
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

// ReDoS detection regex for dangerous nested or overlapping quantifiers: e.g. (a+)+, (.*)*, (a|b)+
const DANGEROUS_REDOS_PATTERN = /(?:[+*]\s*[+*])|\((?:[^()]*[+*][^()]*)\)[+*]|\((?:[^()|]*\|[^()|]*)\)[+*]/;

interface AutoRuleManagerContentProps {
  onClose: () => void;
  categories: Category[];
  onRulesUpdated?: () => void;
}

const AutoRuleManagerContent: React.FC<AutoRuleManagerContentProps> = ({
  onClose,
  categories,
  onRulesUpdated,
}) => {
  const [rules, setRules] = useState<AutoRule[]>(() => getCustomAutoRules());
  const [patternType, setPatternType] = useState<'keywords' | 'regex'>('keywords');
  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState<string>(categories[0]?.name || 'Food & Dining');
  const [suggestedType, setSuggestedType] = useState<'credit' | 'debit'>('debit');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [ruleName, setRuleName] = useState('');

  // Form error and test state
  const [error, setError] = useState<string | null>(null);
  const [testDescription, setTestDescription] = useState('');

  // Validate pattern (ReDoS prevention and regex syntax validation)
  const validatePattern = (
    type: 'keywords' | 'regex',
    rawPattern: string
  ): { valid: boolean; error?: string; cleanPattern?: string } => {
    const trimmed = rawPattern.trim();

    if (type === 'keywords') {
      const keywords = trimmed
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      // Ensure empty keywords cannot be saved
      if (keywords.length === 0) {
        return {
          valid: false,
          error: 'Please enter at least one non-empty keyword (separated by commas).',
        };
      }

      // Check keyword length
      for (const kw of keywords) {
        if (kw.length > 60) {
          return {
            valid: false,
            error: `Keyword "${kw.slice(0, 20)}..." exceeds maximum length of 60 characters.`,
          };
        }
      }

      return { valid: true, cleanPattern: keywords.join(', ') };
    }

    // Regex mode validation
    if (!trimmed) {
      return { valid: false, error: 'Regex pattern cannot be empty.' };
    }

    if (trimmed.length > 100) {
      return {
        valid: false,
        error: 'Regex pattern is too long (maximum 100 characters to prevent performance degradation).',
      };
    }

    // ReDoS heuristic check: protect against catastrophic backtracking
    if (DANGEROUS_REDOS_PATTERN.test(trimmed)) {
      return {
        valid: false,
        error: 'Potential ReDoS (catastrophic backtracking) pattern detected. Avoid nested quantifiers like (a+)+ or (.*)*.',
      };
    }

    // Syntax validation: catch invalid regex
    try {
      new RegExp(trimmed, 'i');
    } catch (err: any) {
      return {
        valid: false,
        error: `Invalid Regular Expression syntax: ${err.message || 'Syntax error'}`,
      };
    }

    return { valid: true, cleanPattern: trimmed };
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePattern(patternType, pattern);
    if (!validation.valid || !validation.cleanPattern) {
      setError(validation.error || 'Invalid pattern.');
      return;
    }

    const newRule: AutoRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: ruleName.trim() || undefined,
      patternType,
      pattern: validation.cleanPattern,
      category,
      suggestedType,
      paymentMethod: (paymentMethod as PaymentMethod) || undefined,
      enabled: true,
    };

    const updated = [newRule, ...rules];
    setRules(updated);
    saveCustomAutoRules(updated);

    // Reset input fields
    setPattern('');
    setRuleName('');
    setError(null);
    onRulesUpdated?.();
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    saveCustomAutoRules(updated);
    onRulesUpdated?.();
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setRules(updated);
    saveCustomAutoRules(updated);
    onRulesUpdated?.();
  };

  // Test current simulator output
  const testMatchResult = testDescription.trim()
    ? suggestCategory(testDescription, 'Others', rules)
    : null;

  return (
    <div className="space-y-6">
        {/* Add Rule Form */}
        <form onSubmit={handleAddRule} className="p-4 bg-sunken rounded-2xl border border-line space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Create New Rule</span>
            </h4>

            {/* Pattern Type Toggle */}
            <div className="flex items-center bg-surface p-0.5 rounded-xl border border-line text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setPatternType('keywords');
                  setError(null);
                }}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  patternType === 'keywords'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                <Tag className="w-3 h-3" />
                <span>Keywords</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPatternType('regex');
                  setError(null);
                }}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  patternType === 'regex'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Regex</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1">
              {patternType === 'keywords'
                ? 'Keywords (comma-separated, case-insensitive) *'
                : 'Regular Expression Pattern *'}
            </label>
            <input
              type="text"
              required
              value={pattern}
              onChange={e => {
                setPattern(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                patternType === 'keywords'
                  ? 'e.g. blinkit, zepto, quick mart'
                  : 'e.g. ^upi.*starbucks|coffee.*day'
              }
              className="w-full font-mono text-xs px-3 py-2 bg-surface border border-line rounded-xl text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-ink-3">
              {patternType === 'keywords'
                ? 'Matches words or phrases in transaction narrations (e.g. Swiggy, Uber).'
                : 'Validated against syntax errors & ReDoS before saving.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1">
                Assign Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-surface border border-line rounded-xl text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1">
                Transaction Type
              </label>
              <select
                value={suggestedType}
                onChange={e => setSuggestedType(e.target.value as 'credit' | 'debit')}
                className="w-full text-xs px-2.5 py-2 bg-surface border border-line rounded-xl text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="debit">Debit (Expense)</option>
                <option value="credit">Credit (Income)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1">
                Payment Method (Opt)
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod | '')}
                className="w-full text-xs px-2.5 py-2 bg-surface border border-line rounded-xl text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Auto-Detect</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:opacity-95 text-on-primary shadow-xs transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Rule</span>
            </button>
          </div>
        </form>

        {/* Live Simulator / Rule Tester */}
        <div className="p-4 bg-sunken/60 rounded-2xl border border-line space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-1">
            <TestTube2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Test Your Rules Live</span>
          </div>
          <input
            type="text"
            value={testDescription}
            onChange={e => setTestDescription(e.target.value)}
            placeholder="Type a narration (e.g. 'UPI-SWIGGY-1923 BANGLORE') to see the auto-category..."
            className="w-full text-xs px-3 py-2 bg-surface border border-line rounded-xl text-ink-1 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {testMatchResult && (
            <div className="p-2.5 bg-surface rounded-xl border border-line flex items-center justify-between text-xs">
              <span className="text-ink-3 font-medium">Result:</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md font-bold bg-primary-tint text-primary">
                  {testMatchResult.category}
                </span>
                <span className="text-ink-3 font-numeric capitalize">
                  ({testMatchResult.suggestedType || 'debit'})
                </span>
                <span className="text-xs text-ink-3">
                  Confidence: <strong className="text-ink-1 capitalize">{testMatchResult.confidence}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Saved Custom Rules List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-ink-3 uppercase tracking-wider">
            <span>Custom Rules ({rules.length})</span>
            {rules.length === 0 && <span className="text-xs normal-case">No custom rules yet</span>}
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {rules.length === 0 ? (
              <div className="p-6 text-center bg-surface border border-dashed border-line rounded-2xl">
                <p className="text-xs text-ink-3">
                  You have not created any custom auto-categorization rules. Built-in defaults for Swiggy, Zomato, Uber, Zepto, and top Indian merchants are active.
                </p>
              </div>
            ) : (
              rules.map(rule => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                    rule.enabled
                      ? 'bg-surface border-line'
                      : 'bg-surface/50 border-line/60 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-sunken text-ink-2 border border-line">
                        {rule.patternType}
                      </span>
                      <span className="text-xs font-mono font-bold text-ink-1 truncate">
                        {rule.pattern}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink-3">
                      <span>Category: <strong className="text-ink-1">{rule.category}</strong></span>
                      <span>•</span>
                      <span>Type: <strong className="text-ink-1 capitalize">{rule.suggestedType || 'debit'}</strong></span>
                      {rule.paymentMethod && (
                        <>
                          <span>•</span>
                          <span>Method: <strong className="text-ink-1">{rule.paymentMethod}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule.id)}
                      className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-colors border ${
                        rule.enabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                          : 'bg-sunken text-ink-3 border-line'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-xl text-ink-3 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-sunken hover:bg-line text-ink-1 border border-line transition-colors"
          >
            Close
          </button>
        </div>
      </div>
  );
};

export const AutoRuleManagerModal: React.FC<AutoRuleManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRulesUpdated,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-Categorization Rules"
      subtitle="Define smart keyword and regex rules to automatically categorize imported transactions"
    >
      {isOpen && (
        <AutoRuleManagerContent
          onClose={onClose}
          categories={categories}
          onRulesUpdated={onRulesUpdated}
        />
      )}
    </Modal>
  );
};
