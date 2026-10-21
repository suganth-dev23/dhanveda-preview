import { describe, it, expect } from 'vitest';
import {
  calculateCAGR,
  calculateXIRR,
  calculateInvestmentAnnualReturn,
  getInvestmentInceptionDate,
} from '../investmentCalculations';


describe('investmentCalculations', () => {
  describe('calculateCAGR', () => {
    it('calculates CAGR accurately over multi-year horizons', () => {
      // ₹10,000 doubled to ₹20,000 in 3 years -> ~25.99%
      const cagr = calculateCAGR(10000, 20000, 3);
      expect(cagr).not.toBeNull();
      expect(cagr!).toBeCloseTo(25.99, 1);
    });

    it('returns null for non-positive or invalid inputs', () => {
      expect(calculateCAGR(0, 1000, 1)).toBeNull();
      expect(calculateCAGR(1000, 0, 1)).toBeNull();
      expect(calculateCAGR(1000, 1000, 0)).toBeNull();
      expect(calculateCAGR(-100, 1000, 1)).toBeNull();
    });
  });

  describe('calculateXIRR', () => {
    it('calculates XIRR accurately for multiple staggered investments', () => {
      // Invested ₹10,000 on 2024-01-01, another ₹10,000 on 2025-01-01, valued at ₹25,000 on 2026-01-01
      const cashFlows = [
        { date: '2024-01-01', amount: -10000 },
        { date: '2025-01-01', amount: -10000 },
        { date: '2026-01-01', amount: 25000 },
      ];
      const xirr = calculateXIRR(cashFlows);
      expect(xirr).not.toBeNull();
      // Rate is approximately 16.3%
      expect(xirr!).toBeGreaterThan(15);
      expect(xirr!).toBeLessThan(18);
    });

    it('returns null when cashflows lack either inflows or outflows', () => {
      expect(calculateXIRR([{ date: '2024-01-01', amount: -10000 }])).toBeNull();
      expect(calculateXIRR([
        { date: '2024-01-01', amount: 10000 },
        { date: '2025-01-01', amount: 20000 },
      ])).toBeNull();
    });
  });

  describe('getInvestmentInceptionDate', () => {
    it('prefers startDate if set', () => {
      const inv = { startDate: '2024-05-15', createdAt: '2025-01-01T00:00:00.000Z' };
      expect(getInvestmentInceptionDate(inv)).toBe('2024-05-15');
    });

    it('extracts YYYY-MM-DD from ISO createdAt if startDate is absent', () => {
      const inv = { createdAt: '2025-03-20T10:30:00.000Z' };
      expect(getInvestmentInceptionDate(inv)).toBe('2025-03-20');
    });
  });
});

  describe('calculateInvestmentAnnualReturn', () => {
    it('returns CAGR for single holding with inception >= 90 days', () => {
      const inv = {
        startDate: '2024-01-01',
        investedAmount: 10000,
        currentValue: 15000,
      };
      const res = calculateInvestmentAnnualReturn(inv);
      expect(res).not.toBeNull();
      expect(res!.label).toBe('CAGR');
      expect(res!.rate).toBeGreaterThan(0);
    });
  });
