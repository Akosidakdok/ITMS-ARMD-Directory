import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { OCTOBER_PERSONNEL_ROSTER_COLUMNS } from '../src/constants/personnelRosterFormat.ts';
import { parsePersonnelExcelRows } from '../src/utils/personnelCsv.ts';
import { buildPersonnelRosterXlsx } from '../src/utils/personnelExport.ts';

const personnelFixture = {
  id: 'fixture-001',
  sourceLink: 'source-001',
  accountNumber: '00012345',
  rank: 'PCOL',
  rankCategory: 'PCO',
  lastName: 'Santos',
  firstName: 'Ana',
  middleName: 'M.',
  qualifier: 'Jr.',
  badgeNo: 'O-12345',
  birthdate: '1987-10-24',
  dateEnteredService: '2008-04-12',
  designation: 'Division Chief',
  designationDate: '2023-08-01',
  lastPromotionDate: '2022-06-15',
  sourceOfCommissionship: 'PNPA',
  dateOfOfficershipOrCommission: '2008-04-12',
  status: 'Active',
  pstatus: 'ON DUTY/ACTIVE',
  pstatusDate: '2024-01-01',
  rankStatus: 'PERMANENT',
  unitCode: 'C02',
  unit: 'ITMS',
  subUnitCode: 'C021',
  sub_unit: 'Office of the Director',
  stationCode: 'ST01',
  station: 'Camp Crame',
  subStationCode: 'SUB01',
  subStation: 'Main Building',
  gender: 'Female',
  civilStatus: 'Single',
  religion: 'Roman Catholic',
  email: 'ana@example.test',
  contactNumber: '09170000001',
  tin: '001-234-567',
  gsisNumber: '0001234567',
  philHealthNo: '001234567890',
  pagibigNo: '000012345678',
  address: 'Sample City'
};

const workbookRows = async buffer => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  return Array.from({ length: worksheet.rowCount }, (_, rowIndex) =>
    Array.from({ length: OCTOBER_PERSONNEL_ROSTER_COLUMNS.length }, (_, columnIndex) =>
      worksheet.getRow(rowIndex + 1).getCell(columnIndex + 1).value ?? ''
    )
  );
};

test('October roster export retains its 42-column layout and round-trips personnel fields', async () => {
  const buffer = await buildPersonnelRosterXlsx([personnelFixture]);
  const rows = await workbookRows(buffer);
  const headerRow = rows[7];
  const dataRow = rows[8];

  assert.equal(headerRow.length, 42);
  assert.equal(headerRow[31], 'Gender');
  assert.equal(headerRow[1], 'Link');
  assert.equal(headerRow[4], 'Account Number');
  assert.equal(headerRow[40], 'Address');
  assert.equal(dataRow[31], 'Female');
  assert.equal(dataRow[1], 'source-001');
  assert.equal(dataRow[2], 'source-001');
  assert.equal(dataRow[3], 'source-001');
  assert.equal(dataRow[4], '00012345');

  const imported = parsePersonnelExcelRows(rows);
  assert.equal(imported.detectedHeaderRowIndex, 7);
  assert.equal(imported.rows.length, 1);
  assert.equal(imported.errors.length, 0);
  assert.equal(imported.rows[0].rowNumber, 9);
  assert.equal(imported.rows[0].data.gender, 'Female');
  assert.equal(imported.rows[0].data.sourceLink, 'source-001');
  assert.equal(imported.rows[0].data.accountNumber, '00012345');
  assert.equal(imported.rows[0].data.pstatus, 'ON DUTY/ACTIVE');
  assert.equal(imported.rows[0].data.status, undefined);
  assert.equal(imported.rows[0].data.dateEnteredService, '2008-04-12');
  assert.equal(imported.rows[0].data.station, 'Camp Crame');
});

test('October import flags inconsistent values in repeated source columns', async () => {
  const rows = await workbookRows(await buildPersonnelRosterXlsx([personnelFixture]));
  rows[8][7] = 'Different Last Name';

  const result = parsePersonnelExcelRows(rows);

  assert.equal(result.rows.length, 0);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].rowNumber, 9);
  assert.match(result.errors[0].messages.join(' '), /Repeated Last Name columns/);
});
