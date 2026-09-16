import type { RankAbbr } from '../types/pais.ts';

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
  { code: 'Pat', name: 'Patrolman', category: 'PNCO', level: 1, minTigYears: 2 },
  { code: 'NUP', name: 'Non-Uniformed Personnel', category: 'NUP', level: 0, minTigYears: 3 }
];

export const UNIFORMED_RANKS: RankAbbr[] = PNP_RANKS.filter(r => r.category !== 'NUP').map(r => r.code);

export function isUniformedRank(rank?: string): boolean {
  if (!rank) return true;
  return rank !== 'NUP';
}

export const PNP_RANK_NAMES: Record<string, string> = PNP_RANKS.reduce((acc, r) => {
  acc[r.code] = r.name;
  return acc;
}, {} as Record<string, string>);

export function normalizeRankCode(rank?: string): string {
  if (!rank) return '';
  const clean = rank.trim();
  const upper = clean.toUpperCase().replace(/\s+/g, '');
  
  // PCO slash and alias normalization
  if (upper === 'P/BGEN' || upper === 'PBGEN' || upper.startsWith('POLICEBRIGADIERGENERAL')) return 'PBGEN';
  if (upper === 'P/COL' || upper === 'PCOL' || upper.startsWith('POLICECOLONEL')) return 'PCOL';
  if (upper === 'P/LCOL' || upper === 'P/LTCOL' || upper === 'PLTCOL' || upper.startsWith('POLICELIEUTENANTCOLONEL')) return 'PLTCOL';
  if (upper === 'P/MAJ' || upper === 'PMAJ' || upper.startsWith('POLICEMAJOR')) return 'PMAJ';
  if (upper === 'P/CAPT' || upper === 'P/CPT' || upper === 'PCPT' || upper.startsWith('POLICECAPTAIN')) return 'PCPT';
  if (upper === 'P/LT' || upper === 'PLT' || upper.startsWith('POLICELIEUTENANT')) return 'PLT';
  
  // Legacy generals
  if (upper === 'P/MGEN' || upper === 'PMGEN' || upper.startsWith('POLICEMAJORGENERAL')) return 'PMGEN';
  if (upper === 'P/LTGEN' || upper === 'PLTGEN' || upper.startsWith('POLICELIEUTENANTGENERAL')) return 'PLTGEN';
  if (upper === 'P/GEN' || upper === 'PGEN' || upper.startsWith('POLICEGENERAL')) return 'PGEN';
  
  // PNCO normalization
  if (upper === 'PEMS' || upper.startsWith('POLICEEXECUTIVEMASTERSERGEANT')) return 'PEMS';
  if (upper === 'PCMS' || upper.startsWith('POLICECHIEFMASTERSERGEANT')) return 'PCMS';
  if (upper === 'PSMS' || upper.startsWith('POLICESENIORMASTERSERGEANT')) return 'PSMS';
  if (upper === 'PMS' || upper === 'PMSG' || upper.startsWith('POLICEMASTERSERGEANT')) return 'PMSg';
  if (upper === 'PSSG' || upper.startsWith('POLICESTAFFSERGEANT')) return 'PSSg';
  if (upper === 'PCPL' || upper.startsWith('POLICECORPORAL')) return 'PCpl';
  if (upper === 'PAT' || upper === 'PATROLMAN' || upper === 'PATROLWOMAN' || upper.startsWith('PATROLMAN')) return 'Pat';
  if (upper === 'PO3') return 'PO3';
  if (upper === 'PO2') return 'PO2';
  if (upper === 'PO1') return 'PO1';
  
  // NUP
  if (upper === 'NUP' || upper === 'NON-UNIFORMEDPERSONNEL') return 'NUP';
  
  return clean;
}

export function getRankFullName(rank: string): string {
  const norm = normalizeRankCode(rank);
  return PNP_RANK_NAMES[norm] || PNP_RANK_NAMES[rank] || rank;
}

export function getRankInfo(rank: string): RankInfo | undefined {
  const norm = normalizeRankCode(rank);
  return PNP_RANKS.find(r => r.code === norm) || PNP_RANKS.find(r => r.code === rank);
}

export function getMinimumTigYears(rank: string): number {
  const info = getRankInfo(rank);
  return info ? info.minTigYears : 3;
}

export const RANK_CATEGORIES = ['PCO', 'PNCO', 'NUP'] as const;
export type RankCategoryValue = typeof RANK_CATEGORIES[number];

