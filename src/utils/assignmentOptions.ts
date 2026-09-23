import type { AssignmentRecord, Personnel } from '../types/pais';
import { ASSIGNMENT_STATION_OPTIONS } from '../constants/ranks';

/**
 * Returns the shared station list used by assignment entry and reporting views.
 * Saved custom stations are included so they remain available after creation,
 * editing, tab changes, and a fresh data load.
 */
export function getAssignmentStationOptions(
  assignments: AssignmentRecord[] = [],
  personnel: Personnel[] = []
): string[] {
  return Array.from(new Set([
    ...ASSIGNMENT_STATION_OPTIONS,
    ...assignments.map(assignment => assignment.station || ''),
    ...personnel.map(person => person.station || '')
  ].map(value => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
