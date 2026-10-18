export type TransactionType = 'credit' | 'debit';

export type PaymentMethod = 
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Net Banking'
  | 'Bank Transfer'
  | 'Cash'
  | 'Cheque'
  | 'Wallet'
  | 'Other';

export type TransactionSource = 'manual' | 'imported';

// Direction from the app owner's point of view:
// 'they_owe_me'  → the contact owes the user money (user is owed)
// 'i_owe_them'   → the user owes the contact money
export type OwedDirection = 'they_owe_me' | 'i_owe_them';

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface SettlementRecord {
  id: string;
  contactId: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  // Set only when this settlement was auto-created by the one-tap "mark as settled"
  // tick on a transaction row, so the action can be cleanly undone.
  sourceTransactionId?: string;
  sourceSplitEntryId?: string; // Identifies which SplitEntry within that transaction
  // A transaction (imported or manual) that represents this repayment in the cash ledger
  linkedTransactionId?: string;
  // Direction of this settlement from app owner's perspective:
  // 'they_owe_me' = contact paid user back; 'i_owe_them' = user paid contact back
  direction?: OwedDirection;
  // Tracks all splits reconciled by this settlement (multi-split support)
  reconciledSplits?: Array<{
    transactionId: string;
    splitEntryId: string;
    amount: number;
  }>;
}

export interface ContactBalance {
  contactId: string;
  netAmount: number; // positive = they owe the user; negative = user owes them
  lastUpdated: string;
}