export interface RankOption {
  code: RankAbbr;
  name: string;
  label: string;
}

export const PCO_DISPLAY_RANKS: RankOption[] = [
  { code: 'PBGEN', name: 'Police Brigadier General', label: 'Police Brigadier General (PBGEN)' },
  { code: 'PCOL', name: 'Police Colonel', label: 'Police Colonel (PCOL)' },
  { code: 'PLTCOL', name: 'Police Lieutenant Colonel', label: 'Police Lieutenant Colonel (PLTCOL)' },
  { code: 'PMAJ', name: 'Police Major', label: 'Police Major (PMAJ)' },
  { code: 'PCPT', name: 'Police Captain', label: 'Police Captain (PCPT)' },
  { code: 'PLT', name: 'Police Lieutenant', label: 'Police Lieutenant (PLT)' }
];

export const PNCO_DISPLAY_RANKS: RankOption[] = [
  { code: 'PEMS', name: 'Police Executive Master Sergeant', label: 'Police Executive Master Sergeant (PEMS)' },
  { code: 'PCMS', name: 'Police Chief Master Sergeant', label: 'Police Chief Master Sergeant (PCMS)' },
  { code: 'PSMS', name: 'Police Senior Master Sergeant', label: 'Police Senior Master Sergeant (PSMS)' },
  { code: 'PMSg', name: 'Police Master Sergeant', label: 'Police Master Sergeant (PMSg)' },
  { code: 'PSSg', name: 'Police Staff Sergeant', label: 'Police Staff Sergeant (PSSg)' },
  { code: 'PCpl', name: 'Police Corporal', label: 'Police Corporal (PCpl)' },
  { code: 'Pat', name: 'Patrolman/Patrolwoman', label: 'Patrolman/Patrolwoman (Pat)' }
];

export const NUP_DISPLAY_RANKS: RankOption[] = [
  { code: 'NUP', name: 'Non-Uniformed Personnel', label: 'NUP (Non-Uniformed Personnel)' }
];

export const POSITION_CATEGORIES = ['Main', 'In Addition/Concurrent'] as const;
export type PositionCategoryValue = typeof POSITION_CATEGORIES[number];

export const UNIT_CATEGORIES = [
  'ITMS HQ',
  'Command Group',
  'P-Staff',
  'DIPO/APC',
  'D-Staff',
  'NOSU',
  'NASU',
  'PRO'
] as const;
export type UnitCategoryValue = typeof UNIT_CATEGORIES[number];

export const SUB_UNIT_CATEGORIES = [
  'Division',
  'Center',
  'Office',
  'Section',
  'Operating Unit',
  'Desk'
] as const;
export type SubUnitCategoryValue = typeof SUB_UNIT_CATEGORIES[number];

export function getPcoRanks(): RankAbbr[] {
  return PCO_DISPLAY_RANKS.map(r => r.code);
}

export function getPncoRanks(): RankAbbr[] {
  return PNCO_DISPLAY_RANKS.map(r => r.code);
}

export function getNupRanks(): RankAbbr[] {
  return NUP_DISPLAY_RANKS.map(r => r.code);
}

export function getRanksByCategory(category?: 'PCO' | 'PNCO' | 'NUP' | string): RankOption[] {
  if (category === 'PCO') return PCO_DISPLAY_RANKS;
  if (category === 'PNCO') return PNCO_DISPLAY_RANKS;
  if (category === 'NUP') return NUP_DISPLAY_RANKS;
  return [];
}

