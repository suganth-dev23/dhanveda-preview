/**
 * Formats a number to Indian Rupee (INR) currency format
 * e.g., 125000 -> ₹1,25,000
 * e.g., 1550000.75 -> ₹15,50,000.75
 */
/**
 * Rounds a number to 2 decimal places to prevent floating point inaccuracies like 33.330000000000005.
 */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
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
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return (options?.showSymbol !== false ? '₹' : '') + '0';
  }

  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const showSymbol = options?.showSymbol !== false;

  if (options?.compact) {
    return formatCompactINR(num, { showSymbol });
  }

  const symbol = showSymbol ? '₹' : '';
  const sign = isNegative ? '-' : '';
  const maxFraction = options?.maximumFractionDigits !== undefined ? options.maximumFractionDigits : (Number.isInteger(absNum) ? 0 : 2);
  const minFraction = options?.minimumFractionDigits !== undefined ? options.minimumFractionDigits : 0;

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

  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return `${symbol}0`;
  }

  const num = Number(amount);
  const abs = Math.abs(num);
  const sign = num < 0 && abs > 0 ? '-' : '';

  const formatNum = (val: number): string => {
    return parseFloat(val.toFixed(2)).toString();
  };

  if (abs >= 10000000) {
    return `${sign}${symbol}${formatNum(abs / 10000000)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}${symbol}${formatNum(abs / 100000)}L`;
  }
  if (abs >= 1000) {
    return `${sign}${symbol}${formatNum(abs / 1000)}K`;
  }
  return `${sign}${symbol}${formatNum(abs)}`;
}

/**
 * Parses user typed rupee string into clean float number
 * Handles "₹1,25,000.50", " 15000 ", etc.
 */
export function parseINR(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const str = String(value).trim();
  if (!str) return 0;

  const isParenNegative = /^\(.*\)$/.test(str);
  const isExplicitMinus = str.startsWith('-') || str.endsWith('-') || str.includes('-');
  const isDr = /\b(dr|debit)\b/i.test(str);

  const cleaned = str.replace(/,/g, '').replace(/[^0-9.eE+-]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;

  if (isParenNegative || isExplicitMinus || isDr) {
    return -Math.abs(parsed);
  }
  return parsed;
}

/**
 * Converts amount into Indian words
 * e.g., 150000 -> "One Lakh Fifty Thousand"
 */
export function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Zero Rupees';
  if (isNaN(amount)) return '';

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

  const num = Math.floor(Math.abs(amount));
  let result = '';

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const remaining = num % 1000;

  if (crores > 0) {
    if (crores >= 100) {
      result += `${numberToWordsINR(crores).replace(/ Rupees$/, '')} Crore `;
    } else {
      result += `${convertTwoDigits(crores)} Crore `;
    }
  }
  if (lakhs > 0) {
    result += `${convertTwoDigits(lakhs)} Lakh `;
  }
  if (thousands > 0) {
    result += `${convertTwoDigits(thousands)} Thousand `;
  }
  if (remaining > 0) {
    result += `${convertThreeDigits(remaining)} `;
  }

  return (result.trim() + ' Rupees');
}

/**
 * Splits an amount into N equal parts, distributing remainder cents across the first
 * remainder parts to guarantee the sum equals totalAmount exactly with 0 epsilon mismatch.
 * e.g. splitAmountEqually(100, 3) => [33.34, 33.33, 33.33], sum = 100.00
 */
export function splitAmountEqually(totalAmount: number, shares: number): number[] {
  if (shares <= 0) return [];
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
