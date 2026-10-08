import {
  Transaction,
  Contact,
  SettlementRecord,
  Budget,
  Investment,
  DreamGoal,
  Category,
  RecurringPayment,
  RecurringPaymentLog,
  SplitEntry,
  EmergencyFund,
  AIHealthReport,
} from '../types/finance';
import { getTodayString } from './date';
import { MAX_AMOUNT, isValidAmount, isValidDate, roundMoney } from './validation';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalizes and validates a transaction record.
 * Returns a repaired Transaction object or null if critically invalid.
 */
export function normalizeTransaction(raw: any): Transaction | null {
  if (!raw || typeof raw !== 'object') return null;

  // ID must be a non-empty string
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  if (!id) return null;

  // Amount must be a valid positive number up to MAX_AMOUNT
  const amount = typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount);
  if (!isValidAmount(amount)) return null;

  // Type must be credit or debit (mapping income->credit, expense->debit for backward-compatibility)
  let type: 'credit' | 'debit';
  if (raw.type === 'credit' || raw.type === 'income') {
    type = 'credit';
  } else if (raw.type === 'debit' || raw.type === 'expense') {
    type = 'debit';
  } else {
    return null;
  }

  // Date validation: must match valid ISO date range or fall back to createdAt date
  let date: string;
  if (typeof raw.date === 'string' && isValidDate(raw.date)) {
    date = raw.date;
  } else if (typeof raw.createdAt === 'string' && isValidDate(raw.createdAt.slice(0, 10))) {
    date = raw.createdAt.slice(0, 10);
  } else {
    return null;
  }

  const createdAt =
    typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt;
  const description = typeof raw.description === 'string' ? raw.description : '';
  const category = typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : 'Other';
  const paymentMethod = typeof raw.paymentMethod === 'string' && raw.paymentMethod.trim() ? raw.paymentMethod : 'Other';
  const source = raw.source === 'imported' ? 'imported' : 'manual';
  const person = typeof raw.person === 'string' && raw.person.trim() ? raw.person.trim() : undefined;
  const referenceId = typeof raw.referenceId === 'string' && raw.referenceId.trim() ? raw.referenceId.trim() : undefined;
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t: any) => typeof t === 'string') : undefined;

  // Normalize splits if present
  let splitWith: SplitEntry[] | undefined = undefined;
  const rawSplits = raw.splitWith || raw.splits;
  if (rawSplits && !Array.isArray(rawSplits) && typeof rawSplits === 'object') {
    const single = rawSplits as any;
    const splitAmount = typeof single.amount === 'number' ? single.amount : parseFloat(single.amount) || 0;
    splitWith = [
      {
        id: single.id || `split-${id}-1`,
        contactId: single.contactId ? String(single.contactId).trim() : undefined,
        label: single.label || (!single.contactId ? 'Unnamed Person' : undefined),
        amount: roundMoney(splitAmount),
        direction: single.direction === 'i_owe_them' ? 'i_owe_them' : 'they_owe_me',
        settled: Boolean(single.settled),
        settledAmount: typeof single.settledAmount === 'number' ? roundMoney(single.settledAmount) : undefined,
        linkedTransactionId: single.linkedTransactionId || undefined,
      },
    ];
  } else if (Array.isArray(rawSplits)) {
    splitWith = rawSplits.map((entry: any, idx: number) => {
      const splitAmount = typeof entry.amount === 'number' ? entry.amount : parseFloat(entry.amount) || 0;
      return {
        id: entry.id || `split-${id}-${idx + 1}`,
        contactId: entry.contactId ? String(entry.contactId).trim() : undefined,
        label: entry.label || (!entry.contactId ? `Person ${idx + 1}` : undefined),
        amount: roundMoney(splitAmount),
        direction: entry.direction === 'i_owe_them' ? 'i_owe_them' : 'they_owe_me',
        settled: Boolean(entry.settled),
        settledAmount: typeof entry.settledAmount === 'number' ? roundMoney(entry.settledAmount) : undefined,
        linkedTransactionId: entry.linkedTransactionId || undefined,
      };
    });
  }

  return {
    id,
    date,
    amount: roundMoney(amount),
    type,
    category,
    paymentMethod,
    description,
    person,
    source,
    tags,
    referenceId,
    createdAt,
    updatedAt,
    splitWith: splitWith && splitWith.length > 0 ? splitWith : undefined,
  };
}

