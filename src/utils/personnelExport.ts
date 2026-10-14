/**
 * Personnel Export Utility
 * Supports CSV and PDF export for selected or all personnel.
 * Uses jsPDF + jspdf-autotable for PDF generation (client-side, no server needed).
 */

import type { Personnel } from '../types/pais';
import { OCTOBER_PERSONNEL_ROSTER_COLUMNS, OCTOBER_PERSONNEL_HEADER_ROW } from '../constants/personnelRosterFormat.ts';

// ─── CSV Export ───────────────────────────────────────────────────────────────

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export function exportPersonnelCsv(records: Personnel[], filename = 'personnel_records.csv'): void {
  const headers = [
    'Personnel ID', 'Rank', 'Rank Full Name', 'First Name', 'Middle Name', 'Last Name',
    'Qualifier', 'Full Name', 'Badge No.', 'Agency Type', 'Agency Name', 'Salary Grade', 'Plantilla',
    'Sub-Unit', 'Details', 'Station', 'Designation', 'Address', 'Gender',
    'Contact Number', 'Birthday', 'Date of Entry', 'Designation Date',
    'Last Promotion Date', 'Status'
  ];

  const lines: string[] = [buildCsvRow(headers)];

  for (const p of records) {
    lines.push(buildCsvRow([
      p.id, p.rank, p.rankFullName ?? '',
      p.firstName, p.middleName ?? '', p.lastName,
      p.qualifier ?? '', p.fullName, p.badgeNo,
      p.agencyType || 'PNP', p.agencyType === 'OTHER_GOVERNMENT' ? p.agencyName ?? '' : '',
      p.salaryGrade ?? '', p.plantilla ?? '',
      p.sub_unit ?? p.division ?? '',
      p.details ?? p.detail ?? '',
      p.station ?? '',
      p.designation,
      p.address ?? '', p.gender ?? '',
      p.contactNumber ?? '', p.birthday ?? '',
      p.dateOfEntry ?? '', p.enterInOfficerPositionDate ?? '',
      p.lastPromotionDate ?? '', p.status
    ]));
  }

  downloadTextFile(lines.join('\n'), filename, 'text/csv');
}

const getOctoberRosterValue = (person: Personnel, field: keyof Personnel | null): string => {
  if (!field) return '';
  const record = person as Personnel & Record<string, unknown>;
  let value: unknown = record[field];

  switch (field) {
    case 'sourceLink':
      value = record.sourceLink || record.source_link;
      break;
    case 'accountNumber':
      value = record.accountNumber || record.account_number;
      break;
    case 'badgeNo':
      value = record.badgeNo || record.badge_number || (
        person.rankCategory === 'NUP' || String(person.rank).toUpperCase() === 'NUP'
          ? person.salaryGrade
          : ''
      );
      break;
    case 'birthdate':
      value = record.birthdate || record.birthday;
      break;
    case 'dateEnteredService':
      value = record.dateEnteredService || record.dateOfEntry || record.desUp || record.date_entered_service;
      break;
    case 'pstatus':
      value = record.pstatus || record.status;
      break;
    case 'unit':
      value = record.unit || record.unitCategory;
      break;
    case 'sub_unit':
      value = record.sub_unit || record.subUnit || record.division || record.officeDivision;
      break;
    case 'contactNumber':
      value = record.contactNumber || record.phoneNumber || record.phone_number;
      break;
    case 'gsisNumber':
      value = record.gsisNumber || record.gsis_number;
      break;
    case 'philHealthNo':
      value = record.philHealthNo || record.phil_health_no;
      break;
    case 'pagibigNo':
      value = record.pagibigNo || record.pagibig_no;
      break;
  }

  if (value === null || value === undefined) return '';
  return String(value).trim();
};

