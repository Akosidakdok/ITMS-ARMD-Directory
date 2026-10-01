import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePersonnelExcelRows,
  parsePersonnelCsv,
  findPersonnelHeaderRowIndex,
  calculateYearsBetween
} from '../src/utils/personnelCsv.ts';
import {
  sanitizePersonnelImportRow,
  PERSONNEL_IMPORTABLE_FIELDS
} from '../backend/schemas/personnelImportSchema.js';
import { db } from '../backend/store/repository.js';

test('15-column schema: official headers are accepted and mapped correctly', () => {
  const official15Headers = [
    'RANK',
    'STATUS',
    'BADGE NO/SG',
    'LAST NAME',
    'FIRST NAME',
    'MIDDLE NAME',
    'QUAL.',
    'AGE TO DATE',
    'Birthdate',
    'AGE OF SERVICE TO DATE',
    'DES (UP)',
    'PNCO',
    'NUP',
    'OFFICE/DIVISION',
    'DESIGNATION'
  ];

  const rows = [
    official15Headers,
    [
      'PCpl',
      'Active',
      '248910',
      'Dela Cruz',
      'Juan',
      'Mercado',
      'Jr.',
      '32',
      '1994-03-15',
      '8',
      '2018-06-01',
      '2018-06-01',
      '',
      'ITOD',
      'Network Administrator'
    ],
    [
      'NUP',
      'Active',
      '14',
      'Santos',
      'Maria',
      'Clara',
      '',
      '29',
      '1997-08-20',
      '4',
      '',
      '',
      '2022-01-10',
      'SMD',
      'Database Administrator'
    ]
  ];

  const result = parsePersonnelExcelRows(rows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 2);

  // Row 1: Uniformed Personnel (PCpl)
  const pcoRow = result.rows[0].data;
  assert.equal(pcoRow.rank, 'PCpl');
  assert.equal(pcoRow.status, 'Active');
  assert.equal(pcoRow.badgeNo, '248910');
  assert.equal(pcoRow.salaryGrade, undefined, 'Uniformed personnel must not have salaryGrade');
  assert.equal(pcoRow.lastName, 'Dela Cruz');
  assert.equal(pcoRow.firstName, 'Juan');
  assert.equal(pcoRow.middleName, 'Mercado');
  assert.equal(pcoRow.qualifier, 'Jr.');
  assert.equal(pcoRow.qualification, 'Jr.');
  assert.equal(pcoRow.ageToDate, 32);
  assert.equal(pcoRow.birthdate, '1994-03-15');
  assert.equal(pcoRow.birthday, '1994-03-15');
  assert.equal(pcoRow.ageOfServiceToDate, 8);
  assert.equal(pcoRow.desUp, '2018-06-01');
  assert.equal(pcoRow.dateOfEntry, '2018-06-01');
  assert.equal(pcoRow.sub_unit, 'ITOD');
  assert.equal(pcoRow.officeDivision, 'ITOD');
  assert.equal(pcoRow.designation, 'Network Administrator');

  // Row 2: Non-Uniformed Personnel (NUP)
  const nupRow = result.rows[1].data;
  assert.equal(nupRow.rank, 'NUP');
  assert.equal(nupRow.status, 'Active');
  assert.equal(nupRow.badgeNo, '', 'NUP must not have badgeNo');
  assert.equal(nupRow.salaryGrade, '14', 'NUP BADGE NO/SG must map to salaryGrade');
  assert.equal(nupRow.lastName, 'Santos');
  assert.equal(nupRow.firstName, 'Maria');
  assert.equal(nupRow.middleName, 'Clara');
  assert.equal(nupRow.ageToDate, 29);
  assert.equal(nupRow.birthdate, '1997-08-20');
  assert.equal(nupRow.nup, '2022-01-10');
  assert.equal(nupRow.sub_unit, 'SMD');
  assert.equal(nupRow.designation, 'Database Administrator');
});

test('15-column schema: DES (UP) represents service entry date, not designation', () => {
  const row = {
    rank: 'PMAJ',
    badgeNo: '112233',
    firstName: 'Alexander',
    lastName: 'Reyes',
    'DES (UP)': '2015-04-01',
    DESIGNATION: 'Chief, IT Operations Division'
  };

  const { personnel: normalized } = sanitizePersonnelImportRow(row);
  assert.equal(normalized.desUp, '2015-04-01');
  assert.equal(normalized.dateOfEntry, '2015-04-01');
  assert.equal(normalized.designation, 'Chief, IT Operations Division');
  assert.notEqual(normalized.designation, '2015-04-01', 'Designation must not be corrupted by DES (UP) date');
});

test('15-column schema: calculates Age and Service when missing from row', () => {
  const birthdate = '2000-01-01';
  const entryDate = '2020-01-01';

  const expectedAge = calculateYearsBetween(birthdate);
  const expectedService = calculateYearsBetween(entryDate);

  assert.ok(expectedAge >= 26);
  assert.ok(expectedService >= 6);

  const rows = [
    ['RANK', 'FIRST NAME', 'LAST NAME', 'BADGE NO/SG', 'Birthdate', 'DES (UP)', 'DESIGNATION'],
    ['PCpl', 'Carlos', 'Mendoza', '998877', birthdate, entryDate, 'Action Officer']
  ];

  const result = parsePersonnelExcelRows(rows);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].data.ageToDate, expectedAge);
  assert.equal(result.rows[0].data.ageOfServiceToDate, expectedService);
});

test('15-column schema: rejects in-file duplicate badges for uniformed personnel', () => {
  const rows = [
    ['RANK', 'FIRST NAME', 'LAST NAME', 'BADGE NO/SG', 'DESIGNATION'],
    ['PCpl', 'John', 'Doe', '123456', 'Investigator'],
    ['PSSg', 'Jane', 'Smith', '123456', 'Admin Specialist']
  ];

  const result = parsePersonnelExcelRows(rows);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].rowNumber, 3);
  assert.ok(result.errors[0].messages.some(m => m.includes('duplicated in this file')));
});

test('repository: coerceSalaryGradeForLegacyInt safely transforms empty string to null', () => {
  assert.equal(db.coerceSalaryGradeForLegacyInt({ salaryGrade: '' }).salaryGrade, null);
  assert.equal(db.coerceSalaryGradeForLegacyInt({ salaryGrade: '   ' }).salaryGrade, null);
  assert.equal(db.coerceSalaryGradeForLegacyInt({ salaryGrade: null }).salaryGrade, null);
  assert.equal(db.coerceSalaryGradeForLegacyInt({ salaryGrade: undefined }).salaryGrade, null);
  assert.equal(db.coerceSalaryGradeForLegacyInt({ salaryGrade: '14' }).salaryGrade, 14);
  assert.equal(db.coerceSalaryGradeForLegacyInt({ salaryGrade: 18 }).salaryGrade, 18);
  assert.equal(db.coerceSalaryGradeForLegacyInt({ salaryGrade: 'SG-15' }).salaryGrade, 15);
  assert.equal(db.coerceSalaryGradeForLegacyInt({ salaryGrade: 'Invalid-Grade' }).salaryGrade, null);
});
