/**
 * Recurring Payment Date & Calculation Utilities
 * 
 * Handles schedule calculation, month rollover, short-month day clamping (e.g. 31st in 30-day months),
 * and monthly financial normalization.
 */

import type { RecurringPayment, RecurringPaymentLog, RecurrenceFrequency } from '../types/finance';
import { roundCurrency } from './currency';

/**
 * Returns the maximum days in a given year and month (1-indexed month: 1=Jan, 12=Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Clamps target day of month to the maximum available days in that month.
 * e.g., 31 in April (month 4) -> 30, 31 in Feb 2026 -> 28
 */
export function clampDayOfMonth(year: number, month: number, targetDay: number): number {
  const maxDays = getDaysInMonth(year, month);
  return Math.max(1, Math.min(targetDay, maxDays));
}

/**
 * Formats a Date object or components to YYYY-MM-DD
 */
export function formatDateISO(year: number, month: number, day: number): string {
  const y = year.toString().padStart(4, '0');
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD into [year, month, day]
 */
export function parseDateISO(dateStr: string): [number, number, number] {
  const parts = dateStr.split('-');
  return [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)];
}

/**
 * Normalizes payment amount to a monthly financial commitment figure.
 * Supports weekly, bi-weekly, monthly, quarterly, semi-annually, yearly, daily.
 * Uses roundCurrency to preserve paise without whole-rupee truncation.
 */
export function calculateMonthlyEquivalent(amount: number, frequency: RecurrenceFrequency | string): number {
  if (amount <= 0 || isNaN(amount)) return 0;
  switch (frequency) {
    case 'weekly':
      return roundCurrency((amount * 52) / 12);
    case 'bi-weekly':
    case 'biweekly':
      return roundCurrency((amount * 26) / 12);
    case 'monthly':
      return roundCurrency(amount);
    case 'quarterly':
      return roundCurrency(amount / 3);
    case 'semi-annually':
    case 'half-yearly':
      return roundCurrency(amount / 6);
    case 'yearly':
      return roundCurrency(amount / 12);
    case 'daily':
      return roundCurrency((amount * 365) / 12);
    default:
      return roundCurrency(amount);
  }
}

/**
 * Checks whether a given due date has already been marked as paid or skipped in the logs.
 */
export function isOccurrencePaid(
  paymentId: string,
  dueDate: string,
  logs: RecurringPaymentLog[]
): boolean {
  return logs.some(
    log => log.recurringPaymentId === paymentId && log.dueDate === dueDate && (Boolean(log.paidDate) || Boolean(log.skipped))
  );
}

/**
 * Calculates candidate due dates for a RecurringPayment around a given reference date.
 * Returns the relevant unpaid due date or the next upcoming due date.
 */
