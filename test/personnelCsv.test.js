import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePersonnelCsv,
  parsePersonnelExcelRows,
  PERSONNEL_IMPORTABLE_FIELDS,
  PERSONNEL_REQUIRED_IMPORT_FIELDS
} from '../src/utils/personnelCsv.ts';
import {
  PERSONNEL_IMPORTABLE_FIELDS as BACKEND_IMPORTABLE_FIELDS,
  PERSONNEL_REQUIRED_IMPORT_FIELDS as BACKEND_REQUIRED_FIELDS
} from '../backend/schemas/personnelImportSchema.js';
import { createXlsxFixture } from '../test-support/xlsxFixture.js';

test('frontend and backend personnel schema allowlists stay aligned', () => {
  assert.deepEqual(PERSONNEL_IMPORTABLE_FIELDS, BACKEND_IMPORTABLE_FIELDS);
  assert.deepEqual(PERSONNEL_REQUIRED_IMPORT_FIELDS, BACKEND_REQUIRED_FIELDS);
});

test('projects CSV rows onto known personnel fields only', () => {
  const csv = [
    'rank,firstName,lastName,badgeNo,sub_unit,unnecessaryColumn,privateNotes',
    'PCPL,Ana,Santos,B-100,CSD,ignore me,do not import'
  ].join('\n');

  const result = parsePersonnelCsv(csv);

  assert.deepEqual(result.ignoredHeaders, ['unnecessaryColumn', 'privateNotes']);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(Object.keys(result.rows[0].data).sort(), [
    'badgeNo',
    'firstName',
    'fullName',
    'lastName',
    'rank',
    'status',
    'sub_unit'
  ]);
  assert.equal(result.rows[0].data.fullName, 'Ana Santos');
  assert.equal(result.rows[0].data.sub_unit, 'CSD');
});

test('maps legacy division header to sub_unit in CSV import', () => {
  const csv = [
    'rank,firstName,lastName,badgeNo,division',
    'PCPL,Ana,Santos,B-100,CSD'
  ].join('\n');

  const result = parsePersonnelCsv(csv);

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].data.sub_unit, 'CSD');
});

test('handles quoted commas, embedded newlines, and escaped quotes', () => {
  const csv = [
    'rank,firstName,lastName,badgeNo,sub_unit,address',
    'PCOL,"Juan, Jr.",Dela Cruz,B-101,ITMS,"Camp ""Crame"",',
    'Quezon City"'
  ].join('\n');

  const result = parsePersonnelCsv(csv);

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].data.firstName, 'Juan, Jr.');
  assert.equal(result.rows[0].data.address, 'Camp "Crame",\nQuezon City');
});

test('accepts missing badge numbers and rejects duplicate badges', () => {
  const csv = [
    'rank,firstName,lastName,badgeNo,sub_unit',
    'PCPL,Ana,Santos,B-200,CSD',
    'PCPL,Ben,Reyes,B-200,CSD',
    'PCPL,Cara,Cruz,,CSD'
  ].join('\n');

  const result = parsePersonnelCsv(csv);

  assert.equal(result.rows.length, 2);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].messages.join(' '), /duplicated/);
  assert.equal(result.rows[1].data.fullName, 'Cara Cruz');
  assert.equal(result.rows[1].data.badgeNo, undefined);
});

test('projects Excel worksheet rows with the same schema-only rules', () => {
  const result = parsePersonnelExcelRows([
    ['rank', 'firstName', 'lastName', 'badgeNo', 'sub_unit', 'privateNotes'],
    ['PCPL', 'Ana', 'Santos', 'B-400', 'CSD', 'must not be imported'],
    ['PCPL', 'Ben', 'Reyes', '', 'CSD', 'must not be validated']
  ]);

  assert.deepEqual(result.ignoredHeaders, ['privateNotes']);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].data.fullName, 'Ana Santos');
  assert.equal('privateNotes' in result.rows[0].data, false);
  assert.equal(result.rows[1].data.fullName, 'Ben Reyes');
  assert.equal(result.rows[1].data.badgeNo, undefined);
  assert.equal(result.errors.length, 0);
});

test('creates a valid ZIP-based .xlsx fixture for browser integration tests', () => {
  const workbook = createXlsxFixture([
    ['rank', 'firstName'],
    ['PCOL', 'Cara']
  ]);

  assert.equal(workbook[0], 0x50);
  assert.equal(workbook[1], 0x4b);
});
