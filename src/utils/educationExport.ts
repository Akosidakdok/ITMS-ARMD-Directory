/**
 * Education & Training Export Utility
 * Supports: CSV and PDF export for selected or all personnel.
 * Uses jsPDF + jspdf-autotable for PDF generation (no server needed).
 */

import type { Personnel, EducationRecord, TrainingRecord } from '../types/pais';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportPersonnelData {
  personnel: Personnel;
  education: EducationRecord[];
  training: TrainingRecord[];
}

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

export function exportEducationCsv(rows: ExportPersonnelData[], filename = 'education_records.csv'): void {
  const headers = ['Personnel ID', 'Rank', 'Full Name', 'Division', 'Designation',
    'Academic Level', 'School', 'Course', 'Major', 'Start Year', 'End Year',
    'Grade', 'Highest', 'Ranking', 'Created By', 'Created On', 'Modified By', 'Modified On'];

  const lines: string[] = [buildCsvRow(headers)];

  for (const { personnel, education } of rows) {
    if (education.length === 0) {
      lines.push(buildCsvRow([
        personnel.id, personnel.rank, personnel.fullName,
        personnel.division, personnel.designation,
        '', '', '', '', '', '', '', '', '', '', '', '', ''
      ]));
    } else {
      for (const edu of education) {
        lines.push(buildCsvRow([
          personnel.id, personnel.rank, personnel.fullName,
          personnel.division, personnel.designation,
          edu.academicLevel ?? '', edu.institution, edu.degree, edu.major ?? '',
          edu.startYear ?? '',
          edu.yearGraduated ?? '',
          edu.honors ?? '',
          edu.highest ? 'Yes' : 'No',
          edu.ranking ?? '',
          edu.createdBy ?? '', edu.createdOn ?? '', edu.modifiedBy ?? '', edu.modifiedOn ?? ''
        ]));
      }
    }
  }

  downloadTextFile(lines.join('\n'), filename, 'text/csv');
}

export function exportTrainingCsv(rows: ExportPersonnelData[], filename = 'training_records.csv'): void {
  const headers = ['Personnel ID', 'Rank', 'Full Name', 'Division', 'Designation',
    'Training Type', 'Training Title', 'School', 'Location', 'Inclusive Start Date',
    'Inclusive End Date', 'Number of Hours', 'Source', 'Auth Number', 'Auth Date',
    'Issued By', 'Attachment', 'Created By', 'Created On', 'Modified By', 'Modified On'];

  const lines: string[] = [buildCsvRow(headers)];

  for (const { personnel, training } of rows) {
    if (training.length === 0) {
      lines.push(buildCsvRow([
        personnel.id, personnel.rank, personnel.fullName,
        personnel.division, personnel.designation,
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
      ]));
    } else {
      for (const trn of training) {
        lines.push(buildCsvRow([
          personnel.id, personnel.rank, personnel.fullName,
          personnel.division, personnel.designation,
          trn.category ?? '', trn.courseName, trn.provider, trn.location ?? '',
          trn.startDate ?? '',
          trn.completionDate ?? '',
          trn.hours ?? '',
          trn.source ?? '',
          trn.certificateNo ?? '',
          trn.authorityDate ?? '',
          trn.issuedBy ?? '',
          trn.attachment ?? '',
          trn.createdBy ?? '', trn.createdOn ?? '', trn.modifiedBy ?? '', trn.modifiedOn ?? ''
        ]));
      }
    }
  }

  downloadTextFile(lines.join('\n'), filename, 'text/csv');
}

