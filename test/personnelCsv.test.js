import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePersonnelCsv,
  parsePersonnelExcelRows,
  findPersonnelHeaderRowIndex,
  countMatchingHeaders,
  isExpectedPersonnelHeader,
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

test('CSV import accepts personnel without sub_unit, details, or station across all optional combinations', () => {
  const csv = [
    'rank,firstName,lastName,badgeNo,sub_unit,details,station',
    'PCPL,Ana,Santos,B-501,,Network,Camp Crame',      // No Sub-unit
    'PCPL,Ben,Reyes,B-502,CSD,,Camp Crame',            // No Details
    'PCPL,Cara,Cruz,B-503,CSD,Network,',              // No Station
    'PCPL,Dan,Diaz,B-504,,,Camp Crame',                // No Sub-unit + No Details
    'PCPL,Eva,Flores,B-505,,Network,',                 // No Sub-unit + No Station
    'PCPL,Gino,Garcia,B-506,CSD,,',                    // No Details + No Station
    'PCPL,Hana,Hizon,B-507,,,',                        // All three fields are empty
  ].join('\n');

  const result = parsePersonnelCsv(csv);

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 7);
  assert.equal(result.rows[0].data.fullName, 'Ana Santos');
  assert.equal(result.rows[0].data.sub_unit, undefined);
  assert.equal(result.rows[0].data.details, 'Network');
  assert.equal(result.rows[1].data.fullName, 'Ben Reyes');
  assert.equal(result.rows[1].data.details, undefined);
  assert.equal(result.rows[2].data.fullName, 'Cara Cruz');
  assert.equal(result.rows[2].data.station, undefined);
  assert.equal(result.rows[6].data.fullName, 'Hana Hizon');
  assert.equal(result.rows[6].data.sub_unit, undefined);
  assert.equal(result.rows[6].data.details, undefined);
  assert.equal(result.rows[6].data.station, undefined);
});

test('Excel import accepts personnel with empty organizational assignment fields', () => {
  const result = parsePersonnelExcelRows([
    ['rank', 'firstName', 'lastName', 'sub_unit', 'details', 'station'],
    ['Pat', 'Juan', 'Dela Cruz', '', '', '']
  ]);

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].data.fullName, 'Juan Dela Cruz');
  assert.equal(result.rows[0].data.sub_unit, undefined);
  assert.equal(result.rows[0].data.details, undefined);
  assert.equal(result.rows[0].data.station, undefined);
});

test('CSV import accepts salaryGrade containing numbers, dashes, and letters without error', () => {
  const csv = [
    'rank,firstName,lastName,badgeNo,salaryGrade',
    'NUP,Maria,Clara,NUP-101,SG-14',
    'NUP,Crisostomo,Ibarra,NUP-102,14-1',
    'NUP,Elias,Salome,NUP-103,SG 18 Step 2',
    'NUP,Sisa,Basilio,NUP-104,18'
  ].join('\n');

  const result = parsePersonnelCsv(csv);

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0].data.salaryGrade, 'SG-14');
  assert.equal(result.rows[1].data.salaryGrade, '14-1');
  assert.equal(result.rows[2].data.salaryGrade, 'SG 18 Step 2');
  assert.equal(result.rows[3].data.salaryGrade, '18');
});

test('Excel import accepts alphanumeric and dash-formatted salaryGrade values', () => {
  const result = parsePersonnelExcelRows([
    ['rank', 'firstName', 'lastName', 'salaryGrade'],
    ['NUP', 'Maria', 'Clara', 'SG-14'],
    ['NUP', 'Crisostomo', 'Ibarra', '14-1']
  ]);

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].data.salaryGrade, 'SG-14');
  assert.equal(result.rows[1].data.salaryGrade, '14-1');
});

