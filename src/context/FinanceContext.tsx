import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import {
 Transaction,
 Category,
 Budget,
 EmergencyFund,
 Investment,
 DreamGoal,
 AISettings,
 AIHealthReport,
 Contact,
 SettlementRecord,
 ContactBalance,
 SyncStatus,
 RecurringPayment,
 RecurringPaymentLog,
 OwedDirection,
 SyncableStoreName,
} from '../types/finance';
import {
 DEFAULT_CATEGORIES,
 INITIAL_TRANSACTIONS,
 INITIAL_BUDGETS,
 INITIAL_EMERGENCY_FUND,
 INITIAL_INVESTMENTS,
 INITIAL_DREAMS,
 INITIAL_RECURRING_PAYMENTS,
 INITIAL_RECURRING_PAYMENT_LOGS,
} from '../utils/sampleData';
import { getCurrentMonthYear, getTodayString, getMonthKey } from '../utils/date';
import {
  normalizeTransaction,
  normalizeContact,
  normalizeSettlement,
  normalizeBudget,
  normalizeInvestment,
  normalizeDream,
  normalizeCategory,
  normalizeRecurringPayment,
  normalizeRecurringPaymentLog,
  normalizeEmergencyFund,
  normalizeAIHealthReport,
  validateStoreRecords,
} from '../utils/recordValidation';
import { roundCurrency } from '../utils/currency';
import { rebaseDemoData } from '../utils/rebaseDemoDates';
import { getPaymentSchedule, calculateMonthlyEquivalent } from '../utils/recurringDates';
import { DEFAULT_AI_MODELS, FinancialAggregates } from '../services/aiService';
import {
 migrateFromLocalStorage,
 getAllFromStore,
 saveAllToStore,
 persistDiff,
 persistDiffSync,
 getCachedDB,
 ArrayStoreName,
 getSingleRecord,
 saveSingleRecord,
 clearAllStores,
 addTombstone,
 removeTombstones,
 UserPreferences,
} from '../utils/db';
import { PERSIST_MODE } from '../constants/uiFlags';
import { googleAuthService } from '../services/googleAuth';
import { driveSyncService } from '../services/driveSync';

export type AppView = 
 | 'dashboard'
 | 'transactions'
 | 'budgets'
 | 'recurring'
 | 'categories'
 | 'emergency'
 | 'investments'
 | 'dreams'
 | 'people'
 | 'ai'
 | 'import'
 | 'settings'
 | 'badges';

export type FinanceEvent =
 | { type: 'transaction_added'; tx: Transaction; silent?: boolean }
 | { type: 'transaction_deleted'; count: number }
 | { type: 'budget_exceeded'; category: string; spent: number; limit: number }
 | { type: 'dream_contributed'; dreamId: string; dreamName: string; amount: number; isCompleted: boolean }
 | { type: 'dream_completed'; dream: DreamGoal }
 | { type: 'emergency_contributed'; amount: number; fundType: 'deposit' | 'withdrawal'; isFullyFunded: boolean }
 | { type: 'recurring_paid'; paymentName: string; amount: number }
 | { type: 'settlement_recorded'; contactName: string; amount: number; allSettled: boolean }
 | { type: 'investment_updated'; totalValue: number }
 | { type: 'streak_continued'; days: number }
 | { type: 'streak_broken' }
 | { type: 'badge_earned'; badge: { id: string; name: string; description: string; icon: string } }
 | { type: 'recurring_overdue_detected'; count: number; paymentName?: string }
 | { type: 'bulk_data_loaded' };

export type FinanceEventListener = (event: FinanceEvent) => void;

export interface FinanceUiContextType {
 currentView: AppView;
 setCurrentView: (view: AppView) => void;
 darkMode: boolean;
 setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
 isInitialized: boolean;
 unreadableRecordCount: number;
 dismissUnreadableBanner: () => void;
 isUnreadableBannerDismissed: boolean;
 saveError: string | null;
 retrySave: () => void;
 clearSaveError: () => void;
  crossTabStale: boolean;
  dismissCrossTabStale: () => void;
}

export interface DeleteTransactionSnapshot {
 transaction: Transaction;
 settlements: SettlementRecord[];
 tombstoneIds: Array<{ store: SyncableStoreName; id: string }>;
 tombstones?: Array<{ store: SyncableStoreName; id: string }>;
}

export interface FinanceActionsContextType {
 // Event Pub/Sub
 subscribeFinanceEvent: (listener: FinanceEventListener) => () => void;
 emitFinanceEvent: (event: FinanceEvent) => void;

 // Google Drive Cross-Device Sync
 triggerSync: (showFeedback?: boolean) => Promise<boolean>;
 connectDrive: () => Promise<boolean>;
 disconnectDrive: () => Promise<void>;
 reloadFromDB: () => Promise<void>;

 // Transactions CRUD
 addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>, options?: { silent?: boolean }) => Transaction;
 addMultipleTransactions: (txs: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
 updateTransaction: (id: string, tx: Partial<Transaction>) => void;
 deleteTransaction: (id: string) => void;
 deleteMultipleTransactions: (ids: string[]) => void;
 captureDeleteSnapshot: (id: string) => DeleteTransactionSnapshot | null;
 restoreTransactions: (snapshots: DeleteTransactionSnapshot[]) => void;

 // Contacts & Splits CRUD
 addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Contact;
 updateContact: (id: string, contact: Partial<Contact>) => void;
 deleteContact: (id: string) => void;
 recordSettlement: (
  contactId: string,
  amount: number,
  note?: string,
  date?: string,
  sourceTransactionId?: string,
  sourceSplitEntryId?: string,
  linkedTransactionId?: string,
  direction?: OwedDirection
 ) => SettlementRecord;
 updateSettlement: (id: string, updated: Partial<SettlementRecord>) => void;
 deleteSettlement: (id: string) => void;
 linkSettlementToTransaction: (settlementId: string, transactionId?: string) => void;
 quickToggleSettleTransaction: (transactionId: string, splitEntryId?: string) => SettlementRecord | undefined;
 assignSplitToContact: (transactionId: string, splitEntryId: string, contactId: string) => void;
 settleSplitEntry: (
  transactionId: string,
  splitEntryId: string,
  options: {
   settled: boolean;
   settledAmount?: number;
   linkedTransactionId?: string;
   note?: string;
   date?: string;
  }
 ) => SettlementRecord | undefined;

 // Categories CRUD
 addCategory: (cat: Omit<Category, 'id'>) => Category;
 updateCategory: (id: string, cat: Partial<Category>) => void;
 deleteCategory: (id: string) => void;

 // Budgets CRUD
 setBudgetForCategory: (category: string, monthlyLimit: number) => void;
 deleteBudget: (id: string) => void;

 // Emergency Fund
 updateEmergencySettings: (targetMonths: number, manualTargetAmount?: number) => void;
 addEmergencyContribution: (amount: number, type: 'deposit' | 'withdrawal', note?: string, date?: string) => void;

 // Investments CRUD
 addInvestment: (inv: Omit<Investment, 'id' | 'lastUpdated'>) => Investment;
 updateInvestment: (id: string, inv: Partial<Investment>) => void;
 deleteInvestment: (id: string) => void;

 // Dreams CRUD
 addDream: (dream: Omit<DreamGoal, 'id' | 'createdAt' | 'contributions' | 'currentSaved'> & { initialSaved?: number }) => DreamGoal;
 updateDream: (id: string, dream: Partial<DreamGoal>) => void;
 deleteDream: (id: string) => void;
 addDreamContribution: (dreamId: string, amount: number, note?: string, date?: string) => void;

 // Recurring Payments CRUD
 addRecurringPayment: (payment: Omit<RecurringPayment, 'id' | 'createdAt' | 'updatedAt'>) => RecurringPayment;
 updateRecurringPayment: (id: string, payment: Partial<RecurringPayment>) => void;
 deleteRecurringPayment: (id: string) => void;
 pauseRecurringPayment: (id: string) => void;
 markRecurringPaymentPaid: (
  recurringPaymentId: string,
  dueDate: string,
  actualAmount?: number,
  linkedTransactionId?: string,
  createTransaction?: boolean
 ) => void;

 // Preferences
 toggleNotRecurring: (txId: string | string[]) => void;

 // AI
 updateAISettings: (settings: Partial<AISettings>) => void;
 saveAIReport: (report: Omit<AIHealthReport, 'id' | 'createdAt'>) => void;
 deleteAIReport: (id: string) => void;
 getAggregatesForAI: () => FinancialAggregates;

 // Backup & Reset
 resetToDemoData: () => void;
 clearAllData: () => void;
 exportBackupJSON: () => string;
 importBackupJSON: (
   jsonStr: string,
   options?: {
     onToast?: (variant: 'success' | 'danger' | 'warning' | 'info', title: string, message?: string, duration?: number, action?: { label: string; onClick: () => void }) => void;
   }
 ) => boolean;
}

export interface FinanceDataContextType {
 transactions: Transaction[];
 categories: Category[];
 budgets: Budget[];
 emergencyFund: EmergencyFund;
 investments: Investment[];
 dreams: DreamGoal[];
 contacts: Contact[];
 settlements: SettlementRecord[];
 recurringPayments: RecurringPayment[];
 recurringPaymentLogs: RecurringPaymentLog[];
 aiSettings: AISettings;
 aiReports: AIHealthReport[];
 notRecurringTxIds: Set<string>;

 // Google Drive Cross-Device Sync
 syncStatus: SyncStatus;
 lastSyncedAt: string | null;
 syncError: string | null;
 isDriveConnected: boolean;
 driveUserEmail: string | null;

 // Calculated Metrics
 totalBalance: number;
 totalNetWorth: number;
 netSharedBalance: number;
 peerBalanceSummary: {
  totalOwedToMe: number;
  totalIOwe: number;
  net: number;
  displayText: string;
 };
 currentMonthIncome: number;
 currentMonthExpense: number;
 currentMonthNet: number;
 currentMonthSavingsRate: number;
 totalInvestedAmount: number;
 totalInvestmentValue: number;
 totalInvestmentGainLoss: number;
 totalInvestmentGainLossPct: number;
 emergencyFundRunwayMonths: number;
 totalGoalsTarget: number;
 totalGoalsSaved: number;
 contactBalances: ContactBalance[];
 totalOwedToMe: number;
 totalIOwe: number;
 categorySpendingThisMonth: { category: string; spent: number; budget: number; percentUsed: number; color: string; icon: string }[];
 upcomingRecurringPayments: Array<RecurringPayment & { nextDueDate: string; daysUntilDue: number }>;
 overdueRecurringPayments: Array<RecurringPayment & { dueDate: string; daysOverdue: number }>;
 totalMonthlyRecurringCommitment: number;
}

export interface FinanceContextType extends FinanceUiContextType, FinanceActionsContextType, FinanceDataContextType {}

const SESSION_TAB_ID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : `tab-${Math.random().toString(36).substring(2)}-${Date.now()}`;

function broadcastDataChange(store: string) {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('dhanveda-data');
      bc.postMessage({ type: 'data_changed', store, senderTabId: SESSION_TAB_ID, at: Date.now() });
      bc.close();
    } catch {}
  }
}

export const FinanceContext = createContext<FinanceContextType | undefined>(undefined);
export const FinanceUiContext = createContext<FinanceUiContextType | undefined>(undefined);
export const FinanceActionsContext = createContext<FinanceActionsContextType | undefined>(undefined);
export const FinanceDataContext = createContext<FinanceDataContextType | undefined>(undefined);

export const useFinanceUi = () => {
  const context = useContext(FinanceUiContext);
  if (!context) {
    throw new Error('useFinanceUi must be used within a FinanceProvider');
  }
  return context;
};

export const useFinanceActions = () => {
  const context = useContext(FinanceActionsContext);
  if (!context) {
    throw new Error('useFinanceActions must be used within a FinanceProvider');
  }
  return context;
};

export const useFinanceData = () => {
  const context = useContext(FinanceDataContext);
  if (!context) {
    throw new Error('useFinanceData must be used within a FinanceProvider');
  }
  return context;
};

