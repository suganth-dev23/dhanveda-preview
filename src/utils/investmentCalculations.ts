/**
 * Investment Calculations & CAGR Utility
 * Pure mathematical functions for investment returns and compounding.
 */

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
