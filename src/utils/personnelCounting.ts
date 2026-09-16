import type { Personnel, RankCategory, PositionCategory, UnitCategory } from '../types/pais.ts';
import { getRankCategory, normalizeRankCode } from '../constants/ranks.ts';

export interface PersonnelFilterCriteria {
  unitCategory?: string;
  subUnitCategory?: string;
  sub_unit?: string;
  station?: string;
  rankCategory?: string;
  rank?: string;
  gender?: string;
  positionCategory?: string;
  status?: string;
  search?: string;
}

export interface PersonnelStrengthSummary {
  totalCount: number;
  filteredCount: number;
  byRankCategory: {
    PCO: number;
    PNCO: number;
    NUP: number;
    [key: string]: number;
  };
  byUnitCategory: Record<string, number>;
  bySubUnitCategory: Record<string, number>;
  bySubUnit: Record<string, number>;
  byStation: Record<string, number>;
  byRank: Record<string, number>;
  byGender: {
    Male: number;
    Female: number;
    [key: string]: number;
  };
  byPositionCategory: {
    Main: number;
    'In Addition/Concurrent': number;
    [key: string]: number;
  };
}

/**
 * Resolves a reliable, normalized rankCategory from a personnel record.
 */
export function resolvePersonnelRankCategory(person: Partial<Personnel>): RankCategory {
  if (person.rank) {
    const catFromRank = getRankCategory(person.rank);
    if (catFromRank === 'PCO' || catFromRank === 'NUP') return catFromRank;
  }
  if (person.rankCategory) {
    const rc = String(person.rankCategory).toUpperCase();
    if (rc === 'PCO' || rc === 'PNCO' || rc === 'NUP') return rc as RankCategory;
  }
  return getRankCategory(person.rank);
}

/**
 * Normalizes an assignment field value for grouping, handling null/undefined/empty string.
 */
