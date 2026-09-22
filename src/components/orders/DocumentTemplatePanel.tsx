import { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, FilePenLine, Printer, RefreshCw, Save } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import type { DocumentTemplateType, Personnel } from '../../types/pais';
import {
  getOrderPurposeLabel,
  ORDER_DOCUMENT_STATUS_OPTIONS,
  ORDER_PURPOSE_OPTIONS,
  ORDER_SERIES_OPTIONS,
  type OrderDocumentStatus,
  type OrderPurposeCode,
  type OrderSeries,
} from '../../constants/orders';

interface DocumentTemplatePanelProps {
  personnel: Personnel[];
}

type TemplateFields = {
  date: string;
  personnelName: string;
  badgeNo: string;
  unit: string;
  designation: string;
  subject: string;
  particulars: string;
  signatory: string;
  signatoryTitle: string;
};

type SavedTemplateDraft = {
  fields: TemplateFields;
  personnelId: string;
  series: OrderSeries;
  purposeCode: OrderPurposeCode;
  documentStatus: OrderDocumentStatus;
};

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

const buildOrderNumberPreview = (series: OrderSeries, purposeCode: OrderPurposeCode, date: string) =>
  date ? `ITMS-${series}-${purposeCode}-${date.slice(0, 4)}-####` : 'ITMS-…-…-YEAR-####';

const buildFields = (
  templateType: DocumentTemplateType,
  person: Personnel | undefined,
  purposeCode: OrderPurposeCode,
  date = today
): TemplateFields => ({
  date,
  personnelName: person ? `${person.rank} ${person.fullName}` : '',
  badgeNo: person?.badgeNo || '',
  unit: person?.sub_unit || person?.division || person?.unitCategory || '',
  designation: person?.designation || '',
  subject: getOrderPurposeLabel(purposeCode),
  particulars: person
    ? `${person.rank} ${person.fullName} is hereby documented under this ${templateType.toLowerCase()} for ${getOrderPurposeLabel(purposeCode).toLowerCase()}.`
    : '',
  signatory: 'PBGEN BENJAMIN H ACORDA',
  signatoryTitle: 'Director, ITMS'
});

