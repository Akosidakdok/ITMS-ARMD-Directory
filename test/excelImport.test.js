import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { generateExcelExport } from '../backend/services/excelExport.js';
import { createExcelPreview } from '../backend/services/excelImport.js';

test('training export can be uploaded for validation preview without committing', async () => {
  const exported = await generateExcelExport({ templateId: 'training-import', asOfDate: '2026-09-17' });
  const preview = await createExcelPreview({ templateId: 'training-import', buffer: exported.buffer, actor: 'test' });
  assert.equal(preview.templateId, 'training-import');
  assert.equal(preview.detectedSheet, 'TRAINING');
  assert.ok(preview.previewId);
  assert.equal(preview.snapshotAvailable, true);
  assert.ok(Array.isArray(preview.changes));
  assert.equal(typeof preview.validCount, 'number');
});

test('report-only templates cannot be used for imports', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Sheet1').addRow(['Personnel ID', 'Name']);
  const buffer = await workbook.xlsx.writeBuffer();
  await assert.rejects(
    createExcelPreview({ templateId: 'statistics-by-rank', buffer, actor: 'test' }),
    error => error.statusCode === 422
  );
});
