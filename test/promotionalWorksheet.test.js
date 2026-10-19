import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  getDynamicPromotionalTitle,
  buildPromotionalApplicantRows,
  validatePromotionalPersonnel,
  buildPromotionalWorksheetWorkbook,
  buildPromotionalWorksheetDetail,
  formatDdMmYyyy,
  parseDateToIso
} from '../src/utils/promotionalWorksheetExport.ts';
import {
  generatePromotionalWorksheetBuffer,
  validatePromotionalPersonnelRows,
  getPromotionalApplicantsData,
  getDynamicPromotionalTitle as getBackendPromotionalTitle
} from '../backend/services/promotionalWorksheetService.js';
import {
  updateWorksheetCell,
  getWorksheetDetail
} from '../backend/services/worksheetDataService.js';
import { db } from '../backend/store/repository.js';

const mockPersonnel = [
  {
    id: 'p-1',
    rank: 'PMSg',
    lastName: 'Dela Cruz',
    firstName: 'Juan',
    middleName: 'Mendoza',
    qualifier: 'JR.',
    fullName: 'Juan M. Dela Cruz, Jr.',
    badgeNo: '123456',
    sub_unit: 'ITSD',
    designation: 'Action PNCO',
    effectiveDate: '2022-01-15',
    designationDate: '2022-01-15',
    dateOfEntry: '2012-07-01',
    lastPromotionDate: '2020-03-10',
    status: 'Active'
  },
  {
    id: 'p-2',
    rank: 'PMSg',
    lastName: 'Santos',
    firstName: 'Pedro',
    middleName: 'Reyes',
    qualifier: '',
    fullName: 'Pedro R. Santos',
    badgeNo: '654321',
    sub_unit: 'ARMD',
    designation: 'Hardware Specialist',
    effectiveDate: '2021-06-20',
    designationDate: '2021-06-20',
    dateOfEntry: '2011-04-12',
    lastPromotionDate: '2019-12-01',
    status: 'Active'
  },
  {
    id: 'p-3',
    rank: 'PMSg',
    lastName: 'Garcia',
    firstName: 'Maria',
    middleName: 'Torres',
    qualifier: '',
    fullName: 'Maria T. Garcia',
    badgeNo: '789123',
    sub_unit: 'SMD',
    designation: 'System Administrator',
    effectiveDate: '2023-02-10',
    designationDate: '2023-02-10',
    dateOfEntry: '2014-08-15',
    lastPromotionDate: '2021-05-20',
    status: 'Active'
  },
  {
    id: 'p-4',
    rank: 'PMSg',
    lastName: 'Ramos',
    firstName: 'Carlo',
    middleName: 'Aquino',
    qualifier: 'III',
    fullName: 'Carlo A. Ramos III',
    badgeNo: '456789',
    sub_unit: 'DMD',
    designation: 'Database Specialist',
    effectiveDate: '2020-11-05',
    designationDate: '2020-11-05',
    dateOfEntry: '2010-09-01',
    lastPromotionDate: '2018-10-15',
    status: 'Active'
  },
  {
    id: 'p-5',
    rank: 'PMSg',
    lastName: 'Navarro',
    firstName: 'Ana',
    middleName: 'Lopez',
    qualifier: '',
    fullName: 'Ana L. Navarro',
    badgeNo: '321654',
    sub_unit: 'PTD',
    designation: 'Training Coordinator',
    effectiveDate: '2022-08-01',
    designationDate: '2022-08-01',
    dateOfEntry: '2013-03-25',
    lastPromotionDate: '2020-11-12',
    status: 'Active'
  }
];

const mockEducation = [
  { id: 'edu-1', personnelId: 'p-1', academicLevel: 'College', degree: 'BS Information Technology', highest: true, certifications: ['CSC Professional'] },
  { id: 'edu-2', personnelId: 'p-2', academicLevel: 'College', degree: 'BS Computer Science', highest: true, certifications: ['RA 1080 (Board Passer)'] },
  { id: 'edu-3', personnelId: 'p-3', academicLevel: 'College', degree: 'BS Information Systems', highest: true, certifications: ['NAPOLCOM Promotional Exam'] },
  { id: 'edu-4', personnelId: 'p-4', academicLevel: 'College', degree: 'BS Electronics Engineering', highest: true, certifications: ['CSC Professional'] },
  { id: 'edu-5', personnelId: 'p-5', academicLevel: 'College', degree: 'BS Computer Engineering', highest: true, certifications: ['NAPOLCOM Promotional Exam'] }
];

