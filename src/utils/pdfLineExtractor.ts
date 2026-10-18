import { StagedTransaction, TransactionType, PaymentMethod } from '../types/finance';
import { suggestCategory, detectPaymentMethod, AutoRule } from './categoryMatcher';
import { parseINR } from './currency';
import { normalizeDate } from './csvParser';
import { isValidAmount, isValidDate, roundMoney } from './validation';

/**
 * Extracts transactions from reconstructed tabular text lines of a PDF bank statement.
 * Supports both decimal (e.g. 1,500.50) and integer amounts (e.g. 500, 25000).
 */
export function extractTransactionsFromPDFLines(
  lines: string[],
  customRules?: AutoRule[]
): StagedTransaction[] {
  const dateRegex = /(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}[-\s.][A-Za-z]{3,9}[-\s.]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b)/;
  // Decimal is now optional so whole numbers (e.g. ₹500, 1500) match accurately
  const amountRegex = /(?:^|[\s\t])(?:\(?₹?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\)?(?:\s*(?:CR|DR|Cr|Dr))?)(?:[\s\t]|$)/g;

  const transactions: StagedTransaction[] = [];
  let rowIndex = 0;

  lines.forEach((line) => {
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) return;

    const rawDate = dateMatch[0];
    const lineWithoutDate = line.replace(rawDate, ' ');

    // Extract amounts from line
    const matches: { rawMatch: string; numStr: string; value: number; isCr: boolean; isDr: boolean }[] = [];
    let match: RegExpExecArray | null;

    amountRegex.lastIndex = 0;
    while ((match = amountRegex.exec(lineWithoutDate)) !== null) {
      if (match[1]) {
        const numStr = match[1];
        const val = parseINR(numStr);
        if (val > 0) {
          matches.push({
            rawMatch: match[0].trim(),
            numStr,
            value: val,
            isCr: /\b(cr|credit)\b/i.test(match[0]),
            isDr: /\b(dr|debit)\b/i.test(match[0]),
          });
        }
      }
    }

    if (matches.length === 0) return;

    let type: TransactionType = 'debit';
    const isCreditCardPayment = /\b(credit\s*card|cc\s*bill|cc\s*payment|card\s*payment|billdesk|autopay\s*cc)\b/i.test(line);
    const isCr = !isCreditCardPayment && /\b(CR|Credit|Deposit|Salary|Refund|Cashback|Direct Dep|ACH CR|NEFT CR|RTGS CR|UPI CR|Interest|Dividend|Received from)\b/i.test(line);
    const isDr = isCreditCardPayment || /\b(DR|Debit|Withdrawal|Wdl|Paid to|POS|Purchase)\b/i.test(line);

    if (isCreditCardPayment) {
      type = 'debit';
    } else if (matches[0].isCr || (isCr && !isDr)) {
      type = 'credit';
    } else if (matches[0].isDr || isDr) {
      type = 'debit';
    }

    const primaryAmount = matches[0];
    const amount = primaryAmount.value;

    let descCandidate = line
      .replace(rawDate, '')
      .replace(primaryAmount.rawMatch, '')
      .replace(/BALANCE|OPENING|CLOSING|TOTAL/gi, '');

    // Remove closing balance if present
    if (matches.length > 1) {
      descCandidate = descCandidate.replace(matches[matches.length - 1].rawMatch, '');
    }

    descCandidate = descCandidate
      .replace(/\b(CR|DR|Cr|Dr)\b/g, '')
      .replace(/[\s\t]+/g, ' ')
      .trim();

    if (!descCandidate || descCandidate.length < 2) {
      descCandidate = 'Bank Transaction';
    }

    if (!isValidAmount(amount)) return;

    const normalizedDate = normalizeDate(rawDate);
    if (!normalizedDate || normalizedDate === 'NaN-NaN-NaN' || !isValidDate(normalizedDate)) return;

    const categoryMatch = suggestCategory(descCandidate, customRules);
    const paymentMethod: PaymentMethod = detectPaymentMethod(descCandidate);

    const resolvedType: TransactionType = isCreditCardPayment
      ? 'debit'
      : (categoryMatch.suggestedType === 'credit' && !isDr)
      ? 'credit'
      : (categoryMatch.suggestedType === 'debit' && !isCr)
      ? 'debit'
      : type;

    rowIndex++;
    transactions.push({
      tempId: `staged-pdf-${Date.now()}-${rowIndex}`,
      date: normalizedDate,
      amount: roundMoney(amount),
      type: resolvedType,
      category: categoryMatch.category,
      paymentMethod,
      description: descCandidate,
      source: 'imported',
      selected: true,
      originalRawRow: line,
    });
  });

  return transactions;
}