export function isRankInCategory(rank?: string, category?: string): boolean {
  if (!rank || !category) return false;
  const upperCat = category.toUpperCase();
  const upperRank = rank.trim().toUpperCase();
  const normRank = normalizeRankCode(rank);

  if (upperCat === 'PCO') {
    // 6 requested PCO ranks plus legacy star ranks (PGEN, PLTGEN, PMGEN) for backward compatibility
    const pcoList = [
      'PBGEN', 'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT',
      'P/BGEN', 'P/COL', 'P/LCOL', 'P/LTCOL', 'P/MAJ', 'P/CAPT', 'P/CPT', 'P/LT',
      'POLICE BRIGADIER GENERAL', 'POLICE COLONEL', 'POLICE LIEUTENANT COLONEL',
      'POLICE MAJOR', 'POLICE CAPTAIN', 'POLICE LIEUTENANT',
      'PMGEN', 'PLTGEN', 'PGEN', 'P/MGEN', 'P/LTGEN', 'P/GEN',
      'POLICE MAJOR GENERAL', 'POLICE LIEUTENANT GENERAL', 'POLICE GENERAL',
      'POLICE BRIGADIER GENERAL (PBGEN)',
      'POLICE COLONEL (PCOL)',
      'POLICE LIEUTENANT COLONEL (PLTCOL)',
      'POLICE MAJOR (PMAJ)',
      'POLICE CAPTAIN (PCPT)',
      'POLICE LIEUTENANT (PLT)',
      'POLICE BRIGADIER GENERAL: PBGEN',
      'POLICE COLONEL: PCOL',
      'POLICE LIEUTENANT COLONEL: PLTCOL',
      'POLICE MAJOR: PMAJ',
      'POLICE CAPTAIN: PCPT',
      'POLICE LIEUTENANT: PLT'
    ];
    return pcoList.includes(upperRank) || ['PBGEN', 'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT', 'PMGEN', 'PLTGEN', 'PGEN'].includes(normRank);
  }
  if (upperCat === 'PNCO') {
    const pncoList = [
      'PEMS', 'PCMS', 'PSMS', 'PMSG', 'PSSG', 'PCPL', 'PAT',
      'PMS', 'PO1', 'PO2', 'PO3',
      'PATROLMAN', 'PATROLWOMAN', 'PATROLMAN/PATROLWOMAN',
      'POLICE EXECUTIVE MASTER SERGEANT', 'POLICE CHIEF MASTER SERGEANT',
      'POLICE SENIOR MASTER SERGEANT', 'POLICE MASTER SERGEANT',
      'POLICE STAFF SERGEANT', 'POLICE CORPORAL',
      'POLICE EXECUTIVE MASTER SERGEANT (PEMS)',
      'POLICE CHIEF MASTER SERGEANT (PCMS)',
      'POLICE SENIOR MASTER SERGEANT (PSMS)',
      'POLICE MASTER SERGEANT (PMSG)',
      'POLICE STAFF SERGEANT (PSSG)',
      'POLICE CORPORAL (PCPL)',
      'PATROLMAN/PATROLWOMAN (PAT)',
      'PATROLMAN (PAT)',
      'POLICE EXECUTIVE MASTER SERGEANT: PEMS',
      'POLICE CHIEF MASTER SERGEANT: PCMS',
      'POLICE SENIOR MASTER SERGEANT: PSMS',
      'POLICE MASTER SERGEANT: PMSG',
      'POLICE STAFF SERGEANT: PSSG',
      'POLICE CORPORAL: PCPL',
      'PATROLMAN/PATROLWOMAN: PAT',
      'PATROLMAN: PAT'
    ];
    return pncoList.includes(upperRank) || ['PEMS', 'PCMS', 'PSMS', 'PMSg', 'PSSg', 'PCpl', 'Pat', 'PO3', 'PO2', 'PO1'].includes(normRank);
  }
  if (upperCat === 'NUP') {
    return (
      upperRank === 'NUP' ||
      normRank === 'NUP' ||
      upperRank === 'NON-UNIFORMED PERSONNEL' ||
      upperRank === 'NUP (NON-UNIFORMED PERSONNEL)' ||
      upperRank === 'NON-UNIFORMED PERSONNEL (NUP)' ||
      upperRank === 'NUP: NON-UNIFORMED PERSONNEL' ||
      upperRank === 'NON-UNIFORMED PERSONNEL: NUP'
    );
  }
  return false;
}

export function getRankCategory(rank?: string): RankCategoryValue {
  if (!rank) return 'PNCO';
  const info = getRankInfo(rank);
  if (info) return info.category;
  const norm = normalizeRankCode(rank);
  if (norm === 'NUP' || rank.toUpperCase() === 'NUP') return 'NUP';
  const pcoList = [
    'PLT', 'PCPT', 'PMAJ', 'PLTCOL', 'PCOL', 'PBGEN', 'PMGEN', 'PLTGEN', 'PGEN',
    'P/LT', 'P/CPT', 'P/CAPT', 'P/MAJ', 'P/LCOL', 'P/LTCOL', 'P/COL', 'P/BGEN', 'P/MGEN', 'P/LTGEN', 'P/GEN'
  ];
  if (pcoList.includes(rank.toUpperCase()) || pcoList.includes(norm)) return 'PCO';
  return 'PNCO';
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