const mockTraining = [
  { id: 'trn-1', personnelId: 'p-1', courseName: 'Public Safety Junior Leadership Course (PSJLC)', category: 'Mandatory Promotion QS' },
  { id: 'trn-2', personnelId: 'p-2', courseName: 'Public Safety Junior Leadership Course (PSJLC)', category: 'Mandatory Promotion QS' },
  { id: 'trn-3', personnelId: 'p-3', courseName: 'Public Safety Junior Leadership Course (PSJLC)', category: 'Mandatory Promotion QS' },
  { id: 'trn-4', personnelId: 'p-4', courseName: 'Public Safety Junior Leadership Course (PSJLC)', category: 'Mandatory Promotion QS' },
  { id: 'trn-5', personnelId: 'p-5', courseName: 'Public Safety Junior Leadership Course (PSJLC)', category: 'Mandatory Promotion QS' }
];

test('Dynamic Promotional Title formatting', () => {
  const rankPaths = [
    ['Pat', 'PATROLMAN TO POLICE CORPORAL'],
    ['PCpl', 'POLICE CORPORAL TO POLICE STAFF SERGEANT'],
    ['PSSg', 'POLICE STAFF SERGEANT TO POLICE MASTER SERGEANT'],
    ['PMSg', 'POLICE MASTER SERGEANT TO POLICE SENIOR MASTER SERGEANT'],
    ['PSMS', 'POLICE SENIOR MASTER SERGEANT TO POLICE CHIEF MASTER SERGEANT'],
    ['PCMS', 'POLICE CHIEF MASTER SERGEANT TO POLICE EXECUTIVE MASTER SERGEANT'],
    ['PEMS', 'POLICE EXECUTIVE MASTER SERGEANT TO POLICE LIEUTENANT'],
    ['PLT', 'POLICE LIEUTENANT TO POLICE CAPTAIN'],
    ['PCPT', 'POLICE CAPTAIN TO POLICE MAJOR'],
    ['PMAJ', 'POLICE MAJOR TO POLICE LIEUTENANT COLONEL'],
    ['PLTCOL', 'POLICE LIEUTENANT COLONEL TO POLICE COLONEL'],
    ['PCOL', 'POLICE COLONEL TO POLICE BRIGADIER GENERAL'],
    ['PBGEN', 'POLICE BRIGADIER GENERAL TO POLICE MAJOR GENERAL'],
    ['PMGEN', 'POLICE MAJOR GENERAL TO POLICE LIEUTENANT GENERAL'],
    ['PLTGEN', 'POLICE LIEUTENANT GENERAL TO POLICE GENERAL']
  ];

  for (const [rank, title] of rankPaths) {
    assert.equal(getDynamicPromotionalTitle(rank), title);
    assert.equal(getBackendPromotionalTitle(rank), title);
  }
  assert.equal(
    getDynamicPromotionalTitle('Police Master Sergeant Promotional Examination'),
    'POLICE MASTER SERGEANT TO POLICE SENIOR MASTER SERGEANT'
  );
  assert.equal(getDynamicPromotionalTitle('PROMOTIONAL EXAMINATION'), '');
  assert.equal(getDynamicPromotionalTitle('ALL'), '');
  assert.equal(getBackendPromotionalTitle('PROMOTIONAL EXAMINATION'), '');
});

test('Workbook contains exactly ONE worksheet and no hidden sheets', async () => {
  const workbook = await buildPromotionalWorksheetWorkbook({
    targetRank: 'PMSg',
    selectedPersonnelIds: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'],
    personnelList: mockPersonnel,
    educationList: mockEducation,
    trainingList: mockTraining
  });

  assert.equal(workbook.worksheets.length, 1);
  const sheet = workbook.worksheets[0];
  assert.equal(sheet.name, 'Worksheet');
  assert.equal(sheet.state, 'visible');
});

