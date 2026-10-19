/**
 * Backend Service: Official Promotional Worksheet Generation
 * Queries canonical PAIS 2.0 database entities (personnel, assignments, education, training, promotions)
 * and generates the single-worksheet Excel workbook.
 */

import ExcelJS from 'exceljs';
import { db } from '../store/repository.js';

export const PNP_RANK_NAMES = {
  PGEN: 'Police General',
  PLTGEN: 'Police Lieutenant General',
  PMGEN: 'Police Major General',
  PBGEN: 'Police Brigadier General',
  PCOL: 'Police Colonel',
  PLTCOL: 'Police Lieutenant Colonel',
  PMAJ: 'Police Major',
  PCPT: 'Police Captain',
  PLT: 'Police Lieutenant',
  PEMS: 'Police Executive Master Sergeant',
  PCMS: 'Police Chief Master Sergeant',
  PSMS: 'Police Senior Master Sergeant',
  PMSg: 'Police Master Sergeant',
  PSSg: 'Police Staff Sergeant',
  PCpl: 'Police Corporal',
  Pat: 'Patrolman',
  NUP: 'Non-Uniformed Personnel'
};

export function normalizeRankCode(rank) {
  if (!rank) return '';
  const clean = String(rank).trim();
  const upper = clean.toUpperCase().replace(/\s+/g, '');
  if (upper === 'P/BGEN' || upper === 'PBGEN') return 'PBGEN';
  if (upper === 'P/COL' || upper === 'PCOL') return 'PCOL';
  if (upper === 'P/LTCOL' || upper === 'PLTCOL') return 'PLTCOL';
  if (upper === 'P/MAJ' || upper === 'PMAJ') return 'PMAJ';
  if (upper === 'P/CPT' || upper === 'PCPT') return 'PCPT';
  if (upper === 'P/LT' || upper === 'PLT') return 'PLT';
  if (upper === 'PEMS') return 'PEMS';
  if (upper === 'PCMS') return 'PCMS';
  if (upper === 'PSMS') return 'PSMS';
  if (upper === 'PMS' || upper === 'PMSG') return 'PMSg';
  if (upper === 'PSSG') return 'PSSg';
  if (upper === 'PCPL') return 'PCpl';
  if (upper === 'PAT' || upper === 'PATROLMAN') return 'Pat';
  if (upper === 'NUP') return 'NUP';
  return clean;
}

export function getRankFullName(rank) {
  const norm = normalizeRankCode(rank);
  return PNP_RANK_NAMES[norm] || PNP_RANK_NAMES[rank] || rank;
}

export function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(Date.UTC(y, mo, d));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

export function calculateTimeInGrade(fromDateStr, targetDateStr) {
  const fromDate = parseDateSafe(fromDateStr);
  if (!fromDate) return 'N/A';
  const targetDate = targetDateStr ? parseDateSafe(targetDateStr) : new Date();
  if (!targetDate || fromDate > targetDate) return 'N/A';

  let years = targetDate.getUTCFullYear() - fromDate.getUTCFullYear();
  let months = targetDate.getUTCMonth() - fromDate.getUTCMonth();
  let days = targetDate.getUTCDate() - fromDate.getUTCDate();

  let borrowedMonths = 0;
  while (days < 0) {
    months -= 1;
    borrowedMonths += 1;
    const prevMonthLastDay = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() - borrowedMonths + 1, 0)).getUTCDate();
    days += prevMonthLastDay;
  }

  while (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
  parts.push(`${days} day${days !== 1 ? 's' : ''}`);

  return parts.join(', ');
}

export function getDynamicPromotionalTitle(targetRankOrTitle) {
  if (!targetRankOrTitle || !targetRankOrTitle.trim()) {
    return 'PROMOTIONAL EXAMINATION';
  }
  const clean = targetRankOrTitle.trim();
  if (clean.toUpperCase().endsWith('PROMOTIONAL EXAMINATION')) {
    return clean.toUpperCase();
  }
  const rankNorm = normalizeRankCode(clean);
  const fullRank = getRankFullName(rankNorm || clean);
  return `${fullRank.toUpperCase()} PROMOTIONAL EXAMINATION`;
}

