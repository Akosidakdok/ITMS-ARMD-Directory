import type { getTemplatePersonnelRows } from './orderTemplatePersonnel.ts';

export interface OrderTemplateFields {
  date: string; personnelName: string; badgeNo: string; unit: string; designation: string;
  subject: string; description: string; signatory: string; signatoryTitle: string;
}
export interface OrderTemplateDocument {
  orderNumber: string; series: string; purposeLabel: string; status: string;
  fields: OrderTemplateFields;
  personnel: ReturnType<typeof getTemplatePersonnelRows>;
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character] || character));

export function buildOrderTemplateHtml(document: OrderTemplateDocument): string {
  const { fields, personnel } = document;
  const metadata = [['Order No.', document.orderNumber], ['Series', document.series], ['Purpose', document.purposeLabel], ['Status', document.status], ['Date', fields.date],
    ...(!personnel.length ? [['Personnel', fields.personnelName], ['Badge No.', fields.badgeNo], ['Unit', fields.unit]] : [])];
  const table = personnel.length ? `<table class="personnel"><thead><tr><th>Personnel</th><th>Badge No.</th><th>Unit</th><th>Designation</th></tr></thead><tbody>${personnel.map(row => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.badgeNo)}</td><td>${escapeHtml(row.unit)}</td><td>${escapeHtml(row.designation)}</td></tr>`).join('')}</tbody></table>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(document.orderNumber)}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#0f172a}.document{max-width:760px;margin:auto;border:1px solid #cbd5e1;padding:40px}.personnel{width:100%;border-collapse:collapse;font-size:12px}.personnel th,.personnel td{border:1px solid #dbe5f0;padding:8px;text-align:left;overflow-wrap:anywhere}.personnel thead{display:table-header-group}.personnel tr{break-inside:avoid}.center{text-align:center}.meta{display:grid;grid-template-columns:140px 1fr;gap:8px;margin:28px 0;white-space:pre-wrap;overflow-wrap:anywhere}.label{font-weight:700}.subject{font-weight:700;text-transform:uppercase;margin-top:24px}.body{line-height:1.7;text-align:justify;margin-top:18px;white-space:pre-wrap;overflow-wrap:anywhere}.signatory{margin-top:64px;text-align:right;break-inside:avoid}@media print{body{margin:0}.document{border:0}}</style></head><body><main class="document"><div class="center"><strong>PHILIPPINE NATIONAL POLICE</strong><br>Information Technology Management Service</div><div class="meta">${metadata.map(([label,value]) => `<span class="label">${escapeHtml(label)}</span><span>${escapeHtml(value)}</span>`).join('')}</div>${table}<p class="subject">${escapeHtml(fields.subject)}</p><p class="body">${escapeHtml(fields.description)}</p><div class="signatory"><strong>${escapeHtml(fields.signatory)}</strong><br>${escapeHtml(fields.signatoryTitle)}</div></main></body></html>`;
}

export async function buildOrderTemplatePdf(document: OrderTemplateDocument) {
  const { jsPDF } = await import('jspdf');
  const { autoTable } = await import('jspdf-autotable');
  const { fields, personnel } = document;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.setFontSize(11);
  pdf.text('PHILIPPINE NATIONAL POLICE', 105, 20, { align: 'center' });
  pdf.text('Information Technology Management Service', 105, 27, { align: 'center' });
  autoTable(pdf, { startY: 37, margin: 20, tableWidth: 170, theme: 'plain', styles: { fontSize: 9, overflow: 'linebreak' }, columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 140 } }, body: [
    ['Order No.', document.orderNumber], ['Series', document.series], ['Purpose', document.purposeLabel], ['Status', document.status], ['Date', fields.date],
    ...(!personnel.length ? [['Personnel', fields.personnelName], ['Badge No.', fields.badgeNo], ['Unit', fields.unit]] : [])
  ] });
  const nextY = () => (pdf as typeof pdf & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  if (personnel.length) autoTable(pdf, { startY: nextY(), margin: 20, head: [['Personnel', 'Badge No.', 'Unit', 'Designation']], body: personnel.map(row => [row.name, row.badgeNo, row.unit, row.designation]), styles: { fontSize: 9, overflow: 'linebreak' }, rowPageBreak: 'avoid', showHead: 'everyPage' });
  autoTable(pdf, { startY: nextY(), margin: 20, theme: 'plain', styles: { fontSize: 10, overflow: 'linebreak' }, body: [[fields.subject.toUpperCase()], [fields.description]] });
  autoTable(pdf, { startY: nextY(), margin: 20, theme: 'plain', styles: { fontSize: 10, halign: 'right', overflow: 'linebreak' }, pageBreak: 'avoid', body: [[fields.signatory], [fields.signatoryTitle]] });
  return pdf;
}
