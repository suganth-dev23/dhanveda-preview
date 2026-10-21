import { describe, it, expect } from 'vitest';
import { parseCSVStatement } from '../csvParser';

describe('Appendix B — CSV fixture expectations', () => {
  const csvContent = `Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
01/10/26,UPI-SWIGGY-123,0000123,01/10/26,450.00,,10000.00
,Opening Balance carry,,,,200.00,
02/10/26,"SALARY, OCT",REF9,02/10/26,,50000.00,60000.00
03/10/26,UPI-Zomato Order,REF10,03/10/26,Rs.300.00,,59700.00`;

  it('imports 3 valid transactions and flags 1 error for blank date row', async () => {
    const result = await parseCSVStatement(csvContent);
    // Expected: 3 transactions, 1 error for the blank-date row
    expect(result.transactions.length).toBe(3);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);

    const tx1 = result.transactions.find(t => t.description.includes('SWIGGY'));
    expect(tx1).toBeDefined();
    expect(tx1?.amount).toBe(450);
    expect(tx1?.date).toBe('2026-10-01');
    expect(tx1?.type).toBe('debit');

    const tx2 = result.transactions.find(t => t.description.includes('SALARY'));
    expect(tx2).toBeDefined();
    expect(tx2?.amount).toBe(50000);
    expect(tx2?.date).toBe('2026-10-02');
    expect(tx2?.type).toBe('credit');

    const tx3 = result.transactions.find(t => t.description.includes('Zomato'));
    expect(tx3).toBeDefined();
    expect(tx3?.amount).toBe(300); // Must be 300, not 0.30!
    expect(tx3?.date).toBe('2026-10-03');
    expect(tx3?.type).toBe('debit');

    // Blank date row must NOT be imported as a transaction dated today
    const blankTx = result.transactions.find(t => t.description.includes('Opening Balance'));
    expect(blankTx).toBeUndefined();
  });
});
