import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  getWorksheetSummaries,
  getWorksheetDetail,
  updateWorksheetCell,
  getWorksheetAuditLogs,
  generateExcelExport,
  calculateDatedif,
  decodeLegacyWorksheetValue,
  encodeLegacyWorksheetValue,
  updateWorksheetMerges
} from '../backend/services/worksheetDataService.js';

test('legacy worksheet storage keeps typed values, formula results, and styles in its text value column', () => {
  const override = { value: '=A1*2', formulaResult: 8, style: { nf: '#,##0', b: 1 } };
  const stored = encodeLegacyWorksheetValue(override);
  assert.deepEqual(decodeLegacyWorksheetValue(stored), override);
  assert.deepEqual(decodeLegacyWorksheetValue('legacy text'), { value: 'legacy text' });
});

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

test('updateWorksheetCell preserves formulas, cached results, and styles for reload and export', async () => {
  const user = { displayName: 'Worksheet Editor', email: 'editor@pnp.gov.ph' };
  await updateWorksheetCell('sheet-1', {
    address: 'B2',
    value: '=SUM(A1:A2)',
    formula: 'SUM(A1:A2)',
    formulaResult: 25,
    style: { nf: '#,##0.00' }
  }, user, null);

  const reloaded = getWorksheetDetail('sheet-1');
  assert.equal(reloaded.cells.B2.f, 'SUM(A1:A2)');
  assert.equal(reloaded.cells.B2.res, 25);
  assert.deepEqual(reloaded.cells.B2.s, { nf: '#,##0.00' });

  await updateWorksheetCell('sheet-1', {
    address: 'B2', value: '25', formula: null, formulaResult: 25
  }, user, null);
  const cleared = getWorksheetDetail('sheet-1');
  assert.equal(cleared.cells.B2.f, null);
  assert.equal(cleared.cells.B2.v, '25');
});

test('generateExcelExport creates valid Excel workbook with Sheet1', async () => {
  await updateWorksheetCell('sheet-1', {
    address: 'A4',
    value: 'POLICE MASTER SERGEANT PROMOTIONAL EXAMINATION',
    style: { c: '#1d4ed8' }
  }, { displayName: 'Export Test' }, null);
  await updateWorksheetCell('sheet-1', {
    address: 'C2', value: '=A1+A2', formula: 'A1+A2', formulaResult: 13,
    style: { nf: '$#,##0.00', b: 1, bg: '#00AAFF', ah: 'center' }
  }, { displayName: 'Export Test' }, null);
  const buffer = await generateExcelExport();
  assert.ok(buffer.length > 0);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  assert.equal(wb.worksheets.length, 1);
  assert.equal(wb.worksheets[0].name.trim(), 'Sheet1');
  assert.equal(wb.worksheets[0].getCell('A4').value, 'POLICE MASTER SERGEANT TO POLICE SENIOR MASTER SERGEANT');
  assert.equal(wb.worksheets[0].getCell('A4').font.color.argb, 'FF000000');
  assert.equal(wb.worksheets[0].getCell('C2').value.formula, 'A1+A2');
  assert.equal(wb.worksheets[0].getCell('C2').value.result, 13);
  assert.equal(wb.worksheets[0].getCell('C2').numFmt, '$#,##0.00');
  assert.equal(wb.worksheets[0].getCell('C2').font.bold, true);
  assert.equal(wb.worksheets[0].getCell('C2').fill.fgColor.argb, 'FF00AAFF');
  assert.equal(wb.worksheets[0].getCell('C2').alignment.horizontal, 'center');
});
test('getWorksheetDetail dynamically registers and returns custom worksheet instead of throwing 404', () => {
  const customId = 'sheet-custom-' + Date.now();
  const customSheet = getWorksheetDetail(customId, []);
  assert.ok(customSheet);
  assert.equal(customSheet.id, customId);
  assert.equal(customSheet.rowCount, 50);
  assert.equal(customSheet.colCount, 26);
  assert.deepEqual(customSheet.cells, {});
});

test('custom worksheets support cell editing and persist in memory', async () => {
  const customId = 'sheet-custom-' + Date.now();
  await updateWorksheetCell(customId, {
    address: 'A1',
    value: 'Hello Custom',
    oldValue: ''
  }, { displayName: 'Custom Tester' }, null);

  const reloaded = getWorksheetDetail(customId);
  assert.equal(reloaded.cells.A1.v, 'Hello Custom');
});

test('updateWorksheetMerges updates merges and includes them in Excel export', async () => {
  const customId = 'sheet-custom-' + Date.now();
  getWorksheetDetail(customId);

  updateWorksheetMerges(customId, ['B2:D4']);
  const sheet = getWorksheetDetail(customId);
  assert.deepEqual(sheet.merges, ['B2:D4']);

  const buffer = await generateExcelExport(customId);
  assert.ok(buffer.length > 0);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  assert.ok(ws);
  const b2 = ws.getCell('B2');
  assert.ok(b2.isMerged);
});
