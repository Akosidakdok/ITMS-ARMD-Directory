/**
 * PAIS 2.0 Promotional Worksheet Generation Engine
 * Produces an authentic, official PNP single-worksheet Excel (.xlsx) document.
 * Adheres strictly to PNP administrative formatting, landscape 1-page width,
 * dynamic promotional exam titles, and pre-export data validation.
 */

import type ExcelJSType from 'exceljs';
import type { Personnel, AssignmentRecord, EducationRecord, TrainingRecord, PromotionRecord } from '../types/pais.ts';
import { getRankFullName, normalizeRankCode, PNP_RANKS } from '../constants/ranks.ts';
import { calculateTimeInGrade, parseCalendarDate } from './timeInGrade.ts';

export interface PromotionalApplicantData {
  nr: number;
  personnelId: string;
  rank: string;
  lastName: string;
  firstName: string;
  middleName: string;
  qualifier: string;
  badgeNo: string;
  officeUnit: string;
  dateOfUnitAssignment: Date | null;
  designation: string;
  dateDesignated: Date | null;
  dateEnteredPNP: Date | null;
  highestEducationalAttainment: string;
  appropriateEligibility: string;
  highestMandatoryCourse: string;
  dateOfLastPromotion: Date | null;
  timeInGrade: string;
}

export interface PersonnelValidationIssue {
  personnelId: string;
  personnelName: string;
  rank: string;
  badgeNo: string;
  missingFields: string[];
}

export interface PromotionalWorksheetOptions {
  promotionalTitle?: string;
  targetRank?: string;
  selectedPersonnelIds: string[];
  personnelList: Personnel[];
  assignmentsList?: AssignmentRecord[];
  educationList?: EducationRecord[];
  trainingList?: TrainingRecord[];
  promotionsList?: PromotionRecord[];
  allowIncomplete?: boolean;
}

export const MANDATORY_COURSES_BY_RANK: Record<string, string[]> = {
  Pat: ['PSRBC', 'PSBRC', 'PUBLIC SAFETY BASIC RECRUIT COURSE'],
  PCpl: ['PSRBC', 'PUBLIC SAFETY BASIC RECRUIT COURSE', 'PSJLC'],
  PSSg: ['PSRBC', 'PSJLC', 'PUBLIC SAFETY JUNIOR LEADERSHIP COURSE'],
  PMSg: ['PSJLC', 'PUBLIC SAFETY JUNIOR LEADERSHIP COURSE', 'PSMSLC'],
  PSMS: ['PSJLC', 'PSSLC', 'PUBLIC SAFETY SENIOR LEADERSHIP COURSE'],
  PCMS: ['PSSLC', 'PUBLIC SAFETY SENIOR LEADERSHIP COURSE', 'PEMSLC'],
  PEMS: ['PSSLC', 'PUBLIC SAFETY SENIOR LEADERSHIP COURSE', 'PSOBC'],
  PLT: ['PSOBC', 'PSOOC', 'PUBLIC SAFETY OFFICERS BASIC COURSE', 'PUBLIC SAFETY OFFICERS ORIENTATION COURSE'],
  PCPT: ['PSOBC', 'PSOOC', 'PSOAC', 'PUBLIC SAFETY OFFICERS ADVANCE COURSE'],
  PMAJ: ['PSOAC', 'PUBLIC SAFETY OFFICERS ADVANCE COURSE'],
  PLTCOL: ['PSOAC', 'PSOSEC', 'PUBLIC SAFETY OFFICERS SENIOR EXECUTIVE COURSE'],
  PCOL: ['PSOSEC', 'PUBLIC SAFETY OFFICERS SENIOR EXECUTIVE COURSE']
};

const NEXT_PROMOTION_RANK: Record<string, string> = {
  Pat: 'PCpl',
  PCpl: 'PSSg',
  PSSg: 'PMSg',
  PMSg: 'PSMS',
  PSMS: 'PCMS',
  PCMS: 'PEMS',
  PEMS: 'PLT',
  PLT: 'PCPT',
  PCPT: 'PMAJ',
  PMAJ: 'PLTCOL',
  PLTCOL: 'PCOL',
  PCOL: 'PBGEN',
  PBGEN: 'PMGEN',
  PMGEN: 'PLTGEN',
  PLTGEN: 'PGEN'
};

