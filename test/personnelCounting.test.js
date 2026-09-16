import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePersonnelRankCategory,
  matchesPersonnelCriteria,
  filterPersonnel,
  countPersonnelByField,
  getPersonnelStrengthSummary,
  calculateCombinedCounts,
  calculate3WayCounts
} from '../src/utils/personnelCounting.ts';

const SAMPLE_PERSONNEL = [
  {
    id: 'p-1',
    rankCategory: 'PCO',
    rank: 'PCOL',
    fullName: 'Juan Dela Cruz',
    badgeNo: 'PCO-001',
    gender: 'Male',
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'ITSD',
    station: 'Camp Crame',
    designation: 'Chief, ITSD',
    status: 'Active'
  },
  {
    id: 'p-2',
    rankCategory: 'PCO',
    rank: 'PCPT',
    fullName: 'Maria Santos',
    badgeNo: 'PCO-002',
    gender: 'Female',
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'ARMD',
    station: 'Camp Crame',
    designation: 'Chief, Personnel Section',
    status: 'Active'
  },
  {
    id: 'p-3',
    rankCategory: 'PNCO',
    rank: 'PMSg',
    fullName: 'Pedro Reyes',
    badgeNo: 'PNCO-001',
    gender: 'Male',
    positionCategory: 'Main',
    unitCategory: 'PRO',
    subUnitCategory: 'Operating Unit',
    sub_unit: 'RITMD 3',
    station: 'Camp Olivas',
    designation: 'Field IT Specialist',
    status: 'Active'
  },
  {
    id: 'p-4',
    rankCategory: 'PNCO',
    rank: 'PCpl',
    fullName: 'Ana Lim',
    badgeNo: 'PNCO-002',
    gender: 'Female',
    positionCategory: 'In Addition/Concurrent',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'ITSD',
    station: '', // Empty optional station
    designation: 'Network Admin',
    status: 'Active'
  },
  {
    id: 'p-5',
    rankCategory: 'NUP',
    rank: 'NUP',
    fullName: 'Elena Roxas',
    badgeNo: 'NUP-001',
    gender: 'Female',
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'ARMD',
    station: 'Camp Crame',
    designation: 'Administrative Officer V',
    status: 'Active'
  },
  {
    id: 'p-6',
    rankCategory: 'NUP',
    rank: 'NUP',
    fullName: 'Carlos Tan',
    badgeNo: 'NUP-002',
    gender: 'Male',
    positionCategory: 'Main',
    unitCategory: 'Command Group',
    subUnitCategory: 'Office',
    sub_unit: 'ODITMS',
    // No station property specified
    designation: 'IT Officer I',
    status: 'On Leave'
  }
];

test('resolvePersonnelRankCategory auto-derives and normalizes categories correctly', () => {
  assert.equal(resolvePersonnelRankCategory({ rankCategory: 'PCO', rank: 'PCOL' }), 'PCO');
  assert.equal(resolvePersonnelRankCategory({ rank: 'PCOL' }), 'PCO');
  assert.equal(resolvePersonnelRankCategory({ rank: 'PMSg' }), 'PNCO');
  assert.equal(resolvePersonnelRankCategory({ rank: 'NUP' }), 'NUP');
  assert.equal(resolvePersonnelRankCategory({ rankCategory: 'nup' }), 'NUP');
});

test('counts personnel accurately by Rank Category (PCO, PNCO, NUP)', () => {
  const summary = getPersonnelStrengthSummary(SAMPLE_PERSONNEL);
  assert.equal(summary.totalCount, 6);
  assert.equal(summary.byRankCategory.PCO, 2);
  assert.equal(summary.byRankCategory.PNCO, 2);
  assert.equal(summary.byRankCategory.NUP, 2);
});

test('counts personnel accurately by Unit Category', () => {
  const summary = getPersonnelStrengthSummary(SAMPLE_PERSONNEL);
  assert.equal(summary.byUnitCategory['ITMS HQ'], 4);
  assert.equal(summary.byUnitCategory['PRO'], 1);
  assert.equal(summary.byUnitCategory['Command Group'], 1);
});

test('counts personnel accurately by Sub-unit Category', () => {
  const summary = getPersonnelStrengthSummary(SAMPLE_PERSONNEL);
  assert.equal(summary.bySubUnitCategory['Division'], 4);
  assert.equal(summary.bySubUnitCategory['Operating Unit'], 1);
  assert.equal(summary.bySubUnitCategory['Office'], 1);
});

test('counts personnel accurately by Sub-unit', () => {
  const summary = getPersonnelStrengthSummary(SAMPLE_PERSONNEL);
  assert.equal(summary.bySubUnit['ITSD'], 2);
  assert.equal(summary.bySubUnit['ARMD'], 2);
  assert.equal(summary.bySubUnit['RITMD 3'], 1);
  assert.equal(summary.bySubUnit['ODITMS'], 1);
});