export const DocumentTemplatePanel = ({ personnel }: DocumentTemplatePanelProps) => {
  const [templateType, setTemplateType] = useState<DocumentTemplateType>('Administrative Order');
  const [personnelId, setPersonnelId] = useState('');
  const [orderSeries, setOrderSeries] = useState<OrderSeries>('SO');
  const [purposeCode, setPurposeCode] = useState<OrderPurposeCode>('DES');
  const [documentStatus, setDocumentStatus] = useState<OrderDocumentStatus>('Draft');
  const selectedPerson = useMemo(
    () => personnel.find(person => person.id === personnelId),
    [personnel, personnelId]
  );
  const [fields, setFields] = useState<TemplateFields>(() => buildFields('Administrative Order', undefined, 'DES'));
  const [message, setMessage] = useState('');

  const orderNumberPreview = buildOrderNumberPreview(orderSeries, purposeCode, fields.date);

  useEffect(() => {
    const saved = window.localStorage.getItem(`pais.template.${templateType}`);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as SavedTemplateDraft;
        setFields(draft.fields || buildFields(templateType, undefined, 'DES'));
        setPersonnelId(draft.personnelId || '');
        setOrderSeries(draft.series || 'SO');
        setPurposeCode(draft.purposeCode || 'DES');
        setDocumentStatus(draft.documentStatus || 'Draft');
        setMessage('Saved draft loaded.');
        return;
      } catch {
        window.localStorage.removeItem(`pais.template.${templateType}`);
      }
    }
    setPersonnelId('');
    setOrderSeries('SO');
    setPurposeCode('DES');
    setDocumentStatus('Draft');
    setFields(buildFields(templateType, undefined, 'DES'));
    setMessage('');
  }, [templateType]);

  const personnelOptions = personnel.map(person => ({
    value: person.id,
    label: `${person.rank} ${person.fullName}`,
    description: `${person.badgeNo} - ${person.sub_unit || person.division || person.unitCategory || 'Unit not recorded'}`
  }));

  const refreshFields = () => {
    setFields(buildFields(templateType, selectedPerson, purposeCode, fields.date));
    setMessage(selectedPerson ? 'Personnel and order fields autofilled.' : 'Template fields reset.');
  };

  const updateField = (key: keyof TemplateFields, value: string) => {
    setFields(previous => ({ ...previous, [key]: value }));
  };

  const updatePurpose = (value: OrderPurposeCode) => {
    setPurposeCode(value);
    setFields(previous => ({
      ...previous,
      subject: getOrderPurposeLabel(value),
      particulars: selectedPerson
        ? `${selectedPerson.rank} ${selectedPerson.fullName} is hereby documented under this ${templateType.toLowerCase()} for ${getOrderPurposeLabel(value).toLowerCase()}.`
        : previous.particulars
    }));
  };

  const saveDraft = () => {
    const draft: SavedTemplateDraft = { fields, personnelId, series: orderSeries, purposeCode, documentStatus };
    window.localStorage.setItem(`pais.template.${templateType}`, JSON.stringify(draft));
    setMessage('Draft saved in this browser. Official order numbering occurs when the order is saved.');
  };

  const documentHtml = () => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(orderNumberPreview)}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#0f172a}.document{max-width:760px;margin:auto;border:1px solid #cbd5e1;padding:40px}.center{text-align:center}.meta{display:grid;grid-template-columns:140px 1fr;gap:8px;margin:28px 0}.label{font-weight:700}.subject{font-weight:700;text-transform:uppercase;margin-top:24px}.body{line-height:1.7;text-align:justify;margin-top:18px;white-space:pre-wrap}.status{color:#475569;font-size:12px}.signatory{margin-top:64px;text-align:right}@media print{body{margin:0}.document{border:0}}</style></head><body><main class="document"><div class="center"><strong>PHILIPPINE NATIONAL POLICE</strong><br>Information Technology Management Service</div><div class="meta"><span class="label">Order No.</span><span>${escapeHtml(orderNumberPreview)}</span><span class="label">Series</span><span>${escapeHtml(orderSeries)}</span><span class="label">Purpose</span><span>${escapeHtml(`${purposeCode} — ${getOrderPurposeLabel(purposeCode)}`)}</span><span class="label">Status</span><span class="status">${escapeHtml(documentStatus)}</span><span class="label">Date</span><span>${escapeHtml(fields.date)}</span><span class="label">Personnel</span><span>${escapeHtml(fields.personnelName)}</span><span class="label">Badge No.</span><span>${escapeHtml(fields.badgeNo)}</span><span class="label">Unit</span><span>${escapeHtml(fields.unit)}</span></div><p class="subject">${escapeHtml(fields.subject)}</p><p class="body">${escapeHtml(fields.particulars)}</p><div class="signatory"><strong>${escapeHtml(fields.signatory)}</strong><br>${escapeHtml(fields.signatoryTitle)}</div></main></body></html>`;

  const downloadHtml = () => {
    const blob = new Blob([documentHtml()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${orderNumberPreview || 'document-template'}.html`;
    link.click();
    URL.revokeObjectURL(url);
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
    pdf.text([
      `Order No.: ${orderNumberPreview}`,
      `Series: ${orderSeries}`,
      `Purpose: ${purposeCode} — ${getOrderPurposeLabel(purposeCode)}`,
      `Status: ${documentStatus}`,
      `Date: ${fields.date}`,
      `Personnel: ${fields.personnelName}`,
      `Badge No.: ${fields.badgeNo}`,
      `Unit: ${fields.unit}`
    ], 20, 42);
    pdf.setFontSize(11);
    pdf.text(fields.subject.toUpperCase(), 20, 92);
    pdf.setFontSize(10);
    pdf.text(pdf.splitTextToSize(fields.particulars, 170), 20, 104);
    pdf.text(fields.signatory, 190, 245, { align: 'right' });
    pdf.text(fields.signatoryTitle, 190, 251, { align: 'right' });
    pdf.save(`${orderNumberPreview || 'document-template'}.pdf`);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><FilePenLine size={18} className="text-teal-700" /> Editable Document Templates</h2>
          <p className="mt-1 text-sm text-slate-500">Draft order documents using the same series, purpose codes, statuses, and numbering format as the Orders register.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveDraft} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Save size={16} /> Save draft</button>
          <button type="button" onClick={printDocument} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Printer size={16} /> Print</button>
          <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><FileDown size={16} /> PDF</button>
          <button type="button" onClick={refreshFields} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} /> Autofill</button>
          <button type="button" onClick={downloadHtml} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Download size={16} /> Download</button>
        </div>
      </div>

      {message && <p role="status" className="mx-5 mt-4 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800">{message}</p>}

      <div className="grid gap-5 p-3 sm:p-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <SearchableSelect label="Template" value={templateType} onChange={value => setTemplateType(value as DocumentTemplateType)} options={TEMPLATE_TYPES.map(value => ({ value, label: value }))} />
          <SearchableSelect label="Order series" value={orderSeries} onChange={value => setOrderSeries(value as OrderSeries)} options={ORDER_SERIES_OPTIONS.map(option => ({ value: option.value, label: option.label }))} />
          <SearchableSelect label="Order purpose" value={purposeCode} onChange={value => updatePurpose(value as OrderPurposeCode)} options={ORDER_PURPOSE_OPTIONS.map(option => ({ value: option.value, label: option.label }))} />
          <SearchableSelect label="Document status" value={documentStatus} onChange={value => setDocumentStatus(value as OrderDocumentStatus)} options={ORDER_DOCUMENT_STATUS_OPTIONS.map(option => ({ value: option.value, label: option.label }))} />
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-700">Generated order number preview</p><p className="mt-1 font-mono text-sm font-extrabold text-blue-950">{orderNumberPreview}</p><p className="mt-1 text-[10px] text-blue-800">The final sequence is assigned when the official order is saved.</p></div>
          <SearchableSelect label="Personnel source" value={personnelId} onChange={value => { setPersonnelId(value); const person = personnel.find(item => item.id === value); if (person) setFields(previous => ({ ...previous, personnelName: `${person.rank} ${person.fullName}`, badgeNo: person.badgeNo || '', unit: person.sub_unit || person.division || person.unitCategory || '', designation: person.designation || '' })); }} placeholder="Select personnel" options={personnelOptions} />
          {Object.entries(fields).map(([key, value]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-bold capitalize text-slate-700">{key.replace(/([A-Z])/g, ' $1')}</span>
              {key === 'particulars' ? <textarea value={value} onChange={event => updateField(key as keyof TemplateFields, event.target.value)} rows={5} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /> : <input type={key === 'date' ? 'date' : 'text'} value={value} onChange={event => updateField(key as keyof TemplateFields, event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />}
            </label>
          ))}
        </div>

        <div className="min-h-[420px] overflow-x-auto bg-slate-100 p-2 sm:min-h-[560px] sm:p-4">
          <div className="mx-auto min-h-[420px] w-full min-w-[320px] max-w-[760px] bg-white p-5 text-slate-950 shadow-sm ring-1 ring-slate-200 sm:min-h-[520px] sm:p-10">
            <div className="text-center text-sm leading-6"><p className="font-bold">PHILIPPINE NATIONAL POLICE</p><p>Information Technology Management Service</p></div>
            <div className="mt-8 grid grid-cols-1 gap-2 text-sm sm:grid-cols-[140px_1fr]">
              <p className="font-bold">Order No.</p><p className="font-mono">{orderNumberPreview}</p>
              <p className="font-bold">Series</p><p>{orderSeries}</p>
              <p className="font-bold">Purpose</p><p>{purposeCode} — {getOrderPurposeLabel(purposeCode)}</p>
              <p className="font-bold">Status</p><p>{documentStatus}</p>
              <p className="font-bold">Date</p><p>{fields.date}</p>
              <p className="font-bold">Personnel</p><p>{fields.personnelName || 'Select personnel or enter manually'}</p>
              <p className="font-bold">Badge No.</p><p>{fields.badgeNo}</p>
              <p className="font-bold">Unit</p><p>{fields.unit}</p>
            </div>
            <p className="mt-8 text-sm font-bold uppercase">{fields.subject}</p>
            <p className="mt-5 whitespace-pre-wrap text-justify text-sm leading-7">{fields.particulars}</p>
            <div className="mt-20 text-right text-sm"><p className="font-bold">{fields.signatory}</p><p>{fields.signatoryTitle}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
};
