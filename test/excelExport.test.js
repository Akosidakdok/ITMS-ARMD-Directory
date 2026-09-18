import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { generateExcelExport } from '../backend/services/excelExport.js';

test('statistics export creates a protected, metadata-bearing xlsx workbook', async () => {
  const result = await generateExcelExport({ templateId: 'statistics-by-rank', asOfDate: '2026-09-17' });
  assert.equal(result.filename, 'statistics-by-rank-2026-09-17.xlsx');
  assert.ok(result.buffer.length > 1000);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.buffer);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['PAIS Metadata', 'Statistics by Rank']);
  assert.equal(workbook.getWorksheet('Statistics by Rank').getCell('A5').value, 'OFFICE');
  assert.equal(workbook.getWorksheet('PAIS Metadata').getCell('B1').value, 'statistics-by-rank');
  assert.ok(workbook.getWorksheet('Statistics by Rank').sheetProtection.sheet);
});

test('training template exposes the approved locked and editable field policy', async () => {
  const result = await generateExcelExport({ templateId: 'training-import', asOfDate: '2026-09-17' });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.buffer);
  const sheet = workbook.getWorksheet('TRAINING');
  assert.equal(sheet.getCell('A1').value, 'Personnel ID');
  assert.ok(sheet.sheetProtection.sheet);
  const metadata = workbook.getWorksheet('PAIS Metadata');
  assert.match(metadata.getCell('B8').value, /courseName/);
  assert.match(metadata.getCell('B9').value, /personnelId/);
});