/**
 * Normalizes and validates a contact record.
 */
export function normalizeContact(raw: any): Contact | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : null;
  if (!id || !name) return null;

  return {
    id,
    name,
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

/**
 * Normalizes and validates a settlement record.
 */
export function normalizeSettlement(raw: any): SettlementRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const contactId = typeof raw.contactId === 'string' && raw.contactId.trim() ? raw.contactId.trim() : null;
  if (!id || !contactId) return null;

  const amount = typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount);
  if (!isValidAmount(amount)) return null;

  let date: string;
  if (typeof raw.date === 'string' && isValidDate(raw.date)) {
    date = raw.date;
  } else if (typeof raw.createdAt === 'string' && isValidDate(raw.createdAt.slice(0, 10))) {
    date = raw.createdAt.slice(0, 10);
  } else {
    date = getTodayString();
  }

  return {
    id,
    contactId,
    date,
    amount: roundMoney(amount),
    note: typeof raw.note === 'string' ? raw.note : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    sourceTransactionId: typeof raw.sourceTransactionId === 'string' ? raw.sourceTransactionId : undefined,
    sourceSplitEntryId: typeof raw.sourceSplitEntryId === 'string' ? raw.sourceSplitEntryId : undefined,
    linkedTransactionId: typeof raw.linkedTransactionId === 'string' ? raw.linkedTransactionId : undefined,
    direction: raw.direction === 'i_owe_them' ? 'i_owe_them' : 'they_owe_me',
    reconciledSplits: Array.isArray(raw.reconciledSplits) ? raw.reconciledSplits : undefined,
  };
}

/**
 * Normalizes and validates a budget record.
 */
export function normalizeBudget(raw: any): Budget | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const category = typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : null;
  if (!id || !category) return null;

  const monthlyLimit = typeof raw.monthlyLimit === 'number' ? raw.monthlyLimit : parseFloat(raw.monthlyLimit);
  if (!isValidAmount(monthlyLimit)) return null;

  return {
    id,
    category,
    monthlyLimit: roundMoney(monthlyLimit),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

/**
 * Normalizes and validates an investment record.
 */
export function normalizeInvestment(raw: any): Investment | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : null;
  if (!id || !name) return null;

  const currentValue = typeof raw.currentValue === 'number' ? raw.currentValue : parseFloat(raw.currentValue);
  const investedAmount = typeof raw.investedAmount === 'number' ? raw.investedAmount : parseFloat(raw.investedAmount);
  if (!Number.isFinite(currentValue) || currentValue < 0 || currentValue > MAX_AMOUNT || !isValidAmount(investedAmount)) return null;

  return {
    id,
    name,
    type: typeof raw.type === 'string' ? raw.type : 'Other',
    currentValue: roundMoney(currentValue),
    investedAmount: roundMoney(investedAmount),
    sipAmount: typeof raw.sipAmount === 'number' && isValidAmount(raw.sipAmount) ? roundMoney(raw.sipAmount) : undefined,
    sipDay: typeof raw.sipDay === 'number' ? raw.sipDay : undefined,
    platform: typeof raw.platform === 'string' ? raw.platform : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    lastUpdated: typeof raw.lastUpdated === 'string' ? raw.lastUpdated : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    logs: Array.isArray(raw.logs) ? raw.logs : undefined,
  };
}

/**
 * Normalizes and validates a dream/goal record.
 */