test('Promotional worksheet headers match PNP specifications', async () => {
  const workbook = await buildPromotionalWorksheetWorkbook({
    targetRank: 'PMSg',
    selectedPersonnelIds: ['p-1'],
    personnelList: mockPersonnel,
    educationList: mockEducation,
    trainingList: mockTraining
  });

  const sheet = workbook.worksheets[0];

  // Header 1: INFORMATION TECHNOLOGY MANAGEMENT SERVICE
  assert.equal(sheet.getCell('A2').value, 'INFORMATION TECHNOLOGY MANAGEMENT SERVICE');
  assert.equal(sheet.getCell('A2').font.bold, true);
  assert.equal(sheet.getCell('A2').alignment.horizontal, 'center');

  // Header 2: WORKSHEET
  assert.equal(sheet.getCell('A3').value, 'WORKSHEET');
  assert.equal(sheet.getCell('A3').font.bold, true);
  assert.equal(sheet.getCell('A3').alignment.horizontal, 'center');

  // Header 3: Dynamic title
  assert.equal(sheet.getCell('A4').value, 'POLICE MASTER SERGEANT TO POLICE SENIOR MASTER SERGEANT');
  assert.equal(sheet.getCell('A4').font.bold, true);
  assert.equal(sheet.getCell('A4').font.color.argb, 'FF000000');
  assert.equal(sheet.getCell('A4').alignment.horizontal, 'center');

  // Table Top Header: Row 6 & 7
  assert.equal(sheet.getCell('A6').value, 'NR');
  assert.equal(sheet.getCell('B6').value, 'NAME OF APPLICANTS');
  assert.equal(sheet.getCell('B7').value, 'Rank');
  assert.equal(sheet.getCell('C7').value, 'Last Name');
  assert.equal(sheet.getCell('D7').value, 'First Name');
  assert.equal(sheet.getCell('E7').value, 'Middle Name');
  assert.equal(sheet.getCell('F7').value, 'Qualifier');
  assert.equal(sheet.getCell('G6').value, 'Badge Number');
  assert.equal(sheet.getCell('H6').value, 'Office/Unit');
  assert.equal(sheet.getCell('I6').value, 'Date of Unit Assignment');
  assert.equal(sheet.getCell('J6').value, 'Designation');
  assert.equal(sheet.getCell('K6').value, 'Date Designated');
  assert.equal(sheet.getCell('L6').value, 'Date Entered the PNP');
  assert.equal(sheet.getCell('M6').value, 'Highest Educational Attainment');
  assert.equal(sheet.getCell('N6').value, 'Appropriate Eligibility');
  assert.equal(sheet.getCell('O6').value, 'Highest Mandatory Course');
  assert.match(String(sheet.getCell('P6').value), /Date of Last Promotion/);
  assert.equal(sheet.getCell('Q6').value, 'Time in Grade/Experience');
});

test('Personnel selection isolation: selecting 5 personnel outputs exactly 5 data rows', async () => {
  const selectedIds = ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'];
  const workbook = await buildPromotionalWorksheetWorkbook({
    targetRank: 'PMSg',
    selectedPersonnelIds: selectedIds,
    personnelList: mockPersonnel,
    educationList: mockEducation,
    trainingList: mockTraining
  });

  const sheet = workbook.worksheets[0];
  // Rows 1-5: headers spacing & titles
  // Rows 6-7: table headers
  // Rows 8-12: 5 personnel data rows
  assert.equal(sheet.getCell('A8').value, 1);
  assert.equal(sheet.getCell('A9').value, 2);
  assert.equal(sheet.getCell('A10').value, 3);
  assert.equal(sheet.getCell('A11').value, 4);
  assert.equal(sheet.getCell('A12').value, 5);

  // Row 13 should be empty
  assert.equal(sheet.getCell('A13').value, null);

  // Check 5th row values
  assert.equal(sheet.getCell('B12').value, 'PMSg');
  assert.equal(sheet.getCell('C12').value, 'Navarro');
  assert.equal(sheet.getCell('D12').value, 'Ana');
  assert.equal(sheet.getCell('G12').value, '321654');
});

