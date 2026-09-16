import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRanksByCategory,
  isRankInCategory,
  getRankCategory,
  PCO_DISPLAY_RANKS,
  PNCO_DISPLAY_RANKS,
  NUP_DISPLAY_RANKS,
  getPcoRanks,
  getPncoRanks,
  getNupRanks
} from '../src/constants/ranks.ts';

test('getRanksByCategory returns exactly the 6 allowed PCO ranks', () => {
  const ranks = getRanksByCategory('PCO');
  assert.equal(ranks.length, 6);

  const expectedPcoCodes = ['PBGEN', 'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT'];
  const expectedPcoNames = [
    'Police Brigadier General',
    'Police Colonel',
    'Police Lieutenant Colonel',
    'Police Major',
    'Police Captain',
    'Police Lieutenant'
  ];

  const expectedPcoLabels = [
    'Police Brigadier General (PBGEN)',
    'Police Colonel (PCOL)',
    'Police Lieutenant Colonel (PLTCOL)',
    'Police Major (PMAJ)',
    'Police Captain (PCPT)',
    'Police Lieutenant (PLT)'
  ];

  assert.deepEqual(ranks.map(r => r.code), expectedPcoCodes);
  assert.deepEqual(ranks.map(r => r.name), expectedPcoNames);
  assert.deepEqual(ranks.map(r => r.label), expectedPcoLabels);
  assert.deepEqual(getPcoRanks(), expectedPcoCodes);
});

test('getRanksByCategory returns exactly the 7 allowed PNCO ranks', () => {
  const ranks = getRanksByCategory('PNCO');
  assert.equal(ranks.length, 7);

  const expectedPncoCodes = ['PEMS', 'PCMS', 'PSMS', 'PMSg', 'PSSg', 'PCpl', 'Pat'];
  const expectedPncoNames = [
    'Police Executive Master Sergeant',
    'Police Chief Master Sergeant',
    'Police Senior Master Sergeant',
    'Police Master Sergeant',
    'Police Staff Sergeant',
    'Police Corporal',
    'Patrolman/Patrolwoman'
  ];

  const expectedPncoLabels = [
    'Police Executive Master Sergeant (PEMS)',
    'Police Chief Master Sergeant (PCMS)',
    'Police Senior Master Sergeant (PSMS)',
    'Police Master Sergeant (PMSg)',
    'Police Staff Sergeant (PSSg)',
    'Police Corporal (PCpl)',
    'Patrolman/Patrolwoman (Pat)'
  ];

  assert.deepEqual(ranks.map(r => r.code), expectedPncoCodes);
  assert.deepEqual(ranks.map(r => r.name), expectedPncoNames);
  assert.deepEqual(ranks.map(r => r.label), expectedPncoLabels);
  assert.deepEqual(getPncoRanks(), expectedPncoCodes);
});

test('getRanksByCategory returns only NUP with strict isolation from police ranks', () => {
  const ranks = getRanksByCategory('NUP');
  assert.equal(ranks.length, 1);
  assert.equal(ranks[0].code, 'NUP');
  assert.equal(ranks[0].name, 'Non-Uniformed Personnel');
  assert.equal(ranks[0].label, 'NUP (Non-Uniformed Personnel)');

  // Verify NUP never contains any police ranks
  const pcoCodes = PCO_DISPLAY_RANKS.map(r => r.code);
  const pncoCodes = PNCO_DISPLAY_RANKS.map(r => r.code);
  for (const r of ranks) {
    assert.equal(pcoCodes.includes(r.code), false);
    assert.equal(pncoCodes.includes(r.code), false);
  }
  assert.deepEqual(getNupRanks(), ['NUP']);
});

test('getRanksByCategory returns an empty array for undefined or invalid category', () => {
  assert.deepEqual(getRanksByCategory(undefined), []);
  assert.deepEqual(getRanksByCategory(''), []);
  assert.deepEqual(getRanksByCategory('CIVILIAN'), []);
});