export function getPaymentSchedule(
  payment: RecurringPayment,
  logs: RecurringPaymentLog[],
  refDate: Date = new Date()
): {
  activeDueDate: string | null;
  isOverdue: boolean;
  daysDiff: number; // negative = days overdue, 0 = due today, positive = days until due
  nextCycleDueDate: string | null;
} {
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth() + 1; // 1-12
  const refDay = refDate.getDate();
  const todayStr = formatDateISO(refYear, refMonth, refDay);

  const [startYear, startMonth, startDay] = parseDateISO(payment.startDate);
  const freq: string = payment.frequency;

  // If start date is in the future, the first occurrence cannot be before startDate
  if (payment.startDate > todayStr) {
    const candidate = payment.startDate;
    const isPaid = isOccurrencePaid(payment.id, candidate, logs);
    if (!isPaid) {
      const daysDiff = Math.round(
        (new Date(candidate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        activeDueDate: candidate,
        isOverdue: false,
        daysDiff,
        nextCycleDueDate: candidate,
      };
    }
  }

  // Monthly frequency handling (most common for bills, rent, SIP, subscriptions)
  if (freq === 'monthly') {
    const targetDay = payment.dayOfMonth || startDay || 1;

    // Check candidate for previous month (1 month back) to catch immediately overdue payment
    // Uniform with daily/weekly/bi-weekly which check the previous period, not an arbitrary 6-month backlog
    let prevM = refMonth - 1;
    let prevY = refYear;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const prevMonthDay = clampDayOfMonth(prevY, prevM, targetDay);
    const prevMonthDueDate = formatDateISO(prevY, prevM, prevMonthDay);
    const isPrevMonthPaid = isOccurrencePaid(payment.id, prevMonthDueDate, logs);

    // If due date is on or after startDate and UNPAID, it is the active overdue payment
    // Cap backlog by createdAt if no logs exist yet (avoids manufacturing past overdue months)
    const minBacklogDate = (logs.length === 0 && payment.createdAt)
      ? payment.createdAt.slice(0, 10)
      : payment.startDate;

    if (prevMonthDueDate >= payment.startDate && prevMonthDueDate >= minBacklogDate && !isPrevMonthPaid) {
      const daysDiff = Math.round(
        (new Date(prevMonthDueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (!payment.endDate || prevMonthDueDate <= payment.endDate) {
        const thisMonthDay = clampDayOfMonth(refYear, refMonth, targetDay);
        const thisMonthDueDate = formatDateISO(refYear, refMonth, thisMonthDay);
        return {
          activeDueDate: prevMonthDueDate,
          isOverdue: true,
          daysDiff,
          nextCycleDueDate: (!payment.endDate || thisMonthDueDate <= payment.endDate) ? thisMonthDueDate : null,
        };
      }
    }

    // Check candidate for current month
    const thisMonthDay = clampDayOfMonth(refYear, refMonth, targetDay);
    const thisMonthDueDate = formatDateISO(refYear, refMonth, thisMonthDay);

    const isThisMonthPaid = isOccurrencePaid(payment.id, thisMonthDueDate, logs);

    // If today is past this month's due date and it's NOT paid -> It is OVERDUE
    if (todayStr > thisMonthDueDate && !isThisMonthPaid && thisMonthDueDate >= payment.startDate) {
      const daysDiff = Math.round(
        (new Date(thisMonthDueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if end date has passed
      if (!payment.endDate || thisMonthDueDate <= payment.endDate) {
        // Calculate next month's cycle
        let nextM = refMonth + 1;
        let nextY = refYear;
        if (nextM > 12) {
          nextM = 1;
          nextY += 1;
        }
        const nextDay = clampDayOfMonth(nextY, nextM, targetDay);
        const nextCycle = formatDateISO(nextY, nextM, nextDay);

        return {
          activeDueDate: thisMonthDueDate,
          isOverdue: true,
          daysDiff,
          nextCycleDueDate: (!payment.endDate || nextCycle <= payment.endDate) ? nextCycle : null,
        };
      }
    }

    // If this month's due date is still upcoming (today <= thisMonthDueDate) and unpaid
    if (!isThisMonthPaid && thisMonthDueDate >= payment.startDate) {
      const daysDiff = Math.round(
        (new Date(thisMonthDueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (!payment.endDate || thisMonthDueDate <= payment.endDate) {
        return {
          activeDueDate: thisMonthDueDate,
          isOverdue: false,
          daysDiff,
          nextCycleDueDate: thisMonthDueDate,
        };
      }
    }

    // Otherwise, this month is already paid! Roll over to next month
    let nextMonth = refMonth + 1;
    let nextYear = refYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const nextMonthDay = clampDayOfMonth(nextYear, nextMonth, targetDay);
    const nextMonthDueDate = formatDateISO(nextYear, nextMonth, nextMonthDay);

    if (payment.endDate && nextMonthDueDate > payment.endDate) {
      return { activeDueDate: null, isOverdue: false, daysDiff: 0, nextCycleDueDate: null };
    }

    const daysDiff = Math.round(
      (new Date(nextMonthDueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      activeDueDate: nextMonthDueDate,
      isOverdue: false,
      daysDiff,
      nextCycleDueDate: nextMonthDueDate,
    };
  }

  // Quarterly or Semi-annually frequency
  if (freq === 'quarterly' || freq === 'semi-annually' || freq === 'half-yearly') {
    const stepMonths = freq === 'quarterly' ? 3 : 6;
    const maxOverdueDays = stepMonths * 32;
    const targetDay = payment.dayOfMonth || startDay || 1;
    let curY = startYear;
    let curM = startMonth;

    while (true) {
      const day = clampDayOfMonth(curY, curM, targetDay);
      const dueDate = formatDateISO(curY, curM, day);

      if (payment.endDate && dueDate > payment.endDate) {
        return { activeDueDate: null, isOverdue: false, daysDiff: 0, nextCycleDueDate: null };
      }

      const isPaid = isOccurrencePaid(payment.id, dueDate, logs);
      const dueUTC = Date.UTC(curY, curM - 1, day);
      const todayUTC = Date.UTC(refYear, refMonth - 1, refDay);
      const daysDiff = Math.round((dueUTC - todayUTC) / (1000 * 60 * 60 * 24));

      // Advance if already paid or too ancient to be the active due cycle
      if (isPaid || daysDiff < -maxOverdueDays) {
        curM += stepMonths;
        if (curM > 12) {
          curY += Math.floor((curM - 1) / 12);
          curM = ((curM - 1) % 12) + 1;
        }
        if (curY > refYear + 5) break;
        continue;
      }

      return {
        activeDueDate: dueDate,
        isOverdue: !isPaid && daysDiff < 0,
        daysDiff,
        nextCycleDueDate: dueDate,
      };
    }
  }

  // Yearly frequency (once a year on startMonth / targetDay)
  if (freq === 'yearly') {
    const targetDay = payment.dayOfMonth || startDay || 1;
    let yearCandidate = refYear;
    const day = clampDayOfMonth(yearCandidate, startMonth, targetDay);
    let dueDate = formatDateISO(yearCandidate, startMonth, day);

    let isPaid = isOccurrencePaid(payment.id, dueDate, logs);
    if (isPaid || (todayStr > dueDate && dueDate < payment.startDate)) {
      yearCandidate += 1;
      const nextDay = clampDayOfMonth(yearCandidate, startMonth, targetDay);
      dueDate = formatDateISO(yearCandidate, startMonth, nextDay);
      isPaid = isOccurrencePaid(payment.id, dueDate, logs);
    }

    if (payment.endDate && dueDate > payment.endDate) {
      return { activeDueDate: null, isOverdue: false, daysDiff: 0, nextCycleDueDate: null };
    }

    const dueParts = parseDateISO(dueDate);
    const dueUTC = Date.UTC(dueParts[0], dueParts[1] - 1, dueParts[2]);
    const todayUTC = Date.UTC(refYear, refMonth - 1, refDay);
    const daysDiff = Math.round((dueUTC - todayUTC) / (1000 * 60 * 60 * 24));

    return {
      activeDueDate: dueDate,
      isOverdue: !isPaid && daysDiff < 0,
      daysDiff,
      nextCycleDueDate: dueDate,
    };
  }

  // Daily, Weekly, or Bi-weekly frequency
  if (
    freq === 'daily' ||
    freq === 'weekly' ||
    freq === 'bi-weekly' ||
    freq === 'biweekly'
  ) {
    const intervalDays = freq === 'daily' ? 1 : freq === 'weekly' ? 7 : 14;
    const msPerDay = 1000 * 60 * 60 * 24;
    const todayUTC = Date.UTC(refYear, refMonth - 1, refDay);
    const startUTC = Date.UTC(startYear, startMonth - 1, startDay);
    const daysSinceStart = Math.round((todayUTC - startUTC) / msPerDay);

    const periodsElapsed = Math.floor(daysSinceStart / intervalDays);
    const prevDate = new Date(Date.UTC(startYear, startMonth - 1, startDay + periodsElapsed * intervalDays));
    const prevOccurrenceStr = formatDateISO(
      prevDate.getUTCFullYear(),
      prevDate.getUTCMonth() + 1,
      prevDate.getUTCDate()
    );

    const nextDate = new Date(Date.UTC(startYear, startMonth - 1, startDay + (periodsElapsed + 1) * intervalDays));
    const nextOccurrenceStr = formatDateISO(
      nextDate.getUTCFullYear(),
      nextDate.getUTCMonth() + 1,
      nextDate.getUTCDate()
    );

    const isPrevPaid = isOccurrencePaid(payment.id, prevOccurrenceStr, logs);

    // If previous occurrence is on or after startDate and is unpaid
    if (prevOccurrenceStr >= payment.startDate && !isPrevPaid) {
      const prevParts = parseDateISO(prevOccurrenceStr);
      const prevUTC = Date.UTC(prevParts[0], prevParts[1] - 1, prevParts[2]);
      const daysDiff = Math.round((prevUTC - todayUTC) / msPerDay);
      if (!payment.endDate || prevOccurrenceStr <= payment.endDate) {
        return {
          activeDueDate: prevOccurrenceStr,
          isOverdue: daysDiff < 0,
          daysDiff,
          nextCycleDueDate: (!payment.endDate || nextOccurrenceStr <= payment.endDate) ? nextOccurrenceStr : null,
        };
      }
    }

    // Otherwise, previous occurrence is paid (or before startDate), candidate is next occurrence
    if (payment.endDate && nextOccurrenceStr > payment.endDate) {
      return { activeDueDate: null, isOverdue: false, daysDiff: 0, nextCycleDueDate: null };
    }

    const isNextPaid = isOccurrencePaid(payment.id, nextOccurrenceStr, logs);
    const nextParts = parseDateISO(nextOccurrenceStr);
    const nextUTC = Date.UTC(nextParts[0], nextParts[1] - 1, nextParts[2]);
    const daysDiff = Math.round((nextUTC - todayUTC) / msPerDay);

    return {
      activeDueDate: nextOccurrenceStr,
      isOverdue: !isNextPaid && daysDiff < 0,
      daysDiff,
      nextCycleDueDate: nextOccurrenceStr,
    };
  }

  return { activeDueDate: null, isOverdue: false, daysDiff: 0, nextCycleDueDate: null };
}
