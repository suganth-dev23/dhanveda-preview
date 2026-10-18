import Papa from 'papaparse';
import { StagedTransaction, TransactionType, PaymentMethod } from '../types/finance';
import { AutoRule, getCustomAutoRules, suggestCategory, detectPaymentMethod } from './categoryMatcher';
import { parseINR } from './currency';
import { isValidAmount, isValidDate, roundMoney } from './validation';

/**
 * Normalize date strings into YYYY-MM-DD
 * Supports:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY, DD-MM-YY
 * - DD-MMM-YYYY, DD MMM YYYY, DD-MMM-YY, DD/MMM/YYYY (e.g. 15-Aug-2026, 15 Aug 2026, 15-AUG-26)
 * - MMM DD, YYYY or MMM DD YYYY (e.g. Jan 01 2026, Aug 15 2026 01:30 PM)
 * - YYYY-MM-DD, YYYY/MM/DD
 * - Timestamps e.g. 2026-01-01T10:00:00 or 01/01/2026 14:30:00
 */
export function normalizeDate(rawDate: string): string {
  if (!rawDate) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const clean = String(rawDate).trim();

  // Already YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = clean.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY or MM/DD/YYYY or 2-digit year
  const dmyMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, '0');
    let month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    // If first part is <= 12 and second part is > 12, this is MM/DD/YYYY format
    if (p1 <= 12 && p2 > 12) {
      month = dmyMatch[1].padStart(2, '0');
      day = dmyMatch[2].padStart(2, '0');
    }
    return `${year}-${month}-${day}`;
  }

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  // DD-MMM-YYYY or DD MMM YYYY or DD-MMM-YY (e.g. 15-Aug-2026 or 15 Aug 2026 or 15-AUG-26)
  const dMmmYMatch = clean.match(/^(\d{1,2})[-/\s.]([A-Za-z]{3,9})[-/\s.](\d{2,4})/);
  if (dMmmYMatch) {
    const day = dMmmYMatch[1].padStart(2, '0');
    const mStr = dMmmYMatch[2].toLowerCase().substring(0, 3);
    const month = monthMap[mStr] || '01';
    let year = dMmmYMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // MMM DD YYYY (e.g. Jan 01 2026 or Jan 01, 2026 01:30 PM)
  const mmmDYMatch = clean.match(/^([A-Za-z]{3,9})[-/\s.]+(\d{1,2})[,\s]+(\d{2,4})/);
  if (mmmDYMatch) {
    const mStr = mmmDYMatch[1].toLowerCase().substring(0, 3);
    const month = monthMap[mStr] || '01';
    const day = mmmDYMatch[2].padStart(2, '0');
    let year = mmmDYMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Fallback try Date.parse
  try {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
  } catch {
    // ignore
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export interface CSVParseResult {
  transactions: StagedTransaction[];
  totalRows: number;
  parsedRows: number;
  errors: string[];
}

/**
 * Intelligent multi-pass CSV statement parser with automatic header row detection
 */
export async function parseCSVStatement(file: File, customRules?: AutoRule[]): Promise<CSVParseResult> {
  const fileText = await file.text();
  const errors: string[] = [];
  const transactions: StagedTransaction[] = [];
  const rules = customRules ?? getCustomAutoRules();

  const cleanText = (fileText || '').replace(/^\uFEFF/, '').trim();

  if (!cleanText) {
    return {
      transactions: [],
      totalRows: 0,
      parsedRows: 0,
      errors: ['The selected CSV file is empty.'],
    };
  }

  // Parse raw 2D array without expecting row 0 to be the header
  const parseResult = Papa.parse<string[]>(cleanText, {
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  const rawRows = parseResult.data;
  if (!rawRows || rawRows.length === 0) {
    return {
      transactions: [],
      totalRows: 0,
      parsedRows: 0,
      errors: ['No tabular data could be read from this CSV file.'],
    };
  }

  // Header keyword patterns for Indian & global bank statements
  const datePatterns = [/date/i, /txn.*dt/i, /trans.*dt/i, /value.*dt/i, /posting.*dt/i, /tran.*dt/i, /^dt$/i, /time/i];
  const descPatterns = [/narration/i, /description/i, /particular/i, /remark/i, /detail/i, /merchant/i, /payee/i, /paid to/i, /transaction details/i, /note/i, /info/i, /name/i, /party/i];
  const debitPatterns = [/withdrawal/i, /debit/i, /\bdr\b/i, /paid out/i, /expense/i, /spent/i];
  const creditPatterns = [/deposit/i, /credit/i, /\bcr\b/i, /paid in/i, /income/i, /received/i];
  const amountPatterns = [/^amount/i, /txn.*amount/i, /trans.*amount/i, /net.*amount/i, /sum/i, /inr/i, /total/i];
  const typePatterns = [/^type$/i, /cr\/dr/i, /dr\/cr/i, /txn.*type/i, /d\/c/i, /c\/d/i];
  const refPatterns = [/ref/i, /chq/i, /cheque/i, /utr/i, /txn.*id/i, /rrn/i, /reference/i, /id/i];

  // 1. Locate the true header row in the first 35 rows
  let headerRowIndex = -1;
  let maxScore = 0;

  for (let r = 0; r < Math.min(rawRows.length, 35); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    let hasDate = false;
    let hasAmount = false;
    let hasDesc = false;

    row.forEach(cell => {
      const c = String(cell || '').trim();
      if (!c) return;

      if (datePatterns.some(p => p.test(c))) {
        score += 3;
        hasDate = true;
      }
      if (descPatterns.some(p => p.test(c))) {
        score += 2;
        hasDesc = true;
      }
      if (debitPatterns.some(p => p.test(c)) || creditPatterns.some(p => p.test(c)) || amountPatterns.some(p => p.test(c))) {
        score += 3;
        hasAmount = true;
      }
      if (typePatterns.some(p => p.test(c)) || refPatterns.some(p => p.test(c))) {
        score += 1;
      }
    });

    if (hasDate && (hasAmount || hasDesc)) {
      score += 4;
    }

    if (score > maxScore && score >= 4) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  // Column index finders
  let dateColIdx = -1;
  let descColIdx = -1;
  let debitColIdx = -1;
  let creditColIdx = -1;
  let amountColIdx = -1;
  let typeColIdx = -1;
  let refColIdx = -1;

  let startDataRow = 0;

  if (headerRowIndex !== -1) {
    const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
    startDataRow = headerRowIndex + 1;

    const findCol = (patterns: RegExp[]): number => {
      return headers.findIndex(h => patterns.some(p => p.test(h)));
    };

    dateColIdx = findCol(datePatterns);
    descColIdx = findCol(descPatterns);
    debitColIdx = findCol(debitPatterns);
    creditColIdx = findCol(creditPatterns);
    amountColIdx = findCol(amountPatterns);
    typeColIdx = findCol(typePatterns);
    refColIdx = findCol(refPatterns);
  } else {
    // Fallback: Pattern-based column discovery
    startDataRow = 0;
    const colCount = Math.max(...rawRows.slice(0, 15).map(r => r.length));
    const numericCols: number[] = [];

    // Test columns across rows to see which column has dates, numbers, strings
    for (let c = 0; c < colCount; c++) {
      let dateMatches = 0;
      let numberMatches = 0;
      let sampleCount = 0;

      for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
        const cell = String(rawRows[r]?.[c] || '').trim();
        if (!cell) continue;
        sampleCount++;

        if (/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}[-\s.][A-Za-z]{3,9}[-\s.]\d{2,4}|\d{4}-\d{2}-\d{2})/.test(cell)) {
          dateMatches++;
        }
        if (Math.abs(parseINR(cell)) > 0) {
          numberMatches++;
        }
      }

      if (sampleCount > 0) {
        if (dateMatches / sampleCount > 0.4 && dateColIdx === -1) {
          dateColIdx = c;
        } else if (numberMatches / sampleCount > 0.4) {
          numericCols.push(c);
        } else if (descColIdx === -1) {
          descColIdx = c;
        }
      }
    }

    if (numericCols.length >= 2) {
      debitColIdx = numericCols[0];
      creditColIdx = numericCols[1];
    } else if (numericCols.length === 1) {
      amountColIdx = numericCols[0];
    }
  }

  // Iterate over data rows
  for (let r = startDataRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Skip empty rows where all cells are blank
    if (row.every(cell => !cell || !String(cell).trim())) continue;

    try {
      const rawDate = dateColIdx !== -1 ? String(row[dateColIdx] || '').trim() : '';
      const rawDesc = descColIdx !== -1 ? String(row[descColIdx] || '').trim() : row.join(' ').trim();
      const rawRef = refColIdx !== -1 ? String(row[refColIdx] || '').trim() : '';

      // Skip lines with no date or text (summary/footer rows)
      if (!rawDate && !rawDesc) continue;

      let type: TransactionType = 'debit';
      let amount = 0;

      const rawDebitStr = debitColIdx !== -1 ? String(row[debitColIdx] || '').trim() : '';
      const rawCreditStr = creditColIdx !== -1 ? String(row[creditColIdx] || '').trim() : '';

      const debitVal = rawDebitStr ? parseINR(rawDebitStr) : 0;
      const creditVal = rawCreditStr ? parseINR(rawCreditStr) : 0;

      const absDebit = Math.abs(debitVal);
      const absCredit = Math.abs(creditVal);

      if (debitColIdx !== -1 && creditColIdx !== -1) {
        if (absCredit > 0 && absDebit === 0) {
          type = 'credit';
          amount = absCredit;
        } else if (absDebit > 0 && absCredit === 0) {
          type = 'debit';
          amount = absDebit;
        } else if (absCredit > 0 && absDebit > 0) {
          if (absCredit >= absDebit) {
            type = 'credit';
            amount = absCredit;
          } else {
            type = 'debit';
            amount = absDebit;
          }
        }
      } else if (amountColIdx !== -1) {
        const rawAmtCell = String(row[amountColIdx] || '').trim();
        const parsedAmt = parseINR(rawAmtCell);
        amount = Math.abs(parsedAmt);

        if (parsedAmt < 0) {
          type = 'debit';
        } else if (/\b(cr|credit)\b/i.test(rawAmtCell)) {
          type = 'credit';
        } else if (/\b(dr|debit)\b/i.test(rawAmtCell)) {
          type = 'debit';
        } else if (typeColIdx !== -1) {
          const tStr = String(row[typeColIdx] || '').toLowerCase().trim();
          if (tStr.includes('cr') || tStr.includes('credit') || tStr.includes('deposit') || tStr.includes('income')) {
            type = 'credit';
          } else {
            type = 'debit';
          }
        } else {
          // Check for CR / DR hints in description or line
          const fullLine = row.join(' ').toLowerCase();
          if (/\b(refund|salary|cashback|interest|dividend)\b/.test(fullLine)) {
            type = 'credit';
          } else if (/\b(cr|credit)\b/.test(fullLine) && !/\b(credit\s*card|cc\s*payment|cc\s*bill)\b/.test(fullLine)) {
            type = 'credit';
          } else {
            type = 'debit';
          }
        }
      } else {
        // Fallback: search all cells in the row for numeric amounts
        for (let c = 0; c < row.length; c++) {
          if (c === dateColIdx || c === descColIdx) continue;
          const val = parseINR(row[c] || '');
          if (Math.abs(val) > 0) {
            amount = Math.abs(val);
            type = val < 0 ? 'debit' : 'credit';
            break;
          }
        }
      }

      // Skip non-transaction rows (e.g. headers repeated, zero amounts)
      if (amount <= 0) continue;

      if (!isValidAmount(amount)) {
        errors.push(`Row ${r + 1}: Skipped row with out-of-bounds amount ₹${amount}`);
        continue;
      }

      // Validate date loosely
      const normalizedDate = normalizeDate(rawDate);
      if (!normalizedDate || normalizedDate === 'NaN-NaN-NaN' || !isValidDate(normalizedDate)) {
        errors.push(`Row ${r + 1}: Skipped row with invalid date "${rawDate}"`);
        continue;
      }

      const cleanDescription = (rawDesc || 'Bank Transaction')
        .replace(/\s+/g, ' ')
        .trim();

      const categoryMatch = suggestCategory(cleanDescription, rules);
      const paymentMethod: PaymentMethod = detectPaymentMethod(cleanDescription + ' ' + (rawRef || ''));

      // If category matcher is highly confident about salary/income and type isn't explicitly debit
      const finalType = (categoryMatch.suggestedType === 'credit' && debitColIdx === -1 && creditColIdx === -1)
        ? 'credit'
        : type;

      transactions.push({
        tempId: `staged-csv-${Date.now()}-${r}`,
        date: normalizedDate,
        amount: roundMoney(amount),
        type: finalType,
        category: categoryMatch.category,
        paymentMethod,
        description: cleanDescription,
        source: 'imported',
        referenceId: rawRef ? rawRef.trim() : undefined,
        selected: true,
        originalRawRow: row,
      });
    } catch (err: any) {
      errors.push(`Row ${r + 1}: ${err?.message || 'Failed to parse row'}`);
    }
  }

  return {
    transactions,
    totalRows: rawRows.length,
    parsedRows: transactions.length,
    errors,
  };
}