export async function getPromotionalApplicantsData(selectedPersonnelIds = [], customTitle = '') {
  const allPersonnel = await db.getPersonnel();
  const allAssignments = await db.getAssignments();
  const allEducation = await db.getEducation();
  const allTraining = await db.getTraining();
  const allPromotions = await db.getPromotions();

  const selectedSet = new Set(selectedPersonnelIds);
  const targetPersonnel = allPersonnel.filter(p => selectedSet.has(p.id));

  return targetPersonnel.map((person, index) => {
    // 1. NR: 1-indexed
    const nr = index + 1;
    // 2. Rank
    const rank = person.rank || '';
    // 3. Last Name
    const lastName = person.lastName || person.last_name || '';
    // 4. First Name
    const firstName = person.firstName || person.first_name || '';
    // 5. Middle Name
    const middleName = person.middleName || person.middle_name || '';
    // 6. Qualifier
    const qualifier = person.qualifier || person.qualification || '';
    // 7. Badge Number
    const badgeNo = person.badgeNo || person.badge_number || '';
    // 8. Office/Unit
    const officeUnit = person.sub_unit || person.division || person.officeDivision || person.unit || '';

    // 9. Date of Unit Assignment
    const currentMainAsg = (allAssignments || [])
      .filter(a => a.personnelId === person.id && a.status === 'Current' && a.positionCategory !== 'In Addition/Concurrent')
      .sort((a, b) => String(b.effectiveDate || b.startDate || '').localeCompare(String(a.effectiveDate || a.startDate || '')))[0];
    const unitAsgDateStr = currentMainAsg?.effectiveDate || currentMainAsg?.startDate || currentMainAsg?.designationDate || person.effectiveDate;
    const dateOfUnitAssignment = parseDateSafe(unitAsgDateStr);

    // 10. Designation
    const designation = person.designation || currentMainAsg?.position || '';

    // 11. Date Designated
    const desigDateStr = person.designationDate || person.designation_date || currentMainAsg?.designationDate || currentMainAsg?.effectiveDate;
    const dateDesignated = parseDateSafe(desigDateStr);

    // 12. Date Entered the PNP
    const entryDateStr = person.dateOfEntry || person.dateEnteredService || person.date_entered_service || person.desUp;
    const dateEnteredPNP = parseDateSafe(entryDateStr);

    // 13. Highest Educational Attainment
    const personEdus = (allEducation || []).filter(e => e.personnelId === person.id);
    let highestEducationalAttainment = '';
    const highestFlagged = personEdus.find(e => e.highest);
    if (highestFlagged && highestFlagged.degree) {
      highestEducationalAttainment = highestFlagged.degree.trim();
    } else if (personEdus.length) {
      highestEducationalAttainment = personEdus[0].degree || personEdus[0].academicLevel || '';
    } else if (person.qualification && !person.qualification.match(/^(JR|SR|II|III|IV|\.)/i)) {
      highestEducationalAttainment = person.qualification.trim();
    }

    // 14. Appropriate Eligibility
    let appropriateEligibility = '';
    const certs = personEdus.flatMap(e => e.certifications || []).filter(Boolean);
    if (certs.length) {
      appropriateEligibility = certs.join(', ');
    } else {
      const personTrainings = (allTraining || []).filter(t => t.personnelId === person.id);
      const eligTrn = personTrainings.find(t => /eligibility|napolcom|csc|civil service|bar|board|let|pese/i.test(`${t.courseName || ''} ${t.category || ''}`));
      if (eligTrn) appropriateEligibility = eligTrn.courseName.trim();
      else if (person.qualification && !person.qualification.match(/^(JR|SR|II|III|IV|\.)/i)) {
        appropriateEligibility = person.qualification.trim();
      }
    }

    // 15. Highest Mandatory Course
    let highestMandatoryCourse = '';
    const personTrns = (allTraining || []).filter(t => t.personnelId === person.id);
    const mandatoryTrns = personTrns.filter(t =>
      t.category === 'Mandatory Promotion QS' ||
      t.category === 'Career Course' ||
      /mandatory|psrbc|psbrc|psjlc|psslc|psobc|psooc|psoac|psosec/i.test(t.courseName || '')
    );
    if (mandatoryTrns.length) {
      highestMandatoryCourse = mandatoryTrns[0].courseName.trim();
    }

    // 16. Date of Last Promotion
    let lastPromDate = parseDateSafe(person.lastPromotionDate || person.last_promotion_date);
    if (!lastPromDate) {
      const personProms = (allPromotions || []).filter(p => p.personnelId === person.id && p.promotionDate);
      if (personProms.length) {
        lastPromDate = parseDateSafe(personProms[0].promotionDate);
      }
    }

    // 17. Time in Grade/Experience
    const timeInGrade = calculateTimeInGrade(person.lastPromotionDate || lastPromDate);

    return {
      nr,
      personnelId: person.id,
      rank,
      lastName,
      firstName,
      middleName,
      qualifier,
      badgeNo,
      officeUnit,
      dateOfUnitAssignment,
      designation,
      dateDesignated,
      dateEnteredPNP,
      highestEducationalAttainment,
      appropriateEligibility,
      highestMandatoryCourse,
      dateOfLastPromotion: lastPromDate,
      timeInGrade: timeInGrade !== 'N/A' ? timeInGrade : ''
    };
  });
}

