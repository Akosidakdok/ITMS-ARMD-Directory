import assert from 'node:assert/strict';
import test from 'node:test';
import { getExcelTemplate, listExcelTemplates } from '../backend/services/excelTemplateRegistry.js';

test('lists the Phase 1 Excel template registry without depending on workbook files', () => {
  const templates = listExcelTemplates();
  assert.equal(templates.length, 6);
  assert.ok(templates.some(template => template.id === 'training-import'));
  assert.ok(templates.some(template => template.id === 'promotion-evaluation-pco'));
  assert.equal(templates.find(template => template.id === 'training-import').referenceFile, 'INITIAL DATA - TRAINING AND EDUC.xlsx');
});

test('training template maps workbook headers to PAIS fields and validations', () => {
  const template = getExcelTemplate('training-import');
  assert.ok(template);
  assert.equal(template.sheets[0].headerRow, 1);
  assert.equal(template.sheets[0].dataStartRow, 2);
  assert.equal(template.fieldMappings.find(field => field.target === 'courseName').required, true);
  assert.ok(template.validation.some(rule => rule.includes('duplicate')));
});

test('promotion templates expose separate PCO and PNCO track mappings', () => {
  const pco = getExcelTemplate('promotion-evaluation-pco');
  const pnco = getExcelTemplate('promotion-evaluation-pnco');
  assert.equal(pco.promotionTrack, 'PCO');
  assert.equal(pnco.promotionTrack, 'PNCO');
  assert.ok(pco.fieldMappings.some(field => field.headerAliases.includes('Seniority (25 pts)')));
  assert.ok(pnco.fieldMappings.some(field => field.headerAliases.includes('Seniority (30 pts)')));
});

test('unknown Excel template IDs return null', () => {
  assert.equal(getExcelTemplate('does-not-exist'), null);
});
