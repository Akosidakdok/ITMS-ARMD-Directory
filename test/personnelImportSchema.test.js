import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERSONNEL_IMPORTABLE_FIELDS,
  sanitizePersonnelImportRow
} from '../backend/schemas/personnelImportSchema.js';

test('backend allowlist never reads or copies unknown properties', () => {
  const input = {
    rank: 'PCPL',
    firstName: 'Ana',
    lastName: 'Santos',
    badgeNo: 'B-300',
    sub_unit: 'CSD'
  };
  Object.defineProperty(input, 'unnecessaryColumn', {
    enumerable: true,
    get() {
      throw new Error('Unknown column was read');
    }
  });

  const { personnel, errors } = sanitizePersonnelImportRow(input);

  assert.deepEqual(errors, []);
  assert.equal(personnel.fullName, 'Ana Santos');
  assert.equal(personnel.sub_unit, 'CSD');
  assert.equal('unnecessaryColumn' in personnel, false);
  assert.deepEqual(
    Object.keys(personnel).filter(key => !PERSONNEL_IMPORTABLE_FIELDS.includes(key) && !['id', 'fullName'].includes(key)),
    []
  );
});

test('backend supports legacy division column alias mapping to sub_unit', () => {
  const input = {
    rank: 'PCPL',
    firstName: 'Ana',
    lastName: 'Santos',
    badgeNo: 'B-300',
    division: 'CSD'
  };

  const { personnel, errors } = sanitizePersonnelImportRow(input);

  assert.deepEqual(errors, []);
  assert.equal(personnel.sub_unit, 'CSD');
});

test('backend rejects missing required fields', () => {
  const { errors } = sanitizePersonnelImportRow({
    rank: 'PCPL',
    firstName: 'Ana'
  });

  assert.ok(errors.includes('lastName is required'));
});

test('backend accepts salaryGrade containing numbers, dashes, and letters (e.g. SG-14, 14-1, 14)', () => {
  const cases = [
    { input: 'SG-14', expected: 'SG-14' },
    { input: '14-1', expected: '14-1' },
    { input: 'SG 14/1', expected: 'SG 14/1' },
    { input: '14', expected: '14' },
    { input: 14, expected: '14' },
    { input: 'SG-18 Step 1', expected: 'SG-18 Step 1' }
  ];

  for (const { input, expected } of cases) {
    const { personnel, errors } = sanitizePersonnelImportRow({
      rank: 'NUP',
      firstName: 'Maria',
      lastName: 'Clara',
      salaryGrade: input
    });
    assert.deepEqual(errors, []);
    assert.equal(personnel.salaryGrade, expected);
  }
});

test('backend accepts personnel records without sub_unit, details, or station across all optional combinations', () => {
  const cases = [
    { label: 'No Sub-unit', data: { rank: 'PCPL', firstName: 'Ana', lastName: 'Santos', details: 'Network', station: 'HQ' } },
    { label: 'No Details', data: { rank: 'PCPL', firstName: 'Ana', lastName: 'Santos', sub_unit: 'CSD', station: 'HQ' } },
    { label: 'No Station', data: { rank: 'PCPL', firstName: 'Ana', lastName: 'Santos', sub_unit: 'CSD', details: 'Network' } },
    { label: 'No Sub-unit + No Details', data: { rank: 'PCPL', firstName: 'Ana', lastName: 'Santos', station: 'HQ' } },
    { label: 'No Sub-unit + No Station', data: { rank: 'PCPL', firstName: 'Ana', lastName: 'Santos', details: 'Network' } },
    { label: 'No Details + No Station', data: { rank: 'PCPL', firstName: 'Ana', lastName: 'Santos', sub_unit: 'CSD' } },
    { label: 'All three fields are empty', data: { rank: 'PCPL', firstName: 'Ana', lastName: 'Santos', sub_unit: '', details: '', station: '' } },
    { label: 'All three fields omitted', data: { rank: 'PCPL', firstName: 'Ana', lastName: 'Santos' } }
  ];

  for (const c of cases) {
    const { personnel, errors } = sanitizePersonnelImportRow(c.data);
    assert.deepEqual(errors, [], `Failed for case: ${c.label}`);
    assert.equal(personnel.fullName, 'Ana Santos');
    assert.equal(personnel.rank, 'PCPL');
  }
});

