import type { Personnel, RankCategory } from '../types/pais.ts';
import { resolvePersonnelRankCategory, matchesPersonnelCriteria, type PersonnelFilterCriteria } from './personnelCounting.ts';

import { DIVISION_GROUPS, personnelInScope, resolveCountedOrganization, type StrengthScope } from './personnelOrganization.ts';
export * from './personnelOrganization.ts';

export interface StrengthRow {
  group: string; section: string;
  pcoCount: number; pncoCount: number; nupCount: number;
  maleCount: number; femaleCount: number; total: number;
  personnel: Personnel[];
}
const key = (value?: string) => String(value || '').trim().toUpperCase();
const emptyRow = (group: string, section = ''): StrengthRow => ({ group, section, pcoCount: 0, pncoCount: 0, nupCount: 0, maleCount: 0, femaleCount: 0, total: 0, personnel: [] });
export function getDivisionStrength(list: Personnel[], scope: StrengthScope = 'current', criteria: PersonnelFilterCriteria = {}) {
  const rows = new Map<string, StrengthRow>();
  const personnel = personnelInScope(list, scope).filter(p => matchesPersonnelCriteria(p, criteria));
  for (const person of personnel) {
    const { group, section } = resolveCountedOrganization(person);
    const rowKey = JSON.stringify([group, section]);
    const row = rows.get(rowKey) || emptyRow(group, section);
    const rank: RankCategory = resolvePersonnelRankCategory(person);
    row[rank === 'PCO' ? 'pcoCount' : rank === 'NUP' ? 'nupCount' : 'pncoCount']++;
    if (key(person.gender) === 'MALE') row.maleCount++;
    if (key(person.gender) === 'FEMALE') row.femaleCount++;
    row.total++; row.personnel.push(person); rows.set(rowKey, row);
  }
  const groups = new Map(DIVISION_GROUPS.map(group => [group, emptyRow(group)]));
  for (const row of rows.values()) {
    const group = groups.get(row.group) || emptyRow(row.group);
    for (const field of ['pcoCount', 'pncoCount', 'nupCount', 'maleCount', 'femaleCount', 'total'] as const) group[field] += row[field];
    group.personnel.push(...row.personnel); groups.set(row.group, group);
  }
  const groupOrder = [...groups.keys()];
  const sortedRows = [...rows.values()].sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || a.section.localeCompare(b.section));
  return { total: personnel.length, rows: sortedRows, groups: [...groups.values()] };
}
