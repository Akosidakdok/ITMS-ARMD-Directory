/**
 * Calculates Time-In-Grade (TIG) based on last promotion date vs current date or specified date.
 * Returns structured object and human-formatted string (e.g. "3 yrs, 4 mos, 12 days").
 */

export interface TimeInGrade {
  years: number;
  months: number;
  days: number;
  formatted: string;
  totalDays: number;
  eligibleForPromotion: boolean; // e.g. TIG >= 3 years
}

const EMPTY_TIME_IN_GRADE: TimeInGrade = {
  years: 0,
  months: 0,
  days: 0,
  formatted: 'N/A',
  totalDays: 0,
  eligibleForPromotion: false
};

function parseCalendarDate(value: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
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

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateTimeInGrade(fromDateStr: string, targetDateStr?: string): TimeInGrade {
  const fromDate = parseCalendarDate(fromDateStr);
  const targetDate = targetDateStr ? parseCalendarDate(targetDateStr) : new Date();

  if (!fromDate || !targetDate || fromDate.getTime() > targetDate.getTime()) {
    return { ...EMPTY_TIME_IN_GRADE };
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
  const eligibleForPromotion = years >= 3; // Standard PNP benchmark demo

  return {
    years,
    months,
    days,
    formatted,
    totalDays,
    eligibleForPromotion
  };
}
