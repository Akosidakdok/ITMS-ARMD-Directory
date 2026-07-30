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
    division: 'CSD'
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
  assert.equal('unnecessaryColumn' in personnel, false);
  assert.deepEqual(
    Object.keys(personnel).filter(key => !PERSONNEL_IMPORTABLE_FIELDS.includes(key) && !['id', 'fullName'].includes(key)),
    []
  );
});

test('backend rejects invalid required data and salary grade', () => {
  const { errors } = sanitizePersonnelImportRow({
    rank: 'PCPL',
    firstName: 'Ana',
    salaryGrade: 'not-a-number'
  });

  assert.ok(errors.includes('salaryGrade must be a number'));
  assert.ok(errors.includes('lastName is required'));
  assert.ok(errors.includes('division is required'));
});