/** Build the October alphalist workbook without copying source-file personnel data. */
export async function buildPersonnelRosterXlsx(records: Personnel[]) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PNP-ITMS PAIS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('AlphalistReport_CompleteGenInfo', {
    views: [{ state: 'frozen', ySplit: OCTOBER_PERSONNEL_HEADER_ROW }]
  });
  worksheet.columns = OCTOBER_PERSONNEL_ROSTER_COLUMNS.map(column => ({ width: column.width }));
  for (let rowNumber = 1; rowNumber < OCTOBER_PERSONNEL_HEADER_ROW; rowNumber += 1) {
    worksheet.addRow([]);
  }

  // Keep the source workbook's header and data row positions without copying its personnel data.
  worksheet.getCell('B2').value = 'Online PAIS';
  worksheet.mergeCells('B6:AO6');
  worksheet.getCell('B6').value = 'Alphalist Report';
  worksheet.getCell('B6').font = { name: 'Arial', size: 14, bold: true };
  worksheet.getCell('B6').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(6).height = 24;

  const headerRow = worksheet.getRow(OCTOBER_PERSONNEL_HEADER_ROW);
  OCTOBER_PERSONNEL_ROSTER_COLUMNS.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F2937' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E6DF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB8B6B0' } },
      left: { style: 'thin', color: { argb: 'FFB8B6B0' } },
      bottom: { style: 'thin', color: { argb: 'FFB8B6B0' } },
      right: { style: 'thin', color: { argb: 'FFB8B6B0' } }
    };
  });
  headerRow.height = 34;

  const startRow = OCTOBER_PERSONNEL_HEADER_ROW + 1;
  for (const person of records) {
    const row = worksheet.addRow(
      OCTOBER_PERSONNEL_ROSTER_COLUMNS.map(column => getOctoberRosterValue(person, column.field))
    );
    row.height = 20;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E0DA' } },
        left: { style: 'thin', color: { argb: 'FFE2E0DA' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E0DA' } },
        right: { style: 'thin', color: { argb: 'FFE2E0DA' } }
      };
    });
  }

  // Summary footer rows with dynamic Excel formulas
  if (records.length > 0) {
    const endRow = startRow + records.length - 1;
    worksheet.addRow([]); // Blank separator row

    const applySummaryStyle = (cell: any) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    };

    // Summary Row 1: Headcount & Male Count
    const sumRow1 = worksheet.addRow([]);
    sumRow1.height = 22;
    const r1Label = sumRow1.getCell(6); // Rank column
    r1Label.value = 'Total: Personnel Count';
    applySummaryStyle(r1Label);
    const r1Val = sumRow1.getCell(7); // Last Name column
    r1Val.value = {
      formula: `COUNTA(G${startRow}:G${endRow})`,
      result: records.length
    };
    applySummaryStyle(r1Val);

    const r1MaleLbl = sumRow1.getCell(31); // Sub Station
    r1MaleLbl.value = 'Total: Male Personnel';
    applySummaryStyle(r1MaleLbl);
    const r1MaleVal = sumRow1.getCell(32); // Gender column (AF)
    const maleCount = records.filter(p => (p.gender || '').toLowerCase() === 'male').length;
    r1MaleVal.value = {
      formula: `COUNTIF(AF${startRow}:AF${endRow},"Male")+COUNTIF(AF${startRow}:AF${endRow},"MALE")`,
      result: maleCount
    };
    applySummaryStyle(r1MaleVal);

    // Summary Row 2: PCO Officers & Female Count
    const sumRow2 = worksheet.addRow([]);
    sumRow2.height = 22;
    const r2Label = sumRow2.getCell(6);
    r2Label.value = 'Total: PCO Officers';
    applySummaryStyle(r2Label);
    const r2Val = sumRow2.getCell(7);
    const pcoCount = records.filter(p => p.rankCategory === 'PCO').length;
    r2Val.value = {
      formula: `COUNTIF(F${startRow}:F${endRow},"PGEN")+COUNTIF(F${startRow}:F${endRow},"PLTGEN")+COUNTIF(F${startRow}:F${endRow},"PMGEN")+COUNTIF(F${startRow}:F${endRow},"PBGEN")+COUNTIF(F${startRow}:F${endRow},"PCOL")+COUNTIF(F${startRow}:F${endRow},"PLTCOL")+COUNTIF(F${startRow}:F${endRow},"PMAJ")+COUNTIF(F${startRow}:F${endRow},"PCPT")+COUNTIF(F${startRow}:F${endRow},"PLT")`,
      result: pcoCount
    };
    applySummaryStyle(r2Val);

    const r2FemLbl = sumRow2.getCell(31);
    r2FemLbl.value = 'Total: Female Personnel';
    applySummaryStyle(r2FemLbl);
    const r2FemVal = sumRow2.getCell(32);
    const femaleCount = records.filter(p => (p.gender || '').toLowerCase() === 'female').length;
    r2FemVal.value = {
      formula: `COUNTIF(AF${startRow}:AF${endRow},"Female")+COUNTIF(AF${startRow}:AF${endRow},"FEMALE")`,
      result: femaleCount
    };
    applySummaryStyle(r2FemVal);

    // Summary Row 3: PNCO Personnel
    const sumRow3 = worksheet.addRow([]);
    sumRow3.height = 22;
    const r3Label = sumRow3.getCell(6);
    r3Label.value = 'Total: PNCO Personnel';
    applySummaryStyle(r3Label);
    const r3Val = sumRow3.getCell(7);
    const pncoCount = records.filter(p => p.rankCategory === 'PNCO').length;
    r3Val.value = {
      formula: `COUNTIF(F${startRow}:F${endRow},"PEMS")+COUNTIF(F${startRow}:F${endRow},"PCMS")+COUNTIF(F${startRow}:F${endRow},"PSMS")+COUNTIF(F${startRow}:F${endRow},"PMSg")+COUNTIF(F${startRow}:F${endRow},"PSSg")+COUNTIF(F${startRow}:F${endRow},"PCpl")+COUNTIF(F${startRow}:F${endRow},"Pat")`,
      result: pncoCount
    };
    applySummaryStyle(r3Val);

    // Summary Row 4: NUP Personnel
    const sumRow4 = worksheet.addRow([]);
    sumRow4.height = 22;
    const r4Label = sumRow4.getCell(6);
    r4Label.value = 'Total: NUP Personnel';
    applySummaryStyle(r4Label);
    const r4Val = sumRow4.getCell(7);
    const nupCount = records.filter(p => p.rankCategory === 'NUP').length;
    r4Val.value = {
      formula: `COUNTIF(F${startRow}:F${endRow},"NUP")`,
      result: nupCount
    };
    applySummaryStyle(r4Val);
  }

  workbook.calcProperties.fullCalcOnLoad = true;
  return workbook.xlsx.writeBuffer();
}