const EMPTY_EMERGENCY_FUND: EmergencyFund = {
 targetMonths: 6,
 monthlyExpenseBaseline: 50000,
 currentSaved: 0,
 contributions: [],
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [currentView, setCurrentView] = useState<AppView>('dashboard');
 const [isInitialized, setIsInitialized] = useState(false);
 const [unreadableRecordCount, setUnreadableRecordCount] = useState<number>(0);
 const [isUnreadableBannerDismissed, setIsUnreadableBannerDismissed] = useState<boolean>(false);
 const dismissUnreadableBanner = useCallback(() => {
   setIsUnreadableBannerDismissed(true);
 }, []);
 const [darkMode, setDarkMode] = useState<boolean>(() => {
 const saved = typeof window !== 'undefined' ? localStorage.getItem('dhanveda_dark_mode') : null;
 if (saved !== null) {
 return saved === 'true';
 }
 return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
 });

 const [transactions, setTransactions] = useState<Transaction[]>([]);
 const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
 const [budgets, setBudgets] = useState<Budget[]>([]);
 const [emergencyFund, setEmergencyFund] = useState<EmergencyFund>(EMPTY_EMERGENCY_FUND);
 const [investments, setInvestments] = useState<Investment[]>([]);
 const [dreams, setDreams] = useState<DreamGoal[]>([]);
 const [contacts, setContacts] = useState<Contact[]>([]);
 const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
 const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
 const [recurringPaymentLogs, setRecurringPaymentLogs] = useState<RecurringPaymentLog[]>([]);
 const [notRecurringTxIds, setNotRecurringTxIds] = useState<Set<string>>(new Set());

 const [aiSettings, setAISettings] = useState<AISettings>({
 provider: 'gemini',
 apiKey: '',
 model: DEFAULT_AI_MODELS.gemini,
 });

 const [aiReports, setAIReports] = useState<AIHealthReport[]>([]);

 // Sync state
 const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
 const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(driveSyncService.getLastSyncedAt());
 const [syncError, setSyncError] = useState<string | null>(null);
 const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
 const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);

 // Synchronous references to in-memory state for safe sync flushes
 const transactionsRef = useRef(transactions);
 const contactsRef = useRef(contacts);
 const settlementsRef = useRef(settlements);
 const categoriesRef = useRef(categories);
 const budgetsRef = useRef(budgets);
 const emergencyFundRef = useRef(emergencyFund);
 const investmentsRef = useRef(investments);
 const dreamsRef = useRef(dreams);
 const recurringPaymentsRef = useRef(recurringPayments);
 const recurringPaymentLogsRef = useRef(recurringPaymentLogs);

  // Previous persisted state refs for diff-based persistence
  const prevTransactionsRef = useRef<Transaction[]>(transactions);
  const prevCategoriesRef = useRef<Category[]>(categories);
  const prevBudgetsRef = useRef<Budget[]>(budgets);
  const prevInvestmentsRef = useRef<Investment[]>(investments);
  const prevDreamsRef = useRef<DreamGoal[]>(dreams);
  const prevContactsRef = useRef<Contact[]>(contacts);
  const prevSettlementsRef = useRef<SettlementRecord[]>(settlements);
  const prevRecurringPaymentsRef = useRef<RecurringPayment[]>(recurringPayments);
  const prevRecurringPaymentLogsRef = useRef<RecurringPaymentLog[]>(recurringPaymentLogs);
  const prevAiReportsRef = useRef<AIHealthReport[]>(aiReports);
  const prevEmergencyFundRef = useRef<EmergencyFund>(emergencyFund);
  const prevAiSettingsRef = useRef<AISettings>(aiSettings);

  const pendingWritesRef = useRef<Map<string, () => Promise<void>>>(new Map());
  const debounceTimersRef = useRef<Map<string, any>>(new Map());
  const dirtyStoresRef = useRef<Set<string>>(new Set());
  const retryTimerRef = useRef<any>(null);
  const retryBackoffMsRef = useRef<number>(1000);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [crossTabStale, setCrossTabStale] = useState(false);
  const dismissCrossTabStale = useCallback(() => setCrossTabStale(false), []);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('dhanveda-data');
      bc.onmessage = (event) => {
        if (event?.data?.type === 'data_changed') {
          if (event.data?.senderTabId && event.data.senderTabId === SESSION_TAB_ID) {
            return;
          }
          setCrossTabStale(true);
        }
      };
    } catch {}
    return () => {
      try { bc?.close(); } catch {}
    };
  }, []);


  const clearSaveError = useCallback(() => {
    setSaveError(null);
  }, []);

  const retryAllDirtyRef = useRef<() => Promise<void>>(null as any);

  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current) return;
    const delay = retryBackoffMsRef.current;
    if (delay < 3000) {
      retryBackoffMsRef.current = 3000;
    } else if (delay < 10000) {
      retryBackoffMsRef.current = 10000;
    } else {
      retryBackoffMsRef.current = 30000;
    }

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      retryAllDirtyRef.current?.();
    }, delay);
  }, []);

  const retryAllDirty = useCallback(async () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const storeMap: Record<string, { current: any[]; prevRef: React.MutableRefObject<any[]> }> = {
      transactions: { current: transactionsRef.current, prevRef: prevTransactionsRef },
      categories: { current: categoriesRef.current, prevRef: prevCategoriesRef },
      budgets: { current: budgetsRef.current, prevRef: prevBudgetsRef },
      investments: { current: investmentsRef.current, prevRef: prevInvestmentsRef },
      dreams: { current: dreamsRef.current, prevRef: prevDreamsRef },
      contacts: { current: contactsRef.current, prevRef: prevContactsRef },
      settlements: { current: settlementsRef.current, prevRef: prevSettlementsRef },
      recurringPayments: { current: recurringPaymentsRef.current, prevRef: prevRecurringPaymentsRef },
      recurringPaymentLogs: { current: recurringPaymentLogsRef.current, prevRef: prevRecurringPaymentLogsRef },
      aiReports: { current: aiReports, prevRef: prevAiReportsRef },
    };

    const dirtyStores = Array.from(dirtyStoresRef.current);
    let anyFailed = false;

    for (const sName of dirtyStores) {
      const cfg = storeMap[sName];
      if (cfg) {
        try {
          if (PERSIST_MODE === 'diff') {
            await persistDiff(sName as ArrayStoreName, cfg.prevRef.current, cfg.current);
          } else {
            await saveAllToStore(sName as ArrayStoreName, cfg.current);
          }
          cfg.prevRef.current = cfg.current;
          dirtyStoresRef.current.delete(sName);
        } catch (err) {
          anyFailed = true;
          console.error(`[DB] Retry failed for ${sName}:`, err);
        }
      } else if (sName === 'emergencyFund') {
        try {
          await saveSingleRecord('emergencyFund', { ...emergencyFundRef.current, id: 'current' });
          dirtyStoresRef.current.delete(sName);
        } catch {
          anyFailed = true;
        }
      } else if (sName === 'aiSettings') {
        try {
          await saveSingleRecord('aiSettings', { ...aiSettings, id: 'current' });
          dirtyStoresRef.current.delete(sName);
        } catch {
          anyFailed = true;
        }
      }
    }

    if (!anyFailed && dirtyStoresRef.current.size === 0) {
      setSaveError(null);
      retryBackoffMsRef.current = 1000;
    } else {
      scheduleRetry();
    }
  }, [aiReports, aiSettings, scheduleRetry]);

  useEffect(() => {
    retryAllDirtyRef.current = retryAllDirty;
  }, [retryAllDirty]);

  const retrySave = useCallback(() => {
    retryBackoffMsRef.current = 1000;
    retryAllDirty();
  }, [retryAllDirty]);

  const flushPendingSync = useCallback(() => {
    for (const timer of debounceTimersRef.current.values()) {
      clearTimeout(timer);
    }
    debounceTimersRef.current.clear();

    const cached = getCachedDB();
    if (cached) {
      const storeConfigs: Array<{
        name: ArrayStoreName;
        current: any[];
        prevRef: React.MutableRefObject<any[]>;
      }> = [
        { name: 'transactions', current: transactionsRef.current, prevRef: prevTransactionsRef },
        { name: 'categories', current: categoriesRef.current, prevRef: prevCategoriesRef },
        { name: 'budgets', current: budgetsRef.current, prevRef: prevBudgetsRef },
        { name: 'investments', current: investmentsRef.current, prevRef: prevInvestmentsRef },
        { name: 'dreams', current: dreamsRef.current, prevRef: prevDreamsRef },
        { name: 'contacts', current: contactsRef.current, prevRef: prevContactsRef },
        { name: 'settlements', current: settlementsRef.current, prevRef: prevSettlementsRef },
        { name: 'recurringPayments', current: recurringPaymentsRef.current, prevRef: prevRecurringPaymentsRef },
        { name: 'recurringPaymentLogs', current: recurringPaymentLogsRef.current, prevRef: prevRecurringPaymentLogsRef },
        { name: 'aiReports', current: aiReports, prevRef: prevAiReportsRef },
      ];

      for (const config of storeConfigs) {
        if (
          config.prevRef.current !== config.current ||
          pendingWritesRef.current.has(config.name) ||
          dirtyStoresRef.current.has(config.name)
        ) {
          try {
            persistDiffSync(cached, config.name, config.prevRef.current, config.current);
            config.prevRef.current = config.current;
            pendingWritesRef.current.delete(config.name);
            dirtyStoresRef.current.delete(config.name);
          } catch (e) {
            console.error(`[DB] Sync flush failed for ${config.name}:`, e);
          }
        }
      }
    }
  }, [aiReports]);

  const flushPendingPersistence = useCallback(async () => {
    flushPendingSync();
    const tasks = Array.from(pendingWritesRef.current.values());
    pendingWritesRef.current.clear();
    await Promise.all(tasks.map(fn => fn()));
  }, [flushPendingSync]);

  const scheduleArrayPersist = useCallback(<T extends { id: string }>(
    storeName: ArrayStoreName,
    currentItems: T[],
    prevRef: React.MutableRefObject<T[]>,
    debounceMs: number = 50
  ) => {
    const existingTimer = debounceTimersRef.current.get(storeName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const persistTask = async () => {
      pendingWritesRef.current.delete(storeName);
      debounceTimersRef.current.delete(storeName);
      try {
        let didChange = false;
        if (PERSIST_MODE === 'diff') {
          const prev = prevRef.current;
          didChange = await persistDiff(storeName, prev, currentItems);
          prevRef.current = currentItems;
        } else {
          await saveAllToStore(storeName, currentItems);
          prevRef.current = currentItems;
          didChange = true;
        }
        dirtyStoresRef.current.delete(storeName);
        if (didChange) {
          broadcastDataChange(storeName);
        }
        if (dirtyStoresRef.current.size === 0) {
          setSaveError(null);
          retryBackoffMsRef.current = 1000;
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
        }
      } catch (e) {
        console.error(`Error saving ${storeName}:`, e);
        dirtyStoresRef.current.add(storeName);
        setSaveError("Some changes could not be saved (storage full or blocked). Your data is still in memory; don't close this tab until storage is free.");
        scheduleRetry();
      }
    };

    pendingWritesRef.current.set(storeName, persistTask);
    const timer = setTimeout(() => {
      persistTask();
    }, debounceMs);
    debounceTimersRef.current.set(storeName, timer);
  }, [scheduleRetry]);

  const scheduleSinglePersist = useCallback(<T extends { id: string }>(
    storeName: 'emergencyFund' | 'aiSettings',
    data: T
  ) => {
    const existingTimer = debounceTimersRef.current.get(storeName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const persistTask = async () => {
      pendingWritesRef.current.delete(storeName);
      debounceTimersRef.current.delete(storeName);
      try {
        const prevRef = storeName === 'emergencyFund' ? prevEmergencyFundRef : prevAiSettingsRef;
        const hasChanged = JSON.stringify(prevRef.current) !== JSON.stringify(data);
        if (!hasChanged) {
          return;
        }
        await saveSingleRecord(storeName, data);
        prevRef.current = data as any;
        dirtyStoresRef.current.delete(storeName);
        broadcastDataChange(storeName);
        if (dirtyStoresRef.current.size === 0) {
          setSaveError(null);
          retryBackoffMsRef.current = 1000;
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
        }
      } catch (e) {
        console.error(`Error saving ${storeName}:`, e);
        dirtyStoresRef.current.add(storeName);
        setSaveError("Some changes could not be saved (storage full or blocked). Your data is still in memory; don't close this tab until storage is free.");
        scheduleRetry();
      }
    };

    pendingWritesRef.current.set(storeName, persistTask);
    const timer = setTimeout(() => {
      persistTask();
    }, 50);
    debounceTimersRef.current.set(storeName, timer);
  }, [scheduleRetry]);

 useEffect(() => {
 transactionsRef.current = transactions;
 contactsRef.current = contacts;
 settlementsRef.current = settlements;
 categoriesRef.current = categories;
 budgetsRef.current = budgets;
 emergencyFundRef.current = emergencyFund;
 investmentsRef.current = investments;
 dreamsRef.current = dreams;
 recurringPaymentsRef.current = recurringPayments;
 recurringPaymentLogsRef.current = recurringPaymentLogs;
 }, [
 transactions,
 contacts,
 settlements,
 categories,
 budgets,
 emergencyFund,
 investments,
 dreams,
 recurringPayments,
 recurringPaymentLogs,
 ]);

 // In-memory pub/sub for domain finance events
 const eventListenersRef = useRef<Set<FinanceEventListener>>(new Set());

 const subscribeFinanceEvent = useCallback((listener: FinanceEventListener) => {
 eventListenersRef.current.add(listener);
 return () => {
 eventListenersRef.current.delete(listener);
 };
 }, []);

 const emitFinanceEvent = useCallback((event: FinanceEvent) => {
 eventListenersRef.current.forEach(listener => {
 try {
 listener(event);
 } catch (err) {
 console.error('Error in finance event listener:', err);
 }
 });
 }, []);

 // Reload all records from IndexedDB into React state
 const reloadFromDB = useCallback(async () => {
 try {
 const [
 dbTx,
 dbCat,
 dbBudgets,
 dbEm,
 dbInv,
 dbDreams,
 dbContacts,
 dbSettlements,
 dbAiSet,
 dbAiReports,
 dbPrefs,
 dbRecPay,
 dbRecLogs,
 ] = await Promise.all([
 getAllFromStore<Transaction>('transactions'),
 getAllFromStore<Category>('categories'),
 getAllFromStore<Budget>('budgets'),
 getSingleRecord<EmergencyFund & { id: string }>('emergencyFund'),
 getAllFromStore<Investment>('investments'),
 getAllFromStore<DreamGoal>('dreams'),
 getAllFromStore<Contact>('contacts'),
 getAllFromStore<SettlementRecord>('settlements'),
 getSingleRecord<AISettings & { id: string }>('aiSettings'),
 getAllFromStore<AIHealthReport>('aiReports'),
 getSingleRecord<UserPreferences>('userPreferences', 'general'),
 getAllFromStore<RecurringPayment>('recurringPayments'),
 getAllFromStore<RecurringPaymentLog>('recurringPaymentLogs'),
 ]);

    let totalInvalid = 0;

    if (dbTx && Array.isArray(dbTx)) {
      const { valid: validTx, invalidCount } = validateStoreRecords(dbTx, normalizeTransaction);
      totalInvalid += invalidCount;
      setTransactions(validTx);
      transactionsRef.current = validTx;
      prevTransactionsRef.current = validTx;
    }
    if (dbCat && Array.isArray(dbCat)) {
      const { valid: validCat, invalidCount } = validateStoreRecords(dbCat, normalizeCategory);
      totalInvalid += invalidCount;
      if (validCat.length > 0) {
        setCategories(validCat);
        categoriesRef.current = validCat;
        prevCategoriesRef.current = validCat;
      }
    }
    if (dbBudgets && Array.isArray(dbBudgets)) {
      const { valid: validBudgets, invalidCount } = validateStoreRecords(dbBudgets, normalizeBudget);
      totalInvalid += invalidCount;
      setBudgets(validBudgets);
      budgetsRef.current = validBudgets;
      prevBudgetsRef.current = validBudgets;
    }
    if (dbEm) {
      const { id: _id, ...cleanEm } = dbEm;
      setEmergencyFund(cleanEm);
      prevEmergencyFundRef.current = cleanEm;
    }
    if (dbInv && Array.isArray(dbInv)) {
      const { valid: validInv, invalidCount } = validateStoreRecords(dbInv, normalizeInvestment);
      totalInvalid += invalidCount;
      setInvestments(validInv);
      investmentsRef.current = validInv;
      prevInvestmentsRef.current = validInv;
    }
    if (dbDreams && Array.isArray(dbDreams)) {
      const { valid: validDreams, invalidCount } = validateStoreRecords(dbDreams, normalizeDream);
      totalInvalid += invalidCount;
      setDreams(validDreams);
      dreamsRef.current = validDreams;
      prevDreamsRef.current = validDreams;
    }
    if (dbContacts && Array.isArray(dbContacts)) {
      const { valid: validContacts, invalidCount } = validateStoreRecords(dbContacts, normalizeContact);
      totalInvalid += invalidCount;
      setContacts(validContacts);
      contactsRef.current = validContacts;
      prevContactsRef.current = validContacts;
    }
    if (dbSettlements && Array.isArray(dbSettlements)) {
      const { valid: validSettlements, invalidCount } = validateStoreRecords(dbSettlements, normalizeSettlement);
      totalInvalid += invalidCount;
      setSettlements(validSettlements);
      settlementsRef.current = validSettlements;
      prevSettlementsRef.current = validSettlements;
    }
    if (dbRecPay && Array.isArray(dbRecPay)) {
      const { valid: validRecPay, invalidCount } = validateStoreRecords(dbRecPay, normalizeRecurringPayment);
      totalInvalid += invalidCount;
      setRecurringPayments(validRecPay);
      recurringPaymentsRef.current = validRecPay;
      prevRecurringPaymentsRef.current = validRecPay;
    }
    if (dbRecLogs && Array.isArray(dbRecLogs)) {
      const { valid: validRecLogs, invalidCount } = validateStoreRecords(dbRecLogs, normalizeRecurringPaymentLog);
      totalInvalid += invalidCount;
      setRecurringPaymentLogs(validRecLogs);
      recurringPaymentLogsRef.current = validRecLogs;
      prevRecurringPaymentLogsRef.current = validRecLogs;
    }

    setUnreadableRecordCount(totalInvalid);
  if (dbAiSet) {
    const { id: _id, ...cleanAi } = dbAiSet;
    const normalizedAi: AISettings = {
      provider: cleanAi.provider || 'gemini',
      apiKey: cleanAi.apiKey || '',
      model: cleanAi.model || DEFAULT_AI_MODELS[cleanAi.provider || 'gemini'],
    };
    setAISettings(normalizedAi);
    prevAiSettingsRef.current = normalizedAi;
  }
  if (dbAiReports && Array.isArray(dbAiReports)) {
    setAIReports(dbAiReports);
    prevAiReportsRef.current = dbAiReports;
  }
 if (dbPrefs) {
 if (dbPrefs.darkMode !== undefined) setDarkMode(dbPrefs.darkMode);
 if (dbPrefs.notRecurringTxIds && Array.isArray(dbPrefs.notRecurringTxIds)) {
 setNotRecurringTxIds(new Set(dbPrefs.notRecurringTxIds));
 }
 }
 } catch (err) {
 console.error('[FinanceContext] Error reloading from IndexedDB:', err);
 }
 }, []);

 // Initial load from IndexedDB + migrate from localStorage if available
 useEffect(() => {
 let isMounted = true;
 async function init() {
 try {
 await migrateFromLocalStorage();
 if (isMounted) {
 await reloadFromDB();
 }
 } catch (err) {
 console.error('[FinanceContext] Error initializing IndexedDB:', err);
 } finally {
 if (isMounted) setIsInitialized(true);
 }
 }

 init();
 return () => {
 isMounted = false;
 };
 }, [flushPendingPersistence, reloadFromDB]);

 // Sync methods
 const triggerSync = useCallback(async (_showFeedback = true): Promise<boolean> => {
 try {
    await flushPendingPersistence();
 // 1. Immediately flush all current in-memory React state to IndexedDB so driveSync reads 100% current data
 await Promise.all([
 saveAllToStore('transactions', transactionsRef.current),
 saveAllToStore('contacts', contactsRef.current),
 saveAllToStore('settlements', settlementsRef.current),
 saveAllToStore('categories', categoriesRef.current),
 saveAllToStore('budgets', budgetsRef.current),
 saveAllToStore('investments', investmentsRef.current),
 saveAllToStore('dreams', dreamsRef.current),
 saveAllToStore('recurringPayments', recurringPaymentsRef.current),
 saveAllToStore('recurringPaymentLogs', recurringPaymentLogsRef.current),
 saveSingleRecord('emergencyFund', { ...emergencyFundRef.current, id: 'current' }),
 ]);

 const ok = await driveSyncService.sync();
 if (ok) {
 await reloadFromDB();
 }
 return ok;
 } catch (err: any) {
 console.error('[FinanceContext] triggerSync error:', err);
 return false;
 }
 }, [flushPendingPersistence, reloadFromDB]);

 const connectDrive = useCallback(async (): Promise<boolean> => {
 try {
 setSyncStatus('syncing');
 setSyncError(null);
 const token = await googleAuthService.requestAccessToken(true);
 if (token) {
 const ok = await triggerSync(true);
 return ok;
 }
 setSyncStatus('disconnected');
 return false;
 } catch (err: any) {
 console.error('[FinanceContext] connectDrive error:', err);
 setSyncError(err?.message || 'Failed to connect Google Drive');
 setSyncStatus('error');
 return false;
 }
 }, [triggerSync]);

 const disconnectDrive = useCallback(async (): Promise<void> => {
 await googleAuthService.disconnect();
 setSyncStatus('disconnected');
 setSyncError(null);
 }, []);

 // Subscriptions to Google Auth & Drive Sync
 useEffect(() => {
 return googleAuthService.subscribe((connected, profile) => {
 setIsDriveConnected(connected);
 setDriveUserEmail(profile?.email || null);
 if (!connected) {
 setSyncStatus(googleAuthService.hasClientId() ? 'disconnected' : 'unconfigured');
 }
 });
 }, []);

 useEffect(() => {
 return driveSyncService.subscribe((isSyncing, lastSync, error) => {
 setLastSyncedAt(lastSync);
 setSyncError(error);
 if (isSyncing) {
 setSyncStatus('syncing');
 } else if (error) {
 setSyncStatus('error');
 } else if (lastSync) {
 setSyncStatus('synced');
 } else if (googleAuthService.isConnected()) {
 setSyncStatus('idle');
 }
 });
 }, []);

 // Sync Triggers: on app start (if enabled) - deferred to idle
 useEffect(() => {
 if (!isInitialized) return;
 if (googleAuthService.isSyncEnabled()) {
 const scheduleIdle = typeof window !== 'undefined' && 'requestIdleCallback' in window
 ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2000 })
 : (cb: () => void) => setTimeout(cb, 1000);
 const cancelIdle = typeof window !== 'undefined' && 'cancelIdleCallback' in window
 ? (id: any) => window.cancelIdleCallback(id)
 : (id: any) => clearTimeout(id);

 const handle = scheduleIdle(() => {
 triggerSync(false);
 });
 return () => cancelIdle(handle);
 }
 }, [isInitialized, triggerSync]);

 // Sync Triggers: on network back online
 useEffect(() => {
 const handleOnline = () => {
 if (googleAuthService.isSyncEnabled()) {
 triggerSync(false);
 }
 };
 window.addEventListener('online', handleOnline);
 return () => window.removeEventListener('online', handleOnline);
 }, [triggerSync]);

 // Sync Triggers: every 3 minutes if tab is visible
 useEffect(() => {
 const interval = setInterval(() => {
 if (
 document.visibilityState === 'visible' &&
 navigator.onLine &&
 googleAuthService.isSyncEnabled() &&
 !driveSyncService.isSyncing()
 ) {
 triggerSync(false);
 }
 }, 3 * 60 * 1000);
 return () => clearInterval(interval);
 }, [triggerSync]);

  // Sync to IndexedDB once initialized (debounced & diff-based)
  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('transactions', transactions, prevTransactionsRef);
  }, [transactions, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('categories', categories, prevCategoriesRef);
  }, [categories, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('budgets', budgets, prevBudgetsRef);
  }, [budgets, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleSinglePersist('emergencyFund', { ...emergencyFund, id: 'current' });
  }, [emergencyFund, isInitialized, scheduleSinglePersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('investments', investments, prevInvestmentsRef);
  }, [investments, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('dreams', dreams, prevDreamsRef);
  }, [dreams, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('contacts', contacts, prevContactsRef);
  }, [contacts, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('settlements', settlements, prevSettlementsRef);
  }, [settlements, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('recurringPayments', recurringPayments, prevRecurringPaymentsRef);
  }, [recurringPayments, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('recurringPaymentLogs', recurringPaymentLogs, prevRecurringPaymentLogsRef);
  }, [recurringPaymentLogs, isInitialized, scheduleArrayPersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleSinglePersist('aiSettings', { ...aiSettings, id: 'current' });
  }, [aiSettings, isInitialized, scheduleSinglePersist]);

  useEffect(() => {
    if (!isInitialized) return;
    scheduleArrayPersist('aiReports', aiReports, prevAiReportsRef);
  }, [aiReports, isInitialized, scheduleArrayPersist]);

  // Flush pending changes on visibilitychange (when hidden) or pagehide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSync();
      } else if (document.visibilityState === 'visible' && dirtyStoresRef.current.size > 0) {
        retryAllDirtyRef.current?.();
      }
    };
    const handlePageHide = () => {
      flushPendingSync();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      flushPendingSync();
    };
  }, [flushPendingSync]);

 useEffect(() => {
 // Apply temporary .theme-anim class for smooth transition only during toggle (E.4)
 document.documentElement.classList.add('theme-anim');
 const timer = setTimeout(() => {
 document.documentElement.classList.remove('theme-anim');
 }, 350);

 if (darkMode) {
 document.documentElement.classList.add('dark');
 localStorage.setItem('dhanveda_dark_mode', 'true');
 } else {
 document.documentElement.classList.remove('dark');
 localStorage.setItem('dhanveda_dark_mode', 'false');
 }
 if (isInitialized) {
 saveSingleRecord('userPreferences', {
 id: 'general',
 darkMode,
 notRecurringTxIds: Array.from(notRecurringTxIds),
 updatedAt: new Date().toISOString(),
 }).catch(e => console.error('Error saving user preferences:', e));
 }
 return () => clearTimeout(timer);
 }, [darkMode, notRecurringTxIds, isInitialized]);

 const toggleNotRecurring = (txId: string | string[]) => {
 setNotRecurringTxIds(prev => {
 const next = new Set(prev);
 const ids = Array.isArray(txId) ? txId : [txId];
 const allPresent = ids.every(id => next.has(id));
 if (allPresent) {
 ids.forEach(id => next.delete(id));
 } else {
 ids.forEach(id => next.add(id));
 }
 return next;
 });
 };

 // Transaction operations
 const addTransaction = (
 txData: Omit<Transaction, 'id' | 'createdAt'>,
 options?: { silent?: boolean }
 ): Transaction => {
 const now = new Date().toISOString();
 const newTx: Transaction = {
 ...txData,
 id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
 createdAt: now,
 updatedAt: now,
 };
 transactionsRef.current = [newTx, ...transactionsRef.current];
 setTransactions(prev => [newTx, ...prev]);
 flushPendingSync();
 if (!options?.silent) {
 emitFinanceEvent({ type: 'transaction_added', tx: newTx });
 }
 return newTx;
 };

 const addMultipleTransactions = (txsData: Omit<Transaction, 'id' | 'createdAt'>[]) => {
 const timestamp = Date.now();
 const now = new Date().toISOString();
 const newTxs: Transaction[] = txsData.map((t, idx) => ({
 ...t,
 id: `tx-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
 createdAt: now,
 updatedAt: now,
 }));
 transactionsRef.current = [...newTxs, ...transactionsRef.current];
 setTransactions(prev => [...newTxs, ...prev]);
 flushPendingSync();
 };

 const updateTransaction = (id: string, updated: Partial<Transaction>) => {
 const now = new Date().toISOString();
 transactionsRef.current = transactionsRef.current.map(t =>
 t.id === id ? { ...t, ...updated, updatedAt: now } : t
 );
 setTransactions(prev =>
 prev.map(t => (t.id === id ? { ...t, ...updated, updatedAt: now } : t))
 );
 flushPendingSync();
 };

 const deleteTransaction = (id: string) => {
 addTombstone('transactions', id);
 transactionsRef.current = transactionsRef.current.filter(t => t.id !== id);
 setTransactions(prev => prev.filter(t => t.id !== id));

    // Clean up or detach settlements tied to this transaction
    // B-10: Only create a new settlement object when a field actually changes (and bump updatedAt).
    // Untouched settlements keep their existing object references so scheduleArrayPersist skips IDB puts.
    const now = new Date().toISOString();
    const updatedSettlements: SettlementRecord[] = [];

    settlementsRef.current.forEach(s => {
      // Check multi-split reconciliation
      if (s.reconciledSplits && s.reconciledSplits.length > 0) {
        const remainingSplits = s.reconciledSplits.filter(r => r.transactionId !== id);
        if (remainingSplits.length === 0 && (s.sourceTransactionId === id || !s.sourceTransactionId)) {
          // All reconciled splits belonged to this deleted transaction -> delete settlement
          addTombstone('settlements', s.id);
          return;
        }

        const hasSplitChanged = remainingSplits.length !== s.reconciledSplits.length;
        const hasLinkedChanged = s.linkedTransactionId === id;
        const hasSourceChanged = s.sourceTransactionId === id;

        if (hasSplitChanged || hasLinkedChanged || hasSourceChanged) {
          // Partial removal: some splits remain on other transactions or links changed
          const nextSourceTx = hasSourceChanged
            ? (remainingSplits[0]?.transactionId || undefined)
            : s.sourceTransactionId;
          const nextSourceSplit = hasSourceChanged
            ? (remainingSplits[0]?.splitEntryId || undefined)
            : s.sourceSplitEntryId;

          updatedSettlements.push({
            ...s,
            sourceTransactionId: nextSourceTx,
            sourceSplitEntryId: nextSourceSplit,
            linkedTransactionId: hasLinkedChanged ? undefined : s.linkedTransactionId,
            reconciledSplits: remainingSplits.length > 0 ? remainingSplits : undefined,
            updatedAt: now,
          });
          return;
        }

        // Untouched multi-split settlement: retain existing object reference
        updatedSettlements.push(s);
        return;
      }

      // Legacy single-split settlement
      if (s.sourceTransactionId === id) {
        addTombstone('settlements', s.id);
        return;
      }

      if (s.linkedTransactionId === id) {
        updatedSettlements.push({
          ...s,
          linkedTransactionId: undefined,
          updatedAt: now,
        });
        return;
      }

      // Untouched settlement: retain existing object reference
      updatedSettlements.push(s);
    });

 settlementsRef.current = updatedSettlements;
 setSettlements(updatedSettlements);
 flushPendingSync();
 emitFinanceEvent({ type: 'transaction_deleted', count: 1 });
 };

 const deleteMultipleTransactions = (ids: string[]) => {
 ids.forEach(id => addTombstone('transactions', id));
 const set = new Set(ids);
 transactionsRef.current = transactionsRef.current.filter(t => !set.has(t.id));
 setTransactions(prev => prev.filter(t => !set.has(t.id)));

    // B-10: Only create a new settlement object when a field actually changes (and bump updatedAt)
    const now = new Date().toISOString();
    const updatedSettlements: SettlementRecord[] = [];

    settlementsRef.current.forEach(s => {
      if (s.reconciledSplits && s.reconciledSplits.length > 0) {
        const remainingSplits = s.reconciledSplits.filter(r => !set.has(r.transactionId));
        if (remainingSplits.length === 0 && (s.sourceTransactionId ? set.has(s.sourceTransactionId) : true)) {
          addTombstone('settlements', s.id);
          return;
        }

        const hasSplitChanged = remainingSplits.length !== s.reconciledSplits.length;
        const hasLinkedChanged = Boolean(s.linkedTransactionId && set.has(s.linkedTransactionId));
        const hasSourceChanged = Boolean(s.sourceTransactionId && set.has(s.sourceTransactionId));

        if (hasSplitChanged || hasLinkedChanged || hasSourceChanged) {
          const nextSourceTx = hasSourceChanged
            ? (remainingSplits[0]?.transactionId || undefined)
            : s.sourceTransactionId;
          const nextSourceSplit = hasSourceChanged
            ? (remainingSplits[0]?.splitEntryId || undefined)
            : s.sourceSplitEntryId;

          updatedSettlements.push({
            ...s,
            sourceTransactionId: nextSourceTx,
            sourceSplitEntryId: nextSourceSplit,
            linkedTransactionId: hasLinkedChanged ? undefined : s.linkedTransactionId,
            reconciledSplits: remainingSplits.length > 0 ? remainingSplits : undefined,
            updatedAt: now,
          });
          return;
        }

        // Untouched multi-split settlement: retain existing object reference
        updatedSettlements.push(s);
        return;
      }

      if (s.sourceTransactionId && set.has(s.sourceTransactionId)) {
        addTombstone('settlements', s.id);
        return;
      }

      if (s.linkedTransactionId && set.has(s.linkedTransactionId)) {
        updatedSettlements.push({
          ...s,
          linkedTransactionId: undefined,
          updatedAt: now,
        });
        return;
      }

      // Untouched settlement: retain existing object reference
      updatedSettlements.push(s);
    });

 settlementsRef.current = updatedSettlements;
 setSettlements(updatedSettlements);
 emitFinanceEvent({ type: 'transaction_deleted', count: ids.length });
 };

  const captureDeleteSnapshot = useCallback((id: string): DeleteTransactionSnapshot | null => {
    const tx = transactionsRef.current.find(t => t.id === id);
    if (!tx) return null;

    const affectedSettlements: SettlementRecord[] = [];
    const tombstoneIds: Array<{ store: SyncableStoreName; id: string }> = [
      { store: 'transactions', id },
    ];

    settlementsRef.current.forEach(s => {
      const isLinked = s.linkedTransactionId === id;
      const isSource = s.sourceTransactionId === id;
      const hasReconciled = Boolean(s.reconciledSplits && s.reconciledSplits.some(r => r.transactionId === id));

      if (isLinked || isSource || hasReconciled) {
        affectedSettlements.push(JSON.parse(JSON.stringify(s)));
        if (s.reconciledSplits && s.reconciledSplits.length > 0) {
          const remainingSplits = s.reconciledSplits.filter(r => r.transactionId !== id);
          if (remainingSplits.length === 0 && (s.sourceTransactionId === id || !s.sourceTransactionId)) {
            tombstoneIds.push({ store: 'settlements', id: s.id });
          }
        } else if (isSource) {
          tombstoneIds.push({ store: 'settlements', id: s.id });
        }
      }
    });

    const snapshot: DeleteTransactionSnapshot = {
      transaction: JSON.parse(JSON.stringify(tx)),
      settlements: affectedSettlements,
      tombstoneIds,
      tombstones: tombstoneIds,
    };
    return snapshot;
  }, []);

  const restoreTransactions = useCallback((snapshots: DeleteTransactionSnapshot[]) => {
    if (!snapshots || snapshots.length === 0) return;

    // 1. Transactions restoration (original id, createdAt, updatedAt)
    const currentTxMap = new Map(transactionsRef.current.map(t => [t.id, t]));
    const txsToRestore: Transaction[] = [];

    snapshots.forEach(s => {
      if (s && s.transaction && s.transaction.id && !currentTxMap.has(s.transaction.id)) {
        txsToRestore.push(s.transaction);
        currentTxMap.set(s.transaction.id, s.transaction);
      }
    });

    if (txsToRestore.length > 0) {
      const nextTransactions = [...txsToRestore, ...transactionsRef.current];
      transactionsRef.current = nextTransactions;
      setTransactions(nextTransactions);
    }

    // 2. Settlements restoration
    const settlementMap = new Map<string, SettlementRecord>();
    settlementsRef.current.forEach(s => settlementMap.set(s.id, s));

    let settlementsChanged = false;
    snapshots.forEach(s => {
      if (Array.isArray(s.settlements)) {
        s.settlements.forEach(setRecord => {
          if (setRecord && setRecord.id) {
            settlementMap.set(setRecord.id, setRecord);
            settlementsChanged = true;
          }
        });
      }
    });

    if (settlementsChanged) {
      const nextSettlements = Array.from(settlementMap.values());
      settlementsRef.current = nextSettlements;
      setSettlements(nextSettlements);
    }

    // 3. Tombstone removal from IndexedDB
    const allTombstones: Array<{ store: SyncableStoreName; id: string }> = [];
    const seenTombstoneKeys = new Set<string>();

    snapshots.forEach(s => {
      const list = s.tombstoneIds || s.tombstones;
      if (Array.isArray(list)) {
        list.forEach(t => {
          const key = typeof t === 'string' ? t : `${t.store}:${t.id}`;
          if (!seenTombstoneKeys.has(key)) {
            seenTombstoneKeys.add(key);
            allTombstones.push(typeof t === 'string' ? { store: 'transactions', id: t } : t);
          }
        });
      }
    });

    if (allTombstones.length > 0) {
      removeTombstones(allTombstones).catch(err => {
        console.error('[FinanceContext] Error removing tombstones during undo:', err);
      });
    }

    flushPendingSync();
    // Explicitly NO transaction_added / gamification events emitted!
  }, [flushPendingSync]);

 // Contact CRUD operations
 const addContact = (contactData: Omit<Contact, 'id' | 'createdAt'>): Contact => {
 const now = new Date().toISOString();
 const newContact: Contact = {
 ...contactData,
 id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
 createdAt: now,
 updatedAt: now,
 };
 contactsRef.current = [...contactsRef.current, newContact];
 setContacts(prev => [...prev, newContact]);
 return newContact;
 };

 const updateContact = (id: string, updated: Partial<Contact>) => {
 const now = new Date().toISOString();
 contactsRef.current = contactsRef.current.map(c =>
 c.id === id ? { ...c, ...updated, updatedAt: now } : c
 );
 setContacts(prev =>
 prev.map(c => (c.id === id ? { ...c, ...updated, updatedAt: now } : c))
 );
 };

 const deleteContact = (id: string) => {
 addTombstone('contacts', id);
 contactsRef.current = contactsRef.current.filter(c => c.id !== id);
 setContacts(prev => prev.filter(c => c.id !== id));
 // Tombstone and remove all settlements tied to this contact for sync integrity
 const tiedSettlements = settlementsRef.current.filter(s => s.contactId === id);
 tiedSettlements.forEach(s => addTombstone('settlements', s.id));
 settlementsRef.current = settlementsRef.current.filter(s => s.contactId !== id);
 setSettlements(prev => prev.filter(s => s.contactId !== id));
 const now = new Date().toISOString();
 transactionsRef.current = transactionsRef.current.map(t => {
 if (!t.splitWith || !Array.isArray(t.splitWith)) return t;
 const updatedSplits = t.splitWith.map(s =>
 s.contactId === id ? { ...s, contactId: undefined, label: s.label || 'Former Contact' } : s
 );
 return { ...t, splitWith: updatedSplits, updatedAt: now };
 });
 setTransactions(prev =>
 prev.map(t => {
 if (!t.splitWith || !Array.isArray(t.splitWith)) return t;
 const updatedSplits = t.splitWith.map(s =>
 s.contactId === id ? { ...s, contactId: undefined, label: s.label || 'Former Contact' } : s
 );
 return { ...t, splitWith: updatedSplits, updatedAt: now };
 })
 );
 };

 const recordSettlement = (
 contactId: string,
 amount: number,
 note?: string,
 date?: string,
 sourceTransactionId?: string,
 sourceSplitEntryId?: string,
 linkedTransactionId?: string,
 direction?: OwedDirection
 ): SettlementRecord => {
 const now = new Date().toISOString();
 const resolvedDirection: OwedDirection = direction || 'they_owe_me';

 // If this is a contact-level settlement (no sourceTransactionId),
 // automatically reconcile open splits for this contact in FIFO order!
 const reconciledSplits: Array<{ transactionId: string; splitEntryId: string; amount: number }> = [];

 if (!sourceTransactionId && amount > 0) {
 let remainingToReconcile = amount;
 let firstReconciledTxId: string | undefined = undefined;
 let firstReconciledSplitId: string | undefined = undefined;

 const updatedTxs = transactionsRef.current.map(t => {
 if (!t.splitWith || !Array.isArray(t.splitWith) || remainingToReconcile <= 0) return t;
 let txModified = false;
 const updatedSplits = t.splitWith.map(entry => {
 if (
 entry.contactId === contactId &&
 entry.direction === resolvedDirection &&
 !entry.settled &&
 remainingToReconcile > 0
 ) {
 const currentSettled = entry.settledAmount || 0;
 const openAmt = Math.max(0, entry.amount - currentSettled);
 if (openAmt > 0) {
 const allocation = roundCurrency(Math.min(openAmt, remainingToReconcile));
 const newSettledAmt = roundCurrency(currentSettled + allocation);
 const isFull = newSettledAmt >= entry.amount - 0.01;
 remainingToReconcile = Math.max(0, roundCurrency(remainingToReconcile - allocation));
 txModified = true;
 reconciledSplits.push({
 transactionId: t.id,
 splitEntryId: entry.id,
 amount: allocation,
 });
 if (!firstReconciledTxId) {
 firstReconciledTxId = t.id;
 firstReconciledSplitId = entry.id;
 }
 return {
 ...entry,
 settled: isFull,
 settledAmount: Number(newSettledAmt.toFixed(2)),
 linkedTransactionId: linkedTransactionId || entry.linkedTransactionId,
 };
 }
 }
 return entry;
 });

 return txModified ? { ...t, splitWith: updatedSplits, updatedAt: now } : t;
 });

 if (firstReconciledTxId) {
 transactionsRef.current = updatedTxs;
 setTransactions(updatedTxs);
 sourceTransactionId = firstReconciledTxId;
 sourceSplitEntryId = firstReconciledSplitId;
 }
 }

 const newSettlement: SettlementRecord = {
 id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
 contactId,
 amount,
 date: date || now.split('T')[0],
 note: note || 'Settlement payment',
 createdAt: now,
 updatedAt: now,
 sourceTransactionId,
 sourceSplitEntryId,
 linkedTransactionId,
 direction: resolvedDirection,
 reconciledSplits: reconciledSplits.length > 0 ? reconciledSplits : undefined,
 };
 settlementsRef.current = [newSettlement, ...settlementsRef.current];
 setSettlements(prev => [newSettlement, ...prev]);
 const contact = contacts.find(c => c.id === contactId);
 emitFinanceEvent({
 type: 'settlement_recorded',
 contactName: contact ? contact.name : 'Contact',
 amount,
 allSettled: false,
 });
 return newSettlement;
 };

 const deleteSettlement = (id: string) => {
 addTombstone('settlements', id);
 const target = settlementsRef.current.find(s => s.id === id);
 settlementsRef.current = settlementsRef.current.filter(s => s.id !== id);
 setSettlements(prev => prev.filter(s => s.id !== id));

 const now = new Date().toISOString();

 // 1. If this settlement tracked multi-split reconciliations, restore all of them
 if (target?.reconciledSplits && target.reconciledSplits.length > 0) {
 const splitLookup = new Map<string, number>();
 target.reconciledSplits.forEach(r => {
 splitLookup.set(`${r.transactionId}:${r.splitEntryId}`, r.amount);
 });

 const updatedTxs = transactionsRef.current.map(t => {
 if (!t.splitWith || !Array.isArray(t.splitWith)) return t;
 let txModified = false;
 const updatedSplits = t.splitWith.map(s => {
 const key = `${t.id}:${s.id}`;
 if (splitLookup.has(key)) {
 txModified = true;
 const reconciledAmt = splitLookup.get(key) || 0;
 const currentSettled = s.settledAmount !== undefined ? s.settledAmount : s.amount;
 const newSettledAmt = Math.max(0, currentSettled - reconciledAmt);
 if (newSettledAmt <= 0.01) {
 return { ...s, settled: false, settledAmount: undefined, linkedTransactionId: undefined };
 } else {
 return { ...s, settled: false, settledAmount: Number(newSettledAmt.toFixed(2)) };
 }
 }
 return s;
 });
 return txModified ? { ...t, splitWith: updatedSplits, updatedAt: now } : t;
 });

 transactionsRef.current = updatedTxs;
 setTransactions(updatedTxs);
 } else if (target?.sourceTransactionId) {
 // 2. Legacy fallback for single-split settlements
 const updatedTxs = transactionsRef.current.map(t => {
 if (t.id !== target.sourceTransactionId || !t.splitWith) return t;
 const updatedSplits = t.splitWith.map(s => {
 if (target.sourceSplitEntryId ? s.id === target.sourceSplitEntryId : true) {
 return { ...s, settled: false, settledAmount: undefined, linkedTransactionId: undefined };
 }
 return s;
 });
 return { ...t, splitWith: updatedSplits, updatedAt: now };
 });
 transactionsRef.current = updatedTxs;
 setTransactions(updatedTxs);
 }
 };

 const updateSettlement = (id: string, updated: Partial<SettlementRecord>) => {
 const now = new Date().toISOString();
 settlementsRef.current = settlementsRef.current.map(s =>
 s.id === id ? { ...s, ...updated, updatedAt: now } : s
 );
 setSettlements(prev =>
 prev.map(s => (s.id === id ? { ...s, ...updated, updatedAt: now } : s))
 );
 };

 const linkSettlementToTransaction = (settlementId: string, transactionId?: string) => {
 const now = new Date().toISOString();
 settlementsRef.current = settlementsRef.current.map(s =>
 s.id === settlementId
 ? { ...s, linkedTransactionId: transactionId || undefined, updatedAt: now }
 : s
 );
 setSettlements(prev =>
 prev.map(s =>
 s.id === settlementId
 ? { ...s, linkedTransactionId: transactionId || undefined, updatedAt: now }
 : s
 )
 );
 };

 const quickToggleSettleTransaction = (
 transactionId: string,
 splitEntryId?: string
 ): SettlementRecord | undefined => {
 const tx = transactions.find(t => t.id === transactionId);
 if (!tx || !tx.splitWith || !Array.isArray(tx.splitWith)) return undefined;

 const targetEntryId = splitEntryId || tx.splitWith[0]?.id;
 if (!targetEntryId) return undefined;

 const targetEntry = tx.splitWith.find(e => e.id === targetEntryId);
 if (!targetEntry) return undefined;

 const isCurrentlySettled = Boolean(targetEntry.settled);
 const now = new Date().toISOString();

 if (!isCurrentlySettled) {
 // 1. Mark that specific splitEntry as settled
 const updatedSplits = tx.splitWith.map(e =>
 e.id === targetEntryId ? { ...e, settled: true } : e
 );
 updateTransaction(transactionId, { splitWith: updatedSplits, updatedAt: now });

 // 2. If it is attached to a contact, record SettlementRecord
 if (targetEntry.contactId) {
 const newSettlement: SettlementRecord = {
 id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
 contactId: targetEntry.contactId,
 date: now.split('T')[0],
 amount: targetEntry.amount,
 note: `Quick settlement for "${tx.description}"`,
 createdAt: now,
 updatedAt: now,
 sourceTransactionId: transactionId,
 sourceSplitEntryId: targetEntryId,
 direction: targetEntry.direction,
 };
 settlementsRef.current = [newSettlement, ...settlementsRef.current];
 setSettlements(prev => [newSettlement, ...prev]);
 const contact = contacts.find(c => c.id === targetEntry.contactId);
 emitFinanceEvent({
 type: 'settlement_recorded',
 contactName: contact ? contact.name : 'Contact',
 amount: targetEntry.amount,
 allSettled: false,
 });
 return newSettlement;
 }
 return undefined;
 } else {
 // 1. Mark that specific splitEntry as unsettled
 const updatedSplits = tx.splitWith.map(e =>
 e.id === targetEntryId ? { ...e, settled: false } : e
 );
 updateTransaction(transactionId, { splitWith: updatedSplits, updatedAt: now });

 // 2. Remove the auto-created settlement record strictly matching this split entry
 const toDelete = settlements.find(
 s =>
 s.sourceTransactionId === transactionId &&
 s.sourceSplitEntryId === targetEntryId
 );
 if (toDelete) {
 addTombstone('settlements', toDelete.id);
 settlementsRef.current = settlementsRef.current.filter(s => s.id !== toDelete.id);
 setSettlements(prev => prev.filter(s => s.id !== toDelete.id));
 }
 return undefined;
 }
 };

 const assignSplitToContact = (
 transactionId: string,
 splitEntryId: string,
 contactId: string
 ) => {
 const tx = transactions.find(t => t.id === transactionId);
 if (!tx || !tx.splitWith || !Array.isArray(tx.splitWith)) return;

 const now = new Date().toISOString();
 const updatedSplits = tx.splitWith.map(e =>
 e.id === splitEntryId
 ? {
 ...e,
 contactId,
 label: undefined, // Clear generic label once assigned to a real person
 }
 : e
 );
 updateTransaction(transactionId, { splitWith: updatedSplits, updatedAt: now });
 };

 const settleSplitEntry = (
 transactionId: string,
 splitEntryId: string,
 options: {
 settled: boolean;
 settledAmount?: number;
 linkedTransactionId?: string;
 note?: string;
 date?: string;
 }
 ): SettlementRecord | undefined => {
 const tx = transactions.find(t => t.id === transactionId);
 if (!tx || !tx.splitWith || !Array.isArray(tx.splitWith)) return undefined;

 const targetEntry = tx.splitWith.find(e => e.id === splitEntryId);
 if (!targetEntry) return undefined;

 const now = new Date().toISOString();

 if (options.settled) {
 const inputAmount =
 typeof options.settledAmount === 'number' ? options.settledAmount : targetEntry.amount;
 if (inputAmount <= 0) return undefined;

 const finalSettledAmount = Math.min(inputAmount, targetEntry.amount);
 const isFullSettlement = finalSettledAmount >= targetEntry.amount - 0.01;

 // 1. Update splitEntry on transaction
 const updatedSplits = tx.splitWith.map(e =>
 e.id === splitEntryId
 ? {
 ...e,
 settled: isFullSettlement,
 settledAmount: finalSettledAmount,
 linkedTransactionId: options.linkedTransactionId || undefined,
 }
 : e
 );
 updateTransaction(transactionId, { splitWith: updatedSplits, updatedAt: now });

 // 2. If attached to a contact, record or update SettlementRecord
 if (targetEntry.contactId) {
 const existingSettlement = settlements.find(
 s =>
 s.sourceTransactionId === transactionId &&
 s.sourceSplitEntryId === splitEntryId
 );

 if (existingSettlement) {
 const updatedRecord: SettlementRecord = {
 ...existingSettlement,
 amount: finalSettledAmount,
 date: options.date || existingSettlement.date,
 note: options.note || existingSettlement.note,
 linkedTransactionId: options.linkedTransactionId || undefined,
 direction: targetEntry.direction,
 updatedAt: now,
 };
 updateSettlement(existingSettlement.id, updatedRecord);
 return updatedRecord;
 } else {
 const newSettlement: SettlementRecord = {
 id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
 contactId: targetEntry.contactId,
 date: options.date || now.split('T')[0],
 amount: finalSettledAmount,
 note: options.note || `Settlement for "${tx.description}"`,
 createdAt: now,
 updatedAt: now,
 sourceTransactionId: transactionId,
 sourceSplitEntryId: splitEntryId,
 linkedTransactionId: options.linkedTransactionId || undefined,
 direction: targetEntry.direction,
 };
 settlementsRef.current = [newSettlement, ...settlementsRef.current];
 setSettlements(prev => [newSettlement, ...prev]);
 const contact = contacts.find(c => c.id === targetEntry.contactId);
 emitFinanceEvent({
 type: 'settlement_recorded',
 contactName: contact ? contact.name : 'Contact',
 amount: finalSettledAmount,
 allSettled: false,
 });
 return newSettlement;
 }
 }
 return undefined;
 } else {
 // Unsettle
 const updatedSplits = tx.splitWith.map(e =>
 e.id === splitEntryId
 ? {
 ...e,
 settled: false,
 settledAmount: undefined,
 linkedTransactionId: undefined,
 }
 : e
 );
 updateTransaction(transactionId, { splitWith: updatedSplits, updatedAt: now });

 // Remove auto-created settlement record strictly matching this splitEntryId
 const toDelete = settlements.find(
 s =>
 s.sourceTransactionId === transactionId &&
 s.sourceSplitEntryId === splitEntryId
 );
 if (toDelete) {
 addTombstone('settlements', toDelete.id);
 settlementsRef.current = settlementsRef.current.filter(s => s.id !== toDelete.id);
 setSettlements(prev => prev.filter(s => s.id !== toDelete.id));
 }
 return undefined;
 }
 };

 // Category operations
 const addCategory = (catData: Omit<Category, 'id'>): Category => {
 const trimmedName = catData.name.trim();
 const existing = categoriesRef.current.find(
 c => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
 );
 if (existing) {
 console.warn(`[FinanceContext] Category "${trimmedName}" already exists.`);
 return existing;
 }
 const now = new Date().toISOString();
 const newCat: Category = {
 ...catData,
 name: trimmedName,
 id: `cat-${Date.now()}`,
 isCustom: true,
 updatedAt: now,
 };
 categoriesRef.current = [...categoriesRef.current, newCat];
 setCategories(prev => [...prev, newCat]);
 return newCat;
 };

 const updateCategory = (id: string, updated: Partial<Category>) => {
 if (updated.name) {
 const trimmedName = updated.name.trim();
 const duplicate = categoriesRef.current.find(
 c => c.id !== id && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
 );
 if (duplicate) {
 console.warn(`[FinanceContext] Cannot rename: category "${trimmedName}" already exists.`);
 return;
 }
 }
 const now = new Date().toISOString();
 const cleanUpdated = {
 ...updated,
 ...(updated.name ? { name: updated.name.trim() } : {}),
 updatedAt: now,
 };
 categoriesRef.current = categoriesRef.current.map(c =>
 c.id === id ? { ...c, ...cleanUpdated } : c
 );
 setCategories(prev =>
 prev.map(c => (c.id === id ? { ...c, ...cleanUpdated } : c))
 );
 };

 const deleteCategory = (id: string) => {
 const targetCat = categoriesRef.current.find(c => c.id === id);
 if (!targetCat) return;
 if (!targetCat.isCustom) {
 console.warn(`[FinanceContext] Default category "${targetCat.name}" cannot be deleted.`);
 return;
 }
 addTombstone('categories', id);
 categoriesRef.current = categoriesRef.current.filter(c => c.id !== id);
 setCategories(prev => prev.filter(c => c.id !== id));
 };

 // Budget operations
 const setBudgetForCategory = (category: string, monthlyLimit: number) => {
 const now = new Date().toISOString();
 const updater = (prev: Budget[]) => {
 const existingIdx = prev.findIndex(b => b.category.toLowerCase() === category.toLowerCase());
 if (existingIdx >= 0) {
 const next = [...prev];
 next[existingIdx] = { ...next[existingIdx], monthlyLimit, updatedAt: now };
 return next;
 } else {
 return [...prev, { id: `b-${Date.now()}`, category, monthlyLimit, updatedAt: now }];
 }
 };
 budgetsRef.current = updater(budgetsRef.current);
 setBudgets(updater);
 };

 const deleteBudget = (id: string) => {
 addTombstone('budgets', id);
 budgetsRef.current = budgetsRef.current.filter(b => b.id !== id);
 setBudgets(prev => prev.filter(b => b.id !== id));
 };

 // Emergency Fund operations
 const updateEmergencySettings = (targetMonths: number, manualTargetAmount?: number) => {
 const now = new Date().toISOString();
 emergencyFundRef.current = {
 ...emergencyFundRef.current,
 targetMonths,
 manualTargetAmount,
 updatedAt: now,
 };
 setEmergencyFund(prev => ({
 ...prev,
 targetMonths,
 manualTargetAmount,
 updatedAt: now,
 }));
 };

 const addEmergencyContribution = (
 amount: number,
 type: 'deposit' | 'withdrawal',
 note?: string,
 date?: string
 ) => {
 const now = new Date().toISOString();
 const today = date || now.split('T')[0];
 const newContribution = {
 id: `em-${Date.now()}`,
 date: today,
 amount,
 type,
 note: note || (type === 'deposit' ? 'Emergency Fund Deposit' : 'Emergency Fund Withdrawal'),
 createdAt: now,
 updatedAt: now,
 };

 const newSaved = type === 'deposit'
 ? emergencyFundRef.current.currentSaved + amount
 : Math.max(0, emergencyFundRef.current.currentSaved - amount);

 emergencyFundRef.current = {
 ...emergencyFundRef.current,
 currentSaved: newSaved,
 contributions: [newContribution, ...emergencyFundRef.current.contributions],
 updatedAt: now,
 };

 setEmergencyFund(prev => {
 const saved = type === 'deposit' ? prev.currentSaved + amount : Math.max(0, prev.currentSaved - amount);
 return {
 ...prev,
 currentSaved: saved,
 contributions: [newContribution, ...prev.contributions],
 updatedAt: now,
 };
 });

 const target = emergencyFund.manualTargetAmount || (emergencyFund.targetMonths * (emergencyFund.monthlyExpenseBaseline || 50000));
 const finalSaved = newSaved;
 const isFullyFunded = finalSaved >= target;
 emitFinanceEvent({
 type: 'emergency_contributed',
 amount,
 fundType: type,
 isFullyFunded,
 });
 };

 // Investments operations
 const addInvestment = (invData: Omit<Investment, 'id' | 'lastUpdated'>): Investment => {
 const now = new Date().toISOString();
 const newInv: Investment = {
 ...invData,
 id: `inv-${Date.now()}`,
 lastUpdated: now.split('T')[0],
 updatedAt: now,
 logs: [
 {
 id: `log-${Date.now()}`,
 date: now.split('T')[0],
 investedDelta: invData.investedAmount,
 valueDelta: invData.currentValue,
 note: 'Initial holding created',
 },
 ],
 };
 investmentsRef.current = [newInv, ...investmentsRef.current];
 setInvestments(prev => [newInv, ...prev]);
 return newInv;
 };

 const updateInvestment = (id: string, updated: Partial<Investment>) => {
 const now = new Date().toISOString();
 investmentsRef.current = investmentsRef.current.map(i =>
 i.id === id
 ? {
 ...i,
 ...updated,
 lastUpdated: now.split('T')[0],
 updatedAt: now,
 }
 : i
 );
 setInvestments(prev =>
 prev.map(i =>
 i.id === id
 ? {
 ...i,
 ...updated,
 lastUpdated: now.split('T')[0],
 updatedAt: now,
 }
 : i
 )
 );
 };

 const deleteInvestment = (id: string) => {
 addTombstone('investments', id);
 investmentsRef.current = investmentsRef.current.filter(i => i.id !== id);
 setInvestments(prev => prev.filter(i => i.id !== id));
 };

 // Dreams operations
 const addDream = (
 dreamData: Omit<DreamGoal, 'id' | 'createdAt' | 'contributions' | 'currentSaved'> & {
 initialSaved?: number;
 }
 ): DreamGoal => {
 const now = new Date().toISOString();
 const initialSaved = dreamData.initialSaved || 0;
 const today = now.split('T')[0];
 const newDream: DreamGoal = {
 id: `dream-${Date.now()}`,
 name: dreamData.name,
 targetAmount: dreamData.targetAmount,
 currentSaved: initialSaved,
 targetDate: dreamData.targetDate,
 category: dreamData.category || 'General',
 icon: dreamData.icon || 'Target',
 color: dreamData.color || '#3b82f6',
 priority: dreamData.priority || 'medium',
 createdAt: today,
 updatedAt: now,
 contributions: initialSaved > 0 ? [
 {
 id: `dc-${Date.now()}`,
 date: today,
 amount: initialSaved,
 note: 'Initial contribution',
 createdAt: now,
 }
 ] : [],
 };
 dreamsRef.current = [newDream, ...dreamsRef.current];
 setDreams(prev => [newDream, ...prev]);
 return newDream;
 };

 const updateDream = (id: string, updated: Partial<DreamGoal>) => {
 const now = new Date().toISOString();
 dreamsRef.current = dreamsRef.current.map(d =>
 d.id === id ? { ...d, ...updated, updatedAt: now } : d
 );
 setDreams(prev =>
 prev.map(d => (d.id === id ? { ...d, ...updated, updatedAt: now } : d))
 );
 };

 const deleteDream = (id: string) => {
 addTombstone('dreams', id);
 dreamsRef.current = dreamsRef.current.filter(d => d.id !== id);
 setDreams(prev => prev.filter(d => d.id !== id));
 };

 const addDreamContribution = (dreamId: string, amount: number, note?: string, date?: string) => {
 const now = new Date().toISOString();
 const today = date || now.split('T')[0];
 const newContribution = {
 id: `dc-${Date.now()}`,
 date: today,
 amount,
 note: note || 'Goal Contribution',
 createdAt: now,
 updatedAt: now,
 };

 const dreamUpdater = (prev: DreamGoal[]) =>
 prev.map(d => {
 if (d.id === dreamId) {
 return {
 ...d,
 currentSaved: d.currentSaved + amount,
 contributions: [newContribution, ...(d.contributions || [])],
 updatedAt: now,
 };
 }
 return d;
 });

 dreamsRef.current = dreamUpdater(dreamsRef.current);
 setDreams(dreamUpdater);

 const targetDream = dreams.find(d => d.id === dreamId);
 if (targetDream) {
 const isCompleted = (targetDream.currentSaved + amount) >= targetDream.targetAmount;
 emitFinanceEvent({
 type: 'dream_contributed',
 dreamId,
 dreamName: targetDream.name,
 amount,
 isCompleted,
 });
 if (isCompleted) {
 emitFinanceEvent({
 type: 'dream_completed',
 dream: {
 ...targetDream,
 currentSaved: targetDream.currentSaved + amount,
 },
 });
 }
 }
 };

 // Recurring Payments CRUD
 const addRecurringPayment = (
 paymentData: Omit<RecurringPayment, 'id' | 'createdAt' | 'updatedAt'>
 ): RecurringPayment => {
 const now = new Date().toISOString();
 const newPayment: RecurringPayment = {
 ...paymentData,
 id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
 createdAt: now,
 updatedAt: now,
 };
 recurringPaymentsRef.current = [newPayment, ...recurringPaymentsRef.current];
 setRecurringPayments(prev => [newPayment, ...prev]);
 return newPayment;
 };

 const updateRecurringPayment = (id: string, updated: Partial<RecurringPayment>) => {
 const now = new Date().toISOString();
 recurringPaymentsRef.current = recurringPaymentsRef.current.map(p =>
 p.id === id ? { ...p, ...updated, updatedAt: now } : p
 );
 setRecurringPayments(prev =>
 prev.map(p => (p.id === id ? { ...p, ...updated, updatedAt: now } : p))
 );
 };

 const deleteRecurringPayment = (id: string) => {
 addTombstone('recurringPayments', id);
 const logsToDelete = recurringPaymentLogs.filter(l => l.recurringPaymentId === id);
 logsToDelete.forEach(l => addTombstone('recurringPaymentLogs', l.id));

 recurringPaymentsRef.current = recurringPaymentsRef.current.filter(p => p.id !== id);
 recurringPaymentLogsRef.current = recurringPaymentLogsRef.current.filter(l => l.recurringPaymentId !== id);
 setRecurringPayments(prev => prev.filter(p => p.id !== id));
 setRecurringPaymentLogs(prev => prev.filter(l => l.recurringPaymentId !== id));
 };

 const pauseRecurringPayment = (id: string) => {
 const now = new Date().toISOString();
 recurringPaymentsRef.current = recurringPaymentsRef.current.map(p =>
 p.id === id ? { ...p, isActive: !p.isActive, updatedAt: now } : p
 );
 setRecurringPayments(prev =>
 prev.map(p => (p.id === id ? { ...p, isActive: !p.isActive, updatedAt: now } : p))
 );
 };

 const markRecurringPaymentPaid = (
 recurringPaymentId: string,
 dueDate: string,
 actualAmount?: number,
 linkedTransactionId?: string,
 createTransaction?: boolean
 ) => {
 const payment = recurringPayments.find(p => p.id === recurringPaymentId);
 if (!payment) return;

 const paidAmount = actualAmount !== undefined ? actualAmount : payment.amount;
 const paidDate = getTodayString();
 const now = new Date().toISOString();

 let txId = linkedTransactionId;
 const shouldCreateTx = createTransaction !== undefined ? createTransaction : Boolean(payment.autoLogTransaction);

 if (shouldCreateTx && !txId) {
 const newTx = addTransaction({
 date: paidDate,
 amount: paidAmount,
 type: 'debit',
 category: payment.category,
 description: `${payment.name} (Recurring: ${dueDate})`,
 paymentMethod: payment.paymentMethod || 'Other',
 source: 'manual',
 }, { silent: true });
 txId = newTx.id;
 }

 const newLog: RecurringPaymentLog = {
 id: `reclog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
 recurringPaymentId,
 dueDate,
 paidDate,
 amount: paidAmount,
 linkedTransactionId: txId,
 createdAt: now,
 updatedAt: now,
 };

 recurringPaymentLogsRef.current = [newLog, ...recurringPaymentLogsRef.current];
 setRecurringPaymentLogs(prev => [newLog, ...prev]);
 emitFinanceEvent({
 type: 'recurring_paid',
 paymentName: payment.name,
 amount: paidAmount,
 });
 };

 // AI Settings
 const updateAISettings = (settings: Partial<AISettings>) => {
 setAISettings(prev => {
 const provider = settings.provider || prev.provider;
 const resolvedModel = settings.model || DEFAULT_AI_MODELS[provider];
 return {
 ...prev,
 ...settings,
 provider,
 model: resolvedModel,
 updatedAt: new Date().toISOString(),
 };
 });
 };

 const saveAIReport = (reportData: Omit<AIHealthReport, 'id' | 'createdAt'>) => {
 const now = new Date().toISOString();
 const newReport: AIHealthReport = {
 ...reportData,
 id: `rep-${Date.now()}`,
 createdAt: now,
 updatedAt: now,
 };
 setAIReports(prev => [newReport, ...prev]);
 };

 const deleteAIReport = (id: string) => {
 addTombstone('aiReports', id);
 setAIReports(prev => prev.filter(r => r.id !== id));
 };

 // Reset & Backup
  const resetToDemoData = () => {
    emitFinanceEvent({ type: 'bulk_data_loaded' });
    const rebased = rebaseDemoData({
      transactions: INITIAL_TRANSACTIONS,
      emergencyFund: INITIAL_EMERGENCY_FUND,
      investments: INITIAL_INVESTMENTS,
      dreams: INITIAL_DREAMS,
      recurringPayments: INITIAL_RECURRING_PAYMENTS,
      recurringPaymentLogs: INITIAL_RECURRING_PAYMENT_LOGS,
    });

    saveAllToStore('transactions', rebased.transactions).catch(console.error);
    saveAllToStore('categories', DEFAULT_CATEGORIES).catch(console.error);
    saveAllToStore('budgets', INITIAL_BUDGETS).catch(console.error);
    saveAllToStore('investments', rebased.investments).catch(console.error);
    saveAllToStore('dreams', rebased.dreams).catch(console.error);
    saveAllToStore('contacts', []).catch(console.error);
    saveAllToStore('settlements', []).catch(console.error);
    saveAllToStore('recurringPayments', rebased.recurringPayments).catch(console.error);
    saveAllToStore('recurringPaymentLogs', rebased.recurringPaymentLogs).catch(console.error);
    saveAllToStore('aiReports', []).catch(console.error);

    transactionsRef.current = rebased.transactions;
    categoriesRef.current = DEFAULT_CATEGORIES;
    budgetsRef.current = INITIAL_BUDGETS;
    investmentsRef.current = rebased.investments;
    dreamsRef.current = rebased.dreams;
    contactsRef.current = [];
    settlementsRef.current = [];
    recurringPaymentsRef.current = rebased.recurringPayments;
    recurringPaymentLogsRef.current = rebased.recurringPaymentLogs;

    prevTransactionsRef.current = rebased.transactions;
    prevCategoriesRef.current = DEFAULT_CATEGORIES;
    prevBudgetsRef.current = INITIAL_BUDGETS;
    prevInvestmentsRef.current = rebased.investments;
    prevDreamsRef.current = rebased.dreams;
    prevContactsRef.current = [];
    prevSettlementsRef.current = [];
    prevRecurringPaymentsRef.current = rebased.recurringPayments;
    prevRecurringPaymentLogsRef.current = rebased.recurringPaymentLogs;
    prevAiReportsRef.current = [];

    setTransactions(rebased.transactions);
    setCategories(DEFAULT_CATEGORIES);
    setBudgets(INITIAL_BUDGETS);
    setEmergencyFund(rebased.emergencyFund);
    setInvestments(rebased.investments);
    setDreams(rebased.dreams);
    setContacts([]);
    setSettlements([]);
    setRecurringPayments(rebased.recurringPayments);
    setRecurringPaymentLogs(rebased.recurringPaymentLogs);
    setAIReports([]);
    setNotRecurringTxIds(new Set());
    try {
      localStorage.removeItem('dhanveda_setup_checklist_dismissed');
      window.dispatchEvent(new CustomEvent('dhanveda-checklist-reset'));
    } catch {}
  };

  const clearAllData = async () => {
    transactionsRef.current = [];
    categoriesRef.current = [];
    budgetsRef.current = [];
    investmentsRef.current = [];
    dreamsRef.current = [];
    contactsRef.current = [];
    settlementsRef.current = [];
    recurringPaymentsRef.current = [];
    recurringPaymentLogsRef.current = [];

    prevTransactionsRef.current = [];
    prevCategoriesRef.current = [];
    prevBudgetsRef.current = [];
    prevInvestmentsRef.current = [];
    prevDreamsRef.current = [];
    prevContactsRef.current = [];
    prevSettlementsRef.current = [];
    prevRecurringPaymentsRef.current = [];
    prevRecurringPaymentLogsRef.current = [];
    prevAiReportsRef.current = [];

    setTransactions([]);
    setBudgets([]);
    setInvestments([]);
    setDreams([]);
    setContacts([]);
    setSettlements([]);
    setRecurringPayments([]);
    setRecurringPaymentLogs([]);
    setAIReports([]);
    setEmergencyFund(EMPTY_EMERGENCY_FUND);
    setNotRecurringTxIds(new Set());
    try {
      localStorage.removeItem('dhanveda_setup_checklist_dismissed');
      window.dispatchEvent(new CustomEvent('dhanveda-checklist-reset'));
    } catch {}
    await clearAllStores();
  };

  const exportBackupJSON = (): string => {
    const backupData = {
      version: '2.1',
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      budgets,
      emergencyFund,
      investments,
      dreams,
      contacts,
      settlements,
      recurringPayments,
      recurringPaymentLogs,
      aiReports,
      userPreferences: {
        darkMode,
        notRecurringTxIds: Array.from(notRecurringTxIds),
      },
    };
    return JSON.stringify(backupData, null, 2);
  };

  const importBackupJSON = (
    jsonStr: string,
    options?: {
      onToast?: (variant: 'success' | 'danger' | 'warning' | 'info', title: string, message?: string, duration?: number, action?: { label: string; onClick: () => void }) => void;
    }
  ): boolean => {
    const notify = (variant: 'success' | 'danger' | 'warning' | 'info', title: string, message?: string, duration?: number, action?: { label: string; onClick: () => void }) => {
      if (options?.onToast) {
        options.onToast(variant, title, message, duration, action);
      } else {
        console.warn(`[Restore] ${title}: ${message || ''}`);
      }
    };

    try {
      if (!jsonStr || typeof jsonStr !== 'string' || !jsonStr.trim()) {
        notify('danger', 'Invalid Backup', 'The selected backup file is empty.');
        return false;
      }

      if (jsonStr.length > 25 * 1024 * 1024) {
        notify('danger', 'File Too Large', 'Backup file exceeds 25MB limit.');
        return false;
      }

      // Safe parse stripping dangerous prototype keys during parsing
      const parsed = JSON.parse(jsonStr, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        notify('danger', 'Invalid Format', 'Backup file is not a valid DhanVeda backup object.');
        return false;
      }

      // Check version: refuse files from a newer major version with clear message
      if (parsed.version) {
        const major = parseInt(String(parsed.version).split('.')[0], 10);
        if (Number.isFinite(major) && major > 2) {
          notify('danger', 'Incompatible Version', `This backup is from a newer version of DhanVeda (version ${parsed.version}). Please update DhanVeda to restore this file.`);
          return false;
        }
      }

      // Recursive sanitizer to ensure absolutely no dangerous keys slip through
      const sanitize = (val: any): any => {
        if (val === null || typeof val !== 'object') return val;
        if (Array.isArray(val)) return val.map(sanitize);
        const clean: Record<string, any> = {};
        for (const k of Object.keys(val)) {
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
          clean[k] = sanitize(val[k]);
        }
        return clean;
      };

      const data = sanitize(parsed);

      // Structure check: ensure at least one recognized store exists and all present store arrays/objects are valid
      const arrayStoreKeys = [
        'transactions',
        'categories',
        'budgets',
        'investments',
        'dreams',
        'contacts',
        'settlements',
        'recurringPayments',
        'recurringPaymentLogs',
        'aiReports',
      ] as const;

      let recognizedDataFound = false;

      // Validate each array store structure
      for (const key of arrayStoreKeys) {
        if (key in data) {
          if (!Array.isArray(data[key])) {
            notify('danger', 'Corrupt Backup', `Invalid backup: store "${key}" is not an array.`);
            return false;
          }
          recognizedDataFound = true;
        }
      }

      if ('emergencyFund' in data && data.emergencyFund) {
        if (typeof data.emergencyFund !== 'object' || Array.isArray(data.emergencyFund)) {
          notify('danger', 'Corrupt Backup', 'Invalid backup: emergencyFund is not an object.');
          return false;
        }
        recognizedDataFound = true;
      }

      if ('userPreferences' in data && data.userPreferences) {
        if (typeof data.userPreferences !== 'object' || Array.isArray(data.userPreferences)) {
          notify('danger', 'Corrupt Backup', 'Invalid backup: userPreferences is not an object.');
          return false;
        }
        recognizedDataFound = true;
      }

      if (!recognizedDataFound) {
        notify('danger', 'Invalid Backup', 'No recognized DhanVeda store structures found in the file.');
        return false;
      }

      // Record validation with B-02 validators & 5% rejection rule
      const storeValidators: Array<{
        name: string;
        key: string;
        items: any[];
        normalizer: (item: any) => any;
      }> = [];

      if (Array.isArray(data.transactions)) storeValidators.push({ name: 'transactions', key: 'transactions', items: data.transactions, normalizer: normalizeTransaction });
      if (Array.isArray(data.categories)) storeValidators.push({ name: 'categories', key: 'categories', items: data.categories, normalizer: normalizeCategory });
      if (Array.isArray(data.budgets)) storeValidators.push({ name: 'budgets', key: 'budgets', items: data.budgets, normalizer: normalizeBudget });
      if (Array.isArray(data.investments)) storeValidators.push({ name: 'investments', key: 'investments', items: data.investments, normalizer: normalizeInvestment });
      if (Array.isArray(data.dreams)) storeValidators.push({ name: 'goals', key: 'dreams', items: data.dreams, normalizer: normalizeDream });
      if (Array.isArray(data.contacts)) storeValidators.push({ name: 'contacts', key: 'contacts', items: data.contacts, normalizer: normalizeContact });
      if (Array.isArray(data.settlements)) storeValidators.push({ name: 'settlements', key: 'settlements', items: data.settlements, normalizer: normalizeSettlement });
      if (Array.isArray(data.recurringPayments)) storeValidators.push({ name: 'recurring payments', key: 'recurringPayments', items: data.recurringPayments, normalizer: normalizeRecurringPayment });
      if (Array.isArray(data.recurringPaymentLogs)) storeValidators.push({ name: 'recurring payment logs', key: 'recurringPaymentLogs', items: data.recurringPaymentLogs, normalizer: normalizeRecurringPaymentLog });
      if (Array.isArray(data.aiReports)) storeValidators.push({ name: 'AI reports', key: 'aiReports', items: data.aiReports, normalizer: normalizeAIHealthReport });

      const validatedStores = new Map<string, any[]>();
      let totalImported = 0;
      let totalSkipped = 0;
      const skippedDetails: string[] = [];

      for (const sv of storeValidators) {
        const { valid, invalidCount } = validateStoreRecords(sv.items, sv.normalizer);
        if (sv.items.length > 0) {
          const failRate = invalidCount / sv.items.length;
          if (failRate > 0.05) {
            notify('danger', 'Restore Rejected', `Backup rejected: ${Math.round(failRate * 100)}% of ${sv.name} records are invalid (${invalidCount} of ${sv.items.length} failed). No changes were made.`);
            return false;
          }
        }
        validatedStores.set(sv.key, valid);
        totalImported += valid.length;
        totalSkipped += invalidCount;
        if (invalidCount > 0) {
          skippedDetails.push(`${sv.name}: ${invalidCount} invalid record(s) skipped`);
        }
      }

      // Validate emergency fund if present
      let validEmergencyFund: EmergencyFund | undefined = undefined;
      if (data.emergencyFund && typeof data.emergencyFund === 'object') {
        const normEF = normalizeEmergencyFund(data.emergencyFund);
        if (!normEF) {
          notify('danger', 'Restore Rejected', 'Backup rejected: emergency fund data is corrupt.');
          return false;
        }
        validEmergencyFund = normEF;
      }

      // Confirmation modal with counts before replacing anything
      const getCurrentCountsSummary = () => {
        const parts: string[] = [];
        if (transactionsRef.current.length > 0) parts.push(`${transactionsRef.current.length} transaction${transactionsRef.current.length === 1 ? '' : 's'}`);
        if (budgetsRef.current.length > 0) parts.push(`${budgetsRef.current.length} budget${budgetsRef.current.length === 1 ? '' : 's'}`);
        if (categoriesRef.current.length > 0) parts.push(`${categoriesRef.current.length} categor${categoriesRef.current.length === 1 ? 'y' : 'ies'}`);
        if (investmentsRef.current.length > 0) parts.push(`${investmentsRef.current.length} investment${investmentsRef.current.length === 1 ? '' : 's'}`);
        if (dreamsRef.current.length > 0) parts.push(`${dreamsRef.current.length} goal${dreamsRef.current.length === 1 ? '' : 's'}`);
        if (contactsRef.current.length > 0) parts.push(`${contactsRef.current.length} contact${contactsRef.current.length === 1 ? '' : 's'}`);
        if (settlementsRef.current.length > 0) parts.push(`${settlementsRef.current.length} settlement${settlementsRef.current.length === 1 ? '' : 's'}`);
        if (recurringPaymentsRef.current.length > 0) parts.push(`${recurringPaymentsRef.current.length} recurring payment${recurringPaymentsRef.current.length === 1 ? '' : 's'}`);
        return parts.length > 0 ? parts.join(', ') : 'no data';
      };

      const getBackupCountsSummary = () => {
        const parts: string[] = [];
        for (const sv of storeValidators) {
          const count = sv.items.length;
          if (count > 0) {
            parts.push(`${count} ${sv.name}`);
          }
        }
        return parts.length > 0 ? parts.join(', ') : '1 record';
      };

      const confirmMsg = `Replace your current data (${getCurrentCountsSummary()}) with this backup (${getBackupCountsSummary()})? This cannot be undone.`;
      const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMsg) : true;
      if (!confirmed) {
        notify('info', 'Restore Cancelled', 'No changes were made to your data.');
        return false;
      }

      // Automatically download a safety backup of the current data first (Blob download, no storage)
      try {
        const currentBackupJSON = exportBackupJSON();
        const blob = new Blob([currentBackupJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dhanveda-safety-backup-${getTodayString()}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } catch (backupErr) {
        console.error('Safety backup download error:', backupErr);
      }

      // Write valid records to IDB and update in-memory state
      emitFinanceEvent({ type: 'bulk_data_loaded' });

      if (validatedStores.has('transactions')) {
        const validTxs = validatedStores.get('transactions')!;
        saveAllToStore('transactions', validTxs).catch(console.error);
        prevTransactionsRef.current = validTxs;
        transactionsRef.current = validTxs;
        setTransactions(validTxs);
      }
      if (validatedStores.has('categories')) {
        const validCats = validatedStores.get('categories')!;
        saveAllToStore('categories', validCats).catch(console.error);
        prevCategoriesRef.current = validCats;
        categoriesRef.current = validCats;
        setCategories(validCats);
      }
      if (validatedStores.has('budgets')) {
        const validBudgets = validatedStores.get('budgets')!;
        saveAllToStore('budgets', validBudgets).catch(console.error);
        prevBudgetsRef.current = validBudgets;
        budgetsRef.current = validBudgets;
        setBudgets(validBudgets);
      }
      if (validEmergencyFund) {
        const em = { ...validEmergencyFund, id: 'current' };
        saveSingleRecord('emergencyFund', em).catch(console.error);
        emergencyFundRef.current = em;
        setEmergencyFund(em);
      }
      if (validatedStores.has('investments')) {
        const validInvs = validatedStores.get('investments')!;
        saveAllToStore('investments', validInvs).catch(console.error);
        prevInvestmentsRef.current = validInvs;
        investmentsRef.current = validInvs;
        setInvestments(validInvs);
      }
      if (validatedStores.has('dreams')) {
        const validDreams = validatedStores.get('dreams')!;
        saveAllToStore('dreams', validDreams).catch(console.error);
        prevDreamsRef.current = validDreams;
        dreamsRef.current = validDreams;
        setDreams(validDreams);
      }
      if (validatedStores.has('contacts')) {
        const validContacts = validatedStores.get('contacts')!;
        saveAllToStore('contacts', validContacts).catch(console.error);
        prevContactsRef.current = validContacts;
        contactsRef.current = validContacts;
        setContacts(validContacts);
      }
      if (validatedStores.has('settlements')) {
        const validSets = validatedStores.get('settlements')!;
        saveAllToStore('settlements', validSets).catch(console.error);
        prevSettlementsRef.current = validSets;
        settlementsRef.current = validSets;
        setSettlements(validSets);
      }
      if (validatedStores.has('recurringPayments')) {
        const validRec = validatedStores.get('recurringPayments')!;
        saveAllToStore('recurringPayments', validRec).catch(console.error);
        prevRecurringPaymentsRef.current = validRec;
        recurringPaymentsRef.current = validRec;
        setRecurringPayments(validRec);
      }
      if (validatedStores.has('recurringPaymentLogs')) {
        const validLogs = validatedStores.get('recurringPaymentLogs')!;
        saveAllToStore('recurringPaymentLogs', validLogs).catch(console.error);
        prevRecurringPaymentLogsRef.current = validLogs;
        recurringPaymentLogsRef.current = validLogs;
        setRecurringPaymentLogs(validLogs);
      }
      if (validatedStores.has('aiReports')) {
        const validAi = validatedStores.get('aiReports')!;
        saveAllToStore('aiReports', validAi).catch(console.error);
        prevAiReportsRef.current = validAi;
        setAIReports(validAi);
      }
      if (data.userPreferences && typeof data.userPreferences === 'object') {
        if (data.userPreferences.darkMode !== undefined) setDarkMode(Boolean(data.userPreferences.darkMode));
        if (Array.isArray(data.userPreferences.notRecurringTxIds)) {
          const validIds = data.userPreferences.notRecurringTxIds.filter((id: any) => typeof id === 'string');
          setNotRecurringTxIds(new Set(validIds));
        }
      }

      // Show summary
      if (totalSkipped > 0) {
        const downloadList = () => {
          const blob = new Blob([skippedDetails.join('\n')], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dhanveda-skipped-records-${getTodayString()}.txt`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        };

        notify(
          'info',
          'Restore Complete',
          `Imported ${totalImported}, skipped ${totalSkipped}`,
          6000,
          { label: 'download list', onClick: downloadList }
        );
      } else {
        notify('success', 'Backup Restored', `All ${totalImported} records were restored successfully.`, 5000);
      }

      return true;
    } catch (e) {
      console.error('Failed to import backup JSON:', e);
      notify('danger', 'Restore Error', 'An unexpected error occurred while reading the backup file.');
      return false;
    }
  };

 // Calculated Metrics
 const totalBalance = useMemo(() => {
 return transactions.reduce((acc, t) => {
 return t.type === 'credit' ? acc + t.amount : acc - t.amount;
 }, 0);
 }, [transactions]);

 const { key: currentMonthKey, monthName: currentMonthName } = getCurrentMonthYear();

 const currentMonthTransactions = useMemo(() => {
 return transactions.filter(t => t.date && t.date.startsWith(currentMonthKey));
 }, [transactions, currentMonthKey]);

 const currentMonthIncome = useMemo(() => {
 return currentMonthTransactions
 .filter(t => t.type === 'credit')
 .reduce((acc, t) => acc + t.amount, 0);
 }, [currentMonthTransactions]);

 const currentMonthExpense = useMemo(() => {
 return currentMonthTransactions
 .filter(t => t.type === 'debit')
 .reduce((acc, t) => acc + t.amount, 0);
 }, [currentMonthTransactions]);

 const currentMonthNet = currentMonthIncome - currentMonthExpense;
 const currentMonthSavingsRate = currentMonthIncome > 0 ? (currentMonthNet / currentMonthIncome) * 100 : 0;

 const totalInvestedAmount = useMemo(() => {
 return investments.reduce((acc, i) => acc + i.investedAmount, 0);
 }, [investments]);

 const totalInvestmentValue = useMemo(() => {
 return investments.reduce((acc, i) => acc + i.currentValue, 0);
 }, [investments]);

 const totalInvestmentGainLoss = totalInvestmentValue - totalInvestedAmount;
 const totalInvestmentGainLossPct = totalInvestedAmount > 0 ? (totalInvestmentGainLoss / totalInvestedAmount) * 100 : 0;

 const averageMonthlyExpenses = useMemo(() => {
 const monthExpensesMap: Record<string, number> = {};
 transactions.forEach(t => {
 if (t.type === 'debit') {
 const ym = getMonthKey(t.date);
 if (ym) {
 monthExpensesMap[ym] = (monthExpensesMap[ym] || 0) + (Number.isFinite(t.amount) ? t.amount : 0);
 }
 }
 });

 const expenseValues = Object.values(monthExpensesMap);
 if (expenseValues.length === 0) return 50000;
 const sum = expenseValues.reduce((a, b) => a + b, 0);
 return sum / expenseValues.length;
 }, [transactions]);

 const effectiveMonthlyBaseline = emergencyFund.manualTargetAmount
 ? emergencyFund.manualTargetAmount / emergencyFund.targetMonths
 : averageMonthlyExpenses;

 const emergencyFundRunwayMonths = effectiveMonthlyBaseline > 0
 ? emergencyFund.currentSaved / effectiveMonthlyBaseline
 : 0;

 const totalGoalsTarget = useMemo(() => {
 return dreams.reduce((acc, d) => acc + d.targetAmount, 0);
 }, [dreams]);

 const totalGoalsSaved = useMemo(() => {
 return dreams.reduce((acc, d) => acc + d.currentSaved, 0);
 }, [dreams]);

  // Derived Splits & Owed Metrics (Single-pass Map indexed: O(T + S + C) instead of O(C * (T + S)))
  const contactBalances = useMemo<ContactBalance[]>(() => {
    // 1. Single pass over transactions to accumulate split balances per contact
    const splitsByContact = new Map<string, { owedToMe: number; iOweThem: number; latestDate: string }>();

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      if (!t.splitWith || !Array.isArray(t.splitWith)) continue;
      for (let j = 0; j < t.splitWith.length; j++) {
        const entry = t.splitWith[j];
        if (!entry.contactId) continue;
        let data = splitsByContact.get(entry.contactId);
        if (!data) {
          data = { owedToMe: 0, iOweThem: 0, latestDate: '' };
          splitsByContact.set(entry.contactId, data);
        }
        const fullAmount = entry.amount;
        const settledAmt = entry.settled
          ? (entry.settledAmount !== undefined ? entry.settledAmount : fullAmount)
          : (entry.settledAmount || 0);
        const remaining = Math.max(0, fullAmount - settledAmt);

        if (remaining > 0) {
          if (entry.direction === 'they_owe_me') {
            data.owedToMe += remaining;
          } else {
            data.iOweThem += remaining;
          }
        }
        if (t.date > data.latestDate) {
          data.latestDate = t.date;
        }
      }
    }

    // 2. Single pass over settlements to group by contactId
    const settlementsByContact = new Map<string, SettlementRecord[]>();
    for (let i = 0; i < settlements.length; i++) {
      const s = settlements[i];
      if (!s.contactId) continue;
      const list = settlementsByContact.get(s.contactId);
      if (list) {
        list.push(s);
      } else {
        settlementsByContact.set(s.contactId, [s]);
      }
    }

    // 3. Map contacts in O(contacts)
    return contacts.map(contact => {
      const splitData = splitsByContact.get(contact.id);
      let owedToMe = splitData ? splitData.owedToMe : 0;
      let iOweThem = splitData ? splitData.iOweThem : 0;
      let lastUpdated = (splitData && splitData.latestDate > contact.createdAt)
        ? splitData.latestDate
        : contact.createdAt;

      const contactSettlements = settlementsByContact.get(contact.id);
      if (contactSettlements) {
        for (let i = 0; i < contactSettlements.length; i++) {
          const s = contactSettlements[i];
          let settlementApplicableAmount = 0;
          if (!s.sourceTransactionId) {
            settlementApplicableAmount = s.amount;
          } else if (s.reconciledSplits && s.reconciledSplits.length > 0) {
            let totalReconciled = 0;
            for (let r = 0; r < s.reconciledSplits.length; r++) {
              totalReconciled += s.reconciledSplits[r].amount;
            }
            const excess = Math.max(0, s.amount - totalReconciled);
            settlementApplicableAmount = excess;
          }

          if (settlementApplicableAmount <= 0) {
            if (s.date > lastUpdated) lastUpdated = s.date;
            continue;
          }

          if (s.direction === 'they_owe_me') {
            const deduction = Math.min(owedToMe, settlementApplicableAmount);
            owedToMe -= deduction;
            const excess = settlementApplicableAmount - deduction;
            if (excess > 0) {
              iOweThem += excess;
            }
          } else if (s.direction === 'i_owe_them') {
            const deduction = Math.min(iOweThem, settlementApplicableAmount);
            iOweThem -= deduction;
            const excess = settlementApplicableAmount - deduction;
            if (excess > 0) {
              owedToMe += excess;
            }
          } else {
            if (owedToMe >= iOweThem) {
              const deduction = Math.min(owedToMe, settlementApplicableAmount);
              owedToMe -= deduction;
              const leftover = settlementApplicableAmount - deduction;
              if (leftover > 0) {
                iOweThem += leftover;
              }
            } else {
              const deduction = Math.min(iOweThem, settlementApplicableAmount);
              iOweThem -= deduction;
              const leftover = settlementApplicableAmount - deduction;
              if (leftover > 0) {
                owedToMe += leftover;
              }
            }
          }
          if (s.date > lastUpdated) {
            lastUpdated = s.date;
          }
        }
      }

      const netAmount = owedToMe - iOweThem;
      return {
        contactId: contact.id,
        netAmount: Number(netAmount.toFixed(2)),
        lastUpdated,
      };
    });
  }, [contacts, transactions, settlements]);

 const totalOwedToMe = useMemo(() => {
 const namedOwed = contactBalances
 .filter(b => b.netAmount > 0)
 .reduce((acc, b) => acc + b.netAmount, 0);

 let unnamedOwed = 0;
 transactions.forEach(t => {
 if (t.splitWith && Array.isArray(t.splitWith)) {
 t.splitWith.forEach(entry => {
 if (!entry.contactId && entry.direction === 'they_owe_me') {
 const fullAmount = entry.amount;
 const settledAmt = entry.settled
 ? (entry.settledAmount !== undefined ? entry.settledAmount : fullAmount)
 : (entry.settledAmount || 0);
 const remaining = Math.max(0, fullAmount - settledAmt);
 unnamedOwed += remaining;
 }
 });
 }
 });

 return Number((namedOwed + unnamedOwed).toFixed(2));
 }, [contactBalances, transactions]);

 const totalIOwe = useMemo(() => {
 const namedIOwe = contactBalances
 .filter(b => b.netAmount < 0)
 .reduce((acc, b) => acc + Math.abs(b.netAmount), 0);

 let unnamedIOwe = 0;
 transactions.forEach(t => {
 if (t.splitWith && Array.isArray(t.splitWith)) {
 t.splitWith.forEach(entry => {
 if (!entry.contactId && entry.direction === 'i_owe_them') {
 const fullAmount = entry.amount;
 const settledAmt = entry.settled
 ? (entry.settledAmount !== undefined ? entry.settledAmount : fullAmount)
 : (entry.settledAmount || 0);
 const remaining = Math.max(0, fullAmount - settledAmt);
 unnamedIOwe += remaining;
 }
 });
 }
 });

 return Number((namedIOwe + unnamedIOwe).toFixed(2));
 }, [contactBalances, transactions]);

 const netSharedBalance = useMemo(() => {
 return Number((totalOwedToMe - totalIOwe).toFixed(2));
 }, [totalOwedToMe, totalIOwe]);

 const totalNetWorth = useMemo(() => {
 // Note: emergencyFund.currentSaved and totalGoalsSaved are held in bank/cash accounts
 // and are already accounted for within totalBalance (credits - debits).
 // Adding them here would double-count liquid savings.
 const net = totalBalance + totalInvestmentValue + netSharedBalance;
 return Number(net.toFixed(2));
 }, [totalBalance, totalInvestmentValue, netSharedBalance]);

 const peerBalanceSummary = useMemo(() => {
 let displayText = 'Split accounts settled';
 if (totalOwedToMe > 0 && totalIOwe > 0) {
 displayText = `Friends owe ₹${totalOwedToMe.toLocaleString('en-IN')} · You owe ₹${totalIOwe.toLocaleString('en-IN')}`;
 } else if (totalOwedToMe > 0) {
 displayText = `Friends owe ₹${totalOwedToMe.toLocaleString('en-IN')}`;
 } else if (totalIOwe > 0) {
 displayText = `You owe ₹${totalIOwe.toLocaleString('en-IN')}`;
 }
 return {
 totalOwedToMe,
 totalIOwe,
 net: netSharedBalance,
 displayText,
 };
 }, [totalOwedToMe, totalIOwe, netSharedBalance]);

 const categorySpendingThisMonth = useMemo(() => {
 const spendMap: Record<string, number> = {};
 currentMonthTransactions.forEach(t => {
 if (t.type === 'debit') {
 spendMap[t.category] = (spendMap[t.category] || 0) + t.amount;
 }
 });

 const budgetMap = new Map(budgets.map(b => [(b.category || '').toLowerCase(), b.monthlyLimit]));
 const categoryInfoMap = new Map(categories.map(c => [(c.name || '').toLowerCase(), c]));

 const result = Object.entries(spendMap).map(([categoryName, spent]) => {
 const budget = budgetMap.get((categoryName || '').toLowerCase()) || 0;
 const catInfo = categoryInfoMap.get((categoryName || '').toLowerCase());
 const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;

 return {
 category: categoryName,
 spent,
 budget,
 percentUsed,
 color: catInfo?.color || '#64748b',
 icon: catInfo?.icon || 'Tag',
 };
 });

 budgets.forEach(b => {
 const alreadyIncluded = result.some(r => (r.category || '').toLowerCase() === (b.category || '').toLowerCase());
 if (!alreadyIncluded) {
 const catInfo = categoryInfoMap.get((b.category || '').toLowerCase());
 result.push({
 category: b.category,
 spent: 0,
 budget: b.monthlyLimit,
 percentUsed: 0,
 color: catInfo?.color || '#64748b',
 icon: catInfo?.icon || 'Tag',
 });
 }
 });

 return result.sort((a, b) => b.spent - a.spent);
 }, [currentMonthTransactions, budgets, categories]);

  // Budget exceeded detector (fires when percentUsed crosses 100 during active session)
  const prevSpendingRef = useRef<Map<string, number>>(new Map());
  const isBudgetDetectorInitializedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!isInitialized) return;

    if (!isBudgetDetectorInitializedRef.current) {
      isBudgetDetectorInitializedRef.current = true;
      const initMap = new Map<string, number>();
      categorySpendingThisMonth.forEach(cat => {
        initMap.set((cat.category || '').toLowerCase(), cat.percentUsed);
      });
      prevSpendingRef.current = initMap;
      return;
    }

    categorySpendingThisMonth.forEach(cat => {
      if (cat.budget > 0) {
        const prevPercent = prevSpendingRef.current.get((cat.category || '').toLowerCase()) ?? 0;
        if (prevPercent <= 100 && cat.percentUsed > 100) {
          emitFinanceEvent({
            type: 'budget_exceeded',
            category: cat.category,
            spent: cat.spent,
            limit: cat.budget,
          });
        }
      }
    });

    const newMap = new Map<string, number>();
    categorySpendingThisMonth.forEach(cat => {
      newMap.set((cat.category || '').toLowerCase(), cat.percentUsed);
    });
    prevSpendingRef.current = newMap;
  }, [categorySpendingThisMonth, isInitialized, emitFinanceEvent]);

 // Derived Recurring Payments
 const totalMonthlyRecurringCommitment = useMemo(() => {
 return recurringPayments
 .filter(p => p.isActive)
 .reduce((sum, p) => sum + calculateMonthlyEquivalent(p.amount, p.frequency), 0);
 }, [recurringPayments]);

 const { upcomingRecurringPayments, overdueRecurringPayments } = useMemo(() => {
 const upcoming: Array<RecurringPayment & { nextDueDate: string; daysUntilDue: number }> = [];
 const overdue: Array<RecurringPayment & { dueDate: string; daysOverdue: number }> = [];

 const now = new Date();
 recurringPayments
 .filter(p => p.isActive)
 .forEach(p => {
 const schedule = getPaymentSchedule(p, recurringPaymentLogs, now);
 if (schedule.activeDueDate) {
 if (schedule.isOverdue) {
 overdue.push({
 ...p,
 dueDate: schedule.activeDueDate,
 daysOverdue: Math.abs(schedule.daysDiff),
 });
 } else {
 upcoming.push({
 ...p,
 nextDueDate: schedule.activeDueDate,
 daysUntilDue: Math.max(0, schedule.daysDiff),
 });
 }
 }
 });

 overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
 upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

 return { upcomingRecurringPayments: upcoming, overdueRecurringPayments: overdue };
 }, [recurringPayments, recurringPaymentLogs]);

 // Overdue recurring payments alert on app load - deferred to idle
 const hasAlertedOverdueRef = useRef(false);
 useEffect(() => {
 if (!isInitialized || hasAlertedOverdueRef.current) return;
 if (overdueRecurringPayments.length > 0) {
 const scheduleIdle = typeof window !== 'undefined' && 'requestIdleCallback' in window
 ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 1500 })
 : (cb: () => void) => setTimeout(cb, 500);
 const cancelIdle = typeof window !== 'undefined' && 'cancelIdleCallback' in window
 ? (id: any) => window.cancelIdleCallback(id)
 : (id: any) => clearTimeout(id);

 const handle = scheduleIdle(() => {
 if (hasAlertedOverdueRef.current) return;
 hasAlertedOverdueRef.current = true;
 const first = overdueRecurringPayments[0];
 emitFinanceEvent({
 type: 'recurring_overdue_detected',
 count: overdueRecurringPayments.length,
 paymentName: first ? first.name : undefined,
 });
 });
 return () => cancelIdle(handle);
 }
 }, [isInitialized, overdueRecurringPayments, emitFinanceEvent]);

 const getAggregatesForAI = (): FinancialAggregates => {
 const invBreakdownMap: Record<string, number> = {};
 investments.forEach(i => {
 invBreakdownMap[i.type] = (invBreakdownMap[i.type] || 0) + i.currentValue;
 });

 const invBreakdown = Object.entries(invBreakdownMap).map(([type, value]) => ({ type, value }));

 const goalsList = dreams.map(d => ({
 name: d.name,
 target: d.targetAmount,
 saved: d.currentSaved,
 targetDate: d.targetDate,
 percentComplete: d.targetAmount > 0 ? (d.currentSaved / d.targetAmount) * 100 : 0,
 }));

 return {
 currentMonthName,
 monthlyIncome: currentMonthIncome,
 monthlyExpenses: currentMonthExpense,
 netSavings: currentMonthNet,
 savingsRate: currentMonthSavingsRate,
 categorySpending: categorySpendingThisMonth.map(c => ({
 category: c.category,
 spent: c.spent,
 budget: c.budget > 0 ? c.budget : undefined,
 percentUsed: c.budget > 0 ? c.percentUsed : undefined,
 })),
 emergencyFund: {
 target: emergencyFund.manualTargetAmount || (effectiveMonthlyBaseline * emergencyFund.targetMonths),
 saved: emergencyFund.currentSaved,
 monthsCovered: emergencyFundRunwayMonths,
 targetMonths: emergencyFund.targetMonths,
 },
 investments: {
 totalInvested: totalInvestedAmount,
 currentValue: totalInvestmentValue,
 totalGainLoss: totalInvestmentGainLoss,
 gainLossPercent: totalInvestmentGainLossPct,
 breakdown: invBreakdown,
 },
 goals: goalsList,
 };
 };

  const uiValue = useMemo<FinanceUiContextType>(() => ({
    currentView,
    setCurrentView,
    darkMode,
    setDarkMode,
    isInitialized,
    unreadableRecordCount,
    dismissUnreadableBanner,
    isUnreadableBannerDismissed,
    saveError,
    retrySave,
    clearSaveError,
    crossTabStale,
    dismissCrossTabStale,
  }), [
    currentView,
    darkMode,
    isInitialized,
    unreadableRecordCount,
    dismissUnreadableBanner,
    isUnreadableBannerDismissed,
    saveError,
    retrySave,
    clearSaveError,
    crossTabStale,
    dismissCrossTabStale,
  ]);

  const actionsCurrent: FinanceActionsContextType = {
    subscribeFinanceEvent,
    emitFinanceEvent,
    triggerSync,
    connectDrive,
    disconnectDrive,
    reloadFromDB,
    addTransaction,
    addMultipleTransactions,
    updateTransaction,
    deleteTransaction,
    deleteMultipleTransactions,
    captureDeleteSnapshot,
    restoreTransactions,
    addContact,
    updateContact,
    deleteContact,
    recordSettlement,
    updateSettlement,
    deleteSettlement,
    linkSettlementToTransaction,
    quickToggleSettleTransaction,
    assignSplitToContact,
    settleSplitEntry,
    addCategory,
    updateCategory,
    deleteCategory,
    setBudgetForCategory,
    deleteBudget,
    updateEmergencySettings,
    addEmergencyContribution,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addDream,
    updateDream,
    deleteDream,
    addDreamContribution,
    addRecurringPayment,
    updateRecurringPayment,
    deleteRecurringPayment,
    pauseRecurringPayment,
    markRecurringPaymentPaid,
    toggleNotRecurring,
    updateAISettings,
    saveAIReport,
    deleteAIReport,
    getAggregatesForAI,
    resetToDemoData,
    clearAllData,
    exportBackupJSON,
    importBackupJSON,
  };

  const actionsRef = useRef<FinanceActionsContextType>(actionsCurrent);
  useLayoutEffect(() => {
    actionsRef.current = actionsCurrent;
  });

  const actionsValue = useMemo<FinanceActionsContextType>(() => ({
    subscribeFinanceEvent: (...args) => actionsRef.current.subscribeFinanceEvent(...args),
    emitFinanceEvent: (...args) => actionsRef.current.emitFinanceEvent(...args),
    triggerSync: (...args) => actionsRef.current.triggerSync(...args),
    connectDrive: (...args) => actionsRef.current.connectDrive(...args),
    disconnectDrive: (...args) => actionsRef.current.disconnectDrive(...args),
    reloadFromDB: (...args) => actionsRef.current.reloadFromDB(...args),
    addTransaction: (...args) => actionsRef.current.addTransaction(...args),
    addMultipleTransactions: (...args) => actionsRef.current.addMultipleTransactions(...args),
    updateTransaction: (...args) => actionsRef.current.updateTransaction(...args),
    deleteTransaction: (...args) => actionsRef.current.deleteTransaction(...args),
    deleteMultipleTransactions: (...args) => actionsRef.current.deleteMultipleTransactions(...args),
    captureDeleteSnapshot: (...args) => actionsRef.current.captureDeleteSnapshot(...args),
    restoreTransactions: (...args) => actionsRef.current.restoreTransactions(...args),
    addContact: (...args) => actionsRef.current.addContact(...args),
    updateContact: (...args) => actionsRef.current.updateContact(...args),
    deleteContact: (...args) => actionsRef.current.deleteContact(...args),
    recordSettlement: (...args) => actionsRef.current.recordSettlement(...args),
    updateSettlement: (...args) => actionsRef.current.updateSettlement(...args),
    deleteSettlement: (...args) => actionsRef.current.deleteSettlement(...args),
    linkSettlementToTransaction: (...args) => actionsRef.current.linkSettlementToTransaction(...args),
    quickToggleSettleTransaction: (...args) => actionsRef.current.quickToggleSettleTransaction(...args),
    assignSplitToContact: (...args) => actionsRef.current.assignSplitToContact(...args),
    settleSplitEntry: (...args) => actionsRef.current.settleSplitEntry(...args),
    addCategory: (...args) => actionsRef.current.addCategory(...args),
    updateCategory: (...args) => actionsRef.current.updateCategory(...args),
    deleteCategory: (...args) => actionsRef.current.deleteCategory(...args),
    setBudgetForCategory: (...args) => actionsRef.current.setBudgetForCategory(...args),
    deleteBudget: (...args) => actionsRef.current.deleteBudget(...args),
    updateEmergencySettings: (...args) => actionsRef.current.updateEmergencySettings(...args),
    addEmergencyContribution: (...args) => actionsRef.current.addEmergencyContribution(...args),
    addInvestment: (...args) => actionsRef.current.addInvestment(...args),
    updateInvestment: (...args) => actionsRef.current.updateInvestment(...args),
    deleteInvestment: (...args) => actionsRef.current.deleteInvestment(...args),
    addDream: (...args) => actionsRef.current.addDream(...args),
    updateDream: (...args) => actionsRef.current.updateDream(...args),
    deleteDream: (...args) => actionsRef.current.deleteDream(...args),
    addDreamContribution: (...args) => actionsRef.current.addDreamContribution(...args),
    addRecurringPayment: (...args) => actionsRef.current.addRecurringPayment(...args),
    updateRecurringPayment: (...args) => actionsRef.current.updateRecurringPayment(...args),
    deleteRecurringPayment: (...args) => actionsRef.current.deleteRecurringPayment(...args),
    pauseRecurringPayment: (...args) => actionsRef.current.pauseRecurringPayment(...args),
    markRecurringPaymentPaid: (...args) => actionsRef.current.markRecurringPaymentPaid(...args),
    toggleNotRecurring: (...args) => actionsRef.current.toggleNotRecurring(...args),
    updateAISettings: (...args) => actionsRef.current.updateAISettings(...args),
    saveAIReport: (...args) => actionsRef.current.saveAIReport(...args),
    deleteAIReport: (...args) => actionsRef.current.deleteAIReport(...args),
    getAggregatesForAI: (...args) => actionsRef.current.getAggregatesForAI(...args),
    resetToDemoData: (...args) => actionsRef.current.resetToDemoData(...args),
    clearAllData: (...args) => actionsRef.current.clearAllData(...args),
    exportBackupJSON: (...args) => actionsRef.current.exportBackupJSON(...args),
    importBackupJSON: (...args) => actionsRef.current.importBackupJSON(...args),
  }), []);

  const dataValue = useMemo<FinanceDataContextType>(() => ({
    transactions,
    categories,
    budgets,
    emergencyFund,
    investments,
    dreams,
    contacts,
    settlements,
    recurringPayments,
    recurringPaymentLogs,
    aiSettings,
    aiReports,
    notRecurringTxIds,
    syncStatus,
    lastSyncedAt,
    syncError,
    isDriveConnected,
    driveUserEmail,
    totalBalance,
    totalNetWorth,
    netSharedBalance,
    peerBalanceSummary,
    currentMonthIncome,
    currentMonthExpense,
    currentMonthNet,
    currentMonthSavingsRate,
    totalInvestedAmount,
    totalInvestmentValue,
    totalInvestmentGainLoss,
    totalInvestmentGainLossPct,
    emergencyFundRunwayMonths,
    totalGoalsTarget,
    totalGoalsSaved,
    contactBalances,
    totalOwedToMe,
    totalIOwe,
    categorySpendingThisMonth,
    upcomingRecurringPayments,
    overdueRecurringPayments,
    totalMonthlyRecurringCommitment,
  }), [
    transactions,
    categories,
    budgets,
    emergencyFund,
    investments,
    dreams,
    contacts,
    settlements,
    recurringPayments,
    recurringPaymentLogs,
    aiSettings,
    aiReports,
    notRecurringTxIds,
    syncStatus,
    lastSyncedAt,
    syncError,
    isDriveConnected,
    driveUserEmail,
    totalBalance,
    totalNetWorth,
    netSharedBalance,
    peerBalanceSummary,
    currentMonthIncome,
    currentMonthExpense,
    currentMonthNet,
    currentMonthSavingsRate,
    totalInvestedAmount,
    totalInvestmentValue,
    totalInvestmentGainLoss,
    totalInvestmentGainLossPct,
    emergencyFundRunwayMonths,
    totalGoalsTarget,
    totalGoalsSaved,
    contactBalances,
    totalOwedToMe,
    totalIOwe,
    categorySpendingThisMonth,
    upcomingRecurringPayments,
    overdueRecurringPayments,
    totalMonthlyRecurringCommitment,
  ]);

  const contextValue = useMemo<FinanceContextType>(() => ({
    ...uiValue,
    ...actionsValue,
    ...dataValue,
  }), [uiValue, actionsValue, dataValue]);

  return (
    <FinanceUiContext.Provider value={uiValue}>
      <FinanceActionsContext.Provider value={actionsValue}>
        <FinanceDataContext.Provider value={dataValue}>
          <FinanceContext.Provider value={contextValue}>
            {children}
          </FinanceContext.Provider>
        </FinanceDataContext.Provider>
      </FinanceActionsContext.Provider>
    </FinanceUiContext.Provider>
  );
};

export const useFinance = () => {
 const context = useContext(FinanceContext);
 if (!context) {
 throw new Error('useFinance must be used within a FinanceProvider');
 }
 return context;
};
