export const MAX_AMOUNT = 1_000_000_000; // 100 crore INR (1 billion)
export const MIN_AMOUNT = 0.01;
export const MIN_DATE_STRING = '2000-01-01';

export function getMaxDateString(): string {
  const now = new Date();
  const maxYear = now.getFullYear() + 5;
  return `${maxYear}-12-31`;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isValidAmount(amount: any): boolean {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount);
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return false;
  }
  const rounded = roundMoney(amount);
  return rounded >= MIN_AMOUNT && rounded <= MAX_AMOUNT;
}

export function isValidDate(dateStr: any): boolean {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [, monthStr, dayStr] = dateStr.split('-');
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return false;

  const minDate = new Date(`${MIN_DATE_STRING}T00:00:00Z`);
  const maxDate = new Date(`${getMaxDateString()}T23:59:59Z`);

  return d >= minDate && d <= maxDate;
}
