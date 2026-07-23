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

export function calculateTimeInGrade(fromDateStr: string, targetDateStr?: string): TimeInGrade {
  const fromDate = new Date(fromDateStr);
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();

  if (isNaN(fromDate.getTime())) {
    return {
      years: 0,
      months: 0,
      days: 0,
      formatted: 'N/A',
      totalDays: 0,
      eligibleForPromotion: false
    };
  }

  let years = targetDate.getFullYear() - fromDate.getFullYear();
  let months = targetDate.getMonth() - fromDate.getMonth();
  let days = targetDate.getDate() - fromDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0).getDate();
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
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    formatted,
    totalDays: Math.max(0, totalDays),
    eligibleForPromotion
  };
}
