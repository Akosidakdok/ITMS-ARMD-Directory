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

test('getWorksheetSummaries returns exactly 5 sheets in order', () => {
  const summaries = getWorksheetSummaries();
  assert.equal(summaries.length, 5);
  assert.equal(summaries[0].name, 'Disposition');
  assert.equal(summaries[1].name, 'Alpha List');
  assert.equal(summaries[2].name, 'Rank Profile with OSSP');
  assert.equal(summaries[3].name, 'Updates for ADMO');
  assert.equal(summaries[4].name, 'ITMS HQ');
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

test('generateExcelExport creates valid 5-sheet Excel workbook', async () => {
  const buffer = await generateExcelExport();
  assert.ok(buffer.length > 50000);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  assert.equal(wb.worksheets.length, 5);
  assert.equal(wb.worksheets[0].name, 'Disposition');
  assert.equal(wb.worksheets[1].name, 'Alpha List');
  assert.equal(wb.worksheets[2].name, 'Rank Profile with OSSP');
  assert.equal(wb.worksheets[3].name, 'Updates for ADMO');
  assert.equal(wb.worksheets[4].name, 'ITMS HQ');
});

test('all 5 worksheets have resolved formulas and zero [object Object] cells', () => {
  const summaries = getWorksheetSummaries();
  assert.equal(summaries.length, 5);

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

test('Alpha List contains evaluated DATEDIF age and service formulas', () => {
  const alphaList = getWorksheetDetail('sheet-6', []);
  assert.equal(alphaList.name, 'Alpha List');

  const i9 = alphaList.cells['I9'];
  assert.ok(i9);
  assert.match(String(i9.v), /years.*month.*day/);
  assert.ok(i9.f.includes('DATEDIF'));

  const k9 = alphaList.cells['K9'];
  assert.ok(k9);
  assert.match(String(k9.v), /years.*month.*day/);
  assert.ok(k9.f.includes('DATEDIF'));
});
