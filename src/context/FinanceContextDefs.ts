import { createContext, useContext } from 'react';
import {
  Transaction,
  Category,
  Budget,
  EmergencyFund,
  Investment,
  DreamGoal,
  Contact,
  SettlementRecord,
  RecurringPayment,
  RecurringPaymentLog,
  AISettings,
  AIHealthReport,
  SyncStatus,
  ContactBalance,
  OwedDirection,
  PaymentMethod,
  SyncableStoreName,
} from '../types/finance';
import { FinancialAggregates } from '../services/aiService';

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
    createTransaction?: boolean,
    paymentMethod?: PaymentMethod,
    paidDate?: string
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

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
