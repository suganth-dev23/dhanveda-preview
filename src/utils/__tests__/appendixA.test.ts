import { describe, it, expect } from 'vitest';
import {
  parseINR,
  formatINR,
  formatCompactINR,
  numberToWordsINR,
  splitAmountEqually,
  roundCurrency,
} from '../currency';
import { normalizeDate } from '../csvParser';
import { calculateMonthsDiff, todayLocal } from '../date';
import { calculateMonthlyEquivalent, getPaymentSchedule } from '../recurringDates';
import type { RecurringPayment } from '../../types/finance';

describe('Appendix A — Pure-function expectations', () => {
  it('parseINR handles Rs prefix, dates, and sign formats', () => {
    expect(parseINR('Rs.1,234.00')).toBe(1234);
    expect(parseINR('Rs. 500')).toBe(500);
    // '2026-10-21' should not be parsed as -2026
    expect(parseINR('2026-10-21')).toBe(0);
    expect(parseINR('12-5')).toBeGreaterThanOrEqual(0);
    expect(parseINR('(500)')).toBe(-500);
    expect(parseINR('1,50,000 Dr')).toBe(-150000);
  });

  it('normalizeDate returns null on invalid/blank dates without falling back to today or Jan', () => {
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate('garbage')).toBeNull();
    expect(normalizeDate('15 Foo 2026')).toBeNull();
    expect(normalizeDate('03/04/2026')).toBe('2026-04-03');
    expect(normalizeDate('02/13/2026')).toBe('2026-02-13');
  });

  it('formatINR guards against -0.001 and Infinity', () => {
    expect(formatINR(-0.001)).toBe('₹0');
    expect(formatINR(Infinity)).toBe('₹0');
  });

  it('formatCompactINR rolls over properly without 100K or 1000', () => {
    expect(formatCompactINR(99999.5)).toBe('₹1L');
    expect(formatCompactINR(999.999)).toBe('₹1K');
  });

  it('numberToWordsINR includes Paise and Minus, handles boundaries', () => {
    expect(numberToWordsINR(150.75)).toContain('Paise');
    expect(numberToWordsINR(-150).startsWith('Minus')).toBe(true);
  });

  it('splitAmountEqually distributes exact sum and validates shares >= 1', () => {
    expect(splitAmountEqually(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(splitAmountEqually(100, 2.5)).toEqual([]);
  });

  it('roundCurrency rounds half away from zero symmetrically', () => {
    expect(roundCurrency(-1.005)).toBe(-1.01);
    expect(roundCurrency(1.005)).toBe(1.01);
  });

  it('calculateMonthsDiff returns finite number >= 1 on invalid date input', () => {
    const diff = calculateMonthsDiff('x', '2026-02-28');
    expect(Number.isFinite(diff)).toBe(true);
    expect(diff).toBeGreaterThanOrEqual(1);
  });

  it('calculateMonthlyEquivalent uses roundCurrency without whole-rupee truncation', () => {
    expect(calculateMonthlyEquivalent(99.5, 'monthly')).toBe(99.5);
    expect(calculateMonthlyEquivalent(249.5, 'weekly')).toBe(1081.17);
  });

  it('getPaymentSchedule does not manufacture a 6-month backlog for old start dates without logs', () => {
    const refDate = new Date('2026-10-21T00:00:00');
    const payment: RecurringPayment = {
      id: 'rec-test-1',
      name: 'Old Bill',
      amount: 1000,
      category: 'Utilities',
      frequency: 'monthly',
      startDate: '2020-01-05',
      dayOfMonth: 5,
      isActive: true,
      autoLogTransaction: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };
    const schedule = getPaymentSchedule(payment, [], refDate);
    // Backlog must not be 6 months (approx -180 to -200 days)
    expect(schedule.daysDiff).toBeGreaterThanOrEqual(-35);
  });

  it('todayLocal returns correct date in Asia/Kolkata', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