function resolvePromotionalRank(value: string) {
  const clean = value.trim();
  const upper = clean.toUpperCase();
  const exactRank = PNP_RANKS.find(rank => rank.code.toUpperCase() === upper || rank.name.toUpperCase() === upper);
  if (exactRank) return exactRank;
  const normalizedCode = normalizeRankCode(clean);
  return PNP_RANKS.find(rank => rank.code === normalizedCode);
}

/** Builds a promotion path title from the applicant's current rank. */
export function getDynamicPromotionalTitle(targetRankOrTitle?: string): string {
  if (!targetRankOrTitle || !targetRankOrTitle.trim()) return '';
  const clean = targetRankOrTitle.trim();
  if (clean.toUpperCase() === 'ALL' || clean.toUpperCase() === 'PROMOTIONAL EXAMINATION') return '';
  const rankTitle = clean.replace(/\s+PROMOTIONAL EXAMINATION$/i, '').trim();
  if (!rankTitle) return '';

  const explicitPath = rankTitle.match(/^(.+?)\s+TO\s+(.+)$/i);
  if (explicitPath) {
    const fromRank = resolvePromotionalRank(explicitPath[1]);
    const toRank = resolvePromotionalRank(explicitPath[2]);
    const fromName = fromRank?.name || explicitPath[1].trim();
    const toName = toRank?.name || explicitPath[2].trim();
    return `${fromName.toUpperCase()} TO ${toName.toUpperCase()}`;
  }

  const currentRank = resolvePromotionalRank(rankTitle);
  if (!currentRank) {
    const rankNorm = normalizeRankCode(rankTitle);
    return getRankFullName(rankNorm || rankTitle).toUpperCase();
  }

  const nextRankCode = NEXT_PROMOTION_RANK[currentRank.code];
  const nextRank = nextRankCode ? PNP_RANKS.find(rank => rank.code === nextRankCode) : undefined;
  const path = nextRank ? ` TO ${nextRank.name.toUpperCase()}` : '';
  return `${currentRank.name.toUpperCase()}${path}`;
}

/**
 * Resolves Date of Unit Assignment for a personnel
 */
export function resolveDateOfUnitAssignment(
  person: Personnel,
  assignments: AssignmentRecord[] = []
): Date | null {
  const currentMain = assignments
    .filter(a => a.personnelId === person.id && a.status === 'Current' && a.positionCategory !== 'In Addition/Concurrent')
    .sort((a, b) => String(b.effectiveDate || b.startDate || '').localeCompare(String(a.effectiveDate || a.startDate || '')))[0];

  const dateStr = currentMain?.effectiveDate || currentMain?.startDate || currentMain?.designationDate || person.effectiveDate;
  return parseCalendarDate(dateStr);
}

/**
 * Resolves Date Designated for a personnel
 */
export function resolveDateDesignated(
  person: Personnel,
  assignments: AssignmentRecord[] = []
): Date | null {
  const currentMain = assignments
    .filter(a => a.personnelId === person.id && a.status === 'Current')
    .sort((a, b) => String(b.designationDate || b.effectiveDate || '').localeCompare(String(a.designationDate || a.effectiveDate || '')))[0];

  const raw = person as any;
  const dateStr = person.designationDate || raw.designation_date || currentMain?.designationDate || currentMain?.effectiveDate;
  return parseCalendarDate(dateStr);
}

/**
 * Resolves Date Entered PNP
 */
export function resolveDateEnteredPNP(person: Personnel): Date | null {
  const raw = person as any;
  const dateStr = person.dateOfEntry || person.dateEnteredService || raw.date_entered_service || person.desUp;
  return parseCalendarDate(dateStr);
}

/**
 * Resolves Date of Last Promotion
 */
export function resolveDateOfLastPromotion(
  person: Personnel,
  promotions: PromotionRecord[] = []
): Date | null {
  const raw = person as any;
  const promDateStr = person.lastPromotionDate || raw.last_promotion_date;
  if (promDateStr) {
    const parsed = parseCalendarDate(promDateStr);
    if (parsed) return parsed;
  }
  const personPromotions = promotions
    .filter(p => p.personnelId === person.id && p.promotionDate)
    .sort((a, b) => String(b.promotionDate).localeCompare(String(a.promotionDate)));

  if (personPromotions.length && personPromotions[0].promotionDate) {
    return parseCalendarDate(personPromotions[0].promotionDate);
  }
  return null;
}

/**
 * Resolves Highest Educational Attainment
 */