test('Personnel selection isolation: selecting 1 personnel outputs exactly 1 data row', async () => {
  const workbook = await buildPromotionalWorksheetWorkbook({
    targetRank: 'PMSg',
    selectedPersonnelIds: ['p-3'],
    personnelList: mockPersonnel,
    educationList: mockEducation,
    trainingList: mockTraining
  });

  const sheet = workbook.worksheets[0];
  assert.equal(sheet.getCell('A8').value, 1);
  assert.equal(sheet.getCell('C8').value, 'Garcia');
  assert.equal(sheet.getCell('D8').value, 'Maria');
  assert.equal(sheet.getCell('A9').value, null);
});

test('Date columns format properly as dd/mm/yyyy', async () => {
  const workbook = await buildPromotionalWorksheetWorkbook({
    targetRank: 'PMSg',
    selectedPersonnelIds: ['p-1'],
    personnelList: mockPersonnel,
    educationList: mockEducation,
    trainingList: mockTraining
  });

  const sheet = workbook.worksheets[0];
  // Date of Unit Assignment (I8), Date Designated (K8), Date Entered PNP (L8), Date Last Promotion (P8)
  assert.equal(sheet.getCell('I8').numFmt, 'dd/mm/yyyy');
  assert.equal(sheet.getCell('K8').numFmt, 'dd/mm/yyyy');
  assert.equal(sheet.getCell('L8').numFmt, 'dd/mm/yyyy');
  assert.equal(sheet.getCell('P8').numFmt, 'dd/mm/yyyy');

  // Verify formatDdMmYyyy utility
  assert.equal(formatDdMmYyyy(new Date(Date.UTC(2020, 2, 10))), '10/03/2020');
});

test('Pre-export validation blocks incomplete personnel records with specific missing fields', () => {
  const incompletePersonnel = [
    {
      id: 'inc-1',
      rank: 'PMSg',
      lastName: 'Dela Cruz',
      firstName: 'Juan',
      badgeNo: '123456',
      sub_unit: 'ITSD',
      designation: 'Action PNCO',
      dateOfEntry: '2015-01-01',
      lastPromotionDate: '' // Missing last promotion date
    }
  ];

  const rows = buildPromotionalApplicantRows({
    targetRank: 'PMSg',
    selectedPersonnelIds: ['inc-1'],
    personnelList: incompletePersonnel,
    educationList: [], // Missing education
    trainingList: []   // Missing training
  });

  const issues = validatePromotionalPersonnel(rows);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].personnelId, 'inc-1');
  assert.ok(issues[0].missingFields.includes('Highest Educational Attainment'));
  assert.ok(issues[0].missingFields.includes('Highest Mandatory Course'));
  assert.ok(issues[0].missingFields.includes('Date of Last Promotion'));
});

test('Page setup enforces landscape orientation and 1-page wide printing', async () => {
  const workbook = await buildPromotionalWorksheetWorkbook({
    targetRank: 'PMSg',
    selectedPersonnelIds: ['p-1', 'p-2'],
    personnelList: mockPersonnel,
    educationList: mockEducation,
    trainingList: mockTraining
  });

  const sheet = workbook.worksheets[0];
  assert.equal(sheet.pageSetup.orientation, 'landscape');
  assert.equal(sheet.pageSetup.fitToWidth, 1);
  assert.equal(sheet.pageSetup.fitToHeight, 0);
  assert.equal(sheet.pageSetup.fitToPage, true);
  assert.equal(sheet.pageSetup.printTitlesRow, '6:7');
});