export function normalizeDream(raw: any): DreamGoal | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const name = typeof raw.name === 'string' && raw.name.trim()
    ? raw.name.trim()
    : (typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : null);
  if (!id || !name) return null;

  const targetAmount = typeof raw.targetAmount === 'number' ? raw.targetAmount : parseFloat(raw.targetAmount);
  if (!isValidAmount(targetAmount)) return null;

  const currentSaved = typeof raw.currentSaved === 'number'
    ? raw.currentSaved
    : (typeof raw.currentAmount === 'number' ? raw.currentAmount : parseFloat(raw.currentSaved || raw.currentAmount) || 0);

  return {
    id,
    name,
    targetAmount: roundMoney(targetAmount),
    currentSaved: Number.isFinite(currentSaved) ? roundMoney(Math.max(0, currentSaved)) : 0,
    targetDate: typeof raw.targetDate === 'string' && isValidDate(raw.targetDate) ? raw.targetDate : undefined,
    category: typeof raw.category === 'string' ? raw.category : 'General',
    icon: typeof raw.icon === 'string' ? raw.icon : 'Target',
    color: typeof raw.color === 'string' ? raw.color : '#10B981',
    priority: raw.priority === 'low' || raw.priority === 'high' ? raw.priority : 'medium',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    contributions: Array.isArray(raw.contributions) ? raw.contributions : [],
  };
}

/**
 * Normalizes and validates a category record.
 */
export function normalizeCategory(raw: any): Category | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : null;
  if (!id || !name) return null;

  const type = raw.type === 'income' || raw.type === 'both' ? raw.type : 'expense';

  return {
    id,
    name,
    type,
    color: typeof raw.color === 'string' ? raw.color : '#64748B',
    icon: typeof raw.icon === 'string' ? raw.icon : 'Tag',
    isCustom: typeof raw.isCustom === 'boolean' ? raw.isCustom : undefined,
    budgetMonthly: typeof raw.budgetMonthly === 'number' ? raw.budgetMonthly : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

/**
 * Normalizes and validates a recurring payment record.
 */
export function normalizeRecurringPayment(raw: any): RecurringPayment | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : null;
  if (!id || !name) return null;

  const amount = typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount);
  if (!isValidAmount(amount)) return null;

  return {
    id,
    name,
    amount: roundMoney(amount),
    category: typeof raw.category === 'string' ? raw.category : 'General',
    frequency: raw.frequency || 'monthly',
    dayOfMonth: typeof raw.dayOfMonth === 'number' ? raw.dayOfMonth : undefined,
    startDate: typeof raw.startDate === 'string' && isValidDate(raw.startDate) ? raw.startDate : getTodayString(),
    endDate: typeof raw.endDate === 'string' && isValidDate(raw.endDate) ? raw.endDate : undefined,
    isActive: raw.isActive !== false,
    paymentMethod: raw.paymentMethod || undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    autoLogTransaction: Boolean(raw.autoLogTransaction),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

/**
 * Normalizes and validates a recurring payment log.
 */
export function normalizeRecurringPaymentLog(raw: any): RecurringPaymentLog | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const recurringPaymentId =
    typeof raw.recurringPaymentId === 'string' && raw.recurringPaymentId.trim()
      ? raw.recurringPaymentId.trim()
      : null;
  if (!id || !recurringPaymentId) return null;

  const amount = typeof raw.amount === 'number' ? raw.amount : parseFloat(raw.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) return null;

  return {
    id,
    recurringPaymentId,
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : getTodayString(),
    paidDate: typeof raw.paidDate === 'string' ? raw.paidDate : undefined,
    amount,
    linkedTransactionId: typeof raw.linkedTransactionId === 'string' ? raw.linkedTransactionId : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

/**
 * Normalizes and validates an EmergencyFund object.
 */
export function normalizeEmergencyFund(raw: any): EmergencyFund | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const targetMonths = typeof raw.targetMonths === 'number' && Number.isFinite(raw.targetMonths) && raw.targetMonths > 0 ? raw.targetMonths : 6;
  const monthlyExpenseBaseline = typeof raw.monthlyExpenseBaseline === 'number' && Number.isFinite(raw.monthlyExpenseBaseline) && raw.monthlyExpenseBaseline >= 0 ? raw.monthlyExpenseBaseline : 50000;
  const currentSaved = typeof raw.currentSaved === 'number' && Number.isFinite(raw.currentSaved) && raw.currentSaved >= 0 ? raw.currentSaved : 0;
  const contributions = Array.isArray(raw.contributions) ? raw.contributions : [];
  return {
    targetMonths,
    monthlyExpenseBaseline,
    currentSaved,
    manualTargetAmount: typeof raw.manualTargetAmount === 'number' && Number.isFinite(raw.manualTargetAmount) ? raw.manualTargetAmount : undefined,
    contributions,
  };
}

/**
 * Normalizes and validates an AIHealthReport object.
 */
export function normalizeAIHealthReport(raw: any): AIHealthReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  if (!id) return null;
  const snapshot = raw.financialSnapshot && typeof raw.financialSnapshot === 'object' ? raw.financialSnapshot : {};
  return {
    id,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    provider: raw.provider === 'openai' || raw.provider === 'claude' ? raw.provider : 'gemini',
    model: typeof raw.model === 'string' ? raw.model : 'default',
    summaryText: typeof raw.summaryText === 'string' ? raw.summaryText : (typeof raw.summary === 'string' ? raw.summary : ''),
    healthScore: typeof raw.healthScore === 'number' ? raw.healthScore : undefined,
    financialSnapshot: {
      monthlyIncome: typeof snapshot.monthlyIncome === 'number' ? snapshot.monthlyIncome : 0,
      monthlyExpense: typeof snapshot.monthlyExpense === 'number' ? snapshot.monthlyExpense : 0,
      savingsRate: typeof snapshot.savingsRate === 'number' ? snapshot.savingsRate : 0,
      topExpenseCategory: typeof snapshot.topExpenseCategory === 'string' ? snapshot.topExpenseCategory : 'General',
      emergencyFundMonths: typeof snapshot.emergencyFundMonths === 'number' ? snapshot.emergencyFundMonths : 0,
      totalInvestments: typeof snapshot.totalInvestments === 'number' ? snapshot.totalInvestments : 0,
      activeGoalsCount: typeof snapshot.activeGoalsCount === 'number' ? snapshot.activeGoalsCount : 0,
    },
  };
}

