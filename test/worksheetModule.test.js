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
  assert.equal(summaries[8].name, ' New Rank Profile');
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
  const sheet = getWorksheetDetail('sheet-1', []);
  assert.equal(sheet.name, 'DISPO Att (2)');
  assert.ok(sheet.merges.length >= 36);
  assert.ok(Object.keys(sheet.cells).length > 1000);
  assert.equal(sheet.cells['A1'].v, 'Republic of the Philippines');
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
  assert.equal(wb.worksheets[0].name, 'DISPO Att (2)');
  assert.equal(wb.worksheets[5].name, 'Alpha List');
  assert.equal(wb.worksheets[12].name, 'ITMS HQ');
});
