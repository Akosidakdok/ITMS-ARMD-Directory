import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, ChevronRight, Download, FileText, Pencil, Search } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/SystemUI';
import { useAuthRole } from '../../context/AuthRoleContext';
import { downloadDlosDocument, runDlosAction, saveDlosWorkflow } from '../../services/dlosApi';
import type { DlosCase, DlosCaseDocument, DlosWorkflowRecord } from '../../types/dlos';
import { DLOS_STATUS_LABELS } from './dlosStatuses';

type Field = { key: string; label: string; type?: 'date' | 'textarea' | 'respondent' | 'category' };
type Step = { key: string; label: string; fields: Field[]; files: { key: string; label: string }[]; note?: string };
const steps: Step[] = [
  { key: 'roi', label: 'Submission of ROI from SHO', fields: [
    { key: 'roiDate', label: 'Date of Report of Investigation (ROI) of SHO', type: 'date' },
    { key: 'receivedDate', label: 'Date DLOD/DLOS received the ROI', type: 'date' }
  ], files: [{ key: 'roi', label: 'ROI of SHO' }, { key: 'memo', label: 'Memo / Transmittal of SHO' }] },
  { key: 'resolution', label: 'Resolution of IG, IAS / CDAC', fields: [
    { key: 'resolutionDate', label: 'Resolution date', type: 'date' }
  ], files: [{ key: 'resolution', label: 'Resolution' }] },
  { key: 'decision', label: 'Decision', fields: [
    { key: 'liability', label: 'Administrative liability', type: 'textarea' },
    { key: 'penalty', label: 'Penalty', type: 'textarea' },
    { key: 'decisionDate', label: 'Date of decision of DA', type: 'date' },
    { key: 'authority', label: 'Disciplinary Authority (DA)' }
  ], files: [{ key: 'decision', label: 'Decision of DA' }] },
  { key: 'decision_resolution', label: 'Resolution of Decision', note: 'For 3rd level officers only', fields: [
    { key: 'resolutionDate', label: 'Resolution date', type: 'date' }
  ], files: [{ key: 'resolution', label: 'Resolution of decision' }] },
  { key: 'decision_service', label: 'Proof of Service From Receipt of Decision', fields: [
    { key: 'proofType', label: 'Proof of Service (POS) of Decision' },
    { key: 'receivedDate', label: 'Date received', type: 'date' }
  ], files: [{ key: 'proof', label: 'Proof of service' }] },
  { key: 'mr_resolution', label: 'Resolution of Motion for Reconsideration (MR)', fields: [
    { key: 'filedDate', label: 'Date MR filed', type: 'date' },
    { key: 'resolutionDate', label: 'Date of resolution of DA', type: 'date' },
    { key: 'resolution', label: 'Resolution' }
  ], files: [{ key: 'mr_resolution', label: 'Copy of MR and resolution of DA' }] },
  { key: 'mr_service', label: 'Proof of Service of MR', fields: [
    { key: 'serviceDate', label: 'Date of service', type: 'date' }
  ], files: [{ key: 'proof', label: 'Proof of Service of MR' }] },
  { key: 'finality', label: 'Certificate of Finality', fields: [
    { key: 'finalityDate', label: 'Date of finality', type: 'date' }
  ], files: [{ key: 'certificate', label: 'Certificate of Finality' }] },
  { key: 'implementation', label: 'Implementation', fields: [
    { key: 'respondentKey', label: 'Respondent', type: 'respondent' },
    { key: 'penaltyCategory', label: 'Penalty category', type: 'category' },
    { key: 'orderDate', label: 'Implementation order date', type: 'date' },
    { key: 'effectivityDate', label: 'Penalty effectivity date', type: 'date' },
    { key: 'penaltyDuration', label: 'Penalty duration (suspension only)' }
  ], files: [{ key: 'order', label: 'Implementation order' }] }
];
const shoStep: Step = { key: 'sho_amendment', label: 'Amendment / Change of Designated SHO', fields: [
  { key: 'memorandumDate', label: 'Date of memorandum for amendment', type: 'date' }
], files: [{ key: 'memorandum', label: 'Memorandum file' }] };
const inputClass = 'mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-sm';
const shoInputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';
const fileAccept = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
type WorkflowStepDraft = { fields: Record<string, string>; files: Record<string, File>; noDocument: boolean };
const workflowDraftKey = (caseId: string, stepKey: string, respondentKey = '') =>
  `${caseId}:${stepKey}${stepKey === 'implementation' ? `:${respondentKey || 'unselected'}` : ''}`;

