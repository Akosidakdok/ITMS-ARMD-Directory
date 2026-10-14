import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { generateExcelExport } from '../backend/services/worksheetDataService.js';
import { buildPersonnelRosterXlsx } from '../src/utils/personnelExport.ts';
import { buildReportXlsxBuffer } from '../src/utils/reportsExport.ts';
import { calculateTimeInGrade } from '../src/utils/timeInGrade.ts';

test('PARITY 1: Worksheet disposition exports real DATEDIF formulas for Alpha List', async () => {
  const buffer = await generateExcelExport('Alpha List');
  assert.ok(buffer.length > 0, 'Export buffer generated');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet('Alpha List');
  assert.ok(ws, 'Alpha List worksheet exists');

  // Verify Row 9 & 10 contain DATEDIF formulas, not static numbers
  const i9 = ws.getCell('I9');
  const i10 = ws.getCell('I10');
  const k9 = ws.getCell('K9');
  const k10 = ws.getCell('K10');

  assert.ok(i9.value && typeof i9.value === 'object' && i9.value.formula, 'I9 must have formula');
  assert.match(i9.value.formula, /DATEDIF\(J9,TODAY\(\)/, 'I9 formula matches PAIS age calculation');

  assert.ok(i10.value && typeof i10.value === 'object' && i10.value.formula, 'I10 must have formula');
  assert.match(i10.value.formula, /DATEDIF\(J10,TODAY\(\)/, 'I10 formula matches PAIS age calculation');

  assert.ok(k9.value && typeof k9.value === 'object' && k9.value.formula, 'K9 must have formula');
  assert.match(k9.value.formula, /DATEDIF\(L9,TODAY\(\)/, 'K9 formula matches PAIS service calculation');

  assert.ok(k10.value && typeof k10.value === 'object' && k10.value.formula, 'K10 must have formula');
  assert.match(k10.value.formula, /DATEDIF\(L10,TODAY\(\)/, 'K10 formula matches PAIS service calculation');
});

test('PARITY 2: Personnel roster export generates dynamic COUNTA and COUNTIF summary formulas', async () => {
  const mockPersonnel = [
    {
      id: 'p-1',
      rank: 'PCOL',
      rankCategory: 'PCO',
      lastName: 'Dela Cruz',
      firstName: 'Juan',
      gender: 'Male',
      pstatus: 'ON DUTY/ACTIVE',
      badgeNo: '00101'
    },
    {
      id: 'p-2',
      rank: 'PCpl',
      rankCategory: 'PNCO',
      lastName: 'Santos',
      firstName: 'Maria',
      gender: 'Female',
      pstatus: 'ON DUTY/ACTIVE',
      badgeNo: '00102'
    },
    {
      id: 'p-3',
      rank: 'NUP',
      rankCategory: 'NUP',
      lastName: 'Reyes',
      firstName: 'Ana',
      gender: 'Female',
      pstatus: 'Active',
      badgeNo: 'SG-11'
    }
  ];

  const buffer = await buildPersonnelRosterXlsx(mockPersonnel);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  // Data rows are 9, 10, 11. Row 12 is separator.
  // Summary Row 13: Headcount & Male
  const totalCell = ws.getCell('G13');
  assert.ok(totalCell.value && totalCell.value.formula, 'Total personnel cell must have formula');
  assert.equal(totalCell.value.formula, 'COUNTA(G9:G11)');
  assert.equal(totalCell.value.result, 3);

  const maleCell = ws.getCell('AF13');
  assert.ok(maleCell.value && maleCell.value.formula, 'Male count cell must have formula');
  assert.match(maleCell.value.formula, /COUNTIF\(AF9:AF11/);
  assert.equal(maleCell.value.result, 1);

  // Summary Row 14: PCO Officers & Female
  const pcoCell = ws.getCell('G14');
  assert.ok(pcoCell.value && pcoCell.value.formula, 'PCO count must have formula');
  assert.equal(pcoCell.value.result, 1);

  const femaleCell = ws.getCell('AF14');
  assert.ok(femaleCell.value && femaleCell.value.formula, 'Female count must have formula');
  assert.equal(femaleCell.value.result, 2);

  // Summary Row 15: PNCO
  const pncoCell = ws.getCell('G15');
  assert.equal(pncoCell.value.result, 1);

  // Summary Row 16: NUP
  const nupCell = ws.getCell('G16');
  assert.equal(nupCell.value.result, 1);
});

test('PARITY 3: Strength counting report exports SUM formulas per row and summary totals', async () => {
  const strengthData = [
    {
      unitCategory: 'ITMS HQ',
      subUnitCategory: 'Division',
      sub_unit: 'ARMD',
      station: 'HQ Base',
      pcoCount: 4,
      pncoCount: 16,
      nupCount: 5,
      maleCount: 18,
      femaleCount: 7,
      total: 25 // 4 + 16 + 5 = 25
    },
    {
      unitCategory: 'ITMS HQ',
      subUnitCategory: 'Division',
      sub_unit: 'ITOD',
      station: 'HQ Base',
      pcoCount: 6,
      pncoCount: 24,
      nupCount: 2,
      maleCount: 20,
      femaleCount: 12,
      total: 32 // 6 + 24 + 2 = 32
    }
  ];

  const columns = [
    { key: 'unitCategory', label: 'Unit Category' },
    { key: 'subUnitCategory', label: 'Sub-unit Category' },
    { key: 'sub_unit', label: 'Sub-Unit' },
    { key: 'station', label: 'Station' },
    { key: 'pcoCount', label: 'PCO' },
    { key: 'pncoCount', label: 'PNCO' },
    { key: 'nupCount', label: 'NUP' },
    { key: 'maleCount', label: 'Male' },
    { key: 'femaleCount', label: 'Female' },
    { key: 'total', label: 'Total Strength' }
  ];

  const buffer = await buildReportXlsxBuffer(
    'PNP ITMS Automated Personnel Strength & Deployment Audit',
    strengthData,
    columns,
    'strength_counting'
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  // Row 1: Title, Row 2: Headers, Row 3: ARMD, Row 4: ITOD, Row 5: Summary Total
  const armdTotal = ws.getCell('J3');
  assert.ok(armdTotal.value && armdTotal.value.formula, 'ARMD total strength must have formula');
  assert.equal(armdTotal.value.formula, 'SUM(E3:G3)');
  assert.equal(armdTotal.value.result, 25);

  const itodTotal = ws.getCell('J4');
  assert.ok(itodTotal.value && itodTotal.value.formula, 'ITOD total strength must have formula');
  assert.equal(itodTotal.value.formula, 'SUM(E4:G4)');
  assert.equal(itodTotal.value.result, 32);

  // Grand summary row 5
  const grandPco = ws.getCell('E5');
  assert.equal(grandPco.value.formula, 'SUM(E3:E4)');
  assert.equal(grandPco.value.result, 10);

  const grandPnco = ws.getCell('F5');
  assert.equal(grandPnco.value.formula, 'SUM(F3:F4)');
  assert.equal(grandPnco.value.result, 40);

  const grandNup = ws.getCell('G5');
  assert.equal(grandNup.value.formula, 'SUM(G3:G4)');
  assert.equal(grandNup.value.result, 7);

  const grandMale = ws.getCell('H5');
  assert.equal(grandMale.value.formula, 'SUM(H3:H4)');
  assert.equal(grandMale.value.result, 38);

  const grandFemale = ws.getCell('I5');
  assert.equal(grandFemale.value.formula, 'SUM(I3:I4)');
  assert.equal(grandFemale.value.result, 19);

  const grandTotal = ws.getCell('J5');
  assert.equal(grandTotal.value.formula, 'SUM(J3:J4)');
  assert.equal(grandTotal.value.result, 57);
});

test('PARITY 4: Time-In-Grade and promotion eligibility export matches PAIS rules and formulas', async () => {
  const p1Tig = calculateTimeInGrade('2021-04-15'); // > 3 years -> ELIGIBLE
  const p2Tig = calculateTimeInGrade('2025-01-10'); // < 2 years -> Accruing
  const p3Tig = calculateTimeInGrade(''); // No date -> N/A

  const promoData = [
    {
      id: 'p-1',
      rank: 'PCOL',
      fullName: 'Dela Cruz, Juan M.',
      badgeNo: '00101',
      sub_unit: 'ARMD',
      lastPromotionDate: '2021-04-15',
      timeInGrade: p1Tig.formatted,
      eligible: p1Tig.eligibleForPromotion ? 'ELIGIBLE' : 'Accruing'
    },
    {
      id: 'p-2',
      rank: 'PCpl',
      fullName: 'Santos, Maria P.',
      badgeNo: '00102',
      sub_unit: 'ITOD',
      lastPromotionDate: '2025-01-10',
      timeInGrade: p2Tig.formatted,
      eligible: p2Tig.eligibleForPromotion ? 'ELIGIBLE' : 'Accruing'
    },
    {
      id: 'p-3',
      rank: 'Pat',
      fullName: 'Reyes, Pedro L.',
      badgeNo: '00103',
      sub_unit: 'SMD',
      lastPromotionDate: '',
      timeInGrade: 'N/A',
      eligible: 'N/A'
    }
  ];

  const columns = [
    { key: 'rank', label: 'Rank' },
    { key: 'fullName', label: 'Full Name' },
    { key: 'badgeNo', label: 'Badge No.' },
    { key: 'sub_unit', label: 'Sub-Unit' },
    { key: 'lastPromotionDate', label: 'Last Promoted' },
    { key: 'timeInGrade', label: 'Computed TIG' },
    { key: 'eligible', label: 'Board Status' }
  ];

  const buffer = await buildReportXlsxBuffer(
    'PNP ITMS Time-In-Grade (TIG) & Promotion Eligibility Roster',
    promoData,
    columns,
    'promotion'
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  // Row 3: PCOL Dela Cruz (Col F: TIG formula, Col G: Board Status formula)
  const f3 = ws.getCell('F3');
  assert.ok(f3.value && f3.value.formula, 'F3 must have TIG formula');
  assert.match(f3.value.formula, /DATEDIF\(E3,TODAY\(\),"y"\)/);
  assert.equal(f3.value.result, p1Tig.formatted);

  const g3 = ws.getCell('G3');
  assert.ok(g3.value && g3.value.formula, 'G3 must have status formula');
  assert.match(g3.value.formula, /IF\(DATEDIF\(E3,TODAY\(\),"y"\)/);
  assert.equal(g3.value.result, 'ELIGIBLE');

  // Row 4: PCpl Santos
  const g4 = ws.getCell('G4');
  assert.equal(g4.value.result, 'Accruing');

  // Row 5: Pat Reyes (empty date -> N/A)
  const g5 = ws.getCell('G5');
  assert.equal(g5.value.result, 'N/A');

  // Summary Row 6: Total Evaluated
  const sumEval = ws.getCell('E6');
  assert.equal(sumEval.value.formula, 'COUNTA(B3:B5)');
  assert.equal(sumEval.value.result, 3);

  // Summary Row 7: Eligible & Accruing
  const sumEligible = ws.getCell('E7');
  assert.equal(sumEligible.value.formula, 'COUNTIF(G3:G5,"ELIGIBLE")');
  assert.equal(sumEligible.value.result, 1);

  const sumAccruing = ws.getCell('G7');
  assert.equal(sumAccruing.value.formula, 'COUNTIF(G3:G5,"Accruing")');
  assert.equal(sumAccruing.value.result, 1);
});

test('PARITY 5: Leave roster export matches days formula and total summary', async () => {
  const leaveData = [
    {
      id: 'lve-1',
      rank: 'PCOL',
      fullName: 'Dela Cruz, Juan',
      badgeNo: '00101',
      sub_unit: 'ARMD',
      leaveType: 'Vacation Leave',
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      days: 5
    },
    {
      id: 'lve-2',
      rank: 'PCpl',
      fullName: 'Santos, Maria',
      badgeNo: '00102',
      sub_unit: 'ITOD',
      leaveType: 'Sick Leave',
      startDate: '2026-10-08',
      endDate: '2026-10-10',
      days: 3
    }
  ];

  const columns = [
    { key: 'rank', label: 'Rank' },
    { key: 'fullName', label: 'Full Name' },
    { key: 'badgeNo', label: 'Badge No.' },
    { key: 'sub_unit', label: 'Sub-Unit' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'days', label: 'Days' }
  ];

  const buffer = await buildReportXlsxBuffer(
    'PNP ITMS Leave Roster',
    leaveData,
    columns,
    'leave'
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  const h3 = ws.getCell('H3');
  assert.ok(h3.value && h3.value.formula, 'H3 must have Days formula');
  assert.equal(h3.value.result, 5);

  const h4 = ws.getCell('H4');
  assert.equal(h4.value.result, 3);

  // Summary Row 5: Total Days
  const h5 = ws.getCell('H5');
  assert.equal(h5.value.formula, 'SUM(H3:H4)');
  assert.equal(h5.value.result, 8);
});

test('PARITY 6: Recalculation test and edge-case handling', async () => {
  // Test strength counting recalculation and error resilience
  const strengthData = [
    { unitCategory: 'HQ', subUnitCategory: 'Div', sub_unit: 'ITOD', station: 'Base', pcoCount: 1, pncoCount: 2, nupCount: 3, maleCount: 4, femaleCount: 2, total: 6 }
  ];
  const columns = [
    { key: 'unitCategory', label: 'Unit' }, { key: 'subUnitCategory', label: 'SubUnit' },
    { key: 'sub_unit', label: 'Div' }, { key: 'station', label: 'Station' },
    { key: 'pcoCount', label: 'PCO' }, { key: 'pncoCount', label: 'PNCO' },
    { key: 'nupCount', label: 'NUP' }, { key: 'maleCount', label: 'Male' },
    { key: 'femaleCount', label: 'Female' }, { key: 'total', label: 'Total' }
  ];

  const buffer = await buildReportXlsxBuffer('Test Parity', strengthData, columns, 'strength_counting');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  // Verify formula references are valid cell coordinates without #REF!
  const formulaCell = ws.getCell('J3');
  assert.equal(formulaCell.value.formula, 'SUM(E3:G3)');
  assert.doesNotMatch(formulaCell.value.formula, /#REF!/);

  const summaryCell = ws.getCell('J4');
  assert.equal(summaryCell.value.formula, 'SUM(J3:J3)');
  assert.doesNotMatch(summaryCell.value.formula, /#REF!/);
});