/**
 * Filters a raw array through a validator/normalizer function, returning valid items
 * and counting invalid records. Never mutates or deletes anything from storage.
 */
export function validateStoreRecords<T>(
  items: any[] | null | undefined,
  normalizer: (item: any) => T | null
): { valid: T[]; invalidCount: number } {
  if (!items || !Array.isArray(items)) {
    return { valid: [], invalidCount: 0 };
  }
  const valid: T[] = [];
  let invalidCount = 0;
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      invalidCount++;
      continue;
    }
    const normalized = normalizer(item);
    if (normalized !== null) {
      valid.push(normalized);
    } else {
      invalidCount++;
    }
  }
  return { valid, invalidCount };
}

/**
 * Directly exports all raw data from IndexedDB object stores without going through in-memory state.
 * Allows safe data recovery even when records cannot be parsed by application logic.
 */
export async function exportRawIndexedDBData(): Promise<void> {
  const rawData = await new Promise<Record<string, any>>((resolve, reject) => {
    const req = indexedDB.open('dhanveda_db');
    req.onerror = () => reject(req.error || new Error('Failed to open database'));
    req.onsuccess = () => {
      const db = req.result;
      const storeNames = Array.from(db.objectStoreNames);
      const data: Record<string, any> = {
        exportTimestamp: new Date().toISOString(),
        dbVersion: db.version,
        stores: {},
      };

      if (storeNames.length === 0) {
        db.close();
        resolve(data);
        return;
      }

      const tx = db.transaction(storeNames, 'readonly');
      let pending = storeNames.length;

      for (const store of storeNames) {
        const storeReq = tx.objectStore(store).getAll();
        storeReq.onsuccess = () => {
          data.stores[store] = storeReq.result;
          pending--;
          if (pending === 0) {
            db.close();
            resolve(data);
          }
        };
        storeReq.onerror = () => {
          data.stores[store] = [];
          pending--;
          if (pending === 0) {
            db.close();
            resolve(data);
          }
        };
      }
    };
  });

  const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dhanveda-raw-data-${getTodayString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

