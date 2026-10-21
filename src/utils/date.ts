/**
 * Date formatting and range utilities
 */

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate();
    const month = MONTHS_SHORT[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function formatMonth(dateString: string, options?: { shortYear?: boolean }): string {
  if (!dateString) return '';
  try {
    let date: Date;
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      const [y, m] = dateString.split('-').map(Number);
      date = new Date(y, m - 1, 1);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return dateString;
    const month = MONTHS_SHORT[date.getMonth()];
    const year = date.getFullYear();
    if (options?.shortYear) {
      const shortYearStr = String(year).slice(-2);
      return `${month} '${shortYearStr}`;
    }
    return `${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return '';
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString;
    const day = date.getDate();
    const month = MONTHS_SHORT[date.getMonth()];
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } catch {
    return dateTimeString;
  }
}

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date string (YYYY-MM-DD) in local time (IST).
 * Standardized replacement for all toISOString().split('T')[0] occurrences.
 */
export function todayLocal(): string {
  return getTodayString();
}

let cachedMonthYearKey = '';
let cachedMonthYearResult: { month: number; year: number; monthName: string; key: string } | null = null;

export function getCurrentMonthYear(): { month: number; year: number; monthName: string; key: string } {
  const dayKey = todayLocal();
  if (cachedMonthYearResult && cachedMonthYearKey === dayKey) {
    return cachedMonthYearResult;
  }
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthName = now.toLocaleString('en-IN', { month: 'long' });
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  cachedMonthYearKey = dayKey;
  cachedMonthYearResult = { month, year, monthName, key };
  return cachedMonthYearResult;
}

export function getPreviousMonthKey(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentDayOfMonth(): number {
  return new Date().getDate();
}

export function getDaysSinceDate(dateStr: string): number | null {
  if (!dateStr) return null;
  let inceptionTime: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    inceptionTime = new Date(y, m - 1, d).getTime();
  } else {
    inceptionTime = Date.parse(dateStr);
  }
  if (Number.isNaN(inceptionTime)) return null;
  const nowMs = Date.now();
  return Math.max(1, (nowMs - inceptionTime) / (1000 * 60 * 60 * 24));
}

export function getMonthKey(date: string | null | undefined): string {
  if (!date || typeof date !== 'string') return '';
  const match = /^(\d{4})-(\d{1,2})/.exec(date);
  if (match) {
    const m = parseInt(match[2], 10);
    if (m >= 1 && m <= 12) {
      return `${match[1]}-${String(m).padStart(2, '0')}`;
    }
  }
  return '';
}

export function getMonthName(yearMonth: string): string {
  // expects YYYY-MM
  return formatMonth(yearMonth);
}

export function getRelativeMonthsList(count = 6): { key: string; label: string }[] {
  const list: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
    list.push({ key, label });
  }
  return list;
}

export function isDateInMonth(dateStr: string, yearMonthKey: string): boolean {
  if (!dateStr || !yearMonthKey) return false;
  return dateStr.startsWith(yearMonthKey);
}

export function calculateMonthsDiff(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 1;
    }
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 30.44));
  } catch {
    return 1;
  }
}

/**
 * Sanitizes and validates a date string, returning ISO YYYY-MM-DD or null if invalid.
 * Prevents invalid dates (e.g. 2026-02-31, NaN) and normalizes input.
 */
export function sanitizeDateString(input: string): string | null {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();

  // Check YYYY-MM-DD
  const ymdMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const testDate = new Date(y, m - 1, d);
      if (testDate.getFullYear() === y && testDate.getMonth() === m - 1 && testDate.getDate() === d) {
        return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    return null;
  }

  // Fallback for valid Date strings
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}
