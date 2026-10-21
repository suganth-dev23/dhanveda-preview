import {
  BudgetCategoryItem,
  CashflowPoint,
  ComputedBudgetMetrics,
  RecurringPayment,
  RecurringPaymentLog,
  TimeframeWindow,
  Transaction,
} from '../types/finance';
import { getRelativeMonthsList, getTodayString, MONTHS_SHORT } from './date';

/**
 * Perceptual OKLCH-inspired status hex tokens for Prospect Theory cortisol de-escalation:
 * - Mint (#81C995): Healthy (<75% utilized)
 * - Warm Tangerine (#FA903E): Near ceiling (75% - 99% utilized)
 * - Controlled Coral (#D93025): Over budget (>=100% utilized)
 * - Signal Blue (#1A73E8): Base allocation reference in split-track overrun mode
 */
export const STATUS_COLORS = {
  MINT: '#81C995',
  TANGERINE: '#FA903E',
  CORAL: '#D93025',
  SIGNAL_BLUE: '#1A73E8',
} as const;

/**
 * Safely rounds any numeric input to an integer INR value, eliminating IEEE-754 float drift
 * (e.g., 0.1 + 0.2 = 0.30000000000000004) and guarding against NaN / Infinity.
 */
export function roundINR(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/**
 * Zero-safe ratio helper. Guards against denominator <= 0 or non-finite inputs.
 */
export function safeRatio(numerator: number, denominator: number): number {
  const safeNum = Number.isFinite(numerator) ? numerator : 0;
  const safeDenom = Number.isFinite(denominator) ? denominator : 0;
  if (safeDenom <= 0) {
    return safeNum > 0 ? 1 : 0;
  }
  return safeNum / safeDenom;
}

/**
 * Computes deterministic, zero-safe, integer-rounded budget utilization metrics
 * for GPU-composited scaleX progress bars and Split-Track Overrun visualization.
 * Resolves defects BC-01, BC-02, BC-03, and BC-05.
 */
export function computeBudgetMetrics(allocated: number, spent: number): ComputedBudgetMetrics {
  const safeAllocated = Math.max(0, roundINR(allocated));
  const safeSpent = Math.max(0, roundINR(spent));

  // Defect BC-03 Guard: Handle unallocated or zero-budget categories without NaN / Infinity
  if (safeAllocated === 0) {
    const isOver = safeSpent > 0;
    return {
      utilizationRatio: isOver ? 1 : 0,
      clampedRatio: isOver ? 1 : 0,
      displayPercent: isOver ? 100 : 0,
      remainingAmount: 0,
      overrunAmount: safeSpent,
      isOverBudget: isOver,
      isNearLimit: false,
      baseSplitRatio: 0,
      overrunSplitRatio: isOver ? 1 : 0,
      statusColor: isOver ? STATUS_COLORS.CORAL : STATUS_COLORS.MINT,
    };
  }

  const rawRatio = safeSpent / safeAllocated;
  const clampedRatio = Math.min(1, Math.max(0, rawRatio));
  const isOverBudget = safeSpent > safeAllocated;
  const isNearLimit = !isOverBudget && rawRatio >= 0.75;
  const overrunAmount = isOverBudget ? safeSpent - safeAllocated : 0;
  const remainingAmount = isOverBudget ? 0 : safeAllocated - safeSpent;

  // Defect BC-02 Split-Track Overrun Math:
  // When spent > allocated, the 100% container splits into base (allocated / spent)
  // and excess ((spent - allocated) / spent), guaranteeing base + overrun === 1.0.
  const baseSplitRatio = isOverBudget ? safeAllocated / safeSpent : clampedRatio;
  const overrunSplitRatio = isOverBudget ? overrunAmount / safeSpent : 0;

  let statusColor: string = STATUS_COLORS.MINT;
  if (isOverBudget) {
    statusColor = STATUS_COLORS.CORAL;
  } else if (rawRatio >= 0.75) {
    statusColor = STATUS_COLORS.TANGERINE;
  }

  return {
    utilizationRatio: rawRatio,
    clampedRatio,
    displayPercent: Math.round(rawRatio * 100),
    remainingAmount,
    overrunAmount,
    isOverBudget,
    isNearLimit,
    baseSplitRatio,
    overrunSplitRatio,
    statusColor,
  };
}

export interface AggregateBudgetSummary {
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
  totalOverrun: number;
  netVariance: number;
  aggregateMetrics: ComputedBudgetMetrics;
  overBudgetCount: number;
  nearLimitCount: number;
  healthyCount: number;
}

/**
 * Computes aggregate budget totals from raw integer amounts BEFORE deriving overall percentage,
 * preventing rounding reconciliation drift (BC-05 where summed row percentages = 99% or 101%).
 */
export function computeAggregateBudgetSummary(items: BudgetCategoryItem[]): AggregateBudgetSummary {
  let totalAllocated = 0;
  let totalSpent = 0;
  let overBudgetCount = 0;
  let nearLimitCount = 0;
  let healthyCount = 0;

  for (const item of items) {
    const alloc = Math.max(0, roundINR(item.allocated));
    const spent = Math.max(0, roundINR(item.spent));
    totalAllocated += alloc;
    totalSpent += spent;

    const rowMetrics = computeBudgetMetrics(alloc, spent);
    if (rowMetrics.isOverBudget) {
      overBudgetCount += 1;
    } else if (rowMetrics.isNearLimit) {
      nearLimitCount += 1;
    } else {
      healthyCount += 1;
    }
  }

  const aggregateMetrics = computeBudgetMetrics(totalAllocated, totalSpent);
  const netVariance = totalAllocated - totalSpent;

  return {
    totalAllocated,
    totalSpent,
    totalRemaining: Math.max(0, netVariance),
    totalOverrun: netVariance < 0 ? Math.abs(netVariance) : 0,
    netVariance,
    aggregateMetrics,
    overBudgetCount,
    nearLimitCount,
    healthyCount,
  };
}

const TIMEFRAME_MONTH_COUNT: Record<Exclude<TimeframeWindow, 'ALL'>, number> = {
  '3M': 3,
  '6M': 6,
  '1Y': 12,
};

/**
 * Pure time-series builder for Cashflow Trajectory Chart.
 * Produces deterministic YYYY-MM `id` keys, integer-rounded inflows/outflows/netCashflow,
 * running cumulative balance, and optional category cross-highlight series.
 */
export function buildCashflowSeries(
  transactions: Transaction[],
  timeframe: TimeframeWindow = '6M',
  selectedCategory: string | null = null
): CashflowPoint[] {
  const safeTxs = Array.isArray(transactions) ? transactions : [];
  let monthSlots: { key: string; label: string }[];

  if (timeframe === 'ALL') {
    const monthKeys = safeTxs
      .map(t => (typeof t.date === 'string' && t.date.length >= 7 ? t.date.slice(0, 7) : ''))
      .filter(k => /^\d{4}-\d{2}$/.test(k))
      .sort();

    if (monthKeys.length > 0) {
      const earliest = monthKeys[0];
      const [startY, startM] = earliest.split('-').map(Number);
      const now = new Date();
      const totalMonths = Math.min(
        36,
        Math.max(
          6,
          (now.getFullYear() - startY) * 12 + (now.getMonth() - (startM - 1)) + 1
        )
      );
      monthSlots = getRelativeMonthsList(totalMonths);
    } else {
      monthSlots = getRelativeMonthsList(12);
    }
  } else {
    monthSlots = getRelativeMonthsList(TIMEFRAME_MONTH_COUNT[timeframe]);
  }

  const bucketMap = new Map<
    string,
    { inflow: number; outflow: number; categoryOutflow: number }
  >();

  for (const slot of monthSlots) {
    bucketMap.set(slot.key, { inflow: 0, outflow: 0, categoryOutflow: 0 });
  }

  const normalizedCat = selectedCategory ? selectedCategory.trim().toLowerCase() : null;

  for (const tx of safeTxs) {
    if (!tx || typeof tx.date !== 'string' || tx.date.length < 7) continue;
    const monthKey = tx.date.slice(0, 7);
    const bucket = bucketMap.get(monthKey);
    if (!bucket) continue;

    const amt = roundINR(tx.amount);
    if (amt <= 0 || tx.kind === 'transfer') continue;

    if (tx.type === 'credit') {
      bucket.inflow += amt;
    } else if (tx.type === 'debit') {
      bucket.outflow += amt;
      if (normalizedCat && tx.category?.toLowerCase() === normalizedCat) {
        bucket.categoryOutflow += amt;
      }
    }
  }

  const result: CashflowPoint[] = [];
  let runningCumulative = 0;

  for (const slot of monthSlots) {
    const bucket = bucketMap.get(slot.key) || { inflow: 0, outflow: 0, categoryOutflow: 0 };
    const inflow = roundINR(bucket.inflow);
    const outflow = roundINR(bucket.outflow);
    const netCashflow = inflow - outflow;
    runningCumulative += netCashflow;

    let label = slot.label;
    if (/^\d{4}-\d{2}$/.test(slot.key)) {
      const [y, m] = slot.key.split('-').map(Number);
      label = `${MONTHS_SHORT[(m - 1) % 12]} '${String(y).slice(-2)}`;
    }

    result.push({
      id: slot.key,
      label,
      inflow,
      outflow,
      netCashflow,
      cumulative: runningCumulative,
      categoryOutflow: normalizedCat ? roundINR(bucket.categoryOutflow) : undefined,
    });
  }

  return result;
}

// ── 25-Year SIP & Multi-Asset Wealth Compounding Engine ──

export interface CompoundingScenarioInput {
  monthlySIP: number;
  initialLumpSum: number;
  annualStepUpPct: number;
  horizonYears: number;
}

export interface CompoundingYearPoint {
  year: number;
  label: string;
  totalInvested: number;
  bankSavings4: number;   // 4% p.a.
  fixedDeposit7: number;  // 7% p.a.
  gold9: number;          // 9% p.a.
  sensex12: number;       // 12% p.a.
  equitySIP15: number;    // 15% p.a.
}

function simulateAssetTrajectory(
  initialLumpSum: number,
  baseMonthlySIP: number,
  annualStepUpPct: number,
  annualRatePct: number,
  years: number
): number[] {
  const monthlyRate = annualRatePct / 100 / 12;
  const stepUpFactor = 1 + Math.max(0, annualStepUpPct) / 100;
  let balance = Math.max(0, initialLumpSum);
  let currentMonthlySIP = Math.max(0, baseMonthlySIP);

  const yearlyBalances: number[] = [roundINR(balance)];

  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      balance = (balance + currentMonthlySIP) * (1 + monthlyRate);
    }
    yearlyBalances.push(roundINR(balance));
    currentMonthlySIP = currentMonthlySIP * stepUpFactor;
  }

  return yearlyBalances;
}

