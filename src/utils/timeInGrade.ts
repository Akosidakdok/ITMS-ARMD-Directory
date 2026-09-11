/**
 * Calculates Time-In-Grade (TIG) based on last promotion date vs current date or specified date.
 * Accurately handles leap years (Feb 29), month-end transitions, future dates, invalid dates, and boundary conditions.
 */

export interface TimeInGrade {
  years: number;
  months: number;
  days: number;
  formatted: string;
  totalDays: number;
  eligibleForPromotion: boolean; // e.g. TIG >= required years
  statusText: string;
  isFuture: boolean;
  isInvalid: boolean;
}

const EMPTY_TIME_IN_GRADE: TimeInGrade = {
  years: 0,
  months: 0,
  days: 0,
  formatted: 'N/A',
  totalDays: 0,
  eligibleForPromotion: false,
  statusText: 'No date recorded',
  isFuture: false,
  isInvalid: false
};

export function parseCalendarDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calculates Time In Grade between two calendar dates.
 *
 * @param fromDateStr The start date (last promotion date or entry date)
 * @param targetDateStr Optional reference/target date (defaults to current UTC date)
 * @param minYearsRequired Minimum years required for board eligibility (default 3)
 */
export function calculateTimeInGrade(
  fromDateStr: string | null | undefined,
  targetDateStr?: string | null,
  minYearsRequired: number = 3
): TimeInGrade {
  if (!fromDateStr || typeof fromDateStr !== 'string' || !fromDateStr.trim()) {
    return { ...EMPTY_TIME_IN_GRADE };
  }

  const fromDate = parseCalendarDate(fromDateStr);
  if (!fromDate) {
    return {
      ...EMPTY_TIME_IN_GRADE,
      statusText: 'Invalid date',
      isInvalid: true
    };
  }

  const targetDate = targetDateStr ? parseCalendarDate(targetDateStr) : new Date();
  if (!targetDate) {
    return {
      ...EMPTY_TIME_IN_GRADE,
      statusText: 'Invalid target date',
      isInvalid: true
    };
  }

  // Future promotion date
  if (fromDate.getTime() > targetDate.getTime()) {
    return {
      years: 0,
      months: 0,
      days: 0,
      formatted: 'N/A',
      totalDays: 0,
      eligibleForPromotion: false,
      statusText: 'Pending Effective Date',
      isFuture: true,
      isInvalid: false
    };
  }

  let years = targetDate.getUTCFullYear() - fromDate.getUTCFullYear();
  let months = targetDate.getUTCMonth() - fromDate.getUTCMonth();
  let days = targetDate.getUTCDate() - fromDate.getUTCDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(
      Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 0)
    ).getUTCDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.floor((targetDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

  // Format string
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
  parts.push(`${days} day${days !== 1 ? 's' : ''}`);

  const formatted = parts.join(', ');
  const eligibleForPromotion = years >= minYearsRequired;
  const statusText = eligibleForPromotion ? 'Eligible for review' : 'Accruing service time';

  return {
    years,
    months,
    days,
    formatted,
    totalDays,
    eligibleForPromotion,
    statusText,
    isFuture: false,
    isInvalid: false
  };
}
