import { describe, it, expect } from 'vitest';
import { normalizeSettlement } from '../recordValidation';
import { roundCurrency } from '../currency';

describe('People & Settlement Verification', () => {
  it('normalizes legacy settlements with missing or empty contactId as unassigned', () => {
    const legacyRaw = {
      id: 'set-legacy-1',
      contactId: '',
      amount: 450,
      date: '2026-10-15',
      note: 'Dinner split repayment',
    };

    const normalized = normalizeSettlement(legacyRaw);
    expect(normalized).not.toBeNull();
    expect(normalized?.id).toBe('set-legacy-1');
    expect(normalized?.contactId).toBe('unassigned');
    expect(normalized?.amount).toBe(450);
    expect(normalized?.date).toBe('2026-10-15');
  });

  it('safely normalizes settlements with ISO timestamp dates', () => {
    const isoDateRaw = {
      id: 'set-iso-1',
      contactId: 'contact-alex',
      amount: 1200.5,
      date: '2026-10-14T08:30:00.000Z',
      direction: 'they_owe_me',
    };

    const normalized = normalizeSettlement(isoDateRaw);
    expect(normalized).not.toBeNull();
    expect(normalized?.id).toBe('set-iso-1');
    expect(normalized?.contactId).toBe('contact-alex');
    expect(normalized?.amount).toBe(1200.5);
    expect(normalized?.date).toBe('2026-10-14');
    expect(normalized?.direction).toBe('they_owe_me');
  });

  it('rejects invalid or non-object settlements', () => {
    expect(normalizeSettlement(null)).toBeNull();
    expect(normalizeSettlement(undefined)).toBeNull();
    expect(normalizeSettlement('invalid')).toBeNull();
    expect(normalizeSettlement({ id: 'bad-amount', amount: -50 })).toBeNull();
  });

  it('preserves exact paise currency math across split and settlement netting', () => {
    const splitAmount1 = 333.34;
    const splitAmount2 = 333.33;
    const splitAmount3 = 333.33;
    const totalSplits = roundCurrency(splitAmount1 + splitAmount2 + splitAmount3);
    expect(totalSplits).toBe(1000.00);

    const settledAmount = 500.00;
    const remaining = roundCurrency(totalSplits - settledAmount);
    expect(remaining).toBe(500.00);
  });
});