export interface SplitEntry {
  id: string;               // unique per split line
  contactId?: string;       // omitted for an "unnamed" row
  label?: string;           // fallback display name when contactId is absent, e.g. "Person 2"
  amount: number;           // this person's owed portion
  direction: OwedDirection; // 'they_owe_me' | 'i_owe_them'
  settled: boolean;
  settledAmount?: number;   // amount settled so far (if partial, remainder stays open)
  linkedTransactionId?: string; // direct reference to the bank transaction repayment
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  description: string;
  person?: string; // free-text: who this transaction was with, e.g. "Amit", "Landlord"
  source: TransactionSource;
  tags?: string[];
  referenceId?: string; // UPI ref / Bank transaction ref
  createdAt: string;
  updatedAt?: string;
  splitWith?: SplitEntry[]; // array of split entries, 0 or more
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'yearly';

export interface RecurringPayment {
  id: string;
  name: string;               // e.g. "Netflix", "Rent", "Car EMI"
  amount: number;
  category: string;           // category name matching Category.name
  frequency: RecurrenceFrequency;
  dayOfMonth?: number;        // 1–31, relevant for monthly, quarterly, yearly
  startDate: string;          // YYYY-MM-DD
  endDate?: string;           // optional YYYY-MM-DD for fixed-term commitments
  isActive: boolean;          // paused/cancelled subscriptions remain in history
  paymentMethod?: PaymentMethod;
  notes?: string;
  autoLogTransaction: boolean; // whether "Mark as Paid" offers to create a real Transaction
  createdAt: string;          // ISO string
  updatedAt: string;          // ISO string for sync LWW
}

export interface RecurringPaymentLog {
  id: string;
  recurringPaymentId: string;
  dueDate: string;            // YYYY-MM-DD
  paidDate?: string;          // YYYY-MM-DD when paid, undefined if pending/overdue
  amount: number;             // actual amount paid
  linkedTransactionId?: string; // ID of created/matched Transaction
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Hex or Tailwind color
  type: 'expense' | 'income' | 'both';
  isCustom?: boolean;
  budgetMonthly?: number;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  updatedAt?: string;
}

export interface EmergencyContribution {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmergencyFund {
  targetMonths: number; // e.g. 6 months
  monthlyExpenseBaseline?: number; // Auto computed or user defined
  manualTargetAmount?: number;
  currentSaved: number;
  contributions: EmergencyContribution[];
  updatedAt?: string;
}

export type InvestmentType = 
  | 'Mutual Funds'
  | 'Stocks'
  | 'Fixed Deposit (FD)'
  | 'Recurring Deposit (RD)'
  | 'Gold / SGB'
  | 'Crypto'
  | 'PPF / EPF'
  | 'NPS'
  | 'Real Estate'
  | 'Bonds / Debt'
  | 'Other';

export interface InvestmentLog {
  id: string;
  date: string;
  investedDelta: number;
  valueDelta?: number;
  note?: string;
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  investedAmount: number;
  currentValue: number;
  sipAmount?: number; // Monthly SIP if applicable
  sipDay?: number; // 1 to 28
  platform?: string; // e.g. Zerodha, Groww, INDmoney, Kuvera, SBI
  notes?: string;
  startDate?: string; // YYYY-MM-DD holding inception date
  createdAt?: string; // ISO creation timestamp
  lastUpdated: string;
  updatedAt?: string;
  logs?: InvestmentLog[];
}

export interface DreamContribution {
  id: string;
  date: string;
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DreamGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  targetDate?: string; // YYYY-MM-DD
  category: string; // e.g. Travel, Gadget, Vehicle, Home, Education
  icon: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
  contributions: DreamContribution[];
  createdAt: string;
  updatedAt?: string;
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  customPromptPrefix?: string;
  updatedAt?: string;
}

export interface AIHealthReport {
  id: string;
  createdAt: string;
  updatedAt?: string;
  provider: AIProvider;
  model: string;
  summaryText: string;
  healthScore?: number; // e.g. 85 / 100
  financialSnapshot: {
    monthlyIncome: number;
    monthlyExpense: number;
    savingsRate: number;
    topExpenseCategory: string;
    emergencyFundMonths: number;
    totalInvestments: number;
    activeGoalsCount: number;
  };
}

export interface StagedTransaction extends Omit<Transaction, 'id' | 'createdAt'> {
  tempId: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  selected: boolean;
  originalRawRow?: any;
}

// --- Sync & Tombstone Data Structures ---

export type SyncableStoreName =
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'investments'
  | 'dreams'
  | 'contacts'
  | 'settlements'
  | 'aiReports'
  | 'recurringPayments'
  | 'recurringPaymentLogs';

export interface TombstoneRecord {
  id: string;
  store: SyncableStoreName;
  deletedAt: string; // ISO 8601
}

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'offline'
  | 'unconfigured'
  | 'disconnected';

export interface SyncMetadata {
  status: SyncStatus;
  lastSyncedAt?: string;
  errorMessage?: string;
  userEmail?: string;
  deviceId: string;
}

export interface SyncPayload {
  version: number;
  deviceId: string;
  lastModified: string; // ISO 8601
  stores: {
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    emergencyFund: EmergencyFund & { id: string };
    investments: Investment[];
    dreams: DreamGoal[];
    aiSettings: Omit<AISettings, 'apiKey'> & { id: string }; // Excludes apiKey for security
    aiReports: AIHealthReport[];
    userPreferences: {
      id: string;
      darkMode: boolean;
      notRecurringTxIds: string[];
      updatedAt?: string;
    };
    contacts: Contact[];
    settlements: SettlementRecord[];
    recurringPayments?: RecurringPayment[];
    recurringPaymentLogs?: RecurringPaymentLog[];
  };
  tombstones: TombstoneRecord[];
}

// ── Gamification System Types (Phase 4) ──

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type BadgeCategory = 'budgeting' | 'saving' | 'investing' | 'consistency' | 'milestone';

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: string; // Lucide icon name
  xp: number;
  unlockedAt?: string; // ISO 8601 string if unlocked
  progress?: number; // 0 - 100 percentage
  targetCount?: number;
  currentCount?: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export interface FinancialHealthScore {
  overallScore: number; // 0 - 100
  savingsScore: number; // 0 - 25
  budgetScore: number; // 0 - 25
  emergencyScore: number; // 0 - 20
  debtScore: number; // 0 - 15
  consistencyScore: number; // 0 - 15
  grade: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  trend: 'up' | 'down' | 'neutral';
}

export interface GamificationState {
  streak: StreakData;
  unlockedBadgeIds: string[];
  unlockedBadgeDates: Record<string, string>; // badgeId -> ISO string
  totalXP: number;
  level: number;
}

// ── Behavioral Motion & Analytical Visualization Types ──

export type ChartViewMode = 'bar' | 'line' | 'combined';
export type TimeframeWindow = '3M' | '6M' | '1Y' | 'ALL';
export type BudgetFilterMode = 'all' | 'over' | 'warning' | 'healthy';
export type BudgetSortOrder = 'utilization' | 'spent' | 'allocated' | 'name';

export interface CashflowPoint {
  id: string;          // Canonical YYYY-MM key (e.g., "2026-10") for deterministic point matching
  label: string;       // Display label (e.g., "Oct '26")
  inflow: number;      // Integer INR >= 0
  outflow: number;     // Integer INR >= 0
  netCashflow: number; // Integer INR (inflow - outflow, can be negative)
  cumulative: number;  // Running trajectory balance in INR
  categoryOutflow?: number; // Optional cross-highlighted category outflow in INR
}

export interface BudgetCategoryItem {
  id: string;          // Stable ID or slug (e.g., budget.id or "cat-housing")
  name: string;
  allocated: number;   // Integer INR >= 0
  spent: number;       // Integer INR >= 0
  icon?: string;
  color?: string;
}

export interface ComputedBudgetMetrics {
  utilizationRatio: number;  // Raw ratio (safe from division by zero)
  clampedRatio: number;      // Strictly clamped to [0, 1] for GPU scaleX
  displayPercent: number;    // Integer percentage for UI badge
  remainingAmount: number;   // Integer INR >= 0
  overrunAmount: number;     // Integer INR > 0 when spent > allocated, else 0
  isOverBudget: boolean;
  isNearLimit: boolean;
  baseSplitRatio: number;    // Proportion of bar representing original budget (0 to 1)
  overrunSplitRatio: number; // Proportion of bar representing overrun excess (0 to 1)
  statusColor: string;       // Perceptual hex token (#81C995 | #FA903E | #D93025)
}


