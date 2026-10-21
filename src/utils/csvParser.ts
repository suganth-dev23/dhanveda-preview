import Papa from 'papaparse';
import { StagedTransaction, TransactionType, PaymentMethod } from '../types/finance';
import { AutoRule, getCustomAutoRules, suggestCategory, detectPaymentMethod } from './categoryMatcher';
import { parseINR } from './currency';
import { isValidAmount, isValidDate, roundMoney } from './validation';

/**
 * Normalize date strings into YYYY-MM-DD or return null if blank/unparseable.
 * Supports:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY, DD-MM-YY
 * - DD-MMM-YYYY, DD MMM YYYY, DD-MMM-YY, DD/MMM/YYYY (e.g. 15-Aug-2026, 15 Aug 2026, 15-AUG-26)
 * - MMM DD, YYYY or MMM DD YYYY (e.g. Jan 01 2026, Aug 15 2026 01:30 PM)
 * - YYYY-MM-DD, YYYY/MM/DD
 * - Timestamps e.g. 2026-01-01T10:00:00 or 01/01/2026 14:30:00
 */
export function normalizeDate(rawDate: string): string | null {
  if (!rawDate || !rawDate.trim()) {
    return null;
  }

  const clean = String(rawDate).trim();

  // Already YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = clean.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymdMatch) {
    const _y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
    }
    return null;
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
    const mNum = parseInt(month, 10);
    const dNum = parseInt(day, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
    return null;
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
    const month = monthMap[mStr];
    if (!month) return null; // Reject unknown months like "Foo"
    let year = dMmmYMatch[3];
    if (year.length === 2) year = `20${year}`;
    const dNum = parseInt(day, 10);
    if (dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  // MMM DD YYYY (e.g. Jan 01 2026 or Jan 01, 2026 01:30 PM)
  const mmmDYMatch = clean.match(/^([A-Za-z]{3,9})[-/\s.]+(\d{1,2})[,\s]+(\d{2,4})/);
  if (mmmDYMatch) {
    const mStr = mmmDYMatch[1].toLowerCase().substring(0, 3);
    const month = monthMap[mStr];
    if (!month) return null;
    const day = mmmDYMatch[2].padStart(2, '0');
    let year = mmmDYMatch[3];
    if (year.length === 2) year = `20${year}`;
    const dNum = parseInt(day, 10);
    if (dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  // Fallback try Date.parse - only if it produces valid date and is not obviously garbage
  try {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime()) && !/^[A-Za-z\s]+$/.test(clean)) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {
    // ignore
  }

  return null;
}

export interface CSVParseResult {
  transactions: StagedTransaction[];
  totalRows: number;
  parsedRows: number;
  errors: string[];
}

/**
 * Intelligent multi-pass CSV statement parser with automatic header row detection.
 * Accepts either a File object or raw CSV string content.
 */
export async function parseCSVStatement(
  fileOrText: File | string,
  customRules?: AutoRule[]
): Promise<CSVParseResult> {
  const fileText = typeof fileOrText === 'string' ? fileOrText : await fileOrText.text();
  const errors: string[] = [];
  const transactions: StagedTransaction[] = [];
  const rules = customRules ?? getCustomAutoRules();

  const cleanText = (fileText || '').replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { transactions: [], totalRows: 0, parsedRows: 0, errors: ['File is empty.'] };
  }

  const parsedCSV = Papa.parse(cleanText, {
    skipEmptyLines: 'greedy',
    header: false,
    dynamicTyping: false,
  });

  const rawRows = (parsedCSV.data as string[][]).filter(
    row => Array.isArray(row) && row.some(cell => String(cell).trim().length > 0)
  );

  if (rawRows.length === 0) {
    return { transactions: [], totalRows: 0, parsedRows: 0, errors: ['No valid rows found in file.'] };
  }

  // Multi-pass Header Row Detection: Find the row that best matches known banking column labels
  const datePatterns = /\b(date|txn date|value date|tran date|trans date|posting date|transaction date)\b/i;
  const descPatterns = /\b(narration|description|particulars|details|remark|remarks|payee|memo|transaction details)\b/i;
  const withdrawalPatterns = /\b(debit|withdrawal|dr|paid out|expense|dr amt|debit amount|withdrawn|spent)\b/i;
  const depositPatterns = /\b(credit|deposit|cr|paid in|income|cr amt|credit amount|received)\b/i;
  const amountPatterns = /\b(amount|txn amount|transaction amount|net amount|inr)\b/i;
  const refPatterns = /\b(ref|chq|cheque|utr|reference|txn id|ref no|transaction id)\b/i;

  let headerRowIndex = -1;
  let dateColIdx = -1;
  let descColIdx = -1;
  let debitColIdx = -1;
  let creditColIdx = -1;
  let amountColIdx = -1;
  let refColIdx = -1;

  for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
    const row = rawRows[r];
    let dIdx = -1;
    let descIdx = -1;
    let drIdx = -1;
    let crIdx = -1;
    let amtIdx = -1;
    let rIdx = -1;

    for (let c = 0; c < row.length; c++) {
      const header = String(row[c] || '').trim();
      if (!header) continue;

      if (datePatterns.test(header) && dIdx === -1) {
        dIdx = c;
      } else if (descPatterns.test(header) && descIdx === -1) {
        descIdx = c;
      } else if (withdrawalPatterns.test(header) && drIdx === -1) {
        drIdx = c;
      } else if (depositPatterns.test(header) && crIdx === -1) {
        crIdx = c;
      } else if (amountPatterns.test(header) && amtIdx === -1) {
        amtIdx = c;
      } else if (refPatterns.test(header) && rIdx === -1) {
        rIdx = c;
      }
    }

    // A valid header row must contain at least a Date column and either Description or an Amount/Debit/Credit column
    if (dIdx !== -1 && (descIdx !== -1 || drIdx !== -1 || crIdx !== -1 || amtIdx !== -1)) {
      headerRowIndex = r;
      dateColIdx = dIdx;
      descColIdx = descIdx;
      debitColIdx = drIdx;
      creditColIdx = crIdx;
      amountColIdx = amtIdx;
      refColIdx = rIdx;
      break;
    }
  }

  const startDataRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

  // Fallback: If no header found, inspect the first 25 rows to identify columns by data heuristics
  if (headerRowIndex === -1) {
    const colCount = Math.max(...rawRows.map(r => r.length));
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
        // Strict numeric check to avoid classifying narrations with numbers like "UPI/123/x" as amounts
        const isLikelyNumeric = /^[+-]?(₹|rs\.?|inr)?\s*[\d,]+(\.\d+)?\s*(dr|cr)?$/i.test(cell);
        if (isLikelyNumeric && Math.abs(parseINR(cell)) > 0) {
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

      let amount = 0;
      let type: TransactionType = 'debit';

      // Parse dual column withdrawal/deposit
      if (debitColIdx !== -1 || creditColIdx !== -1) {
        const rawDebit = debitColIdx !== -1 ? row[debitColIdx] : '';
        const rawCredit = creditColIdx !== -1 ? row[creditColIdx] : '';
        const debitVal = parseINR(rawDebit || '');
        const creditVal = parseINR(rawCredit || '');

        if (Math.abs(creditVal) > 0) {
          amount = Math.abs(creditVal);
          type = 'credit';
        } else if (Math.abs(debitVal) > 0) {
          amount = Math.abs(debitVal);
          type = 'debit';
        }
      } else if (amountColIdx !== -1) {
        // Single Amount column with possible +/- or Cr/Dr in text
        const rawAmount = row[amountColIdx];
        const parsed = parseINR(rawAmount || '');
        if (Math.abs(parsed) > 0) {
          amount = Math.abs(parsed);
          // If parsed is negative, it's a debit
          type = parsed < 0 ? 'debit' : 'credit';

          // Additional check for Dr/Cr in the amount string or adjacent text
          if (/\b(dr|debit)\b/i.test(String(rawAmount))) {
            type = 'debit';
          } else if (/\b(cr|credit)\b/i.test(String(rawAmount))) {
            type = 'credit';
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

      // Validate date
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
        description: cleanDescription,
        paymentMethod,
        referenceId: rawRef || undefined,
        source: 'imported',
        selected: true,
      });
    } catch {
      errors.push(`Row ${r + 1}: Failed to parse transaction row.`);
    }
  }

  return {
    transactions,
    totalRows: rawRows.length - startDataRow,
    parsedRows: transactions.length,
    errors,
  };
}