test('recognizes all expected personnel headers and aliases for detection', () => {
  const expectedSample = [
    'NO.',
    'RANK',
    'STATUS',
    'BADGE',
    'LAST NAME',
    'FIRST NAME',
    'MIDDLE NAME',
    'QUAL.',
    'AGE TO DATE',
    'BIRTHDATE',
    'AGE OF SERVICE TO DATE',
    'DES (UP)',
    'PNCO',
    'NUP',
    'OFFICE/DIVISION',
    'DESIGNATION'
  ];

  for (const header of expectedSample) {
    assert.equal(isExpectedPersonnelHeader(header), true, `Expected ${header} to be recognized`);
  }

  assert.equal(isExpectedPersonnelHeader('Republic of the Philippines'), false);
  assert.equal(isExpectedPersonnelHeader('NATIONAL POLICE COMMISSION'), false);
  assert.equal(isExpectedPersonnelHeader('ALPHA LIST'), false);
  assert.equal(countMatchingHeaders(expectedSample), 16);
});

test('detects header on Row 8 with report headers on Rows 1-7 and parses records from Row 9', () => {
  const spreadsheetRows = [
    ['Republic of the Philippines'],
    ['NATIONAL POLICE COMMISSION'],
    ['PHILIPPINE NATIONAL POLICE'],
    ['INFORMATION TECHNOLOGY MANAGEMENT SERVICE'],
    ['ALPHA LIST OF PERSONNEL'],
    ['As of September 7, 2026'],
    ['UNIFORMED PERSONNEL'],
    [
      'NO.',
      'RANK',
      'STATUS',
      'BADGE',
      'LAST NAME',
      'FIRST NAME',
      'MIDDLE NAME',
      'QUAL.',
      'AGE TO DATE',
      'BIRTHDATE',
      'AGE OF SERVICE TO DATE',
      'DES (UP)',
      'PNCO',
      'NUP',
      'OFFICE/DIVISION',
      'DESIGNATION'
    ],
    [
      '1',
      'PCpl',
      'Active',
      'B-100',
      'Santos',
      'Ana',
      'M',
      '',
      '28',
      '1998-05-12',
      '5',
      'Action Officer',
      '1',
      '0',
      'ITOD',
      'Action Officer'
    ],
    [
      '2',
      'Pat',
      'Active',
      'B-101',
      'Reyes',
      'Ben',
      'S',
      'Jr.',
      '25',
      '2001-01-15',
      '2',
      'Specialist',
      '1',
      '0',
      'SMD',
      'Specialist'
    ]
  ];

  const headerIndex = findPersonnelHeaderRowIndex(spreadsheetRows);
  assert.equal(headerIndex, 7, 'Row 8 (index 7) should be detected as header row');

  const result = parsePersonnelExcelRows(spreadsheetRows);

  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 2);

  // Physical Excel row numbers: Record 1 is Row 9, Record 2 is Row 10
  assert.equal(result.rows[0].rowNumber, 9);
  assert.equal(result.rows[1].rowNumber, 10);

  // Field mappings and data extraction
  assert.equal(result.rows[0].data.rank, 'PCpl');
  assert.equal(result.rows[0].data.firstName, 'Ana');
  assert.equal(result.rows[0].data.middleName, 'M');
  assert.equal(result.rows[0].data.lastName, 'Santos');
  assert.equal(result.rows[0].data.fullName, 'Ana M Santos');
  assert.equal(result.rows[0].data.badgeNo, 'B-100');
  assert.equal(result.rows[0].data.status, 'Active');
  assert.equal(result.rows[0].data.sub_unit, 'ITOD');
  assert.equal(result.rows[0].data.designation, 'Action Officer');
  assert.equal(result.rows[0].data.birthday, '1998-05-12');

  assert.equal(result.rows[1].data.rank, 'Pat');
  assert.equal(result.rows[1].data.firstName, 'Ben');
  assert.equal(result.rows[1].data.lastName, 'Reyes');
  assert.equal(result.rows[1].data.qualifier, 'Jr.');
  assert.equal(result.rows[1].data.fullName, 'Ben S Reyes Jr.');
  assert.equal(result.rows[1].data.badgeNo, 'B-101');
  assert.equal(result.rows[1].data.sub_unit, 'SMD');

  // Ignored vs Accepted headers
  assert.ok(result.ignoredHeaders.includes('NO.'));
  assert.ok(result.ignoredHeaders.includes('AGE TO DATE'));
  assert.ok(result.ignoredHeaders.includes('AGE OF SERVICE TO DATE'));
  assert.ok(result.ignoredHeaders.includes('PNCO'));
  assert.ok(result.ignoredHeaders.includes('NUP'));
  assert.ok(result.acceptedHeaders.includes('RANK'));
  assert.ok(result.acceptedHeaders.includes('FIRST NAME'));
  assert.ok(result.acceptedHeaders.includes('LAST NAME'));
  assert.ok(result.acceptedHeaders.includes('OFFICE/DIVISION'));
  assert.ok(result.acceptedHeaders.includes('DES (UP)'));
});