/**
 * Computes deterministic multi-asset compounding trajectories across
 * Bank Savings (4%), Fixed Deposits (7%), Gold/SGB (9%), Sensex (12%), and Equity SIP (15%).
 */
export function computeWealthCompoundingTrajectory(
  input: CompoundingScenarioInput
): CompoundingYearPoint[] {
  const safeSIP = Math.max(0, roundINR(input.monthlySIP));
  const safeLumpSum = Math.max(0, roundINR(input.initialLumpSum));
  const safeStepUp = Math.min(50, Math.max(0, roundINR(input.annualStepUpPct)));
  const safeYears = Math.min(40, Math.max(1, roundINR(input.horizonYears)));

  const investedSeries = simulateAssetTrajectory(safeLumpSum, safeSIP, safeStepUp, 0, safeYears);
  const bank4Series = simulateAssetTrajectory(safeLumpSum, safeSIP, safeStepUp, 4, safeYears);
  const fd7Series = simulateAssetTrajectory(safeLumpSum, safeSIP, safeStepUp, 7, safeYears);
  const gold9Series = simulateAssetTrajectory(safeLumpSum, safeSIP, safeStepUp, 9, safeYears);
  const sensex12Series = simulateAssetTrajectory(safeLumpSum, safeSIP, safeStepUp, 12, safeYears);
  const equity15Series = simulateAssetTrajectory(safeLumpSum, safeSIP, safeStepUp, 15, safeYears);

  const points: CompoundingYearPoint[] = [];
  for (let y = 0; y <= safeYears; y++) {
    points.push({
      year: y,
      label: y === 0 ? 'Now' : `Yr ${y}`,
      totalInvested: investedSeries[y],
      bankSavings4: bank4Series[y],
      fixedDeposit7: fd7Series[y],
      gold9: gold9Series[y],
      sensex12: sensex12Series[y],
      equitySIP15: equity15Series[y],
    });
  }

  return points;
}