interface Props {
  item: DlosCase | null;
  records: DlosWorkflowRecord[];
  documents: DlosCaseDocument[];
  initialStep?: 'sho_amendment';
  onClose: () => void;
  onSaved: (item: DlosCase) => void;
  onEditCase: () => void;
}

export const DlosWorkflowDialog = ({ item, records, documents, initialStep, onClose, onSaved, onEditCase }: Props) => {
  const { personnelList } = useAuthRole();
  const [stepKey, setStepKey] = useState(initialStep || steps[0].key);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [noDocument, setNoDocument] = useState(false);
  const [shoSearch, setShoSearch] = useState('');
  const [memorandumPreview, setMemorandumPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [statusSelection, setStatusSelection] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const draftCacheRef = useRef<Record<string, WorkflowStepDraft>>({});
  const lastImplementationRespondentRef = useRef<Record<string, string>>({});
  const step = initialStep ? shoStep : steps.find(entry => entry.key === stepKey) || steps[0];
  const respondents = item?.people.filter(person => person.role === 'respondent') || [];
  const selectedRecord = records.find(record => record.stepKey === step.key && (step.key !== 'implementation' || record.respondentKey === fields.respondentKey));
  const stepDocuments = documents.filter(document => document.stepKey === step.key && (step.key !== 'implementation' || document.respondentKey === fields.respondentKey));
  const matchingPersonnel = useMemo(() => personnelList.filter(person =>
    `${person.rank || ''} ${person.fullName}`.toLowerCase().includes(shoSearch.toLowerCase())).slice(0, 30), [personnelList, shoSearch]);
  const stepSummaries = useMemo(() => steps.map((entry, index) => {
    const stepRecords = records.filter(record => record.stepKey === entry.key);
    const fileCount = documents.filter(document => document.stepKey === entry.key).length;
    const implementationRespondentsUpdated = new Set(stepRecords.map(record => record.respondentKey).filter(Boolean)).size;
    const implementationComplete = respondents.length > 0 && implementationRespondentsUpdated >= respondents.length;
    const complete = entry.key === 'implementation' ? implementationComplete : stepRecords.length > 0;
    const detailState = entry.key === 'implementation' && respondents.length > 0
      ? `${implementationRespondentsUpdated} of ${respondents.length} respondents updated`
      : complete ? 'Details saved' : 'Details pending';
    const noDocumentRecorded = stepRecords.length > 0 && stepRecords.every(record => record.noDocument);
    return {
      entry,
      index,
      complete,
      detailState,
      documentState: fileCount ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : noDocumentRecorded ? 'No document available' : 'No file uploaded'
    };
  }), [records, documents, respondents.length]);
  const completedStepCount = stepSummaries.filter(summary => summary.complete).length;
  const attachedStepDocumentCount = documents.filter(document => steps.some(entry => entry.key === document.stepKey)).length;
  const baselineFields = selectedRecord?.fields || {};
  const hasCurrentDraftChanges = (
    Object.keys({ ...baselineFields, ...fields }).some(key => (fields[key] || '') !== (baselineFields[key] || '')) ||
    Object.keys(files).length > 0 || noDocument !== (selectedRecord?.noDocument || false)
  );
  const hasUnsavedChanges = !initialStep && hasCurrentDraftChanges;

  useEffect(() => {
    if (!item) return;
    const activeStepKey = initialStep || stepKey;
    const first = records.find(record => record.stepKey === activeStepKey);
    const respondentKey = activeStepKey === 'implementation'
      ? lastImplementationRespondentRef.current[item.id] || first?.respondentKey || ''
      : '';
    const record = records.find(entry => entry.stepKey === activeStepKey && (activeStepKey !== 'implementation' || entry.respondentKey === respondentKey));
    const cachedDraft = draftCacheRef.current[workflowDraftKey(item.id, activeStepKey, respondentKey)];
    setFields(cachedDraft?.fields || record?.fields || (respondentKey ? { respondentKey } : {}));
    setNoDocument(cachedDraft?.noDocument ?? record?.noDocument ?? false);
    setFiles(cachedDraft?.files || {});
    setError('');
  }, [item?.id, stepKey, initialStep, records]);
  useEffect(() => { setStatusSelection(item?.caseStatus || ''); setStatusReason(''); setStatusEditorOpen(false); }, [item?.id, item?.caseStatus]);
  useEffect(() => {
    const file = files.memorandum;
    if (!file) { setMemorandumPreview(''); return; }
    const url = URL.createObjectURL(file);
    setMemorandumPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [files.memorandum]);

  const cacheCurrentDraft = () => {
    if (!item) return;
    const key = workflowDraftKey(item.id, step.key, fields.respondentKey);
    if (hasCurrentDraftChanges) draftCacheRef.current[key] = { fields, files, noDocument };
    else delete draftCacheRef.current[key];
  };
  const selectStep = (nextStepKey: string) => {
    if (nextStepKey === stepKey) return;
    cacheCurrentDraft();
    setStepKey(nextStepKey);
  };
  const closeDialog = () => {
    if (busy) return;
    cacheCurrentDraft();
    onClose();
  };
  const setField = (key: string, value: string) => {
    if (key === 'respondentKey') {
      if (item) {
        cacheCurrentDraft();
        lastImplementationRespondentRef.current[item.id] = value;
      }
      const cachedDraft = item ? draftCacheRef.current[workflowDraftKey(item.id, 'implementation', value)] : undefined;
      const record = records.find(entry => entry.stepKey === 'implementation' && entry.respondentKey === value);
      setFields(cachedDraft?.fields || record?.fields || { respondentKey: value });
      setFiles(cachedDraft?.files || {});
      setNoDocument(cachedDraft?.noDocument ?? record?.noDocument ?? false);
      return;
    }
    setFields(current => ({ ...current, [key]: value }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!item || busy) return;
    setBusy(true); setError('');
    try {
      for (const file of Object.values(files)) if (file.size > 10 * 1024 * 1024) throw new Error('Each PDF or image must be 10 MB or smaller.');
      const updated = await saveDlosWorkflow(item, step.key, fields, files, noDocument);
      delete draftCacheRef.current[workflowDraftKey(item.id, step.key, fields.respondentKey)];
      onSaved(updated);
      setFiles({});
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save workflow step.'); }
    finally { setBusy(false); }
  };
  const changeStatus = async () => {
    if (!item || busy || !statusReason.trim() || !statusSelection || statusSelection === item.caseStatus) return;
    setBusy(true); setError('');
    try {
      cacheCurrentDraft();
      onSaved(await runDlosAction(item, 'set_status', { caseStatus: statusSelection, reason: statusReason }));
      setStatusReason('');
      setStatusEditorOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to change status.'); }
    finally { setBusy(false); }
  };

  return <Modal isOpen={item !== null} onClose={closeDialog}
    title={initialStep ? shoStep.label : 'Case Updates'} subtitle={item?.docketNumber} maxWidth="4xl">
    <div className={`-m-4 min-w-0 bg-white sm:-m-5 ${initialStep ? '' : 'lg:grid lg:h-[min(76vh,44rem)] lg:min-h-[30rem] lg:grid-cols-[19rem_minmax(0,1fr)]'}`}>
      {!initialStep && <aside className="flex min-w-0 flex-col border-b border-slate-300 bg-slate-50 lg:min-h-0 lg:border-b-0 lg:border-r">
        <div className="dlos-workflow-sidebar-heading flex items-center justify-between gap-3 px-4 py-3">
          <h3 className="text-sm font-semibold">Workflow steps</h3>
          <span className="text-xs text-slate-200">{completedStepCount} of {steps.length} saved</span>
        </div>
        <section className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current case status</p>
              <span className="mt-1 inline-flex max-w-full rounded-sm bg-slate-600 px-2 py-1 text-xs font-semibold leading-snug text-white">{item?.caseStatus}</span>
            </div>
            <button type="button" aria-expanded={statusEditorOpen} onClick={() => setStatusEditorOpen(open => !open)}
              className="inline-flex min-h-10 shrink-0 items-center rounded-md px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              {statusEditorOpen ? 'Close' : 'Change'}
            </button>
          </div>
          {statusEditorOpen && <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
            <label className="block text-xs font-semibold text-slate-700">New case status<select className={inputClass} value={statusSelection} onChange={event => setStatusSelection(event.target.value)}>
              {!DLOS_STATUS_LABELS.includes(item?.caseStatus as typeof DLOS_STATUS_LABELS[number]) && <option value={item?.caseStatus}>{item?.caseStatus}</option>}
              {DLOS_STATUS_LABELS.map(status => <option key={status} value={status}>{status}</option>)}
            </select></label>
            <label className="block text-xs font-semibold text-slate-700">Reason for status change<input className={inputClass} maxLength={500} value={statusReason} onChange={event => setStatusReason(event.target.value)} /></label>
            <div className="flex justify-end"><Button type="button" disabled={busy || !statusReason.trim() || statusSelection === item?.caseStatus} onClick={() => void changeStatus()}>Save status</Button></div>
          </div>}
        </section>
        <nav aria-label="Case update steps" className="hidden divide-y divide-slate-200 overflow-y-auto lg:block lg:min-h-0 lg:flex-1">
          {stepSummaries.map(({ entry, index, complete, detailState, documentState }) => {
            const isSelected = entry.key === step.key;
            return <button key={entry.key} type="button" aria-current={isSelected ? 'step' : undefined} onClick={() => selectStep(entry.key)}
              className={`group flex w-full items-center gap-3 px-3 py-3 text-left focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-blue-700 ${isSelected ? 'bg-[#fff7d6] text-[#172b4d]' : 'bg-white text-slate-800 hover:bg-slate-100'}`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm border text-xs font-semibold ${isSelected ? 'border-[#d8ad24] bg-[#f4c542] text-[#172b4d]' : complete ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-500'}`}>{complete ? <Check size={14} aria-label="Saved" /> : index + 1}</span>
              <span className="min-w-0 flex-1">
                <strong className="block text-xs font-semibold leading-snug">{entry.label}</strong>
                {entry.note && <small className="mt-0.5 block text-[11px] text-slate-500">{entry.note}</small>}
                <span className="mt-1 block text-[11px] text-slate-500">{isSelected && hasUnsavedChanges ? 'Unsaved changes' : detailState} <span aria-hidden="true">·</span> {documentState}</span>
              </span>
              <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold ${isSelected ? 'text-[#172b4d]' : 'text-blue-700'}`}>Details<ChevronRight size={14} /></span>
            </button>;
          })}
        </nav>
        <button type="button" className="flex min-h-11 items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-blue-700" onClick={() => { cacheCurrentDraft(); onEditCase(); }}>
          <Pencil size={14} /> Edit case fields and dated notes
        </button>
      </aside>}
      {!initialStep && <div className="space-y-2 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <label className="block text-xs font-semibold text-slate-700">Choose a case update step<select className={inputClass} value={stepKey} onChange={event => selectStep(event.target.value)}>
          {stepSummaries.map(({ entry, index, complete }) => <option key={entry.key} value={entry.key}>{index + 1}. {entry.label} · {entry.key === step.key && hasUnsavedChanges ? 'Unsaved' : complete ? 'Saved' : 'Pending'}</option>)}
        </select></label>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{completedStepCount} of {steps.length} details saved</span><span>{attachedStepDocumentCount} files attached</span>
        </div>
      </div>}
      <form onSubmit={submit} className={`min-w-0 space-y-5 p-4 sm:p-6 ${initialStep ? '' : 'lg:h-full lg:overflow-y-auto'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-snug text-slate-900">{step.label}</h3>
            {step.note && <p className="mt-1 text-sm text-slate-500">{step.note}</p>}
            {selectedRecord && <p className="mt-2 text-xs text-slate-500">Last saved by {selectedRecord.actorName} on {new Date(selectedRecord.updatedAt).toLocaleString('en-PH')}</p>}
          </div>
          {hasUnsavedChanges ? <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Unsaved changes</span> : selectedRecord && <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"><Check size={13} /> Details saved</span>}
        </div>
        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {initialStep && <div className="space-y-2 rounded-xl border border-slate-200 p-4">
          <label className="block text-sm font-semibold">Search new SHO<input className={shoInputClass} type="search" value={shoSearch} onChange={event => setShoSearch(event.target.value)} placeholder="Rank or name" /></label>
          <div className="max-h-36 space-y-1 overflow-y-auto">{matchingPersonnel.map(person => <button key={person.id} type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-blue-50" onClick={() => setFields(current => ({ ...current, shoName: `${person.rank || ''} ${person.fullName}`.trim(), shoPersonnelId: person.id }))}><Search size={13} />{person.rank} {person.fullName}</button>)}</div>
          <label className="block text-sm font-semibold">Selected SHO<input className={shoInputClass} required maxLength={160} value={fields.shoName || ''} onChange={event => setFields(current => ({ ...current, shoName: event.target.value, shoPersonnelId: '' }))} /></label>
        </div>}
        <section className="space-y-3">
          {!initialStep && <><h4 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-800">Details</h4><p className="-mt-1 text-xs leading-relaxed text-slate-500">Save this step to record changes. Unsaved edits stay available while you switch steps or close and reopen this dialog.</p></>}
          <div className="grid gap-4 sm:grid-cols-2">{step.fields.map(field => <label key={field.key} className={`block text-sm font-semibold text-slate-700 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>{field.label}
            {field.type === 'respondent' ? <select className={initialStep ? shoInputClass : inputClass} required value={fields[field.key] || ''} onChange={event => setField(field.key, event.target.value)}><option value="">Select respondent</option>{respondents.map(person => <option key={person.id} value={person.id}>{person.rank} {person.nameSnapshot} · {person.status || 'No status'}</option>)}</select>
              : field.type === 'category' ? <select className={initialStep ? shoInputClass : inputClass} value={fields[field.key] || ''} onChange={event => setField(field.key, event.target.value)}><option value="">Select category</option><option value="suspension">Suspension</option><option value="demotion">Demotion</option><option value="dismissal">Dismissal</option><option value="exonerated">Exonerated</option></select>
              : field.type === 'textarea' ? <textarea className={initialStep ? shoInputClass : inputClass} rows={3} maxLength={2000} value={fields[field.key] || ''} onChange={event => setField(field.key, event.target.value)} />
                : <input className={initialStep ? shoInputClass : inputClass} type={field.type === 'date' ? 'date' : 'text'} maxLength={2000} value={fields[field.key] || ''} onChange={event => setField(field.key, event.target.value)} />}
          </label>)}</div>
        </section>
        <section className="space-y-3 border-t border-slate-200 pt-4">
          {initialStep ? <h4 className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} /> Documents</h4> : <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><FileText size={16} className="text-blue-700" /> Supporting documents</h4>
            <label className="inline-flex min-h-11 items-center gap-2 py-2 text-xs font-medium text-slate-700"><input className="accent-blue-700" type="checkbox" checked={noDocument} onChange={event => { setNoDocument(event.target.checked); if (event.target.checked) setFiles({}); }} />No document available</label>
          </div>}
          <div className={initialStep ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
            {step.files.map(slot => <label key={slot.key} className={initialStep ? 'block text-sm font-medium text-slate-700' : `block border border-slate-200 bg-slate-50 p-3 ${noDocument ? 'opacity-60' : ''}`}>
              <span className={initialStep ? '' : 'block text-xs font-semibold text-slate-700'}>{slot.label}</span>
              <input key={`${step.key}-${noDocument ? 'none' : 'file'}`} className={initialStep ? shoInputClass : 'mt-2 block min-h-11 w-full min-w-0 text-xs text-slate-600 file:mr-2 file:rounded-sm file:border-0 file:bg-white file:px-2 file:py-1.5 file:font-semibold file:text-blue-700 hover:file:bg-slate-100'} type="file" accept={fileAccept} disabled={noDocument} onChange={event => { const chosen = event.target.files?.[0]; if (chosen) setNoDocument(false); setFiles(current => { const next = { ...current }; if (chosen) next[slot.key] = chosen; else delete next[slot.key]; return next; }); }} />
              {!initialStep && files[slot.key] && <span className="mt-2 block truncate text-[11px] text-slate-500">Selected: {files[slot.key].name}</span>}
            </label>)}
          </div>
          {initialStep && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={noDocument} onChange={event => { setNoDocument(event.target.checked); if (event.target.checked) setFiles({}); }} />No document available</label>}
          {initialStep && memorandumPreview && (files.memorandum?.type.startsWith('image/') ? <img src={memorandumPreview} alt="Selected memorandum preview" className="max-h-64 rounded-lg border object-contain" /> : <iframe src={memorandumPreview} title="Selected memorandum preview" className="h-64 w-full rounded-lg border" />)}
          {stepDocuments.length > 0 && <div className={initialStep ? 'space-y-1 rounded-lg bg-slate-50 p-3' : 'overflow-hidden border border-slate-200'}>
            <h5 className={initialStep ? 'text-xs text-slate-600' : 'bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700'}>{initialStep ? 'Previous files' : 'Files already on record'}</h5>
            {stepDocuments.map(file => <button key={file.id} type="button" className={initialStep ? 'block text-left text-sm text-blue-700 underline' : 'flex w-full items-center gap-2 border-t border-slate-200 bg-white px-3 py-2 text-left text-xs text-blue-700 hover:bg-blue-50'} onClick={() => void downloadDlosDocument(item!, file).catch(cause => setError(cause instanceof Error ? cause.message : 'Download failed.'))}>
              {initialStep ? `${file.fileRole || file.kind} · ${file.fileName}` : <><Download size={14} className="shrink-0" /><span className="min-w-0 flex-1 truncate">{file.fileRole || file.kind} · {file.fileName}</span><span className="shrink-0 text-[11px] text-slate-500">{file.documentDate || ''}</span></>}
            </button>)}
          </div>}
        </section>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button type="button" onClick={closeDialog} disabled={busy}>Close</Button><Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : initialStep ? 'Save step' : 'Save details'}</Button></div>
      </form>
    </div>
  </Modal>;
};