export function resolveHighestEducation(
  person: Personnel,
  educationList: EducationRecord[] = []
): string {
  const raw = person as any;
  const importedEducation = String(person.highestEducationalAttainment || raw.highest_educational_attainment || '').trim();
  if (importedEducation) return importedEducation;

  const records = educationList.filter(e => e.personnelId === person.id);
  if (!records.length) {
    return person.qualification && !person.qualification.match(/^(JR|SR|II|III|IV|\.)/i) ? person.qualification.trim() : '';
  }

  const highestFlagged = records.find(e => e.highest);
  if (highestFlagged && highestFlagged.degree) {
    return highestFlagged.degree.trim();
  }

  const levelPriority: Record<string, number> = {
    'post-graduate': 4,
    'post graduate': 4,
    'masteral': 4,
    'doctorate': 4,
    'college': 3,
    'vocational': 2,
    'high school': 1,
    'elementary': 0
  };

  const sorted = [...records].sort((a, b) => {
    const pA = levelPriority[String(a.academicLevel || '').toLowerCase().trim()] ?? 2;
    const pB = levelPriority[String(b.academicLevel || '').toLowerCase().trim()] ?? 2;
    return pB - pA;
  });

  const best = sorted[0];
  if (best?.degree) return best.degree.trim();
  if (best?.academicLevel) return best.academicLevel.trim();
  return '';
}

/**
 * Resolves Appropriate Eligibility
 */
export function resolveAppropriateEligibility(
  person: Personnel,
  educationList: EducationRecord[] = [],
  trainingList: TrainingRecord[] = []
): string {
  const importedEligibility = person.civilServiceEligibility?.trim();
  if (importedEligibility) return importedEligibility;

  const personEdus = educationList.filter(e => e.personnelId === person.id);
  const certs = personEdus.flatMap(e => e.certifications || []).filter(Boolean);
  if (certs.length) {
    return certs.join(', ');
  }

  const personTrainings = trainingList.filter(t => t.personnelId === person.id);
  const eligibilityTrainings = personTrainings.filter(t =>
    /eligibility|napolcom|csc|civil service|bar|board|let|pese|officer/i.test(`${t.courseName || ''} ${t.category || ''}`)
  );
  if (eligibilityTrainings.length) {
    return eligibilityTrainings[0].courseName.trim();
  }

  if (person.qualification && !person.qualification.match(/^(JR|SR|II|III|IV|\.)/i)) {
    return person.qualification.trim();
  }

  return '';
}

/**
 * Resolves Highest Mandatory Course
 */
export function resolveHighestMandatoryCourse(
  person: Personnel,
  trainingList: TrainingRecord[] = []
): string {
  const importedCourse = person.mandatoryCourse?.trim();
  if (importedCourse) return importedCourse;

  const personTrainings = trainingList.filter(t => t.personnelId === person.id);
  if (!personTrainings.length) return '';

  const mandatoryTrainings = personTrainings.filter(t =>
    t.category === 'Mandatory Promotion QS' ||
    t.category === 'Career Course' ||
    /mandatory|psrbc|psbrc|psjlc|psslc|psobc|psooc|psoac|psosec/i.test(t.courseName || '')
  );

  if (!mandatoryTrainings.length) return '';

  const cleanRank = normalizeRankCode(person.rank);
  const rankCourses = MANDATORY_COURSES_BY_RANK[cleanRank] || [];

  for (const code of rankCourses) {
    const matched = mandatoryTrainings.find(t =>
      (t.courseName || '').toUpperCase().includes(code)
    );
    if (matched) return matched.courseName.trim();
  }

  return mandatoryTrainings[0].courseName.trim();
}

/**
 * Transforms personnel database records into structured promotional applicant rows
 */
