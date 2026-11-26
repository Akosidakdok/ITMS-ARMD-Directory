import type { Personnel } from '../types/pais.ts';
import { getPersonnelDesignations } from './personnelOrganization.ts';

export function formatTemplatePersonnelName(person: Personnel): string {
  const name = [person.firstName, person.middleName, person.lastName, person.qualifier].filter(Boolean).join(' ') || person.fullName;
  return name.toUpperCase().startsWith(`${person.rank.toUpperCase()} `) ? name : `${person.rank} ${name}`.trim();
}
export function restoreTemplatePersonnelIds(draft: { personnelIds?: unknown; personnelId?: unknown }): string[] {
  if (Array.isArray(draft.personnelIds)) return [...new Set(draft.personnelIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))];
  return typeof draft.personnelId === 'string' && draft.personnelId ? [draft.personnelId] : [];
}
export function getTemplatePersonnelRows(personnel: Personnel[], ids: string[]) {
  const byId = new Map(personnel.map(person => [person.id, person]));
  return [...new Set(ids)].map(id => {
    const person = byId.get(id);
    return person ? { id, name: formatTemplatePersonnelName(person), badgeNo: person.badgeNo || '', unit: person.sub_unit || person.division || person.unitCategory || '', designation: getPersonnelDesignations(person) }
      : { id, name: 'Personnel no longer in roster — reselect before export', badgeNo: '', unit: '', designation: '' };
  });
}
