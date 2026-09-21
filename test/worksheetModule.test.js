import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  getWorksheetSummaries,
  getWorksheetDetail,
  updateWorksheetCell,
  getWorksheetAuditLogs,
  generateExcelExport,
  calculateDatedif
} from '../backend/services/worksheetDataService.js';

test('getWorksheetSummaries returns exactly 13 sheets in order', () => {
  const summaries = getWorksheetSummaries();
  assert.equal(summaries.length, 13);
  assert.equal(summaries[0].name, 'DISPO Att (2)');
  assert.equal(summaries[1].name, 'DISPO Att');
  assert.equal(summaries[2].name, 'detail Crame based');
  assert.equal(summaries[3].name, 'itmsHQ');
  assert.equal(summaries[4].name, 'Disposition');
  assert.equal(summaries[5].name, 'Alpha List');
  assert.equal(summaries[6].name, '15 YRS LENGTH OF SERVICE');
  assert.equal(summaries[7].name, 'Crame-based PCOs');
  assert.equal(summaries[8].name, 'New Rank Profile');
  assert.equal(summaries[9].name, 'New Ranked Profile (DPL)');
  assert.equal(summaries[10].name, 'Rank Profile with OSSP');
  assert.equal(summaries[11].name, 'Updates for ADMO');
  assert.equal(summaries[12].name, 'ITMS HQ');
});

test('calculateDatedif returns expected format', () => {
  const diff = calculateDatedif('1990-01-01', '2026-04-30');
  assert.match(diff, /36 years/);
  assert.match(diff, /month/);
  assert.match(diff, /day/);
});

test('getWorksheetDetail returns full cells and merged structures', () => {
  const sheet = getWorksheetDetail('sheet-5', []);
  assert.equal(sheet.name, 'Disposition');
  assert.ok(sheet.merges.length >= 36);
  assert.ok(Object.keys(sheet.cells).length > 1000);
  assert.equal(sheet.cells['A1'].v, 'NATIONAL POLICE COMMISSION');
});

test('updateWorksheetCell records edit and audit log', async () => {
  const mockUser = { displayName: 'Inspector General', email: 'ig@pnp.gov.ph' };
  const res = await updateWorksheetCell(
    'sheet-6',
    { address: 'E9', value: 'ABANILLA-EDITED', oldValue: 'ABANILLA' },
    mockUser,
    null
  );

  assert.equal(res.success, true);
  assert.equal(res.value, 'ABANILLA-EDITED');
  assert.ok(res.auditLog);
  assert.equal(res.auditLog.cellAddress, 'E9');
  assert.equal(res.auditLog.modifiedBy, 'Inspector General');

  const logs = getWorksheetAuditLogs();
  assert.ok(logs.some(l => l.cellAddress === 'E9' && l.newValue === 'ABANILLA-EDITED'));
});

test('generateExcelExport creates valid 13-sheet Excel workbook', async () => {
  const buffer = await generateExcelExport();
  assert.ok(buffer.length > 50000);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  assert.equal(wb.worksheets.length, 13);
  assert.equal(wb.worksheets[0].name.trim(), 'DISPO Att (2)');
  assert.equal(wb.worksheets[4].name.trim(), 'Disposition');
  assert.equal(wb.worksheets[5].name.trim(), 'Alpha List');
  assert.equal(wb.worksheets[10].name.trim(), 'Rank Profile with OSSP');
  assert.equal(wb.worksheets[11].name.trim(), 'Updates for ADMO');
  assert.equal(wb.worksheets[12].name.trim(), 'ITMS HQ');
});

test('all 13 worksheets have resolved formulas and zero [object Object] cells', () => {
  const summaries = getWorksheetSummaries();
  assert.equal(summaries.length, 13);

  summaries.forEach(s => {
    const detail = getWorksheetDetail(s.id, []);
    let objectCells = 0;
    for (const [addr, cell] of Object.entries(detail.cells)) {
      if (cell.v !== null && typeof cell.v === 'object') {
        objectCells++;
      }
    }
    assert.equal(objectCells, 0, `Sheet ${s.name} must have 0 object cells`);
  });
});