export function buildPromotionalApplicantRows(options: PromotionalWorksheetOptions): PromotionalApplicantData[] {
  const {
    selectedPersonnelIds,
    personnelList,
    assignmentsList = [],
    educationList = [],
    trainingList = [],
    promotionsList = []
  } = options;

  const selectedSet = new Set(selectedPersonnelIds);
  const targetPersonnel = personnelList.filter(p => selectedSet.has(p.id));

  return targetPersonnel.map((person, index) => {
    const dateOfUnitAssignment = resolveDateOfUnitAssignment(person, assignmentsList);
    const dateDesignated = resolveDateDesignated(person, assignmentsList);
    const dateEnteredPNP = resolveDateEnteredPNP(person);
    const dateOfLastPromotion = resolveDateOfLastPromotion(person, promotionsList);
    const highestEducationalAttainment = resolveHighestEducation(person, educationList);
    const appropriateEligibility = resolveAppropriateEligibility(person, educationList, trainingList);
    const highestMandatoryCourse = resolveHighestMandatoryCourse(person, trainingList);

    const tigDateStr = person.lastPromotionDate || (dateOfLastPromotion ? dateOfLastPromotion.toISOString().slice(0, 10) : '');
    const tigCalc = calculateTimeInGrade(tigDateStr);
    const timeInGrade = tigCalc.formatted !== 'N/A' ? tigCalc.formatted : '';

    const officeUnit = person.sub_unit || person.division || person.officeDivision || person.unit || '';

    return {
      nr: index + 1,
      personnelId: person.id,
      rank: person.rank || '',
      lastName: person.lastName || '',
      firstName: person.firstName || '',
      middleName: person.middleName || '',
      qualifier: person.qualifier || '',
      badgeNo: person.badgeNo || person.badge_number || '',
      officeUnit,
      dateOfUnitAssignment,
      designation: person.designation || '',
      dateDesignated,
      dateEnteredPNP,
      highestEducationalAttainment,
      appropriateEligibility,
      highestMandatoryCourse,
      dateOfLastPromotion,
      timeInGrade
    };
  });
}

/**
 * Strict Pre-Export Validation
 * Detects missing mandatory information and returns clear error issues per personnel
 */
export function validatePromotionalPersonnel(
  selectedPersonnel: PromotionalApplicantData[]
): PersonnelValidationIssue[] {
  const issues: PersonnelValidationIssue[] = [];

  for (const applicant of selectedPersonnel) {
    const missing: string[] = [];

    if (!applicant.rank?.trim()) missing.push('Rank');
    if (!applicant.lastName?.trim()) missing.push('Last Name');
    if (!applicant.firstName?.trim()) missing.push('First Name');
    if (!applicant.badgeNo?.trim()) missing.push('Badge Number');
    if (!applicant.officeUnit?.trim()) missing.push('Office/Unit');
    if (!applicant.dateOfUnitAssignment) missing.push('Date of Unit Assignment');
    if (!applicant.designation?.trim()) missing.push('Designation');
    if (!applicant.dateDesignated) missing.push('Date Designated');
    if (!applicant.dateEnteredPNP) missing.push('Date Entered the PNP');
    if (!applicant.highestEducationalAttainment?.trim()) missing.push('Highest Educational Attainment');
    if (!applicant.appropriateEligibility?.trim()) missing.push('Appropriate Eligibility');
    if (!applicant.highestMandatoryCourse?.trim()) missing.push('Highest Mandatory Course');
    if (!applicant.dateOfLastPromotion) missing.push('Date of Last Promotion');
    if (!applicant.timeInGrade?.trim()) missing.push('Time in Grade/Experience');

    if (missing.length > 0) {
      const nameParts = [applicant.rank, applicant.firstName, applicant.middleName, applicant.lastName, applicant.qualifier].filter(Boolean);
      issues.push({
        personnelId: applicant.personnelId,
        personnelName: nameParts.join(' ').trim() || `Personnel #${applicant.nr}`,
        rank: applicant.rank,
        badgeNo: applicant.badgeNo,
        missingFields: missing
      });
    }
  }

  return issues;
}

/**
 * Formats a JavaScript Date as dd/mm/yyyy
 */