// ── Interactive Monthly Cashflow Calendar & Bill Heatmap Engine ──

export interface CalendarBillItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  isPaid: boolean;
  isOverdue: boolean;
}

export interface CalendarDayCell {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPastOrToday: boolean;
  inflow: number;
  outflow: number;
  net: number;
  transactions: Transaction[];
  dueBills: CalendarBillItem[];
  isNoSpendDay: boolean;
  intensityLevel: 0 | 1 | 2 | 3 | 4; // 0 = no spend, 1 = low, 2 = medium, 3 = high, 4 = spike
}

export interface MonthlyCalendarSummary {
  year: number;
  month: number; // 0-11
  monthLabel: string;
  cells: CalendarDayCell[];
  noSpendDaysCount: number;
  activeSpendDaysCount: number;
  scheduledBillsCount: number;
  unpaidBillsCount: number;
  peakOutflowDay: { dateStr: string; amount: number } | null;
  totalInflow: number;
  totalOutflow: number;
}

export function buildMonthlyCalendarMatrix(
  year: number,
  month: number,
  transactions: Transaction[],
  recurringPayments: RecurringPayment[] = [],
  recurringPaymentLogs: RecurringPaymentLog[] = []
): MonthlyCalendarSummary {
  const safeTxs = Array.isArray(transactions) ? transactions : [];
  const safeRecurring = Array.isArray(recurringPayments) ? recurringPayments : [];
  const safeLogs = Array.isArray(recurringPaymentLogs) ? recurringPaymentLogs : [];

  const todayStr = getTodayString();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthLabel = `${MONTHS_SHORT[month]} ${year}`;

  // Group transactions in this month by YYYY-MM-DD
  const txByDate = new Map<string, Transaction[]>();
  for (const tx of safeTxs) {
    if (!tx || typeof tx.date !== 'string' || !tx.date.startsWith(monthKey)) continue;
    const list = txByDate.get(tx.date) || [];
    list.push(tx);
    txByDate.set(tx.date, list);
  }

  // Map recurring bills due on specific days of this month
  const billsByDay = new Map<number, CalendarBillItem[]>();
  for (const rp of safeRecurring) {
    if (!rp.isActive) continue;
    if (rp.startDate && rp.startDate.slice(0, 7) > monthKey) continue;
    if (rp.endDate && rp.endDate.slice(0, 7) < monthKey) continue;

    let dueDay: number | null = null;
    if (rp.frequency === 'monthly' || rp.frequency === 'quarterly' || rp.frequency === 'yearly') {
      const targetDay = rp.dayOfMonth || Number(rp.startDate?.split('-')[2]) || 1;
      dueDay = Math.min(daysInMonth, Math.max(1, targetDay));
    } else if (rp.startDate) {
      const startDay = Number(rp.startDate.split('-')[2]) || 1;
      dueDay = Math.min(daysInMonth, Math.max(1, startDay));
    }

    if (dueDay !== null) {
      const dueDateStr = `${monthKey}-${String(dueDay).padStart(2, '0')}`;
      const isPaid = safeLogs.some(
        log =>
          log.recurringPaymentId === rp.id &&
          ((log.dueDate && log.dueDate.startsWith(monthKey)) ||
            (log.paidDate && log.paidDate.startsWith(monthKey))) &&
          Boolean(log.paidDate)
      );
      const isOverdue = !isPaid && dueDateStr < todayStr;
      const existing = billsByDay.get(dueDay) || [];
      existing.push({
        id: rp.id,
        name: rp.name,
        amount: roundINR(rp.amount),
        category: rp.category,
        isPaid,
        isOverdue,
      });
      billsByDay.set(dueDay, existing);
    }
  }

  // Compute daily outflows to calibrate intensity thresholds
  const dailyOutflows: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${monthKey}-${String(d).padStart(2, '0')}`;
    const dayTxs = txByDate.get(dStr) || [];
    const out = dayTxs
      .filter(t => t.type === 'debit' && t.kind !== 'transfer')
      .reduce((acc, t) => acc + roundINR(t.amount), 0);
    if (out > 0) dailyOutflows.push(out);
  }

  const avgDailyOutflow =
    dailyOutflows.length > 0
      ? dailyOutflows.reduce((a, b) => a + b, 0) / dailyOutflows.length
      : 1000;

  const cells: CalendarDayCell[] = [];

  // Leading padding cells from previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    cells.push({
      dateStr: dStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dStr === todayStr,
      isPastOrToday: dStr <= todayStr,
      inflow: 0,
      outflow: 0,
      net: 0,
      transactions: [],
      dueBills: [],
      isNoSpendDay: false,
      intensityLevel: 0,
    });
  }

  let noSpendDaysCount = 0;
  let activeSpendDaysCount = 0;
  let scheduledBillsCount = 0;
  let unpaidBillsCount = 0;
  let totalInflow = 0;
  let totalOutflow = 0;
  let peakOutflowDay: { dateStr: string; amount: number } | null = null;

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${monthKey}-${String(d).padStart(2, '0')}`;
    const dayTxs = txByDate.get(dStr) || [];
    const dueBills = billsByDay.get(d) || [];

    scheduledBillsCount += dueBills.length;
    unpaidBillsCount += dueBills.filter(b => !b.isPaid).length;

    let inflow = 0;
    let outflow = 0;
    for (const tx of dayTxs) {
      if (tx.kind === 'transfer') continue;
      const amt = roundINR(tx.amount);
      if (tx.type === 'credit') inflow += amt;
      else if (tx.type === 'debit') outflow += amt;
    }

    totalInflow += inflow;
    totalOutflow += outflow;

    if (outflow > 0) {
      activeSpendDaysCount += 1;
      if (!peakOutflowDay || outflow > peakOutflowDay.amount) {
        peakOutflowDay = { dateStr: dStr, amount: outflow };
      }
    }

    const isPastOrToday = dStr <= todayStr;
    const isNoSpendDay = isPastOrToday && outflow === 0;
    if (isNoSpendDay) {
      noSpendDaysCount += 1;
    }

    let intensityLevel: 0 | 1 | 2 | 3 | 4 = 0;
    if (outflow > 0) {
      const ratio = outflow / Math.max(1, avgDailyOutflow);
      if (ratio >= 2.2) intensityLevel = 4;
      else if (ratio >= 1.3) intensityLevel = 3;
      else if (ratio >= 0.6) intensityLevel = 2;
      else intensityLevel = 1;
    }

    cells.push({
      dateStr: dStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dStr === todayStr,
      isPastOrToday,
      inflow,
      outflow,
      net: inflow - outflow,
      transactions: dayTxs,
      dueBills,
      isNoSpendDay,
      intensityLevel,
    });
  }

  // Trailing padding cells to complete 7-column rows
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const toAdd = 7 - remainder;
    for (let i = 1; i <= toAdd; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isPastOrToday: dStr <= todayStr,
        inflow: 0,
        outflow: 0,
        net: 0,
        transactions: [],
        dueBills: [],
        isNoSpendDay: false,
        intensityLevel: 0,
      });
    }
  }

  return {
    year,
    month,
    monthLabel,
    cells,
    noSpendDaysCount,
    activeSpendDaysCount,
    scheduledBillsCount,
    unpaidBillsCount,
    peakOutflowDay,
    totalInflow,
    totalOutflow,
  };
}