export function validatePromotionalPersonnelRows(rows = []) {
  const issues = [];
  for (const applicant of rows) {
    const missing = [];
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

export async function generatePromotionalWorksheetBuffer({
  selectedPersonnelIds = [],
  targetRank = '',
  promotionalTitle = '',
  allowIncomplete = true
}) {
  const applicantRows = await getPromotionalApplicantsData(selectedPersonnelIds);
  const issues = validatePromotionalPersonnelRows(applicantRows);
  if (!allowIncomplete && issues.length > 0) {
    const error = new Error('Cannot generate worksheet. Missing required personnel records.');
    error.statusCode = 422;
    error.issues = issues;
    throw error;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'PNP-ITMS PAIS 2.0';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  const ws = wb.addWorksheet('Worksheet', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      printTitlesRow: '6:7'
    },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 7, showGridLines: true }]
  });

  const title = getDynamicPromotionalTitle(promotionalTitle || targetRank);

  ws.columns = [
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

  const fontBold = { name: 'Arial', size: 9, bold: true };
  const fontRegular = { name: 'Arial', size: 9 };
  const borderThin = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  const fillHeader = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' }
  };

  ws.getRow(1).height = 10;

  // Header Lines (Rows 2, 3, 4)
  ws.mergeCells('A2:Q2');
  const h1 = ws.getCell('A2');
  h1.value = 'INFORMATION TECHNOLOGY MANAGEMENT SERVICE';
  h1.font = { name: 'Arial', size: 12, bold: true };
  h1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  ws.mergeCells('A3:Q3');
  const h2 = ws.getCell('A3');
  h2.value = 'WORKSHEET';
  h2.font = { name: 'Arial', size: 11, bold: true };
  h2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 18;

  ws.mergeCells('A4:Q4');
  const h3 = ws.getCell('A4');
  h3.value = title;
  h3.font = { name: 'Arial', size: 11, bold: true };
  h3.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 18;

  ws.getRow(5).height = 12;

  // Table Headers (Rows 6 & 7)
  ws.getRow(6).height = 24;
  ws.getRow(7).height = 24;

  const verticalHeaders = [
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

  verticalHeaders.forEach(item => {
    ws.mergeCells(item.range);
    const cell = ws.getCell(item.cell);
    cell.value = item.text;
    cell.font = fontBold;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = fillHeader;
    cell.border = borderThin;
  });

  // Name of Applicants (B6:F6)
  ws.mergeCells('B6:F6');
  const nameCell = ws.getCell('B6');
  nameCell.value = 'NAME OF APPLICANTS';
  nameCell.font = fontBold;
  nameCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  nameCell.fill = fillHeader;
  nameCell.border = borderThin;

  const subHeaders = [
    { cell: 'B7', text: 'Rank' },
    { cell: 'C7', text: 'Last Name' },
    { cell: 'D7', text: 'First Name' },
    { cell: 'E7', text: 'Middle Name' },
    { cell: 'F7', text: 'Qualifier' }
  ];
  subHeaders.forEach(s => {
    const c = ws.getCell(s.cell);
    c.value = s.text;
    c.font = fontBold;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = fillHeader;
    c.border = borderThin;
  });

  for (let col = 1; col <= 17; col++) {
    const colL = String.fromCharCode(64 + col);
    ws.getCell(`${colL}6`).border = borderThin;
    ws.getCell(`${colL}7`).border = borderThin;
  }

  // Rows 8+
  applicantRows.forEach((row, idx) => {
    const rNum = 8 + idx;
    const r = ws.getRow(rNum);
    r.height = 22;

    const setCell = (colIdx, val, align = 'left', bold = false, numFmt = undefined) => {
      const cell = r.getCell(colIdx);
      cell.value = val;
      cell.font = bold ? fontBold : fontRegular;
      cell.alignment = { horizontal: align, vertical: 'middle', wrapText: true };
      cell.border = borderThin;
      if (numFmt) cell.numFmt = numFmt;
    };

    setCell(1, row.nr, 'center');
    setCell(2, row.rank, 'center', true);
    setCell(3, row.lastName, 'left');
    setCell(4, row.firstName, 'left');
    setCell(5, row.middleName || '', 'left');
    setCell(6, row.qualifier || '', 'center');
    setCell(7, row.badgeNo, 'center');
    setCell(8, row.officeUnit, 'center');
    setCell(9, row.dateOfUnitAssignment || '', 'center', false, row.dateOfUnitAssignment ? 'dd/mm/yyyy' : undefined);
    setCell(10, row.designation, 'left');
    setCell(11, row.dateDesignated || '', 'center', false, row.dateDesignated ? 'dd/mm/yyyy' : undefined);
    setCell(12, row.dateEnteredPNP || '', 'center', false, row.dateEnteredPNP ? 'dd/mm/yyyy' : undefined);
    setCell(13, row.highestEducationalAttainment, 'left');
    setCell(14, row.appropriateEligibility, 'left');
    setCell(15, row.highestMandatoryCourse, 'left');
    setCell(16, row.dateOfLastPromotion || '', 'center', false, row.dateOfLastPromotion ? 'dd/mm/yyyy' : undefined);
    setCell(17, row.timeInGrade, 'left');
  });

  return await wb.xlsx.writeBuffer();
}