export function formatDdMmYyyy(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses dd/mm/yyyy, yyyy-mm-dd, or Date object to ISO YYYY-MM-DD
 */
export function parseDateToIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(value).trim();
  if (!str) return null;

  // Match dd/mm/yyyy or dd-mm-yyyy
  const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(str);
  if (dmyMatch) {
    const d = String(dmyMatch[1]).padStart(2, '0');
    const m = String(dmyMatch[2]).padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Match yyyy-mm-dd or yyyy/mm/dd
  const ymdMatch = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(str);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(ymdMatch[2]).padStart(2, '0');
    const d = String(ymdMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Assembles and styles the official single-worksheet ExcelJS Workbook
 */
export async function buildPromotionalWorksheetWorkbook(
  options: PromotionalWorksheetOptions
): Promise<ExcelJSType.Workbook> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PNP-ITMS PAIS 2.0';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  // Single worksheet named "Worksheet"
  const worksheet = workbook.addWorksheet('Worksheet', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      },
      printTitlesRow: '6:7'
    },
    views: [
      { state: 'frozen', xSplit: 0, ySplit: 7, showGridLines: true }
    ]
  });

  const promotionalTitle = getDynamicPromotionalTitle(options.promotionalTitle || options.targetRank);
  const applicantRows = buildPromotionalApplicantRows(options);

  // Column definitions (A to Q = 17 columns)
  worksheet.columns = [
    { key: 'nr', width: 6 },
    { key: 'rank', width: 10 },
    { key: 'lastName', width: 16 },
    { key: 'firstName', width: 16 },
    { key: 'middleName', width: 14 },
    { key: 'qualifier', width: 9 },
    { key: 'badgeNo', width: 14 },
    { key: 'officeUnit', width: 14 },
    { key: 'dateOfUnitAssignment', width: 15 },
    { key: 'designation', width: 22 },
    { key: 'dateDesignated', width: 15 },
    { key: 'dateEnteredPNP', width: 15 },
    { key: 'highestEducationalAttainment', width: 26 },
    { key: 'appropriateEligibility', width: 24 },
    { key: 'highestMandatoryCourse', width: 26 },
    { key: 'dateOfLastPromotion', width: 16 },
    { key: 'timeInGrade', width: 20 }
  ];

  // Common styles
  const fontHeaderTitle = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } };
  const fontSubTitle = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  const fontExamTitle = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
  const fontTableHeader = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };
  const fontDataRegular = { name: 'Arial', size: 9, color: { argb: 'FF000000' } };
  const fontDataBold = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF000000' } };

  const borderThin: Partial<ExcelJSType.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  const fillHeaderGray: ExcelJSType.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' }
  };

  // Row 1: Spacing
  worksheet.getRow(1).height = 10;

  // Row 2: INFORMATION TECHNOLOGY MANAGEMENT SERVICE
  worksheet.mergeCells('A2:Q2');
  const titleCell1 = worksheet.getCell('A2');
  titleCell1.value = 'INFORMATION TECHNOLOGY MANAGEMENT SERVICE';
  titleCell1.font = fontHeaderTitle;
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Row 3: WORKSHEET
  worksheet.mergeCells('A3:Q3');
  const titleCell2 = worksheet.getCell('A3');
  titleCell2.value = 'WORKSHEET';
  titleCell2.font = fontSubTitle;
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 18;

  // Row 4: Dynamic Promotional Title
  worksheet.mergeCells('A4:Q4');
  const titleCell3 = worksheet.getCell('A4');
  titleCell3.value = promotionalTitle;
  titleCell3.font = fontExamTitle;
  titleCell3.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(4).height = 18;

  // Row 5: Spacing
  worksheet.getRow(5).height = 12;

  // Table Headers (Rows 6 & 7)
  worksheet.getRow(6).height = 24;
  worksheet.getRow(7).height = 24;

  // Merged Vertically (Rows 6 to 7)
  const verticalMerges: Array<{ range: string; cell: string; text: string }> = [
    { range: 'A6:A7', cell: 'A6', text: 'NR' },
    { range: 'G6:G7', cell: 'G6', text: 'Badge Number' },
    { range: 'H6:H7', cell: 'H6', text: 'Office/Unit' },
    { range: 'I6:I7', cell: 'I6', text: 'Date of Unit Assignment' },
    { range: 'J6:J7', cell: 'J6', text: 'Designation' },
    { range: 'K6:K7', cell: 'K6', text: 'Date Designated' },
    { range: 'L6:L7', cell: 'L6', text: 'Date Entered the PNP' },
    { range: 'M6:M7', cell: 'M6', text: 'Highest Educational Attainment' },
    { range: 'N6:N7', cell: 'N6', text: 'Appropriate Eligibility' },
    { range: 'O6:O7', cell: 'O6', text: 'Highest Mandatory Course' },
    { range: 'P6:P7', cell: 'P6', text: 'Date of Last Promotion\n(dd/mm/yyyy)' },
    { range: 'Q6:Q7', cell: 'Q6', text: 'Time in Grade/Experience' }
  ];

  verticalMerges.forEach(item => {
    worksheet.mergeCells(item.range);
    const cell = worksheet.getCell(item.cell);
    cell.value = item.text;
    cell.font = fontTableHeader;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = fillHeaderGray;
    cell.border = borderThin;
  });

  // Name of Applicants (Merged Horizontally B6:F6)
  worksheet.mergeCells('B6:F6');
  const applicantsCell = worksheet.getCell('B6');
  applicantsCell.value = 'NAME OF APPLICANTS';
  applicantsCell.font = fontTableHeader;
  applicantsCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applicantsCell.fill = fillHeaderGray;
  applicantsCell.border = borderThin;

  // Sub-headers in Row 7 for Name of Applicants
  const subHeaders: Array<{ cell: string; text: string }> = [
    { cell: 'B7', text: 'Rank' },
    { cell: 'C7', text: 'Last Name' },
    { cell: 'D7', text: 'First Name' },
    { cell: 'E7', text: 'Middle Name' },
    { cell: 'F7', text: 'Qualifier' }
  ];

  subHeaders.forEach(sub => {
    const cell = worksheet.getCell(sub.cell);
    cell.value = sub.text;
    cell.font = fontTableHeader;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = fillHeaderGray;
    cell.border = borderThin;
  });

  // Apply borders to all cells in rows 6 and 7 (including merged components)
  for (let c = 1; c <= 17; c++) {
    const colLetter = String.fromCharCode(64 + c);
    const c6 = worksheet.getCell(`${colLetter}6`);
    const c7 = worksheet.getCell(`${colLetter}7`);
    c6.border = borderThin;
    c7.border = borderThin;
  }

  // Populate Data Rows (Starting at Row 8)
  applicantRows.forEach((row, idx) => {
    const rNum = 8 + idx;
    const r = worksheet.getRow(rNum);
    r.height = 22;

    const setCell = (colIdx: number, val: any, align: 'left' | 'center' | 'right' = 'left', bold = false, numFmt?: string) => {
      const cell = r.getCell(colIdx);
      cell.value = val;
      cell.font = bold ? fontDataBold : fontDataRegular;
      cell.alignment = { horizontal: align, vertical: 'middle', wrapText: true };
      cell.border = borderThin;
      if (numFmt) {
        cell.numFmt = numFmt;
      }
    };

    // 1. NR
    setCell(1, row.nr, 'center');
    // 2. Rank
    setCell(2, row.rank, 'center', true);
    // 3. Last Name
    setCell(3, row.lastName, 'left');
    // 4. First Name
    setCell(4, row.firstName, 'left');
    // 5. Middle Name
    setCell(5, row.middleName || '', 'left');
    // 6. Qualifier
    setCell(6, row.qualifier || '', 'center');
    // 7. Badge Number
    setCell(7, row.badgeNo, 'center');
    // 8. Office/Unit
    setCell(8, row.officeUnit, 'center');
    // 9. Date of Unit Assignment (dd/mm/yyyy)
    setCell(9, row.dateOfUnitAssignment || '', 'center', false, row.dateOfUnitAssignment ? 'dd/mm/yyyy' : undefined);
    // 10. Designation
    setCell(10, row.designation, 'left');
    // 11. Date Designated (dd/mm/yyyy)
    setCell(11, row.dateDesignated || '', 'center', false, row.dateDesignated ? 'dd/mm/yyyy' : undefined);
    // 12. Date Entered PNP (dd/mm/yyyy)
    setCell(12, row.dateEnteredPNP || '', 'center', false, row.dateEnteredPNP ? 'dd/mm/yyyy' : undefined);
    // 13. Highest Educational Attainment
    setCell(13, row.highestEducationalAttainment, 'left');
    // 14. Appropriate Eligibility
    setCell(14, row.appropriateEligibility, 'left');
    // 15. Highest Mandatory Course
    setCell(15, row.highestMandatoryCourse, 'left');
    // 16. Date of Last Promotion (dd/mm/yyyy)
    setCell(16, row.dateOfLastPromotion || '', 'center', false, row.dateOfLastPromotion ? 'dd/mm/yyyy' : undefined);
    // 17. Time in Grade/Experience
    setCell(17, row.timeInGrade, 'left');
  });

  return workbook;
}