/** Download personnel in the October alphalist's 42-column layout. */
export async function exportPersonnelXlsx(
  records: Personnel[],
  filename = 'personnel_roster.xlsx'
): Promise<void> {
  const buffer = await buildPersonnelRosterXlsx(records);
  const blob = new Blob([buffer], {
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
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export async function exportPersonnelPdf(
  records: Personnel[],
  filename = 'personnel_records.pdf'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  drawPdfHeader(doc, 'Personnel Directory Report', records.length);

  const tableData = records.map(p => [
    `${p.rank} ${p.fullName}`,
    p.agencyType === 'OTHER_GOVERNMENT' ? p.agencyName || 'Agency name not recorded' : 'PNP',
    p.badgeNo,
    p.sub_unit ?? p.division ?? '—',
    p.designation,
    p.details ?? p.detail ?? '—',
    p.station ?? '—',
    p.gender ?? '—',
    p.contactNumber ?? '—',
    p.birthday ?? '—',
    p.dateOfEntry ?? '—',
    p.status,
  ]);

  autoTable(doc, {
    startY: 38,
    head: [[
      'Name', 'Agency', 'Badge No.', 'Sub-Unit', 'Designation', 'Details', 'Station',
      'Gender', 'Contact', 'Birthday', 'Date of Entry', 'Status'
    ]],
    body: tableData,
    styles: { fontSize: 7, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: [70, 130, 180], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 37 },
      1: { cellWidth: 31 },
      2: { cellWidth: 17 },
      3: { cellWidth: 19 },
      4: { cellWidth: 31 },
      5: { cellWidth: 21 },
      6: { cellWidth: 14 },
      7: { cellWidth: 15 },
      8: { cellWidth: 17 },
      9: { cellWidth: 18 },
      10: { cellWidth: 18 },
      11: { cellWidth: 17 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => drawPdfFooter(doc, data.pageNumber),
  });

  doc.save(filename);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawPdfHeader(doc: import('jspdf').jsPDF, title: string, count: number): void {
  const now = new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // Steel-blue accent bar
  doc.setFillColor(70, 130, 180);
  doc.rect(0, 0, 297, 6, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ITMS-ARMD Personnel Directory', 10, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(title, 10, 21);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${now}   |   Records included: ${count}`, 10, 28);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(10, 32, 287, 32);
}

function drawPdfFooter(doc: import('jspdf').jsPDF, pageNum: number): void {
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('ITMS-ARMD Directory — Confidential', 10, 203);
  doc.text(`Page ${pageNum} of ${pageCount}`, 270, 203, { align: 'right' });
}

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
