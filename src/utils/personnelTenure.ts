import type { AssignmentRecord, Personnel, PromotionRecord } from '../types/pais.ts';
import { calculateTimeInGrade, parseCalendarDate } from './timeInGrade.ts';

/** Personnel dates are calendar dates in the Philippines, regardless of the viewer's device time zone. */
export function getTodayInPhilippines(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function getLatestPromotionDate(personnel: Personnel, promotions: PromotionRecord[]): string {
  const dates = [personnel.lastPromotionDate, ...promotions
    .filter(promotion => promotion.personnelId === personnel.id)
    .map(promotion => promotion.promotionDate)]
    .filter((date): date is string => Boolean(date && parseCalendarDate(date)));
  dates.sort();
  return dates[dates.length - 1] || personnel.lastPromotionDate || '';
}

export function getAssignmentEffectiveDate(assignment: AssignmentRecord): string {
  return assignment.effectiveDate || assignment.startDate || '';
}

export function getCurrentMainAssignment(assignments: AssignmentRecord[], personnelId: string): AssignmentRecord | undefined {
  return assignments
    .filter(assignment => assignment.personnelId === personnelId
      && assignment.status === 'Current'
      && assignment.positionCategory !== 'In Addition/Concurrent')
    .sort((a, b) => getAssignmentEffectiveDate(b).localeCompare(getAssignmentEffectiveDate(a)))[0];
}

export function formatTenure(startDate: string | null | undefined, endDate: string | null | undefined): string {
  if (!startDate) return 'Not recorded';
  if (!endDate) return 'End date not recorded';
  const duration = calculateTimeInGrade(startDate, endDate);
  if (duration.isInvalid) return 'Invalid date';
  if (duration.isFuture) return 'Pending effective date';
  return duration.formatted;
}

export function formatAssignmentTenure(assignment: AssignmentRecord, today: string): string {
  const endDate = assignment.status === 'Current'
    ? assignment.endDate && assignment.endDate < today ? assignment.endDate : today
    : assignment.endDate;
  return formatTenure(getAssignmentEffectiveDate(assignment), endDate);
}
