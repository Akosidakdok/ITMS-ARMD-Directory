import { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, FilePenLine, Printer, RefreshCw, Save } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import type { DocumentTemplateType, Personnel } from '../../types/pais';

interface DocumentTemplatePanelProps {
  personnel: Personnel[];
}

const TEMPLATE_TYPES: DocumentTemplateType[] = [
  'Assignment Order',
  'Administrative Order',
  'Leave Endorsement',
  'Award Citation'
];

const today = new Date().toISOString().slice(0, 10);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character] || character));

const buildFields = (templateType: DocumentTemplateType, person?: Personnel) => ({
  referenceNo: `${templateType.toUpperCase().replace(/\s+/g, '-')}-${today.replace(/-/g, '')}`,
  date: today,
  personnelName: person ? `${person.rank} ${person.fullName}` : '',
  badgeNo: person?.badgeNo || '',
  unit: person?.division || '',
  designation: person?.designation || '',
  subject: templateType,
  particulars: person
    ? `${person.rank} ${person.fullName} is hereby documented under this ${templateType.toLowerCase()} record.`
    : '',
  signatory: 'PBGEN BENJAMIN H ACORDA',
  signatoryTitle: 'Director, ITMS'
});

export const DocumentTemplatePanel = ({ personnel }: DocumentTemplatePanelProps) => {
  const [templateType, setTemplateType] = useState<DocumentTemplateType>('Administrative Order');
  const [personnelId, setPersonnelId] = useState('');
  const selectedPerson = useMemo(
    () => personnel.find(person => person.id === personnelId),
    [personnel, personnelId]
  );
  const [fields, setFields] = useState(buildFields('Administrative Order'));
  const [message, setMessage] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem(`pais.template.${templateType}`);
    if (saved) {
      try {
        setFields(JSON.parse(saved));
        setMessage('Saved draft loaded.');
        return;
      } catch {
        window.localStorage.removeItem(`pais.template.${templateType}`);
      }
    }
    setFields(buildFields(templateType, selectedPerson));
    setMessage('');
  }, [templateType]);

  const personnelOptions = personnel.map(person => ({
    value: person.id,
    label: `${person.rank} ${person.fullName}`,
    description: `${person.badgeNo} - ${person.division}`
  }));

  const refreshFields = () => {
    setFields(buildFields(templateType, selectedPerson));
  };

  const updateField = (key: keyof typeof fields, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const documentHtml = () => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(fields.referenceNo)}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#0f172a}.document{max-width:760px;margin:auto;border:1px solid #cbd5e1;padding:40px}.center{text-align:center}.meta{display:grid;grid-template-columns:140px 1fr;gap:8px;margin:28px 0}.label{font-weight:700}.subject{font-weight:700;text-transform:uppercase;margin-top:24px}.body{line-height:1.7;text-align:justify;margin-top:18px;white-space:pre-wrap}.signatory{margin-top:64px;text-align:right}@media print{body{margin:0}.document{border:0}}</style></head><body><main class="document"><div class="center"><strong>PHILIPPINE NATIONAL POLICE</strong><br>Information Technology Management Service</div><div class="meta"><span class="label">Reference No.</span><span>${escapeHtml(fields.referenceNo)}</span><span class="label">Date</span><span>${escapeHtml(fields.date)}</span><span class="label">Personnel</span><span>${escapeHtml(fields.personnelName)}</span><span class="label">Badge No.</span><span>${escapeHtml(fields.badgeNo)}</span><span class="label">Unit</span><span>${escapeHtml(fields.unit)}</span></div><p class="subject">${escapeHtml(fields.subject)}</p><p class="body">${escapeHtml(fields.particulars)}</p><div class="signatory"><strong>${escapeHtml(fields.signatory)}</strong><br>${escapeHtml(fields.signatoryTitle)}</div></main></body></html>`;

  const downloadHtml = () => {
    const html = documentHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fields.referenceNo || 'document-template'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveDraft = () => {
    window.localStorage.setItem(`pais.template.${templateType}`, JSON.stringify(fields));
    setMessage('Draft saved in this browser.');
  };

  const printDocument = () => {
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) return setMessage('Allow pop-ups to print the document.');
    popup.document.write(documentHtml());
    popup.document.close();
    popup.addEventListener('load', () => popup.print(), { once: true });
  };

  const exportPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.setFontSize(11);
    pdf.text('PHILIPPINE NATIONAL POLICE', 105, 20, { align: 'center' });
    pdf.text('Information Technology Management Service', 105, 27, { align: 'center' });
    pdf.setFontSize(9);
    pdf.text([`Reference No.: ${fields.referenceNo}`, `Date: ${fields.date}`, `Personnel: ${fields.personnelName}`, `Badge No.: ${fields.badgeNo}`, `Unit: ${fields.unit}`], 20, 42);
    pdf.setFontSize(11);
    pdf.text(fields.subject.toUpperCase(), 20, 76);
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(fields.particulars, 170), 20, 88);
    pdf.text(fields.signatory, 190, 245, { align: 'right' });
    pdf.text(fields.signatoryTitle, 190, 251, { align: 'right' });
    pdf.save(`${fields.referenceNo || 'document-template'}.pdf`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <FilePenLine size={18} className="text-teal-700" /> Editable Document Templates
          </h2>
          <p className="mt-1 text-sm text-slate-500">Fixed layout preview with editable fields and personnel autofill.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveDraft} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Save size={16} /> Save draft</button>
          <button type="button" onClick={printDocument} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Printer size={16} /> Print</button>
          <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><FileDown size={16} /> PDF</button>
          <button type="button" onClick={refreshFields} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw size={16} /> Autofill
          </button>
          <button type="button" onClick={downloadHtml} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            <Download size={16} /> Download
          </button>
        </div>
      </div>

      {message && <p role="status" className="mx-5 mt-4 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">{message}</p>}

      <div className="grid gap-5 p-3 sm:p-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <SearchableSelect label="Template" value={templateType} onChange={value => setTemplateType(value as DocumentTemplateType)} options={TEMPLATE_TYPES.map(value => ({ value, label: value }))} />
          <SearchableSelect label="Personnel source" value={personnelId} onChange={setPersonnelId} placeholder="Select personnel" options={personnelOptions} />
          {Object.entries(fields).map(([key, value]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-bold capitalize text-slate-700">{key.replace(/([A-Z])/g, ' $1')}</span>
              <input value={value} onChange={event => updateField(key as keyof typeof fields, event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
            </label>
          ))}
        </div>

        <div className="min-h-[420px] overflow-x-auto bg-slate-100 p-2 sm:min-h-[560px] sm:p-4">
          <div className="mx-auto min-h-[420px] w-full min-w-[320px] max-w-[760px] bg-white p-5 text-slate-950 shadow-sm ring-1 ring-slate-200 sm:min-h-[520px] sm:p-10">
            <div className="text-center text-sm leading-6">
              <p className="font-bold">PHILIPPINE NATIONAL POLICE</p>
              <p>Information Technology Management Service</p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-2 text-sm sm:grid-cols-[140px_1fr]">
              <p className="font-bold">Reference No.</p><p>{fields.referenceNo}</p>
              <p className="font-bold">Date</p><p>{fields.date}</p>
              <p className="font-bold">Personnel</p><p>{fields.personnelName || 'Select personnel or enter manually'}</p>
              <p className="font-bold">Badge No.</p><p>{fields.badgeNo}</p>
              <p className="font-bold">Unit</p><p>{fields.unit}</p>
            </div>
            <p className="mt-8 text-sm font-bold uppercase">{fields.subject}</p>
            <p className="mt-5 whitespace-pre-wrap text-justify text-sm leading-7">{fields.particulars}</p>
            <div className="mt-20 text-right text-sm">
              <p className="font-bold">{fields.signatory}</p>
              <p>{fields.signatoryTitle}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
