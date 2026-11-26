import type { Personnel } from '../types/pais.ts';

export type StrengthScope = 'current' | 'all' | 'retired';
export const DIVISION_GROUPS = ['Command Group', 'ARMD HQ', 'ARMD, PHAS', 'ITPMD HQ', 'ITPMD Detailed', 'ITSD', 'SMD', 'ISSD', 'PTD', 'DMD'];
const clean = (value?: string) => String(value || '').trim().replace(/\s+/g, ' ');
const key = (value?: string) => clean(value).toUpperCase();
const organizationByCode: Record<string, string> = {
  C021: 'OD', C022: 'ODDA', C024: 'OCS', C0214: 'PIO', C0215: 'CI',
  C0219: 'Office of the Deputy Director', C0225: 'Office of the Deputy Director for IT Matters',
  C0216: 'ARMD', C0224: 'ITPMD', C0221: 'ITSD', C0222: 'SMD', C025: 'SMD',
  C0223: 'ISSD', C0210: 'PTD', C029: 'DMD'
};
const aliases: Record<string, string> = {
  'OFFICE OF THE DIRECTOR': 'OD', 'OFFICE OF THE CHIEF OF STAFF': 'OCS',
  'OFFICE OF THE DEPUTY DIRECTOR FOR ADMINISTRATION': 'ODDA',
  'POLICE COMMUNITY RELATION/ PUBLIC INFORMATION OFFICE': 'PIO', 'INSPECTORATE OFFICE': 'CI',
  'ADMINISTRATIVE AND RESOURCE MANAGEMENT DIVISION': 'ARMD',
  'INFORMATION TECHNOLOGY PROGRAM MANAGEMENT DIVISION': 'ITPMD', ITMPD: 'ITPMD',
  'INFORMATION TECHNICAL SUPPORT DIVISION': 'ITSD',
  'SYSTEM MANAGEMENT DIVISION': 'SMD', 'SYSTEMS MANAGEMENT DIVISION': 'SMD',
  'INFORMATION SYSTEM SECURITY DIVISION': 'ISSD',
  'PLANS AND TRAINING DIVISION': 'PTD', 'DATA MANAGEMENT DIVISION': 'DMD'
};
export function normalizeOrganization(name?: string, code?: string): string {
  return organizationByCode[key(code)] || aliases[key(name)] || clean(name);
}
export function isRetired(person: Pick<Personnel, 'status' | 'pstatus'>): boolean {
  return /^retired$|^(optional|compulsory) retirement$/i.test(clean(person.status || person.pstatus));
}
export function personnelInScope(list: Personnel[], scope: StrengthScope): Personnel[] {
  const seen = new Set<string>();
  return list.filter(person => {
    if (seen.has(person.id)) return false;
    seen.add(person.id);
    return scope === 'all' || (scope === 'retired' ? isRetired(person) : !isRetired(person));
  });
}
export const getPersonnelDesignations = (person: Personnel): string =>
  [...new Set([person.designation, ...(person.additionalDesignations || [])].map(clean).filter(Boolean))].join(' / ');

export function getPersonnelCountedUnit(person: Personnel): string {
  return normalizeOrganization(person.countedUnit) || normalizeOrganization(person.sub_unit || person.division || person.officeDivision, person.subUnitCode);
}

export function resolveCountedOrganization(person: Personnel): { group: string; section: string; countedUnit: string; needsReview: boolean } {
  const home = normalizeOrganization(person.sub_unit || person.division || person.officeDivision, person.subUnitCode);
  const destination = getPersonnelCountedUnit(person);
  const station = clean(person.station);
  let group = destination;
  let section = station || 'HQ / Section not recorded';
  let needsReview = false;
  if (!destination) {
    group = 'Needs assignment'; section = 'Home sub-unit not recorded';
  } else if (['OD', 'ODDA', 'OCS', 'CI', 'PIO', 'PSMU', 'Office of the Deputy Director', 'Office of the Deputy Director for IT Matters'].includes(destination)) {
    group = 'Command Group'; section = destination;
  } else if (destination === 'Command Group') {
    section = station || 'Office not recorded';
  } else if (destination === 'ARMD') {
    group = /personnel holding.*accounting|^PHAS$/i.test(station) ? 'ARMD, PHAS' : 'ARMD HQ';
  } else if (destination === 'ITPMD') {
    const isDetailed = person.dutyAssignments?.some(a => a.kind === 'Detail');
    group = isDetailed ? 'ITPMD Detailed' : 'ITPMD HQ';
  } else if (destination !== home) {
    section = destination;
    // Retain ITPMD's detailed personnel under their home reporting group,
    // with the explicitly credited unit as its child (e.g. NCRPO).
    if (home === 'ITPMD') group = 'ITPMD Detailed';
  }
  if (!DIVISION_GROUPS.includes(group) && group !== 'Needs assignment') {
    needsReview = true;
    group = 'Other units / Needs mapping'; section = destination;
  }
  return { group, section, countedUnit: destination || 'Needs assignment', needsReview };
}

