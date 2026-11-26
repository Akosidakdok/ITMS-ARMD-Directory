import { buildOrderTemplateHtml, buildOrderTemplatePdf, type OrderTemplateFields as TemplateFields } from '../../utils/orderTemplateDocument';
import { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, FilePenLine, Printer, RefreshCw, Save } from 'lucide-react';
import { PersonnelMultiSelect } from '../common/PersonnelMultiSelect';
import { getTemplatePersonnelRows, restoreTemplatePersonnelIds, formatTemplatePersonnelName } from '../../utils/orderTemplatePersonnel';
import { SearchableSelect } from '../common/SearchableSelect';
import type { DocumentTemplateType, Personnel } from '../../types/pais';
import {
  getOrderPurposeLabel,
  formatOrderPurposeLabel,
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

type SavedTemplateDraft = {
  fields: TemplateFields;
  personnelId?: string;
  personnelIds?: string[];
  series: OrderSeries;
  purposeCode: OrderPurposeCode;
  documentStatus: OrderDocumentStatus;
};

const TEMPLATE_TYPES: DocumentTemplateType[] = [
  'Assignment Order',
  'Administrative Order',
  'Leave Endorsement'
];

const today = new Date().toISOString().slice(0, 10);
const buildOrderNumberPreview = (series: OrderSeries, purposeCode: OrderPurposeCode, date: string) =>
  date ? `ITMS-${series}-${purposeCode}-${date.slice(0, 4)}-####` : 'ITMS-…-…-YEAR-####';

const buildFields = (
  templateType: DocumentTemplateType,
  person: Personnel | undefined,
  purposeCode: OrderPurposeCode,
  date = today
): TemplateFields => ({
  date,
  personnelName: person ? formatTemplatePersonnelName(person) : '',
  badgeNo: person?.badgeNo || '',
  unit: person?.sub_unit || person?.division || person?.unitCategory || '',
  designation: person?.designation || '',
  subject: getOrderPurposeLabel(purposeCode),
  description: person
    ? `${formatTemplatePersonnelName(person)} is hereby documented under this ${templateType.toLowerCase()} for ${getOrderPurposeLabel(purposeCode).toLowerCase()}.`
    : '',
  signatory: 'PBGEN BENJAMIN H ACORDA',
  signatoryTitle: 'Director, ITMS'
});

export const DocumentTemplatePanel = ({ personnel }: DocumentTemplatePanelProps) => {
  const [templateType, setTemplateType] = useState<DocumentTemplateType>('Administrative Order');
  const [personnelIds, setPersonnelIds] = useState<string[]>([]);
  const [orderSeries, setOrderSeries] = useState<OrderSeries>('SO');
  const [purposeCode, setPurposeCode] = useState<OrderPurposeCode>('DES');
  const [documentStatus, setDocumentStatus] = useState<OrderDocumentStatus>('Draft');
  const selectedPerson = useMemo(
    () => personnel.find(person => person.id === personnelIds[0]),
    [personnel, personnelIds]
  );
  const [fields, setFields] = useState<TemplateFields>(() => buildFields('Administrative Order', undefined, 'DES'));
  const [message, setMessage] = useState('');

  const orderNumberPreview = buildOrderNumberPreview(orderSeries, purposeCode, fields.date);

  useEffect(() => {
    const saved = window.localStorage.getItem(`pais.template.${templateType}`);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as SavedTemplateDraft;
        const savedFields = draft.fields as (Partial<TemplateFields> & { particulars?: string }) | undefined;
        const { particulars: legacyParticulars, ...normalizedFields } = savedFields || {};
        setFields({
          ...buildFields(templateType, undefined, 'DES'),
          ...normalizedFields,
          description: savedFields?.description ?? legacyParticulars ?? ''
        });
        setPersonnelIds(restoreTemplatePersonnelIds(draft));
        setOrderSeries(draft.series || 'SO');
        setPurposeCode(draft.purposeCode || 'DES');
        setDocumentStatus(draft.documentStatus || 'Draft');
        setMessage('Saved draft loaded.');
        return;
      } catch {
        window.localStorage.removeItem(`pais.template.${templateType}`);
      }
    }
    setPersonnelIds([]);
    setOrderSeries('SO');
    setPurposeCode('DES');
    setDocumentStatus('Draft');
    setFields(buildFields(templateType, undefined, 'DES'));
    setMessage('');
  }, [templateType]);

  const selectedRows = useMemo(() => getTemplatePersonnelRows(personnel, personnelIds), [personnel, personnelIds]);
  const selectionFields = (ids: string[]) => {
    const rows = getTemplatePersonnelRows(personnel, ids);
    return { personnelName: rows.map(p => p.name).join('\n'), badgeNo: rows.map(p => p.badgeNo).join('\n'), unit: [...new Set(rows.map(p => p.unit))].join('\n'), designation: rows.map(p => p.designation).join('\n') };
  };
  const changePersonnel = (ids: string[]) => {
    setPersonnelIds(ids);
    setFields(previous => ({ ...previous, ...selectionFields(ids) }));
  };
  const refreshFields = () => {
    const rows = getTemplatePersonnelRows(personnel, personnelIds);
    setFields({ ...buildFields(templateType, selectedPerson, purposeCode, fields.date), ...selectionFields(personnelIds), description: rows.length ? `${rows.map(row => row.name).join('; ')} ${rows.length === 1 ? 'is' : 'are'} hereby documented under this ${templateType.toLowerCase()} for ${getOrderPurposeLabel(purposeCode).toLowerCase()}.` : '' });
    setMessage(rows.length ? 'Selected personnel and order fields autofilled.' : 'Template fields reset.');
  };
  const validateSelection = () => {
    if (personnelIds.some(id => !personnel.some(person => person.id === id))) {
      setMessage('A selected person is no longer in the roster. Remove or reselect them before exporting.');
      return false;
    }
    return true;
  };

  const updateField = (key: keyof TemplateFields, value: string) => {
    setFields(previous => ({ ...previous, [key]: value }));
  };

  const updatePurpose = (value: OrderPurposeCode) => {
    setPurposeCode(value);
    setFields(previous => ({
      ...previous,
      subject: getOrderPurposeLabel(value),
      description: selectedRows.length
        ? `${selectedRows.map(person => person.name).join('; ')} ${selectedRows.length === 1 ? 'is' : 'are'} hereby documented under this ${templateType.toLowerCase()} for ${getOrderPurposeLabel(value).toLowerCase()}.`
        : previous.description
    }));
  };

  const saveDraft = () => {
    const draft: SavedTemplateDraft = { fields, personnelIds, series: orderSeries, purposeCode, documentStatus };
    window.localStorage.setItem(`pais.template.${templateType}`, JSON.stringify(draft));
    setMessage('Draft saved in this browser. Official order numbering occurs when the order is saved.');
  };

  const documentData = () => ({ orderNumber: orderNumberPreview, series: orderSeries, purposeLabel: formatOrderPurposeLabel(purposeCode), status: documentStatus, fields, personnel: selectedRows });
  const documentHtml = () => buildOrderTemplateHtml(documentData());

  const downloadHtml = () => {
    if (!validateSelection()) return;
    const blob = new Blob([documentHtml()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${orderNumberPreview || 'document-template'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printDocument = () => {
    if (!validateSelection()) return;
    const popup = window.open('', '_blank');
    if (!popup) return setMessage('Allow pop-ups to print the document.');
    popup.opener = null;
    popup.document.write(documentHtml());
    popup.addEventListener('load', () => popup.print(), { once: true });
    popup.document.close();
  };

  const exportPdf = async () => {
    if (!validateSelection()) return;
    const pdf = await buildOrderTemplatePdf(documentData());
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
          <PersonnelMultiSelect personnel={personnel} selectedIds={personnelIds} onChange={changePersonnel} />
          {selectedRows.length > 0 && <p className="text-xs text-slate-500">Names, badge numbers, home units, and designations are taken from the selected personnel. Date and order details apply to everyone selected.</p>}

          {Object.entries(fields).filter(([key]) => !selectedRows.length || !['personnelName', 'badgeNo', 'unit', 'designation'].includes(key)).map(([key, value]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-bold capitalize text-slate-700">{key === 'description' ? 'Description' : key.replace(/([A-Z])/g, ' $1')}</span>
              {key === 'description' ? <textarea aria-label="Description" value={value} onChange={event => updateField(key as keyof TemplateFields, event.target.value)} rows={5} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600 focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /> : <input type={key === 'date' ? 'date' : 'text'} value={value} onChange={event => updateField(key as keyof TemplateFields, event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600 focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />}
            </label>
          ))}
        </div>

        <div className="min-h-[420px] overflow-x-auto bg-slate-100 p-2 sm:min-h-[560px] sm:p-4">
          <div className="mx-auto min-h-[420px] w-full max-w-[760px] bg-white p-5 text-slate-950 shadow-sm ring-1 ring-slate-200 sm:min-h-[520px] sm:p-10">
            <div className="text-center text-sm leading-6"><p className="font-bold">PHILIPPINE NATIONAL POLICE</p><p>Information Technology Management Service</p></div>
            <div className="mt-8 grid grid-cols-1 gap-2 text-sm sm:grid-cols-[140px_1fr]">
              <p className="font-bold">Order No.</p><p className="font-mono">{orderNumberPreview}</p>
              <p className="font-bold">Series</p><p>{orderSeries}</p>
              <p className="font-bold">Purpose</p><p>{formatOrderPurposeLabel(purposeCode)}</p>
              <p className="font-bold">Status</p><p>{documentStatus}</p>
              <p className="font-bold">Date</p><p>{fields.date}</p>
              {!selectedRows.length && <><p className="font-bold">Personnel</p><p>{fields.personnelName || 'Select personnel or enter manually'}</p>
              <p className="font-bold">Badge No.</p><p>{fields.badgeNo}</p>
              <p className="font-bold">Unit</p><p>{fields.unit}</p></>}
            </div>
            {selectedRows.length > 0 && <table className="record-table mt-5 text-xs"><thead><tr><th>Personnel</th><th>Badge No.</th><th>Unit</th><th>Designation</th></tr></thead><tbody>{selectedRows.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.badgeNo}</td><td>{row.unit}</td><td>{row.designation}</td></tr>)}</tbody></table>}
            <p className="mt-8 text-sm font-bold uppercase">{fields.subject}</p>
            <p className="mt-5 whitespace-pre-wrap text-justify text-sm leading-7">{fields.description}</p>
            <div className="mt-20 text-right text-sm"><p className="font-bold">{fields.signatory}</p><p>{fields.signatoryTitle}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
};
