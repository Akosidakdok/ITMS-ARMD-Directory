/**
 * Personnel Export Utility
 * Supports CSV and PDF export for selected or all personnel.
 * Uses jsPDF + jspdf-autotable for PDF generation (client-side, no server needed).
 */

import type { Personnel } from '../types/pais';

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
    'Division', 'Detail', 'Designation', 'Address', 'Gender',
    'Contact Number', 'Birthday', 'Date of Entry', 'Officer Position Date',
    'Last Promotion Date', 'Status'
  ];

  const lines: string[] = [buildCsvRow(headers)];

  for (const p of records) {
    lines.push(buildCsvRow([
      p.id, p.rank, p.rankFullName ?? '',
      p.firstName, p.middleName ?? '', p.lastName,
      p.qualifier ?? '', p.fullName, p.badgeNo,
      p.salaryGrade ?? '', p.plantilla ?? '',
      p.division, p.detail ?? '', p.designation,
      p.address ?? '', p.gender ?? '',
      p.contactNumber ?? '', p.birthday ?? '',
      p.dateOfEntry ?? '', p.enterInOfficerPositionDate ?? '',
      p.lastPromotionDate ?? '', p.status
    ]));
  }

  downloadTextFile(lines.join('\n'), filename, 'text/csv');
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
    p.division,
    p.designation,
    p.detail ?? '—',
    p.gender ?? '—',
    p.contactNumber ?? '—',
    p.birthday ?? '—',
    p.dateOfEntry ?? '—',
    p.status,
  ]);

  autoTable(doc, {
    startY: 38,
    head: [[
      'Name', 'Badge No.', 'Division', 'Designation', 'Detail',
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
