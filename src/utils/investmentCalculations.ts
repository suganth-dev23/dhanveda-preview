/**
 * Investment Calculations, CAGR, and XIRR Utility
 * Pure mathematical functions for investment returns and compounding.
 */

import { todayLocal } from './date';

/**
 * Calculates Compound Annual Growth Rate (CAGR) as a percentage.
 * Returns null if inputs are non-positive or invalid.
 */
export function calculateCAGR(investedAmount: number, currentValue: number, years: number): number | null {
  if (!Number.isFinite(investedAmount) || !Number.isFinite(currentValue) || !Number.isFinite(years)) return null;
  if (investedAmount <= 0 || currentValue <= 0 || years <= 0) return null;
  try {
    const cagr = Math.pow(currentValue / investedAmount, 1 / years) - 1;
    return Number.isFinite(cagr) ? cagr * 100 : null;
  } catch {
    return null;
  }
}

/**
 * Calculates days held from investment inception.
 * Checks startDate, createdAt, first investment log date, or falls back to lastUpdated.
 */
export function getInvestmentInceptionDate(inv: {
  startDate?: string;
  createdAt?: string;
  logs?: Array<{ date: string }>;
  lastUpdated?: string;
}): string | null {
  if (inv.startDate && inv.startDate.trim()) return inv.startDate;
  if (inv.createdAt && inv.createdAt.trim()) {
    // If createdAt is an ISO timestamp (e.g. 2026-01-01T00:00:00.000Z), extract YYYY-MM-DD
    return inv.createdAt.includes('T') ? inv.createdAt.split('T')[0] : inv.createdAt;
  }
  if (inv.logs && inv.logs.length > 0 && inv.logs[0]?.date) {
    return inv.logs[0].date;
  }
  return inv.lastUpdated || null;
}

export interface CashFlow {
  date: string;
  amount: number; // Negative for investments (outflows), positive for redemption/current value (inflows)
}

/**
 * Calculates Extended Internal Rate of Return (XIRR) as an annualized percentage.
 * Uses Newton-Raphson method with bounds check and bisection fallback.
 */
export function calculateXIRR(cashFlows: CashFlow[]): number | null {
  if (!cashFlows || cashFlows.length < 2) return null;

  // Filter valid entries
  const valid = cashFlows.filter(cf => Number.isFinite(cf.amount) && cf.amount !== 0 && cf.date);
  if (valid.length < 2) return null;

  const hasInflow = valid.some(cf => cf.amount > 0);
  const hasOutflow = valid.some(cf => cf.amount < 0);
  if (!hasInflow || !hasOutflow) return null;

  // Sort cashflows chronologically
  const sorted = [...valid].sort((a, b) => a.date.localeCompare(b.date));
  const t0 = new Date(sorted[0].date).getTime();
  if (isNaN(t0)) return null;

  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const flows = sorted.map(cf => ({
    amount: cf.amount,
    years: (new Date(cf.date).getTime() - t0) / msPerYear,
  }));

  // Total timespan must be at least 30 days (~0.08 years)
  const maxYears = flows[flows.length - 1].years;
  if (maxYears < 0.08) return null;

  const npv = (r: number) => {
    let sum = 0;
    for (const f of flows) {
      const denom = Math.pow(1 + r, f.years);
      if (denom === 0 || !Number.isFinite(denom)) return NaN;
      sum += f.amount / denom;
    }
    return sum;
  };

  const dNpv = (r: number) => {
    let sum = 0;
    for (const f of flows) {
      const denom = Math.pow(1 + r, f.years + 1);
      if (denom === 0 || !Number.isFinite(denom)) return NaN;
      sum += (-f.years * f.amount) / denom;
    }
    return sum;
  };

  // Initial guess
  let r = 0.1;
  const maxIter = 100;
  const tol = 1e-6;

  for (let i = 0; i < maxIter; i++) {
    const val = npv(r);
    if (Math.abs(val) < tol) {
      return r * 100;
    }
    const deriv = dNpv(r);
    if (!Number.isFinite(deriv) || Math.abs(deriv) < 1e-10) {
      break;
    }
    const nextR = r - val / deriv;
    // Bound the search
    if (nextR <= -0.999 || nextR > 50 || isNaN(nextR)) {
      break;
    }
    if (Math.abs(nextR - r) < tol) {
      return nextR * 100;
    }
    r = nextR;
  }

  // Fallback to bisection between -0.9 and 10.0
  let low = -0.9;
  let high = 10.0;
  let valLow = npv(low);
  let valHigh = npv(high);

  if (Number.isFinite(valLow) && Number.isFinite(valHigh) && valLow * valHigh < 0) {
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const valMid = npv(mid);
      if (Math.abs(valMid) < tol) return mid * 100;
      if (valLow * valMid < 0) {
        high = mid;
        valHigh = valMid;
      } else {
        low = mid;
        valLow = valMid;
      }
    }
    return ((low + high) / 2) * 100;
  }

  return null;
}

/**
 * Calculates annual return metric (XIRR if multiple logs/cashflows exist, CAGR otherwise).
 */
export function calculateInvestmentAnnualReturn(inv: {
  startDate?: string;
  createdAt?: string;
  investedAmount: number;
  currentValue: number;
  logs?: Array<{ date: string; investedDelta?: number; valueDelta?: number }>;
  lastUpdated?: string;
}): { rate: number; label: 'XIRR' | 'CAGR' } | null {
  const safeInv = Number.isFinite(inv.investedAmount) ? inv.investedAmount : 0;
  const safeVal = Number.isFinite(inv.currentValue) ? inv.currentValue : 0;
  if (safeInv <= 0 || safeVal <= 0) return null;

  const today = todayLocal();

  // If there are multiple investment logs with positive investedDelta, try XIRR
  const investmentLogs = (inv.logs || []).filter(l => (l.investedDelta || 0) > 0 && l.date);
  if (investmentLogs.length > 1) {
    const cashFlows: CashFlow[] = investmentLogs.map(l => ({
      date: l.date,
      amount: -(l.investedDelta || 0),
    }));
    // Add current valuation today
    cashFlows.push({
      date: today,
      amount: safeVal,
    });

    const xirr = calculateXIRR(cashFlows);
    if (xirr !== null && Number.isFinite(xirr)) {
      return { rate: xirr, label: 'XIRR' };
    }
  }

  // Otherwise, fallback to CAGR based on inception date
  const inception = getInvestmentInceptionDate(inv);
  if (inception) {
    const d0 = new Date(inception).getTime();
    const d1 = new Date(today).getTime();
    const daysHeld = (d1 - d0) / (24 * 60 * 60 * 1000);
    if (daysHeld >= 90) {
      const cagr = calculateCAGR(safeInv, safeVal, daysHeld / 365.25);
      if (cagr !== null && Number.isFinite(cagr)) {
        return { rate: cagr, label: 'CAGR' };
      }
    }
  }

  return null;
}