test('ITMS HQ accurately calculates variance and subtotals with proper formulas', () => {
  const itmsHq = getWorksheetDetail('sheet-13', []);
  assert.equal(itmsHq.name, 'ITMS HQ');

  // Check E11 (Variance for PNCO Command Group: 10 - 8 = 2)
  const e11 = itmsHq.cells['E11'];
  assert.ok(e11);
  assert.equal(e11.v, 2);
  assert.equal(e11.f, 'D11-C11');

  // Check E12 (Variance for NUP Command Group: 17 - 8 = 9)
  const e12 = itmsHq.cells['E12'];
  assert.ok(e12);
  assert.equal(e12.v, 9);
  assert.equal(e12.f, 'D12-C12');

  // Check E13 (Variance for Command Group Subtotal: 32 - 21 = 11)
  const e13 = itmsHq.cells['E13'];
  assert.ok(e13);
  assert.equal(e13.v, 11);
  assert.equal(e13.f, 'D13-C13');
});

test('Alpha List contains evaluated DATEDIF age and service formulas with TODAY()', () => {
  const alphaList = getWorksheetDetail('sheet-6', []);
  assert.equal(alphaList.name, 'Alpha List');

  const i9 = alphaList.cells['I9'];
  assert.ok(i9);
  assert.match(String(i9.v), /years.*month.*day/);
  assert.ok(i9.f.includes('DATEDIF'));
  assert.ok(i9.f.includes('TODAY()'), 'I9 formula must use TODAY()');
  assert.ok(!i9.f.includes('DATE(2026,4,30)'), 'I9 formula must NOT use hardcoded DATE');

  const k9 = alphaList.cells['K9'];
  assert.ok(k9);
  assert.match(String(k9.v), /years.*month.*day/);
  assert.ok(k9.f.includes('DATEDIF'));
  assert.ok(k9.f.includes('TODAY()'), 'K9 formula must use TODAY()');
  assert.ok(!k9.f.includes('DATE(2026,4,30)'), 'K9 formula must NOT use hardcoded DATE');
});

test('worksheets dynamically update As of header to current date', () => {
  const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const expectedHeader = `(As of ${todayFormatted})`;

  const summaries = getWorksheetSummaries();
  const sheetsWithAsOf = summaries.filter(s => ['Disposition', 'Alpha List', 'Rank Profile with OSSP', 'Updates for ADMO', 'ITMS HQ'].includes(s.name));
  sheetsWithAsOf.forEach(s => {
    const detail = getWorksheetDetail(s.id, []);
    // Find any cell matching "As of"
    let foundAsOf = false;
    for (const [addr, cell] of Object.entries(detail.cells)) {
      if (typeof cell.v === 'string' && cell.v.includes('(As of')) {
        assert.ok(cell.v.includes(expectedHeader), `Sheet ${s.name} cell ${addr} must contain ${expectedHeader}, found: ${cell.v}`);
        foundAsOf = true;
      }
    }
    assert.ok(foundAsOf, `Sheet ${s.name} must have at least one (As of ...) header cell`);
  });
});

test('generateExcelExport outputs dynamic As of headers and TODAY() formulas', async () => {
  const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const expectedHeader = `(As of ${todayFormatted})`;

  const buffer = await generateExcelExport();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  // 1. Check Alpha List sheet
  const alphaSheet = wb.getWorksheet('Alpha List');
  assert.ok(alphaSheet);
  const a7 = alphaSheet.getCell('A7').value;
  assert.equal(a7, expectedHeader);

  const i9 = alphaSheet.getCell('I9').value;
  assert.ok(i9 && typeof i9 === 'object');
  assert.ok(i9.formula.includes('TODAY()'));
  assert.ok(!i9.formula.includes('DATE(2026,4,30)'));
  assert.match(String(i9.result), /years.*month.*day/);

  const k9 = alphaSheet.getCell('K9').value;
  assert.ok(k9 && typeof k9 === 'object');
  assert.ok(k9.formula.includes('TODAY()'));
  assert.ok(!k9.formula.includes('DATE(2026,4,30)'));
  assert.match(String(k9.result), /years.*month.*day/);

  // 2. Check Disposition sheet header
  const dispoSheet = wb.getWorksheet('Disposition');
  assert.ok(dispoSheet);
  const dispoA7 = dispoSheet.getCell('A7').value;
  assert.equal(dispoA7, expectedHeader);

  // 3. Check Rank Profile with OSSP header
  const rankSheet = wb.getWorksheet('Rank Profile with OSSP');
  assert.ok(rankSheet);
  const rankA4 = rankSheet.getCell('A4').value;
  assert.equal(rankA4, expectedHeader);
});