test('standard files with header on Row 1 still work seamlessly', () => {
  const spreadsheetRows = [
    ['RANK', 'FIRST NAME', 'LAST NAME', 'BADGE'],
    ['PCpl', 'Ana', 'Santos', 'B-201']
  ];

  const headerIndex = findPersonnelHeaderRowIndex(spreadsheetRows);
  assert.equal(headerIndex, 0);

  const result = parsePersonnelExcelRows(spreadsheetRows);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].rowNumber, 2);
  assert.equal(result.rows[0].data.fullName, 'Ana Santos');
  assert.equal(result.rows[0].data.badgeNo, 'B-201');
});

test('selects the earliest matching row when match counts are tied', () => {
  const spreadsheetRows = [
    ['Title Row 1'],
    ['RANK', 'FIRST NAME', 'LAST NAME', 'STATUS'], // Index 1: 4 matches
    ['Some intermediate row'],
    ['RANK', 'FIRST NAME', 'LAST NAME', 'STATUS'], // Index 3: 4 matches (tied)
    ['PCpl', 'Ana', 'Santos', 'Active']
  ];

  const headerIndex = findPersonnelHeaderRowIndex(spreadsheetRows);
  assert.equal(headerIndex, 1, 'Should pick earliest matching row (index 1)');
});

test('rejects file when highest match count is below threshold with clear error message', () => {
  const spreadsheetRows = [
    ['Republic of the Philippines'],
    ['Annual Report 2026'],
    ['123', '456', '789']
  ];

  const headerIndex = findPersonnelHeaderRowIndex(spreadsheetRows);
  assert.equal(headerIndex, -1);

  const result = parsePersonnelExcelRows(spreadsheetRows);
  assert.equal(result.rows.length, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(
    result.errors[0].messages[0],
    'Unable to detect the personnel table header. Please check the Excel file.'
  );
});

test('rejects row with only 1 matching header when minimum threshold is 2', () => {
  const spreadsheetRows = [
    ['RANK', 'Notes', 'Random Column'],
    ['PCpl', 'Note 1', 'Val 1']
  ];

  const headerIndex = findPersonnelHeaderRowIndex(spreadsheetRows);
  assert.equal(headerIndex, -1, 'Should reject because only 1 expected header matched');
});

test('reports validation errors on records with accurate physical Excel row numbers', () => {
  const spreadsheetRows = [
    ['Republic of the Philippines'],
    ['PHILIPPINE NATIONAL POLICE'],
    ['ALPHA LIST'],
    [''],
    ['NO.', 'RANK', 'LAST NAME', 'FIRST NAME', 'BADGE'], // Index 4 -> Row 5
    ['1', 'PCpl', 'Santos', '', 'B-300'],               // Index 5 -> Row 6 (missing firstName)
    ['2', '', 'Reyes', 'Ben', 'B-301']                   // Index 6 -> Row 7 (missing rank)
  ];

  const result = parsePersonnelExcelRows(spreadsheetRows);

  assert.equal(result.rows.length, 0);
  assert.equal(result.errors.length, 2);
  assert.equal(result.errors[0].rowNumber, 6, 'First error should be on physical Row 6');
  assert.ok(result.errors[0].messages.includes('firstName is required'));
  assert.equal(result.errors[1].rowNumber, 7, 'Second error should be on physical Row 7');
  assert.ok(result.errors[1].messages.includes('rank is required'));
});



