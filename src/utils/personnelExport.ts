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
    'Qualifier', 'Full Name', 'Badge No.', 'Salary Grade', 'Plantilla',
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
      'Name', 'Badge No.', 'Sub-Unit', 'Designation', 'Details', 'Station',
      'Gender', 'Contact', 'Birthday', 'Date of Entry', 'Status'
    ]],
    body: tableData,
    styles: { fontSize: 7, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: [70, 130, 180], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 38 },
      4: { cellWidth: 28 },
      5: { cellWidth: 14 },
      6: { cellWidth: 26 },
      7: { cellWidth: 20 },
      8: { cellWidth: 22 },
      9: { cellWidth: 22 },
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