test('Backend service generates valid single-sheet buffer with identical layout', async () => {
  // Add a test personnel into db in-memory store
  const testPerson = {
    ...mockPersonnel[0],
    id: `test-backend-p1-${Date.now()}`
  };
  await db.createPersonnel(testPerson);
  await db.createEducation({
    id: `test-edu-${Date.now()}`,
    personnelId: testPerson.id,
    academicLevel: 'College',
    degree: 'BS Information Technology',
    highest: true,
    certifications: ['CSC Professional']
  });
  await db.createTraining({
    id: `test-trn-${Date.now()}`,
    personnelId: testPerson.id,
    courseName: 'Public Safety Junior Leadership Course (PSJLC)',
    category: 'Mandatory Promotion QS'
  });

  const buffer = await generatePromotionalWorksheetBuffer({
    selectedPersonnelIds: [testPerson.id],
    targetRank: 'PMSg'
  });

  assert.ok(buffer.length > 0);
  const loadedWb = new ExcelJS.Workbook();
  await loadedWb.xlsx.load(buffer);

  assert.equal(loadedWb.worksheets.length, 1);
  const ws = loadedWb.worksheets[0];
  assert.equal(ws.name, 'Worksheet');
  assert.equal(ws.getCell('A2').value, 'INFORMATION TECHNOLOGY MANAGEMENT SERVICE');
  assert.equal(ws.getCell('A4').value, 'POLICE MASTER SERGEANT TO POLICE SENIOR MASTER SERGEANT');
  assert.equal(ws.getCell('A4').font.color.argb, 'FF000000');
  assert.equal(ws.getCell('A8').value, 1);
  assert.equal(ws.getCell('B8').value, 'PMSg');
  assert.equal(ws.getCell('C8').value, 'Dela Cruz');
});

test('Export allows unfilled fields and renders them as blank cells without error', async () => {
  // Personnel with missing education, training, and assignment dates
  const incompleteApplicant = {
    id: `inc-test-${Date.now()}`,
    rank: 'PMSg',
    lastName: 'Balingit',
    firstName: 'Jose Jefferson',
    middleName: 'Lacsam',
    qualifier: 'II',
    badgeNo: '207837',
    sub_unit: 'ITMS',
    status: 'Active'
  };

  const wb = await buildPromotionalWorksheetWorkbook({
    targetRank: 'PMSg',
    selectedPersonnelIds: [incompleteApplicant.id],
    personnelList: [incompleteApplicant],
    educationList: [],
    trainingList: []
  });

  assert.equal(wb.worksheets.length, 1);
  const ws = wb.worksheets[0];
  assert.equal(ws.getCell('A8').value, 1);
  assert.equal(ws.getCell('B8').value, 'PMSg');
  assert.equal(ws.getCell('C8').value, 'Balingit');
  assert.equal(ws.getCell('D8').value, 'Jose Jefferson');
  assert.equal(ws.getCell('E8').value, 'Lacsam');
  assert.equal(ws.getCell('F8').value, 'II');
  assert.equal(ws.getCell('G8').value, '207837');
  // Unfilled fields are empty/blank strings
  assert.equal(ws.getCell('I8').value, '');
  assert.equal(ws.getCell('M8').value, '');
  assert.equal(ws.getCell('N8').value, '');
  assert.equal(ws.getCell('O8').value, '');
});

test('buildPromotionalWorksheetDetail produces full interactive spreadsheet detail with cells, merges, and styles', () => {
  const detail = buildPromotionalWorksheetDetail({
    targetRank: 'PMSg',
    selectedPersonnelIds: ['p-1', 'p-2'],
    personnelList: mockPersonnel,
    educationList: mockEducation,
    trainingList: mockTraining
  });

  assert.equal(detail.id, 'sheet-1');
  assert.equal(detail.name, 'Promotional Worksheet');
  assert.equal(detail.cells['A2'].v, 'INFORMATION TECHNOLOGY MANAGEMENT SERVICE');
  assert.equal(detail.cells['A3'].v, 'WORKSHEET');
  assert.equal(detail.cells['A4'].v, 'POLICE MASTER SERGEANT TO POLICE SENIOR MASTER SERGEANT');
  assert.equal(detail.cells['A4'].s.c, '#000000');
  // Headers
  assert.equal(detail.cells['A6'].v, 'NR');
  assert.equal(detail.cells['B6'].v, 'NAME OF APPLICANTS');
  assert.equal(detail.cells['B7'].v, 'Rank');
  assert.equal(detail.cells['C7'].v, 'Last Name');
  // Data rows
  assert.equal(detail.cells['A8'].v, 1);
  assert.equal(detail.cells['B8'].v, 'PMSg');
  assert.equal(detail.cells['C8'].v, 'Dela Cruz');
  assert.equal(detail.cells['A9'].v, 2);
  assert.equal(detail.cells['B9'].v, 'PMSg');
  assert.equal(detail.cells['C9'].v, 'Santos');
  // Merges
  assert.ok(detail.merges.includes('A2:Q2'));
  assert.ok(detail.merges.includes('A3:Q3'));
  assert.ok(detail.merges.includes('A4:Q4'));
  assert.ok(detail.merges.includes('B6:F6'));
  assert.ok(detail.merges.includes('A6:A7'));
});