// ── Smart Spending Spike & Anomaly Detector ──

export interface SpendingAnomaly {
  id: string;
  type: 'category_spike' | 'large_transaction' | 'unbudgeted_spend';
  title: string;
  description: string;
  category: string;
  amount: number;
  deltaPercent?: number;
  severity: 'warning' | 'alert';
}

export function detectSpendingAnomalies(
  transactions: Transaction[],
  budgets: { category: string; monthlyLimit: number }[]
): SpendingAnomaly[] {
  const safeTxs = Array.isArray(transactions) ? transactions : [];
  if (safeTxs.length === 0) return [];

  const recentMonths = getRelativeMonthsList(4); // [M-3, M-2, M-1, Current]
  const currentMonthKey = recentMonths[recentMonths.length - 1]?.key || '';
  const priorMonthKeys = new Set(recentMonths.slice(0, -1).map(m => m.key));

  const currentCatSpend = new Map<string, number>();
  const priorCatSpend = new Map<string, number>();
  const currentMonthDebits: Transaction[] = [];

  for (const tx of safeTxs) {
    if (!tx || tx.type !== 'debit' || typeof tx.date !== 'string' || tx.date.length < 7) continue;
    const mKey = tx.date.slice(0, 7);
    const cat = tx.category || 'Others';
    const amt = roundINR(tx.amount);
    if (amt <= 0) continue;

    if (mKey === currentMonthKey) {
      currentCatSpend.set(cat, (currentCatSpend.get(cat) || 0) + amt);
      currentMonthDebits.push(tx);
    } else if (priorMonthKeys.has(mKey)) {
      priorCatSpend.set(cat, (priorCatSpend.get(cat) || 0) + amt);
    }
  }

  const anomalies: SpendingAnomaly[] = [];
  const budgetLookup = new Map(
    (Array.isArray(budgets) ? budgets : []).map(b => [b.category.toLowerCase(), roundINR(b.monthlyLimit)])
  );

  // 1. Check Category Velocity Spikes vs 3-Month Historical Average
  for (const [cat, currentSpent] of currentCatSpend.entries()) {
    const priorTotal = priorCatSpend.get(cat) || 0;
    const priorMonthlyAvg = roundINR(priorTotal / 3);

    if (priorMonthlyAvg >= 500 && currentSpent > priorMonthlyAvg * 1.25) {
      const deltaPct = Math.round(((currentSpent - priorMonthlyAvg) / priorMonthlyAvg) * 100);
      anomalies.push({
        id: `spike-${cat.toLowerCase()}`,
        type: 'category_spike',
        title: `${cat} velocity up +${deltaPct}%`,
        description: `Spent ₹${currentSpent.toLocaleString('en-IN')} this month vs ₹${priorMonthlyAvg.toLocaleString('en-IN')} historical avg.`,
        category: cat,
        amount: currentSpent,
        deltaPercent: deltaPct,
        severity: deltaPct >= 60 ? 'alert' : 'warning',
      });
    } else if (
      !budgetLookup.has(cat.toLowerCase()) &&
      currentSpent >= 3000
    ) {
      // 2. Unbudgeted High Spend Category
      anomalies.push({
        id: `unbudgeted-${cat.toLowerCase()}`,
        type: 'unbudgeted_spend',
        title: `Unbudgeted spend in ${cat}`,
        description: `₹${currentSpent.toLocaleString('en-IN')} spent this month without a monthly cap.`,
        category: cat,
        amount: currentSpent,
        severity: 'warning',
      });
    }
  }

  // 3. Single Outlier Debit Detection
  if (currentMonthDebits.length >= 3) {
    const sortedByAmt = [...currentMonthDebits].sort((a, b) => b.amount - a.amount);
    const largest = sortedByAmt[0];
    const median = sortedByAmt[Math.floor(sortedByAmt.length / 2)]?.amount || 500;
    if (largest && largest.amount >= 2500 && largest.amount >= median * 3) {
      anomalies.push({
        id: `outlier-${largest.id}`,
        type: 'large_transaction',
        title: `High single debit: ${largest.description || largest.category}`,
        description: `Single ${largest.paymentMethod} debit of ₹${roundINR(largest.amount).toLocaleString('en-IN')} in ${largest.category}.`,
        category: largest.category,
        amount: roundINR(largest.amount),
        severity: 'warning',
      });
    }
  }

  return anomalies.slice(0, 4);
}