/**
 * Generates and downloads the promotional worksheet directly in the browser
 */
export async function downloadPromotionalWorksheetExcel(
  options: PromotionalWorksheetOptions
): Promise<{ success: boolean; filename?: string; issues?: PersonnelValidationIssue[] }> {
  const applicantRows = buildPromotionalApplicantRows(options);
  const issues = validatePromotionalPersonnel(applicantRows);

  // If allowIncomplete is explicitly set to false, block export on missing fields.
  // By default, allow exporting with unfilled fields left blank.
  if (options.allowIncomplete === false && issues.length > 0) {
    return { success: false, issues };
  }

  const workbook = await buildPromotionalWorksheetWorkbook(options);
  const buffer = await workbook.xlsx.writeBuffer();

  const titlePart = (options.targetRank || options.promotionalTitle || 'Promotional')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `worksheet_${titlePart}_${dateStr}.xlsx`;

  const blob = new Blob([buffer as any], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}

/**
 * Builds an interactive WorksheetDetail model for the spreadsheet grid component (ExcelWorksheetModule)
 * Allows displaying the PNP promotional worksheet live in the browser's spreadsheet table.
 */
export function buildPromotionalWorksheetDetail(
  options: PromotionalWorksheetOptions
) {
  const dynamicTitle = getDynamicPromotionalTitle(options.promotionalTitle || options.targetRank);
  const applicantRows = buildPromotionalApplicantRows(options);

  const cells: Record<string, any> = {};

  // Row 2: Header Line 1
  cells['A2'] = {
    v: 'INFORMATION TECHNOLOGY MANAGEMENT SERVICE',
    s: { b: 1, sz: 12, ah: 'center', av: 'middle', fn: 'Arial' }
  };

  // Row 3: Header Line 2
  cells['A3'] = {
    v: 'WORKSHEET',
    s: { b: 1, sz: 11, ah: 'center', av: 'middle', fn: 'Arial' }
  };

  // Row 4: Header Line 3 (Dynamic promotional exam title)
  cells['A4'] = {
    v: dynamicTitle,
    s: { b: 1, sz: 11, ah: 'center', av: 'middle', fn: 'Arial', c: '#000000' }
  };

  // Row 6: Main Column Headers
  const hdrStyle = { b: 1, sz: 10, ah: 'center', av: 'middle', bg: '#f1f5f9', wrap: 1, fn: 'Arial' };
  cells['A6'] = { v: 'NR', s: hdrStyle };
  cells['B6'] = { v: 'NAME OF APPLICANTS', s: { ...hdrStyle, bg: '#e2e8f0' } };
  cells['G6'] = { v: 'Badge Number', s: hdrStyle };
  cells['H6'] = { v: 'Office/Unit', s: hdrStyle };
  cells['I6'] = { v: 'Date of Unit Assignment', s: hdrStyle };
  cells['J6'] = { v: 'Designation', s: hdrStyle };
  cells['K6'] = { v: 'Date Designated', s: hdrStyle };
  cells['L6'] = { v: 'Date Entered the PNP', s: hdrStyle };
  cells['M6'] = { v: 'Highest Educational Attainment', s: hdrStyle };
  cells['N6'] = { v: 'Appropriate Eligibility', s: hdrStyle };
  cells['O6'] = { v: 'Highest Mandatory Course', s: hdrStyle };
  cells['P6'] = { v: 'Date of Last Promotion', s: hdrStyle };
  cells['Q6'] = { v: 'Time in Grade / Experience', s: hdrStyle };

  // Row 7: Sub Headers under NAME OF APPLICANTS
  const subHdrStyle = { b: 1, sz: 9, ah: 'center', av: 'middle', bg: '#f1f5f9', fn: 'Arial' };
  cells['B7'] = { v: 'Rank', s: subHdrStyle };
  cells['C7'] = { v: 'Last Name', s: subHdrStyle };
  cells['D7'] = { v: 'First Name', s: subHdrStyle };
  cells['E7'] = { v: 'Middle Name', s: subHdrStyle };
  cells['F7'] = { v: 'Qualifier', s: subHdrStyle };

  // Rows 8+: Applicant Data Rows
  applicantRows.forEach((row, idx) => {
    const rNum = 8 + idx;
    const pid = row.personnelId;
    cells[`A${rNum}`] = { v: row.nr, s: { ah: 'center', av: 'middle', sz: 10 }, personnelId: pid, field: 'nr' };
    cells[`B${rNum}`] = { v: row.rank || '', s: { b: 1, ah: 'center', av: 'middle', sz: 10, c: '#1e3a8a' }, personnelId: pid, field: 'rank' };
    cells[`C${rNum}`] = { v: row.lastName || '', s: { b: 1, ah: 'left', av: 'middle', sz: 10 }, personnelId: pid, field: 'lastName' };
    cells[`D${rNum}`] = { v: row.firstName || '', s: { ah: 'left', av: 'middle', sz: 10 }, personnelId: pid, field: 'firstName' };
    cells[`E${rNum}`] = { v: row.middleName || '', s: { ah: 'left', av: 'middle', sz: 10 }, personnelId: pid, field: 'middleName' };
    cells[`F${rNum}`] = { v: row.qualifier || '', s: { ah: 'center', av: 'middle', sz: 10 }, personnelId: pid, field: 'qualifier' };
    cells[`G${rNum}`] = { v: row.badgeNo || '', s: { ah: 'center', av: 'middle', sz: 10 }, personnelId: pid, field: 'badgeNo' };
    cells[`H${rNum}`] = { v: row.officeUnit || '', s: { ah: 'center', av: 'middle', sz: 10 }, personnelId: pid, field: 'sub_unit' };
    cells[`I${rNum}`] = { v: formatDdMmYyyy(row.dateOfUnitAssignment), s: { ah: 'center', av: 'middle', sz: 10, nf: 'dd/mm/yyyy' }, personnelId: pid, field: 'effectiveDate' };
    cells[`J${rNum}`] = { v: row.designation || '', s: { ah: 'left', av: 'middle', sz: 10 }, personnelId: pid, field: 'designation' };
    cells[`K${rNum}`] = { v: formatDdMmYyyy(row.dateDesignated), s: { ah: 'center', av: 'middle', sz: 10, nf: 'dd/mm/yyyy' }, personnelId: pid, field: 'designationDate' };
    cells[`L${rNum}`] = { v: formatDdMmYyyy(row.dateEnteredPNP), s: { ah: 'center', av: 'middle', sz: 10, nf: 'dd/mm/yyyy' }, personnelId: pid, field: 'dateOfEntry' };
    cells[`M${rNum}`] = { v: row.highestEducationalAttainment || '', s: { ah: 'left', av: 'middle', sz: 10 }, personnelId: pid, field: 'highestEducationalAttainment' };
    cells[`N${rNum}`] = { v: row.appropriateEligibility || '', s: { ah: 'left', av: 'middle', sz: 10 }, personnelId: pid, field: 'civilServiceEligibility' };
    cells[`O${rNum}`] = { v: row.highestMandatoryCourse || '', s: { ah: 'left', av: 'middle', sz: 10 }, personnelId: pid, field: 'mandatoryCourse' };
    cells[`P${rNum}`] = { v: formatDdMmYyyy(row.dateOfLastPromotion), s: { ah: 'center', av: 'middle', sz: 10, nf: 'dd/mm/yyyy' }, personnelId: pid, field: 'lastPromotionDate' };
    cells[`Q${rNum}`] = { v: row.timeInGrade || '', s: { ah: 'left', av: 'middle', sz: 10 }, personnelId: pid, field: 'timeInGrade' };
  });

  const merges = [
    'A2:Q2',
    'A3:Q3',
    'A4:Q4',
    'A6:A7',
    'B6:F6',
    'G6:G7',
    'H6:H7',
    'I6:I7',
    'J6:J7',
    'K6:K7',
    'L6:L7',
    'M6:M7',
    'N6:N7',
    'O6:O7',
    'P6:P7',
    'Q6:Q7'
  ];

  const columnConfig: Record<string, { width: number; hidden: boolean; letter: string }> = {
    A: { width: 55, hidden: false, letter: 'A' },
    B: { width: 90, hidden: false, letter: 'B' },
    C: { width: 140, hidden: false, letter: 'C' },
    D: { width: 140, hidden: false, letter: 'D' },
    E: { width: 120, hidden: false, letter: 'E' },
    F: { width: 80, hidden: false, letter: 'F' },
    G: { width: 120, hidden: false, letter: 'G' },
    H: { width: 130, hidden: false, letter: 'H' },
    I: { width: 150, hidden: false, letter: 'I' },
    J: { width: 180, hidden: false, letter: 'J' },
    K: { width: 150, hidden: false, letter: 'K' },
    L: { width: 150, hidden: false, letter: 'L' },
    M: { width: 240, hidden: false, letter: 'M' },
    N: { width: 220, hidden: false, letter: 'N' },
    O: { width: 240, hidden: false, letter: 'O' },
    P: { width: 150, hidden: false, letter: 'P' },
    Q: { width: 180, hidden: false, letter: 'Q' }
  };

  const rowConfig: Record<string, { height?: number; hidden?: boolean }> = {
    '2': { height: 28 },
    '3': { height: 22 },
    '4': { height: 24 },
    '6': { height: 26 },
    '7': { height: 22 }
  };

  return {
    id: 'sheet-1',
    name: 'Promotional Worksheet',
    order: 1,
    rowCount: Math.max(50, applicantRows.length + 15),
    colCount: 26,
    merges,
    columnConfig,
    rowConfig,
    cells
  };
}