test('buildPromotionalWorksheetDetail tags each cell with personnelId and target field name for live synchronization', () => {
  const detail = buildPromotionalWorksheetDetail({
    targetRank: 'PMSg',
    selectedPersonnelIds: ['p-1'],
    personnelList: mockPersonnel,
    educationList: mockEducation,
    trainingList: mockTraining
  });

  // Verify cell metadata on row 8
  assert.equal(detail.cells['A8'].personnelId, 'p-1');
  assert.equal(detail.cells['A8'].field, 'nr');
  assert.equal(detail.cells['B8'].personnelId, 'p-1');
  assert.equal(detail.cells['B8'].field, 'rank');
  assert.equal(detail.cells['C8'].personnelId, 'p-1');
  assert.equal(detail.cells['C8'].field, 'lastName');
  assert.equal(detail.cells['D8'].personnelId, 'p-1');
  assert.equal(detail.cells['D8'].field, 'firstName');
  assert.equal(detail.cells['E8'].personnelId, 'p-1');
  assert.equal(detail.cells['E8'].field, 'middleName');
  assert.equal(detail.cells['F8'].personnelId, 'p-1');
  assert.equal(detail.cells['F8'].field, 'qualifier');
  assert.equal(detail.cells['G8'].personnelId, 'p-1');
  assert.equal(detail.cells['G8'].field, 'badgeNo');
  assert.equal(detail.cells['H8'].personnelId, 'p-1');
  assert.equal(detail.cells['H8'].field, 'sub_unit');
  assert.equal(detail.cells['I8'].personnelId, 'p-1');
  assert.equal(detail.cells['I8'].field, 'effectiveDate');
  assert.equal(detail.cells['J8'].personnelId, 'p-1');
  assert.equal(detail.cells['J8'].field, 'designation');
  assert.equal(detail.cells['K8'].personnelId, 'p-1');
  assert.equal(detail.cells['K8'].field, 'designationDate');
  assert.equal(detail.cells['L8'].personnelId, 'p-1');
  assert.equal(detail.cells['L8'].field, 'dateOfEntry');
  assert.equal(detail.cells['M8'].personnelId, 'p-1');
  assert.equal(detail.cells['M8'].field, 'highestEducationalAttainment');
  assert.equal(detail.cells['N8'].personnelId, 'p-1');
  assert.equal(detail.cells['N8'].field, 'civilServiceEligibility');
  assert.equal(detail.cells['O8'].personnelId, 'p-1');
  assert.equal(detail.cells['O8'].field, 'mandatoryCourse');
  assert.equal(detail.cells['P8'].personnelId, 'p-1');
  assert.equal(detail.cells['P8'].field, 'lastPromotionDate');
  assert.equal(detail.cells['Q8'].personnelId, 'p-1');
  assert.equal(detail.cells['Q8'].field, 'timeInGrade');
});

test('promotional worksheet uses imported eligibility, mandatory course, and service date fields', () => {
  const person = {
    ...mockPersonnel[0],
    highestEducationalAttainment: 'BS Computer Science',
    civilServiceEligibility: 'CSP, PD 907',
    mandatoryCourse: 'PSOBC',
    dateOfEntry: '2021-11-04'
  };
  const [row] = buildPromotionalApplicantRows({
    selectedPersonnelIds: [person.id],
    personnelList: [person],
    educationList: [],
    trainingList: [],
    assignmentsList: []
  });

  assert.equal(row.appropriateEligibility, 'CSP, PD 907');
  assert.equal(row.highestEducationalAttainment, 'BS Computer Science');
  assert.equal(row.highestMandatoryCourse, 'PSOBC');
  assert.equal(row.dateEnteredPNP?.toISOString().slice(0, 10), '2021-11-04');
});

