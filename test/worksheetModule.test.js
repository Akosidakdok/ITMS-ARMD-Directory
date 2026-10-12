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

test('getWorksheetSummaries returns exactly 1 sheet (Sheet1)', () => {
  const summaries = getWorksheetSummaries();
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].name, 'Sheet1');
});

test('calculateDatedif returns expected format', () => {
  const diff = calculateDatedif('1990-01-01', '2026-04-30');
  assert.match(diff, /36 years/);
  assert.match(diff, /month/);
  assert.match(diff, /day/);
});

test('getWorksheetDetail returns Sheet1', () => {
  const sheet = getWorksheetDetail('sheet-1', []);
  assert.equal(sheet.name, 'Sheet1');
  assert.equal(sheet.rowCount, 50);
  assert.equal(sheet.colCount, 26);
});

test('updateWorksheetCell records edit and audit log on Sheet1', async () => {
  const mockUser = { displayName: 'Inspector General', email: 'ig@pnp.gov.ph' };
  const res = await updateWorksheetCell(
    'sheet-1',
    { address: 'A1', value: 'TEST-VALUE', oldValue: '' },
    mockUser,
    null
  );

  assert.equal(res.success, true);
  assert.equal(res.value, 'TEST-VALUE');
  assert.ok(res.auditLog);
  assert.equal(res.auditLog.cellAddress, 'A1');
  assert.equal(res.auditLog.modifiedBy, 'Inspector General');

  const logs = getWorksheetAuditLogs();
  assert.ok(logs.some(l => l.cellAddress === 'A1' && l.newValue === 'TEST-VALUE'));
});

test('generateExcelExport creates valid Excel workbook with Sheet1', async () => {
  const buffer = await generateExcelExport();
  assert.ok(buffer.length > 0);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  assert.equal(wb.worksheets.length, 1);
  assert.equal(wb.worksheets[0].name.trim(), 'Sheet1');
});