export function normalizeGroupValue(value?: string | null, fallback = 'Unspecified'): string {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Evaluates whether a personnel record satisfies the specified filter criteria.
 */
export function matchesPersonnelCriteria(person: Personnel, criteria: PersonnelFilterCriteria): boolean {
  // Category of Unit
  if (criteria.unitCategory && criteria.unitCategory !== 'ALL') {
    const uc = normalizeGroupValue(person.unitCategory, 'ITMS HQ');
    if (uc.toLowerCase() !== criteria.unitCategory.trim().toLowerCase()) return false;
  }

  // Sub-unit Category
  if (criteria.subUnitCategory && criteria.subUnitCategory !== 'ALL') {
    const suc = normalizeGroupValue(person.subUnitCategory, 'Division');
    if (suc.toLowerCase() !== criteria.subUnitCategory.trim().toLowerCase()) return false;
  }

  // Sub-unit
  if (criteria.sub_unit && criteria.sub_unit !== 'ALL') {
    const su = normalizeGroupValue(person.sub_unit || person.division, 'Unassigned');
    if (su.toLowerCase() !== criteria.sub_unit.trim().toLowerCase()) return false;
  }

  // Station
  if (criteria.station && criteria.station !== 'ALL') {
    const st = normalizeGroupValue(person.station, 'No Station Recorded');
    if (st.toLowerCase() !== criteria.station.trim().toLowerCase()) return false;
  }

  // Category of Rank
  if (criteria.rankCategory && criteria.rankCategory !== 'ALL') {
    const rc = resolvePersonnelRankCategory(person);
    if (rc.toLowerCase() !== criteria.rankCategory.trim().toLowerCase()) return false;
  }

  // Rank
  if (criteria.rank && criteria.rank !== 'ALL') {
    const normCrit = normalizeRankCode(criteria.rank);
    const normPerson = normalizeRankCode(person.rank);
    if (person.rank?.toLowerCase() !== criteria.rank.trim().toLowerCase() && normPerson !== normCrit) return false;
  }

  // Gender
  if (criteria.gender && criteria.gender !== 'ALL') {
    const g = normalizeGroupValue(person.gender, 'Unspecified');
    if (g.toLowerCase() !== criteria.gender.trim().toLowerCase()) return false;
  }

  // Position Category
  if (criteria.positionCategory && criteria.positionCategory !== 'ALL') {
    const pc = normalizeGroupValue(person.positionCategory, 'Main');
    if (pc.toLowerCase() !== criteria.positionCategory.trim().toLowerCase()) return false;
  }

  // Status
  if (criteria.status && criteria.status !== 'ALL') {
    if (person.status?.toLowerCase() !== criteria.status.trim().toLowerCase()) return false;
  }

  // Search keyword across multiple fields
  if (criteria.search && criteria.search.trim()) {
    const q = criteria.search.trim().toLowerCase();
    const searchable = [
      person.fullName,
      person.badgeNo,
      person.rank,
      person.designation,
      person.sub_unit,
      person.details,
      person.station,
      person.unitCategory
    ].filter(Boolean).join(' ').toLowerCase();
    if (!searchable.includes(q)) return false;
  }

  return true;
}

/**
 * Filters a personnel list based on any combination of criteria.
 */
export function filterPersonnel(list: Personnel[], criteria: PersonnelFilterCriteria): Personnel[] {
  return list.filter(person => matchesPersonnelCriteria(person, criteria));
}

/**
 * Counts personnel grouped by any specific field.
 */
export function countPersonnelByField(
  list: Personnel[],
  fieldAccessor: (person: Personnel) => string
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const person of list) {
    const key = fieldAccessor(person);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Calculates a complete strength summary and breakdowns for a personnel roster.
 */
export function getPersonnelStrengthSummary(
  list: Personnel[],
  activeCriteria: PersonnelFilterCriteria = {}
): PersonnelStrengthSummary {
  const filtered = filterPersonnel(list, activeCriteria);

  const byRankCategory: { PCO: number; PNCO: number; NUP: number; [key: string]: number } = {
    PCO: 0,
    PNCO: 0,
    NUP: 0
  };

  const byGender: { Male: number; Female: number; [key: string]: number } = {
    Male: 0,
    Female: 0
  };

  const byPositionCategory: { Main: number; 'In Addition/Concurrent': number; [key: string]: number } = {
    Main: 0,
    'In Addition/Concurrent': 0
  };

  const byUnitCategory: Record<string, number> = {};
  const bySubUnitCategory: Record<string, number> = {};
  const bySubUnit: Record<string, number> = {};
  const byStation: Record<string, number> = {};
  const byRank: Record<string, number> = {};

  for (const p of filtered) {
    // Rank Category
    const rc = resolvePersonnelRankCategory(p);
    byRankCategory[rc] = (byRankCategory[rc] || 0) + 1;

    // Gender
    const g = normalizeGroupValue(p.gender, 'Unspecified');
    byGender[g] = (byGender[g] || 0) + 1;

    // Position Category
    const pc = normalizeGroupValue(p.positionCategory, 'Main');
    byPositionCategory[pc] = (byPositionCategory[pc] || 0) + 1;

    // Unit Category
    const uc = normalizeGroupValue(p.unitCategory, 'ITMS HQ');
    byUnitCategory[uc] = (byUnitCategory[uc] || 0) + 1;

    // Sub-unit Category
    const suc = normalizeGroupValue(p.subUnitCategory, 'Division');
    bySubUnitCategory[suc] = (bySubUnitCategory[suc] || 0) + 1;

    // Sub-unit
    const su = normalizeGroupValue(p.sub_unit || p.division, 'Unassigned');
    bySubUnit[su] = (bySubUnit[su] || 0) + 1;

    // Station
    const st = normalizeGroupValue(p.station, 'No Station Recorded');
    byStation[st] = (byStation[st] || 0) + 1;

    // Rank
    const r = p.rank || 'Unassigned';
    byRank[r] = (byRank[r] || 0) + 1;
  }

  return {
    totalCount: list.length,
    filteredCount: filtered.length,
    byRankCategory,
    byUnitCategory,
    bySubUnitCategory,
    bySubUnit,
    byStation,
    byRank,
    byGender,
    byPositionCategory
  };
}

/**
 * Calculates combined 2-way cross-tabulation (matrix) counts (e.g. Unit Category + Rank Category, Rank + Gender).
 */
export function calculateCombinedCounts(
  list: Personnel[],
  primaryAccessor: (p: Personnel) => string,
  secondaryAccessor: (p: Personnel) => string
): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const person of list) {
    const row = primaryAccessor(person);
    const col = secondaryAccessor(person);
    if (!matrix[row]) matrix[row] = {};
    matrix[row][col] = (matrix[row][col] || 0) + 1;
  }
  return matrix;
}

/**
 * Calculates combined 3-way hierarchical counts (e.g. Unit Category + Sub-unit + Station).
 */
export function calculate3WayCounts(
  list: Personnel[]
): Record<string, Record<string, Record<string, number>>> {
  const tree: Record<string, Record<string, Record<string, number>>> = {};
  for (const person of list) {
    const uc = normalizeGroupValue(person.unitCategory, 'ITMS HQ');
    const su = normalizeGroupValue(person.sub_unit || person.division, 'Unassigned');
    const st = normalizeGroupValue(person.station, 'No Station Recorded');

    if (!tree[uc]) tree[uc] = {};
    if (!tree[uc][su]) tree[uc][su] = {};
    tree[uc][su][st] = (tree[uc][su][st] || 0) + 1;
  }
  return tree;
}
