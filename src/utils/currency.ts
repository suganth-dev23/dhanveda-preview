/**
 * Formats a number to Indian Rupee (INR) currency format
 * e.g., 125000 -> ₹1,25,000
 * e.g., 1550000.75 -> ₹15,50,000.75
 */

/**
 * Rounds a number to 2 decimal places using symmetric half-away-from-zero rounding.
 * e.g. roundCurrency(-1.005) => -1.01, roundCurrency(1.005) => 1.01
 */
export function roundCurrency(val: number): number {
  if (!Number.isFinite(val)) return 0;
  const sign = val < 0 ? -1 : 1;
  return sign * (Math.round((Math.abs(val) + Number.EPSILON) * 100) / 100);
}

export function formatINR(
  amount: number | string | undefined | null,
  options?: {
    showSymbol?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  const showSymbol = options?.showSymbol !== false;
  const symbol = showSymbol ? '₹' : '';
  if (amount === undefined || amount === null) {
    return `${symbol}0`;
  }

  const num = Number(amount);
  if (!Number.isFinite(num)) {
    return `${symbol}0`;
  }

  if (options?.compact) {
    return formatCompactINR(num, { showSymbol });
  }

  const absNum = Math.abs(num);
  const maxFraction = options?.maximumFractionDigits !== undefined ? options.maximumFractionDigits : (Number.isInteger(absNum) ? 0 : 2);
  const minFraction = options?.minimumFractionDigits !== undefined ? options.minimumFractionDigits : 0;

  // Prevent -₹0 when value rounds to zero
  const roundedAbs = Math.round(absNum * Math.pow(10, maxFraction)) / Math.pow(10, maxFraction);
  const isNegative = num < 0 && roundedAbs > 0;
  const sign = isNegative ? '-' : '';

  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: maxFraction,
      minimumFractionDigits: minFraction,
    }).format(absNum);

    return `${sign}${symbol}${formatted}`;
  } catch {
    return `${sign}${symbol}${absNum.toLocaleString('en-IN')}`;
  }
}

/**
 * Compact Indian Number format
 * ₹50K, ₹1.5L, ₹2.75Cr (no space between number and unit, always with ₹ symbol unless showSymbol: false, handles negative -₹50K, max 2 decimals)
 */
export function formatCompactINR(
  amount: number | string | undefined | null,
  options?: {
    showSymbol?: boolean;
  }
): string {
  const showSymbol = options?.showSymbol !== false;
  const symbol = showSymbol ? '₹' : '';

  if (amount === undefined || amount === null) {
    return `${symbol}0`;
  }

  const num = Number(amount);
  if (!Number.isFinite(num)) {
    return `${symbol}0`;
  }

  const abs = Math.abs(num);
  const formatNum = (val: number): string => parseFloat(val.toFixed(2)).toString();

  // Thresholds with boundary rounding handling (e.g. 99999.5 rolls to 1L, 999.999 rolls to 1K)
  if (abs >= 9999950) {
    const cr = abs / 10000000;
    return `${num < 0 ? '-' : ''}${symbol}${formatNum(cr)}Cr`;
  }
  if (abs >= 99999.5) {
    const l = abs / 100000;
    return `${num < 0 ? '-' : ''}${symbol}${formatNum(l)}L`;
  }
  if (abs >= 999.95) {
    const k = abs / 1000;
    return `${num < 0 ? '-' : ''}${symbol}${formatNum(k)}K`;
  }

  const rounded = Math.round(abs * 100) / 100;
  const sign = num < 0 && rounded > 0 ? '-' : '';
  return `${sign}${symbol}${formatNum(abs)}`;
}

/**
 * Parses user typed rupee string into clean float number
 * Handles "₹1,25,000.50", " 15000 ", "Rs.1,234.00", "1,50,000 Dr", "(500)", etc.
 */