test('isRankInCategory validates allowed PCO, PNCO, and NUP pairings', () => {
  // PCO valid tests
  assert.equal(isRankInCategory('PBGEN', 'PCO'), true);
  assert.equal(isRankInCategory('PCOL', 'PCO'), true);
  assert.equal(isRankInCategory('PLTCOL', 'PCO'), true);
  assert.equal(isRankInCategory('PMAJ', 'PCO'), true);
  assert.equal(isRankInCategory('PCPT', 'PCO'), true);
  assert.equal(isRankInCategory('PLT', 'PCO'), true);
  assert.equal(isRankInCategory('Police Brigadier General', 'PCO'), true);
  assert.equal(isRankInCategory('Police Colonel', 'PCO'), true);
  assert.equal(isRankInCategory('Police Brigadier General (PBGEN)', 'PCO'), true);
  assert.equal(isRankInCategory('Police Colonel (PCOL)', 'PCO'), true);
  assert.equal(isRankInCategory('Police Brigadier General: PBGEN', 'PCO'), true);
  assert.equal(isRankInCategory('Police Colonel: PCOL', 'PCO'), true);
  assert.equal(isRankInCategory('Police Lieutenant Colonel: PLTCOL', 'PCO'), true);
  assert.equal(isRankInCategory('Police Major: PMAJ', 'PCO'), true);
  assert.equal(isRankInCategory('Police Captain: PCPT', 'PCO'), true);
  assert.equal(isRankInCategory('Police Lieutenant: PLT', 'PCO'), true);

  // PNCO valid tests
  assert.equal(isRankInCategory('PEMS', 'PNCO'), true);
  assert.equal(isRankInCategory('PCMS', 'PNCO'), true);
  assert.equal(isRankInCategory('PSMS', 'PNCO'), true);
  assert.equal(isRankInCategory('PMSg', 'PNCO'), true);
  assert.equal(isRankInCategory('PSSg', 'PNCO'), true);
  assert.equal(isRankInCategory('PCpl', 'PNCO'), true);
  assert.equal(isRankInCategory('Pat', 'PNCO'), true);
  assert.equal(isRankInCategory('Patrolman/Patrolwoman', 'PNCO'), true);
  assert.equal(isRankInCategory('Patrolman', 'PNCO'), true);
  assert.equal(isRankInCategory('Police Corporal', 'PNCO'), true);
  assert.equal(isRankInCategory('Police Executive Master Sergeant (PEMS)', 'PNCO'), true);
  assert.equal(isRankInCategory('Patrolman/Patrolwoman (Pat)', 'PNCO'), true);
  assert.equal(isRankInCategory('Police Executive Master Sergeant: PEMS', 'PNCO'), true);
  assert.equal(isRankInCategory('Patrolman/Patrolwoman: Pat', 'PNCO'), true);

  // NUP valid tests
  assert.equal(isRankInCategory('NUP', 'NUP'), true);
  assert.equal(isRankInCategory('Non-Uniformed Personnel', 'NUP'), true);
  assert.equal(isRankInCategory('NUP (Non-Uniformed Personnel)', 'NUP'), true);
  assert.equal(isRankInCategory('NUP: Non-Uniformed Personnel', 'NUP'), true);
});

test('isRankInCategory preserves backward compatibility for legacy general star ranks in PCO', () => {
  assert.equal(isRankInCategory('PMGEN', 'PCO'), true);
  assert.equal(isRankInCategory('PLTGEN', 'PCO'), true);
  assert.equal(isRankInCategory('PGEN', 'PCO'), true);
  assert.equal(isRankInCategory('Police General', 'PCO'), true);
});