test('backend promotional worksheet reads imported snake-case personnel fields', async () => {
  const person = {
    ...mockPersonnel[0],
    id: 'p-imported-worksheet-fields',
    dateOfEntry: '',
    dateEnteredService: '',
    desUp: '',
    highest_educational_attainment: 'BS Computer Science',
    civil_service_eligibility: 'CSP, PD 907',
    mandatory_course: 'PSOBC',
    date_entered_service: '2021-11-04'
  };
  const originalGetters = {
    getPersonnel: db.getPersonnel,
    getAssignments: db.getAssignments,
    getEducation: db.getEducation,
    getTraining: db.getTraining,
    getPromotions: db.getPromotions
  };

  db.getPersonnel = async () => [person];
  db.getAssignments = async () => [];
  db.getEducation = async () => [];
  db.getTraining = async () => [];
  db.getPromotions = async () => [];

  try {
    const [row] = await getPromotionalApplicantsData([person.id]);
    assert.equal(row.highestEducationalAttainment, 'BS Computer Science');
    assert.equal(row.appropriateEligibility, 'CSP, PD 907');
    assert.equal(row.highestMandatoryCourse, 'PSOBC');
    assert.equal(row.dateEnteredPNP?.toISOString().slice(0, 10), '2021-11-04');
  } finally {
    Object.assign(db, originalGetters);
  }
});

test('parseDateToIso correctly normalizes dates from dd/mm/yyyy, yyyy-mm-dd, and Date instances', () => {
  assert.equal(parseDateToIso('15/06/2021'), '2021-06-15');
  assert.equal(parseDateToIso('01/12/2019'), '2019-12-01');
  assert.equal(parseDateToIso('5/8/2020'), '2020-08-05');
  assert.equal(parseDateToIso('2021-07-20'), '2021-07-20');
  assert.equal(parseDateToIso(new Date(2022, 2, 10)), '2022-03-10');
  assert.equal(parseDateToIso(''), null);
  assert.equal(parseDateToIso(null), null);
});

test('updateWorksheetCell synchronizes promotional worksheet edits directly to personnel database', async () => {
  // Build a test mock database
  const testPerson = {
    id: 'p-sync-1',
    rank: 'PMSg',
    lastName: 'Delos Reyes',
    firstName: 'Marco',
    middleName: 'Gomez',
    qualifier: '',
    fullName: 'Marco G. Delos Reyes',
    badgeNo: '998877',
    sub_unit: 'ITSD',
    lastPromotionDate: '2020-05-15',
    timeInGrade: ''
  };

  const updatedPayloads = [];
  const mockDb = {
    getPersonnel: async () => [testPerson],
    updatePersonnel: async (id, payload) => {
      updatedPayloads.push({ id, payload });
      Object.assign(testPerson, payload);
      return testPerson;
    }
  };

  // 1. Initialize promotional worksheet detail
  getWorksheetDetail('sheet-1', [testPerson]);

  // 2. Update Last Name in cell C8
  const resName = await updateWorksheetCell(
    'sheet-1',
    { address: 'C8', value: 'Villanueva' },
    { displayName: 'TestAdmin' },
    mockDb
  );

  assert.equal(resName.success, true);
  assert.equal(resName.personnelUpdated.field, 'lastName');
  assert.equal(resName.personnelUpdated.value, 'Villanueva');
  assert.equal(testPerson.lastName, 'Villanueva');
  assert.equal(testPerson.fullName, 'Villanueva, Marco Gomez');

  // 3. Update Date of Last Promotion in cell P8 with dd/mm/yyyy format
  const resDate = await updateWorksheetCell(
    'sheet-1',
    { address: 'P8', value: '10/01/2021' },
    { displayName: 'TestAdmin' },
    mockDb
  );

  assert.equal(resDate.success, true);
  assert.equal(resDate.personnelUpdated.field, 'lastPromotionDate');
  assert.equal(resDate.personnelUpdated.value, '2021-01-10'); // Normalized to ISO
  assert.equal(testPerson.lastPromotionDate, '2021-01-10');
  assert.ok(testPerson.timeInGrade.includes('years')); // timeInGrade was auto-recalculated!
});