export function parseINR(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  let str = String(value).trim();
  if (!str) return 0;

  // Reject ISO/hyphenated date strings like 2026-10-21 so they don't parse as -2026
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(str)) {
    return 0;
  }

  // Strip leading currency labels: ₹, Rs, Rs., INR (case-insensitive)
  str = str.replace(/^(₹|rs\.?|inr)\s*/i, '').trim();

  // Check negative notations: (500), -500, 500-, Dr / Debit
  const isParenNegative = /^\(.*\)$/.test(str);
  const isLeadingMinus = str.startsWith('-');
  const isTrailingMinus = str.endsWith('-');
  const isDr = /\b(dr|debit)\b/i.test(str);
  const isNegative = isParenNegative || isLeadingMinus || isTrailingMinus || isDr;

  // Clean comma, parens, Dr/Debit/Cr/Credit
  let cleaned = str
    .replace(/,/g, '')
    .replace(/[()]/g, '')
    .replace(/\b(dr|debit|cr|credit)\b/gi, '')
    .trim();

  // Strip leading or trailing minus/plus
  if (cleaned.startsWith('-') || cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.endsWith('-') || cleaned.endsWith('+')) cleaned = cleaned.slice(0, -1);
  cleaned = cleaned.trim();

  // Reject strings with multiple decimal points
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) return 0;

  // Strict digits check
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return 0;
  }

  const parsed = parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;

  return isNegative ? -parsed : parsed;
}

/**
 * Converts amount into Indian words
 * e.g., 150000 -> "One Lakh Fifty Thousand Rupees"
 * e.g., 150.75 -> "One Hundred and Fifty Rupees and Seventy Five Paise"
 * e.g., -150 -> "Minus One Hundred and Fifty Rupees"
 */
export function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Zero Rupees';
  if (!Number.isFinite(amount)) return '';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 10) return units[n];
    if (n >= 10 && n < 20) return teens[n - 10];
    return `${tens[Math.floor(n / 10)]} ${units[n % 10]}`.trim();
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) res += `${units[hundred]} Hundred `;
    if (rest > 0) {
      if (hundred > 0) res += 'and ';
      res += convertTwoDigits(rest);
    }
    return res.trim();
  }

  function convertUnderCrore(num: number): string {
    let result = '';
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const remaining = num % 1000;

    if (lakhs > 0) {
      result += `${convertTwoDigits(lakhs)} Lakh `;
    }
    if (thousands > 0) {
      result += `${convertTwoDigits(thousands)} Thousand `;
    }
    if (remaining > 0) {
      result += `${convertThreeDigits(remaining)} `;
    }
    return result.trim();
  }

  const integerPart = Math.floor(absAmount);
  const paise = Math.round((absAmount - integerPart) * 100);

  let rupeeWords = '';
  if (integerPart === 0) {
    rupeeWords = paise > 0 ? '' : 'Zero Rupees';
  } else {
    const crores = Math.floor(integerPart / 10000000);
    const belowCrore = integerPart % 10000000;

    if (crores > 0) {
      if (crores < 100) {
        rupeeWords += `${convertTwoDigits(crores)} Crore `;
      } else {
        rupeeWords += `${convertUnderCrore(crores)} Crore `;
      }
    }
    if (belowCrore > 0) {
      rupeeWords += convertUnderCrore(belowCrore);
    }
    rupeeWords = rupeeWords.trim() + ' Rupees';
  }

  let result = (isNegative ? 'Minus ' : '') + rupeeWords;

  if (paise > 0) {
    const paiseWords = `${convertTwoDigits(paise)} Paise`;
    result = integerPart > 0 ? `${result} and ${paiseWords}` : (isNegative ? 'Minus ' : '') + `${paiseWords}`;
  }

  return result.trim();
}

/**
 * Splits an amount into N equal parts, distributing remainder cents across the first
 * remainder parts to guarantee the sum equals totalAmount exactly with 0 epsilon mismatch.
 * Requires integer shares >= 1.
 * e.g. splitAmountEqually(100, 3) => [33.34, 33.33, 33.33], sum = 100.00
 */
export function splitAmountEqually(totalAmount: number, shares: number): number[] {
  if (!Number.isInteger(shares) || shares < 1) return [];
  const roundedTotal = roundCurrency(totalAmount);
  const isNegative = roundedTotal < 0;
  const totalCents = Math.round(Math.abs(roundedTotal) * 100);
  const baseCents = Math.floor(totalCents / shares);
  const remainderCents = totalCents % shares;

  const results: number[] = [];
  for (let i = 0; i < shares; i++) {
    const shareCents = baseCents + (i < remainderCents ? 1 : 0);
    const finalAmount = roundCurrency((isNegative ? -shareCents : shareCents) / 100);
    results.push(finalAmount);
  }
  return results;
}