test('isRankInCategory strictly rejects cross-category mismatches', () => {
  // PCO rank under PNCO or NUP
  assert.equal(isRankInCategory('PCOL', 'PNCO'), false);
  assert.equal(isRankInCategory('PCOL', 'NUP'), false);
  assert.equal(isRankInCategory('PBGEN', 'PNCO'), false);
  assert.equal(isRankInCategory('PCPT', 'PNCO'), false);

  // PNCO rank under PCO or NUP
  assert.equal(isRankInCategory('PCpl', 'PCO'), false);
  assert.equal(isRankInCategory('PCpl', 'NUP'), false);
  assert.equal(isRankInCategory('Pat', 'PCO'), false);
  assert.equal(isRankInCategory('PEMS', 'PCO'), false);

  // NUP under PCO or PNCO
  assert.equal(isRankInCategory('NUP', 'PCO'), false);
  assert.equal(isRankInCategory('NUP', 'PNCO'), false);

  // Blank / undefined inputs
  assert.equal(isRankInCategory('', 'PCO'), false);
  assert.equal(isRankInCategory('PCOL', ''), false);
  assert.equal(isRankInCategory(undefined, 'PCO'), false);
  assert.equal(isRankInCategory('PCOL', undefined), false);
});

test('simulates dependent dropdown auto-clearing logic on category change', () => {
  // User starts with PCO and PCOL selected
  let currentCategory = 'PCO';
  let currentRank = 'PCOL';

  // Category changes to PNCO: previously selected PCOL must be cleared
  let newCategory = 'PNCO';
  if (!isRankInCategory(currentRank, newCategory)) {
    currentRank = '';
  }
  assert.equal(currentRank, '');

  // User selects PCpl in PNCO
  currentCategory = newCategory;
  currentRank = 'PCpl';
  assert.equal(isRankInCategory(currentRank, currentCategory), true);

  // Category changes to NUP: previously selected PCpl must be cleared
  newCategory = 'NUP';
  if (newCategory === 'NUP') {
    currentRank = 'NUP';
  } else if (!isRankInCategory(currentRank, newCategory)) {
    currentRank = '';
  }
  assert.equal(currentRank, 'NUP');
  assert.equal(isRankInCategory(currentRank, newCategory), true);
});

test('getRankCategory correctly resolves categories for personnel counting and legacy records', () => {
  assert.equal(getRankCategory('PBGEN'), 'PCO');
  assert.equal(getRankCategory('PCOL'), 'PCO');
  assert.equal(getRankCategory('PGEN'), 'PCO');
  assert.equal(getRankCategory('PEMS'), 'PNCO');
  assert.equal(getRankCategory('PCpl'), 'PNCO');
  assert.equal(getRankCategory('Pat'), 'PNCO');
  assert.equal(getRankCategory('NUP'), 'NUP');
});

test('handles PNP database slash-formatted ranks and legacy abbreviations', () => {
  // PCO slash ranks in DB
  const pcoSlashRanks = ['P/BGEN', 'P/COL', 'P/LCOL', 'P/LTCOL', 'P/MAJ', 'P/CAPT', 'P/CPT', 'P/LT', 'P/MGEN', 'P/LTGEN', 'P/GEN'];
  for (const rank of pcoSlashRanks) {
    assert.equal(isRankInCategory(rank, 'PCO'), true, `Expected ${rank} to be in PCO`);
    assert.equal(isRankInCategory(rank, 'PNCO'), false, `Expected ${rank} NOT to be in PNCO`);
    assert.equal(isRankInCategory(rank, 'NUP'), false, `Expected ${rank} NOT to be in NUP`);
    assert.equal(getRankCategory(rank), 'PCO', `Expected ${rank} category to be PCO`);
  }

  // Legacy PNCO ranks in DB
  const pncoLegacyRanks = ['PMS', 'PO1', 'PO2', 'PO3'];
  for (const rank of pncoLegacyRanks) {
    assert.equal(isRankInCategory(rank, 'PNCO'), true, `Expected ${rank} to be in PNCO`);
    assert.equal(isRankInCategory(rank, 'PCO'), false, `Expected ${rank} NOT to be in PCO`);
    assert.equal(isRankInCategory(rank, 'NUP'), false, `Expected ${rank} NOT to be in NUP`);
    assert.equal(getRankCategory(rank), 'PNCO', `Expected ${rank} category to be PNCO`);
  }
});
