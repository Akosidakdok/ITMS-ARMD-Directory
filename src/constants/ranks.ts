import { RankAbbr } from '../types/pais';

export interface RankInfo {
  code: RankAbbr;
  name: string;
  category: 'PCO' | 'PNCO' | 'NUP';
  level: number; // 1 lowest (Pat), 16 highest (PGEN)
  minTigYears: number; // Minimum Time-in-Grade required for promotion eligibility
}

export const PNP_RANKS: RankInfo[] = [
  { code: 'PGEN', name: 'Police General', category: 'PCO', level: 16, minTigYears: 3 },
  { code: 'PLTGEN', name: 'Police Lieutenant General', category: 'PCO', level: 15, minTigYears: 3 },
  { code: 'PMGEN', name: 'Police Major General', category: 'PCO', level: 14, minTigYears: 3 },
  { code: 'PBGEN', name: 'Police Brigadier General', category: 'PCO', level: 13, minTigYears: 3 },
  { code: 'PCOL', name: 'Police Colonel', category: 'PCO', level: 12, minTigYears: 3 },
  { code: 'PLTCOL', name: 'Police Lieutenant Colonel', category: 'PCO', level: 11, minTigYears: 3 },
  { code: 'PMAJ', name: 'Police Major', category: 'PCO', level: 10, minTigYears: 3 },
  { code: 'PCPT', name: 'Police Captain', category: 'PCO', level: 9, minTigYears: 3 },
  { code: 'PLT', name: 'Police Lieutenant', category: 'PCO', level: 8, minTigYears: 3 },
  { code: 'PEMS', name: 'Police Executive Master Sergeant', category: 'PNCO', level: 7, minTigYears: 2 },
  { code: 'PCMS', name: 'Police Chief Master Sergeant', category: 'PNCO', level: 6, minTigYears: 2 },
  { code: 'PSMS', name: 'Police Senior Master Sergeant', category: 'PNCO', level: 5, minTigYears: 2 },
  { code: 'PMSg', name: 'Police Master Sergeant', category: 'PNCO', level: 4, minTigYears: 2 },
  { code: 'PSSg', name: 'Police Staff Sergeant', category: 'PNCO', level: 3, minTigYears: 2 },
  { code: 'PCpl', name: 'Police Corporal', category: 'PNCO', level: 2, minTigYears: 2 },
  { code: 'Pat', name: 'Patrolman/Patrolwoman', category: 'PNCO', level: 1, minTigYears: 2 },
  { code: 'NUP', name: 'Non-Uniformed Personnel', category: 'NUP', level: 0, minTigYears: 3 }
];

export const PNP_RANK_NAMES: Record<string, string> = PNP_RANKS.reduce((acc, r) => {
  acc[r.code] = r.name;
  return acc;
}, {} as Record<string, string>);

export function getRankFullName(rank: string): string {
  return PNP_RANK_NAMES[rank] || rank;
}

export function getRankInfo(rank: string): RankInfo | undefined {
  return PNP_RANKS.find(r => r.code === rank);
}

export function getMinimumTigYears(rank: string): number {
  const info = getRankInfo(rank);
  return info ? info.minTigYears : 3;
}

/**
 * Returns the next logical rank in promotional hierarchy, or null if highest / NUP
 */
export function getNextRank(currentRank: string): RankAbbr | null {
  const currentIndex = PNP_RANKS.findIndex(r => r.code === currentRank);
  if (currentIndex <= 0) return null; // Already highest or not found
  if (currentRank === 'NUP') return null;
  return PNP_RANKS[currentIndex - 1].code;
}