test('counts personnel accurately by Station, handling optional and missing stations safely', () => {
  const summary = getPersonnelStrengthSummary(SAMPLE_PERSONNEL);
  assert.equal(summary.byStation['Camp Crame'], 3);
  assert.equal(summary.byStation['Camp Olivas'], 1);
  // Empty or undefined stations are counted under fallback without throwing error
  assert.equal(summary.byStation['No Station Recorded'], 2);
});

test('counts personnel accurately by Rank and Gender', () => {
  const summary = getPersonnelStrengthSummary(SAMPLE_PERSONNEL);
  assert.equal(summary.byRank['PCOL'], 1);
  assert.equal(summary.byRank['PCPT'], 1);
  assert.equal(summary.byRank['PMSg'], 1);
  assert.equal(summary.byRank['PCpl'], 1);
  assert.equal(summary.byRank['NUP'], 2);

  assert.equal(summary.byGender['Male'], 3);
  assert.equal(summary.byGender['Female'], 3);
});

test('calculates 2-way cross-tabulation matrix (Unit Category + Rank Category)', () => {
  const matrix = calculateCombinedCounts(
    SAMPLE_PERSONNEL,
    p => p.unitCategory || 'ITMS HQ',
    p => resolvePersonnelRankCategory(p)
  );

  assert.equal(matrix['ITMS HQ']['PCO'], 2);
  assert.equal(matrix['ITMS HQ']['PNCO'], 1);
  assert.equal(matrix['ITMS HQ']['NUP'], 1);
  assert.equal(matrix['PRO']['PNCO'], 1);
  assert.equal(matrix['Command Group']['NUP'], 1);
});

test('calculates 2-way cross-tabulation matrix (Rank + Gender)', () => {
  const matrix = calculateCombinedCounts(
    SAMPLE_PERSONNEL,
    p => p.rank,
    p => p.gender || 'Unspecified'
  );

  assert.equal(matrix['PCOL']['Male'], 1);
  assert.equal(matrix['PCPT']['Female'], 1);
  assert.equal(matrix['NUP']['Female'], 1);
  assert.equal(matrix['NUP']['Male'], 1);
});

test('calculates 3-way hierarchy (Unit Category + Sub-unit + Station)', () => {
  const tree = calculate3WayCounts(SAMPLE_PERSONNEL);
  assert.equal(tree['ITMS HQ']['ITSD']['Camp Crame'], 1);
  assert.equal(tree['ITMS HQ']['ITSD']['No Station Recorded'], 1);
  assert.equal(tree['ITMS HQ']['ARMD']['Camp Crame'], 2);
  assert.equal(tree['PRO']['RITMD 3']['Camp Olivas'], 1);
  assert.equal(tree['Command Group']['ODITMS']['No Station Recorded'], 1);
});

test('filters personnel with combined multi-criteria filters', () => {
  const filtered = filterPersonnel(SAMPLE_PERSONNEL, {
    unitCategory: 'ITMS HQ',
    rankCategory: 'PCO',
    gender: 'Female'
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'p-2');
  assert.equal(filtered[0].fullName, 'Maria Santos');
});

test('recalculates counts dynamically when personnel are added, modified, or removed', () => {
  let roster = [...SAMPLE_PERSONNEL];
  let summary = getPersonnelStrengthSummary(roster);
  assert.equal(summary.totalCount, 6);
  assert.equal(summary.byRankCategory.PCO, 2);

  // 1. Add new personnel (PCO)
  const newOfficer = {
    id: 'p-7',
    rankCategory: 'PCO',
    rank: 'PLTCOL',
    fullName: 'Antonio Luna',
    badgeNo: 'PCO-003',
    gender: 'Male',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'SMD',
    station: 'Camp Crame',
    designation: 'Chief, SMD',
    status: 'Active'
  };
  roster = [...roster, newOfficer];
  summary = getPersonnelStrengthSummary(roster);
  assert.equal(summary.totalCount, 7);
  assert.equal(summary.byRankCategory.PCO, 3);
  assert.equal(summary.bySubUnit['SMD'], 1);

  // 2. Modify personnel assignment/unit
  roster = roster.map(p => (p.id === 'p-1' ? { ...p, sub_unit: 'SMD' } : p));
  summary = getPersonnelStrengthSummary(roster);
  assert.equal(summary.bySubUnit['ITSD'], 1);
  assert.equal(summary.bySubUnit['SMD'], 2);

  // 3. Remove personnel
  roster = roster.filter(p => p.id !== 'p-7');
  summary = getPersonnelStrengthSummary(roster);
  assert.equal(summary.totalCount, 6);
  assert.equal(summary.byRankCategory.PCO, 2);
  assert.equal(summary.bySubUnit['SMD'], 1);
});