export function exportCombinedCsv(rows: ExportPersonnelData[], filename = 'education_training_records.csv'): void {
  // Section 1: Education
  const eduHeaders = ['Section', 'Personnel ID', 'Rank', 'Full Name', 'Division',
    'Academic Level', 'School', 'Course', 'Major', 'Start Year', 'End Year',
    'Grade', 'Highest', 'Ranking', 'Created By', 'Created On', 'Modified By', 'Modified On'];
  const trnHeaders = ['Section', 'Personnel ID', 'Rank', 'Full Name', 'Division',
    'Training Type', 'Training Title', 'School', 'Location', 'Inclusive Start Date',
    'Inclusive End Date', 'Number of Hours', 'Source', 'Auth Number', 'Auth Date',
    'Issued By', 'Attachment', 'Created By', 'Created On', 'Modified By', 'Modified On'];

  const lines: string[] = [];
  lines.push(buildCsvRow(['=== EDUCATION RECORDS ===']));
  lines.push(buildCsvRow(eduHeaders));

  for (const { personnel, education } of rows) {
    if (education.length === 0) {
      lines.push(buildCsvRow(['EDU', personnel.id, personnel.rank, personnel.fullName, personnel.division, '', '', '', '', '', '', '', '', '', '', '', '', '']));
    } else {
      for (const edu of education) {
        lines.push(buildCsvRow([
          'EDU', personnel.id, personnel.rank, personnel.fullName, personnel.division,
          edu.academicLevel ?? '', edu.institution, edu.degree, edu.major ?? '',
          edu.startYear ?? '', edu.yearGraduated ?? '', edu.honors ?? '',
          edu.highest ? 'Yes' : 'No', edu.ranking ?? '',
          edu.createdBy ?? '', edu.createdOn ?? '', edu.modifiedBy ?? '', edu.modifiedOn ?? ''
        ]));
      }
    }
  }

  lines.push('');
  lines.push(buildCsvRow(['=== TRAINING RECORDS ===']));
  lines.push(buildCsvRow(trnHeaders));

  for (const { personnel, training } of rows) {
    if (training.length === 0) {
      lines.push(buildCsvRow(['TRN', personnel.id, personnel.rank, personnel.fullName, personnel.division, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']));
    } else {
      for (const trn of training) {
        lines.push(buildCsvRow([
          'TRN', personnel.id, personnel.rank, personnel.fullName, personnel.division,
          trn.category ?? '', trn.courseName, trn.provider, trn.location ?? '',
          trn.startDate ?? '', trn.completionDate ?? '', trn.hours ?? '', trn.source ?? '',
          trn.certificateNo ?? '', trn.authorityDate ?? '', trn.issuedBy ?? '', trn.attachment ?? '',
          trn.createdBy ?? '', trn.createdOn ?? '', trn.modifiedBy ?? '', trn.modifiedOn ?? ''
        ]));
      }
    }
  }

  downloadTextFile(lines.join('\n'), filename, 'text/csv');
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export async function exportEducationPdf(
  rows: ExportPersonnelData[],
  filename = 'education_records.pdf'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  drawPdfHeader(doc, 'Education Records Report', rows.length);

  const tableData: (string | number)[][] = [];
  for (const { personnel, education } of rows) {
    if (education.length === 0) {
      tableData.push([
        `${personnel.rank} ${personnel.fullName}`,
        personnel.division,
        personnel.designation,
        '—', '—', '—', '—', '—'
      ]);
    } else {
      education.forEach((edu, i) => {
        tableData.push([
          i === 0 ? `${personnel.rank} ${personnel.fullName}` : '',
          i === 0 ? personnel.division : '',
          i === 0 ? personnel.designation : '',
          edu.degree ?? '—',
          edu.institution ?? '—',
          edu.yearGraduated ?? '—',
          edu.honors ?? '—',
          (edu.certifications ?? []).join(', ') || '—'
        ]);
      });
    }
  }

  autoTable(doc, {
    startY: 38,
    head: [['Name', 'Division', 'Designation', 'Degree / Course', 'Institution', 'Year', 'Honors', 'Certifications']],
    body: tableData,
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 30 },
      2: { cellWidth: 36 },
      3: { cellWidth: 52 },
      4: { cellWidth: 46 },
      5: { cellWidth: 14 },
      6: { cellWidth: 24 },
      7: { cellWidth: 36 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => drawPdfFooter(doc, data.pageNumber),
  });

  doc.save(filename);
}

export async function exportTrainingPdf(
  rows: ExportPersonnelData[],
  filename = 'training_records.pdf'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  drawPdfHeader(doc, 'Training Records Report', rows.length);

  const tableData: (string | number)[][] = [];
  for (const { personnel, training } of rows) {
    if (training.length === 0) {
      tableData.push([
        `${personnel.rank} ${personnel.fullName}`,
        personnel.division,
        '—', '—', '—', '—', '—', '—', '—'
      ]);
    } else {
      training.forEach((trn, i) => {
        tableData.push([
          i === 0 ? `${personnel.rank} ${personnel.fullName}` : '',
          i === 0 ? personnel.division : '',
          trn.courseName,
          trn.category ?? '—',
          trn.provider,
          trn.startDate ?? '—',
          trn.completionDate ?? '—',
          trn.hours !== undefined ? `${trn.hours} hrs` : '—',
          trn.certificateNo ?? '—'
        ]);
      });
    }
  }

  autoTable(doc, {
    startY: 38,
    head: [['Name', 'Division', 'Course Name', 'Category', 'Provider', 'Start', 'Completion', 'Hours', 'Certificate No.']],
    body: tableData,
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 28 },
      2: { cellWidth: 52 },
      3: { cellWidth: 28 },
      4: { cellWidth: 36 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 16 },
      8: { cellWidth: 28 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => drawPdfFooter(doc, data.pageNumber),
  });

  doc.save(filename);
}

export async function exportCombinedPdf(
  rows: ExportPersonnelData[],
  filename = 'education_training_report.pdf'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Education section ──
  drawPdfHeader(doc, 'Education & Training Report — Academic Attainment', rows.length);

  const eduData: (string | number)[][] = [];
  for (const { personnel, education } of rows) {
    if (education.length === 0) {
      eduData.push([`${personnel.rank} ${personnel.fullName}`, personnel.division, '—', '—', '—', '—', '—']);
    } else {
      education.forEach((edu, i) => {
        eduData.push([
          i === 0 ? `${personnel.rank} ${personnel.fullName}` : '',
          i === 0 ? personnel.division : '',
          edu.degree ?? '—', edu.institution ?? '—',
          edu.yearGraduated ?? '—',
          edu.honors ?? '—',
          (edu.certifications ?? []).join(', ') || '—'
        ]);
      });
    }
  }

  autoTable(doc, {
    startY: 38,
    head: [['Name', 'Division', 'Degree / Course', 'Institution', 'Year', 'Honors', 'Certifications']],
    body: eduData,
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 44 }, 1: { cellWidth: 30 }, 2: { cellWidth: 56 },
      3: { cellWidth: 50 }, 4: { cellWidth: 14 }, 5: { cellWidth: 26 }, 6: { cellWidth: 36 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => drawPdfFooter(doc, data.pageNumber),
  });

  // ── Training section on new page ──
  doc.addPage();
  drawPdfHeader(doc, 'Education & Training Report — Specialized IT Trainings', rows.length);

  const trnData: (string | number)[][] = [];
  for (const { personnel, training } of rows) {
    if (training.length === 0) {
      trnData.push([`${personnel.rank} ${personnel.fullName}`, personnel.division, '—', '—', '—', '—', '—', '—', '—']);
    } else {
      training.forEach((trn, i) => {
        trnData.push([
          i === 0 ? `${personnel.rank} ${personnel.fullName}` : '',
          i === 0 ? personnel.division : '',
          trn.courseName, trn.category ?? '—', trn.provider,
          trn.startDate ?? '—', trn.completionDate ?? '—',
          trn.hours !== undefined ? `${trn.hours} hrs` : '—',
          trn.certificateNo ?? '—'
        ]);
      });
    }
  }

  autoTable(doc, {
    startY: 38,
    head: [['Name', 'Division', 'Course Name', 'Category', 'Provider', 'Start', 'Completion', 'Hours', 'Certificate No.']],
    body: trnData,
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 42 }, 1: { cellWidth: 28 }, 2: { cellWidth: 52 },
      3: { cellWidth: 28 }, 4: { cellWidth: 36 }, 5: { cellWidth: 22 },
      6: { cellWidth: 22 }, 7: { cellWidth: 16 }, 8: { cellWidth: 28 },
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => drawPdfFooter(doc, data.pageNumber),
  });

  doc.save(filename);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawPdfHeader(doc: import('jspdf').jsPDF, title: string, personnelCount: number): void {
  const now = new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // Top accent bar
  doc.setFillColor(37, 99, 235);
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
  doc.text(`Generated: ${now}   |   Personnel included: ${personnelCount}`, 10, 28);

  // Divider line
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
