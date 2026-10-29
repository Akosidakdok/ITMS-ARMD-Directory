import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, CircleDot, Download, FileText, ListChecks, Pencil, Search } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/SystemUI';
import { useAuthRole } from '../../context/AuthRoleContext';
import { downloadDlosDocument, fetchDlosDocumentBlob, runDlosAction, saveDlosWorkflow } from '../../services/dlosApi';
import type { DlosCase, DlosCaseDocument, DlosWorkflowRecord } from '../../types/dlos';
import { DLOS_STATUS_LABELS } from './dlosStatuses';

type Field = { key: string; label: string; type?: 'date' | 'textarea' | 'respondent' | 'category' | 'choice' };
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
    { key: 'decisionDate', label: 'Date of decision of DA', type: 'date' },
    { key: 'authority', label: 'Disciplinary Authority (DA)', type: 'choice' }
  ], files: [{ key: 'decision', label: 'Decision of DA' }] },
  { key: 'decision_resolution', label: 'Resolution of Decision', note: 'For 3rd level officers only', fields: [
    { key: 'resolutionDate', label: 'Resolution date', type: 'date' }
  ], files: [{ key: 'resolution', label: 'Resolution of decision' }] },
  { key: 'decision_service', label: 'Proof of Service From Receipt of Decision', fields: [
    { key: 'proofType', label: 'Proof of Service (POS) of Decision', type: 'choice' },
    { key: 'receivedDate', label: 'Date received', type: 'date' }
  ], files: [{ key: 'proof', label: 'Proof of service' }] },
  { key: 'mr_resolution', label: 'Resolution of Motion for Reconsideration (MR)', fields: [
    { key: 'filedDate', label: 'Date MR filed', type: 'date' },
    { key: 'resolutionDate', label: 'Date of resolution of DA', type: 'date' },
    { key: 'resolution', label: 'Resolution', type: 'choice' }
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
const choiceOptions: Record<string, string[]> = {
  authority: ['Chief, PNP', 'Regional Director', 'Director, IAS', 'Inspector General'],
  proofType: ['Personal service', 'Registered mail', 'Courier service', 'Electronic service'],
  resolution: ['Granted', 'Denied', 'Partially granted', 'Dismissed']
};

const WorkflowChoice = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) => {
  const [custom, setCustom] = useState(false);
  const known = options.includes(value);
  return <label>{label}
    <select className={inputClass} value={custom ? '__custom__' : value} onChange={event => {
      if (event.target.value === '__custom__') { setCustom(true); onChange(''); }
      else { setCustom(false); onChange(event.target.value); }
    }}>
      <option value="">Select an option</option>
      {!custom && value && !known && <option value={value}>{value}</option>}
      {options.map(option => <option key={option} value={option}>{option}</option>)}
      <option value="__custom__">Other (specify)</option>
    </select>
    {custom && <input className={inputClass} autoFocus maxLength={2000} aria-label={`Other ${label}`} placeholder="Specify value" value={value} onChange={event => onChange(event.target.value)} />}
  </label>;
};
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
  const { personnelList, authUser } = useAuthRole();
  const [stepKey, setStepKey] = useState(initialStep || steps[0].key);
  const [detailOpen, setDetailOpen] = useState(false);
  const [implementationEditing, setImplementationEditing] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [noDocument, setNoDocument] = useState(false);
  const [shoSearch, setShoSearch] = useState('');
  const [shoSearchActive, setShoSearchActive] = useState(false);
  const [decisionFieldsOpen, setDecisionFieldsOpen] = useState(false);
  const [memorandumPreview, setMemorandumPreview] = useState('');
  const [savedMemorandumPreview, setSavedMemorandumPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [statusSelection, setStatusSelection] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const draftCacheRef = useRef<Record<string, WorkflowStepDraft>>({});
  const lastImplementationRespondentRef = useRef<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const rosterRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastDetailTriggerRef = useRef<HTMLButtonElement>(null);
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
    setDetailOpen(false);
    setImplementationEditing(false);
    setAttachmentsOpen(false);
    if (item?.id && !initialStep) {
      setStepKey(steps[0].key);
      if (listRef.current) listRef.current.scrollTop = 0;
    }
  }, [item?.id, initialStep]);
  useEffect(() => {
    if (!detailOpen) return;
    const frame = window.requestAnimationFrame(() => {
      (formRef.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
        || rosterRef.current?.querySelector<HTMLElement>('button:not([disabled])'))?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [detailOpen, stepKey, implementationEditing]);
  useEffect(() => {
    const file = files.memorandum;
    if (!file) { setMemorandumPreview(''); return; }
    const url = URL.createObjectURL(file);
    setMemorandumPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [files.memorandum]);
  const savedMemorandum = initialStep ? stepDocuments[0] : undefined;
  useEffect(() => {
    if (!initialStep || !item || !savedMemorandum || files.memorandum) { setSavedMemorandumPreview(''); return; }
    let cancelled = false;
    let url = '';
    void fetchDlosDocumentBlob(item, savedMemorandum).then(blob => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setSavedMemorandumPreview(url);
    }).catch(() => { if (!cancelled) setSavedMemorandumPreview(''); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [initialStep, item?.id, savedMemorandum?.id, files.memorandum]);

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
    setAttachmentsOpen(false);
  };
  const openStep = (nextStepKey: string) => {
    selectStep(nextStepKey);
    setDecisionFieldsOpen(false);
    setImplementationEditing(false);
    setDetailOpen(true);
  };
  const closeDetail = () => {
    cacheCurrentDraft();
    setDetailOpen(false);
    setImplementationEditing(false);
    setAttachmentsOpen(false);
    setError('');
    window.requestAnimationFrame(() => lastDetailTriggerRef.current?.focus());
  };
  const closeDialog = () => {
    if (busy) return;
    if (detailOpen && !initialStep) { closeDetail(); return; }
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
    if (step.key === 'decision' && (!fields.liability?.trim() || !fields.penalty?.trim())) {
      setDecisionFieldsOpen(true);
      setError('Set administrative liability and penalty before submitting the decision.');
      return;
    }
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

  const showingForm = Boolean(initialStep || detailOpen && (step.key !== 'implementation' || implementationEditing));
  const roleLabel = authUser?.dlosRole === 'reviewer' ? 'Reviewer' : 'Encoder';

  return <Modal isOpen={item !== null} onClose={closeDialog}
    title={initialStep ? shoStep.label : 'Case Updates'}
    subtitle={initialStep ? item?.docketNumber : undefined}
    maxWidth={initialStep ? '4xl' : 'lg'}
    closeLabel="Close case updates"
    headerInert={detailOpen}
    panelClassName={initialStep ? 'dlos-sho-modal' : 'dlos-workflow-modal'}
    bodyClassName={initialStep ? 'dlos-sho-modal-body' : 'dlos-workflow-modal-body'}
    headerContent={initialStep ? undefined : <div className="dlos-workflow-header">
      <span className="dlos-workflow-header-icon" aria-hidden="true"><ListChecks size={19} /></span>
      <div className="dlos-workflow-header-copy">
        <span>Case updates</span>
        <strong>{'Docket No.: ' + (item?.docketNumber || '')}</strong>
      </div>
      <span className="dlos-workflow-role">For Updating by DLOS {roleLabel}</span>
    </div>}
    footer={!initialStep && <button type="button" className="dlos-workflow-close" disabled={busy || detailOpen} onClick={closeDialog}>Close</button>}>
    {!initialStep && <div ref={listRef} className="dlos-workflow-list" inert={detailOpen} aria-hidden={detailOpen}>
      <div className="dlos-workflow-timeline" role="list" aria-label="Case update steps">
        {stepSummaries.map(({ entry, complete, detailState, documentState }) => <div className="dlos-workflow-row" role="listitem" key={entry.key}>
          <span className={'dlos-workflow-marker' + (complete ? ' is-complete' : '')} aria-hidden="true">{complete ? <Check size={11} /> : <CircleDot size={10} />}</span>
          <div className="dlos-workflow-card">
            <div className="dlos-workflow-card-copy">
              <strong>{entry.label}</strong>
              {entry.note && <span className="dlos-workflow-note">{entry.note}</span>}
              <span className="dlos-workflow-file-state">{documentState}</span>
              {complete && <span className="dlos-workflow-saved">{detailState}</span>}
              {entry.key === step.key && hasUnsavedChanges && <span className="dlos-workflow-unsaved">Unsaved changes</span>}
            </div>
            <button type="button" className="dlos-workflow-details" onClick={event => { lastDetailTriggerRef.current = event.currentTarget; openStep(entry.key); }}
              aria-label={'Details for ' + entry.label}><Pencil size={12} aria-hidden="true" /> Details</button>
          </div>
        </div>)}
      </div>
      <section className="dlos-workflow-management" aria-label="Case management">
        <div className="dlos-workflow-management-top">
          <div><span className="dlos-workflow-eyebrow">Current case status</span><strong>{item?.caseStatus}</strong></div>
          <button type="button" className="dlos-workflow-text-button" aria-expanded={statusEditorOpen} onClick={() => setStatusEditorOpen(open => !open)}>{statusEditorOpen ? 'Cancel' : 'Change status'}</button>
        </div>
        {statusEditorOpen && <div className="dlos-workflow-status-editor">
          <label>New case status<select className={inputClass} value={statusSelection} onChange={event => setStatusSelection(event.target.value)}>
            {!DLOS_STATUS_LABELS.includes(item?.caseStatus as typeof DLOS_STATUS_LABELS[number]) && <option value={item?.caseStatus}>{item?.caseStatus}</option>}
            {DLOS_STATUS_LABELS.map(status => <option key={status} value={status}>{status}</option>)}
          </select></label>
          <label>Reason for status change<input className={inputClass} maxLength={500} value={statusReason} onChange={event => setStatusReason(event.target.value)} /></label>
          {error && <p role="alert" className="dlos-workflow-error">{error}</p>}
          <Button type="button" disabled={busy || !statusReason.trim() || statusSelection === item?.caseStatus} onClick={() => void changeStatus()}>Save status</Button>
        </div>}
        <div className="dlos-workflow-management-bottom">
          <span>{completedStepCount} of {steps.length} updates saved · {attachedStepDocumentCount} files attached</span>
          <button type="button" className="dlos-workflow-text-button" onClick={() => { cacheCurrentDraft(); onEditCase(); }}><Pencil size={13} /> Edit case fields and notes</button>
        </div>
      </section>
    </div>}
    {(detailOpen || initialStep) && <div className={initialStep ? 'dlos-workflow-sho-content' : 'dlos-workflow-detail-layer'} onMouseDown={event => { if (detailOpen && !busy && event.target === event.currentTarget) closeDetail(); }}>
      <div className={initialStep ? 'dlos-workflow-sho-content' : 'dlos-workflow-detail-panel'} role={initialStep ? undefined : 'group'} aria-label={initialStep ? undefined : step.label}>
    {!initialStep && <div className="dlos-workflow-detail-header">
      <span className="dlos-workflow-header-icon" aria-hidden="true"><FileText size={19} /></span>
      <div className="dlos-workflow-header-copy"><span>Case updates</span><strong>{step.label}</strong></div>
      <button type="button" aria-label="Close update details" disabled={busy} onClick={closeDetail}>×</button>
    </div>}
    {!initialStep && detailOpen && step.key === 'implementation' && !implementationEditing && <div ref={rosterRef} className="dlos-workflow-roster">
      <p>Choose a respondent to record the implementation order.</p>
      {respondents.length ? <div className="dlos-workflow-roster-table" role="table" aria-label="Respondents">
        <div className="dlos-workflow-roster-head" role="row"><span role="columnheader">Respondent name</span><span role="columnheader">Status</span><span role="columnheader">Action</span></div>
        {respondents.map(person => {
          const saved = records.some(record => record.stepKey === 'implementation' && record.respondentKey === person.id);
          return <div className="dlos-workflow-roster-row" role="row" key={person.id}>
            <span role="cell">{person.rank} {person.nameSnapshot}</span>
            <span role="cell">{person.status || 'No status recorded'}{saved && <small>Details saved</small>}</span>
            <span role="cell"><button type="button" onClick={() => { setField('respondentKey', person.id || ''); setImplementationEditing(true); setAttachmentsOpen(false); }}>Upload implementation order</button></span>
          </div>;
        })}
      </div> : <p className="dlos-workflow-empty">No respondents are attached to this case yet.</p>}
    </div>}
    {showingForm && <form ref={formRef} onSubmit={submit} className={'dlos-workflow-form' + (initialStep ? ' dlos-workflow-sho-form' : '')}>
      {step.key === 'implementation' && !initialStep && <button type="button" className="dlos-workflow-text-button" onClick={() => { cacheCurrentDraft(); setImplementationEditing(false); setError(''); }}>← All respondents</button>}
      {selectedRecord && <p className="dlos-workflow-last-saved">Last saved by {selectedRecord.actorName} on {new Date(selectedRecord.updatedAt).toLocaleString('en-PH')}</p>}
      {hasUnsavedChanges && <p className="dlos-workflow-unsaved">Unsaved changes</p>}
      {error && <p role="alert" className="dlos-workflow-error">{error}</p>}
      {initialStep && <>
        <div className="dlos-workflow-sho-search">
          <label>New Summary Hearing Officer<input data-autofocus className={shoInputClass} type="search" value={shoSearch} onChange={event => { setShoSearch(event.target.value); setShoSearchActive(false); }} placeholder="Search by rank or name" /></label>
          <button type="button" className="dlos-workflow-sho-search-button" onClick={() => setShoSearchActive(true)}><Search size={15} /> Search New SHO</button>
          {shoSearchActive && shoSearch.trim() && <div className="dlos-workflow-sho-results" aria-label="Matching personnel">{matchingPersonnel.length ? matchingPersonnel.map(person => <button key={person.id} type="button" onClick={() => { setFields(current => ({ ...current, shoName: ((person.rank || '') + ' ' + person.fullName).trim(), shoPersonnelId: person.id })); setShoSearchActive(false); }}><Search size={13} /> {person.rank} {person.fullName}</button>) : <p>No personnel found. Enter the SHO name below.</p>}</div>}
          <label className="dlos-workflow-sho-selected">Selected SHO<input className={shoInputClass} required maxLength={160} value={fields.shoName || ''} onChange={event => setFields(current => ({ ...current, shoName: event.target.value, shoPersonnelId: '' }))} /></label>
        </div>
        <div className="dlos-workflow-sho-fields">
          <label>Date of Memorandum<input className={shoInputClass} type="date" value={fields.memorandumDate || ''} onChange={event => setField('memorandumDate', event.target.value)} /></label>
          <label>Memorandum File<input key={noDocument ? 'none' : savedMemorandum?.id || 'new'} className={shoInputClass} type="file" accept={fileAccept} disabled={noDocument} onChange={event => { const chosen = event.target.files?.[0]; if (chosen) { setNoDocument(false); setFiles(current => ({ ...current, memorandum: chosen })); } }} /></label>
        </div>
        <label className="dlos-workflow-sho-no-document"><input type="checkbox" checked={noDocument} onChange={event => { setNoDocument(event.target.checked); if (event.target.checked) setFiles({}); }} /> No document available</label>
        <div className="dlos-workflow-sho-preview"><strong>Memorandum Preview</strong><div className="dlos-workflow-sho-preview-frame">
          {(memorandumPreview || savedMemorandumPreview) ? (files.memorandum?.type || savedMemorandum?.mimeType || '').startsWith('image/') ? <img src={memorandumPreview || savedMemorandumPreview} alt="Memorandum preview" className="dlos-workflow-preview" /> : <iframe src={memorandumPreview || savedMemorandumPreview} title="Memorandum preview" className="dlos-workflow-preview" />
            : <div className="dlos-workflow-sho-preview-empty"><FileText size={30} /><span>{stepDocuments.length ? `On record: ${stepDocuments[0].fileName}` : 'Select a memorandum file to preview it here.'}</span></div>}
        </div></div>
        <div className="dlos-workflow-sho-footer"><Button type="button" disabled={busy} onClick={closeDialog}>Cancel</Button><button type="submit" className="dlos-workflow-submit" disabled={busy}>{busy ? 'Saving…' : 'Save Amendment'}</button></div>
      </>}
      {!initialStep && <label className="dlos-workflow-no-document"><input type="checkbox" checked={noDocument} onChange={event => { setNoDocument(event.target.checked); if (event.target.checked) setFiles({}); }} /> No available documents to upload? Check this box.</label>}
      {!initialStep && step.key === 'decision' && <div className="dlos-workflow-decision-prompt">
        <p>Please set Administrative Liability and Penalty before submitting the Decision.</p>
        <button type="button" onClick={() => { setDecisionFieldsOpen(open => !open); setError(''); }}>{decisionFieldsOpen ? 'Back to Decision' : fields.liability?.trim() && fields.penalty?.trim() ? 'Change Administrative Liability and Penalty' : 'Set Administrative Liability and Penalty'}</button>
        {!decisionFieldsOpen && fields.liability?.trim() && fields.penalty?.trim() && <small>Administrative liability and penalty are set.</small>}
      </div>}
      {!initialStep && step.key === 'decision' && decisionFieldsOpen && <div className="dlos-workflow-decision-fields">
        <label>Administrative Liability<textarea className={inputClass} rows={3} maxLength={2000} value={fields.liability || ''} onChange={event => setField('liability', event.target.value)} /></label>
        <label>Penalty<textarea className={inputClass} rows={3} maxLength={2000} value={fields.penalty || ''} onChange={event => setField('penalty', event.target.value)} /></label>
        <button type="button" className="dlos-workflow-submit" onClick={() => { if (!fields.liability?.trim() || !fields.penalty?.trim()) { setError('Enter both administrative liability and penalty.'); return; } setError(''); setDecisionFieldsOpen(false); }}>Done</button>
      </div>}
      {!initialStep && !(step.key === 'decision' && decisionFieldsOpen) && <div className="dlos-workflow-fields">{step.fields.map(field => field.type === 'choice'
        ? <WorkflowChoice key={field.key} label={field.label} value={fields[field.key] || ''} options={choiceOptions[field.key]} onChange={value => setField(field.key, value)} />
        : <label key={field.key}>{field.label}
        {field.type === 'respondent' ? <select className={inputClass} required value={fields[field.key] || ''} onChange={event => setField(field.key, event.target.value)}><option value="">Select respondent</option>{respondents.map(person => <option key={person.id} value={person.id}>{person.rank} {person.nameSnapshot} · {person.status || 'No status'}</option>)}</select>
        : field.type === 'category' ? <select className={inputClass} value={fields[field.key] || ''} onChange={event => setField(field.key, event.target.value)}><option value="">Select category</option><option value="suspension">Suspension</option><option value="demotion">Demotion</option><option value="dismissal">Dismissal</option><option value="exonerated">Exonerated</option></select>
        : field.type === 'textarea' ? <textarea className={inputClass} rows={3} maxLength={2000} value={fields[field.key] || ''} onChange={event => setField(field.key, event.target.value)} />
        : <input className={inputClass} type={field.type === 'date' ? 'date' : 'text'} maxLength={2000} value={fields[field.key] || ''} onChange={event => setField(field.key, event.target.value)} />}
      </label>)}</div>}
      {!initialStep && !(step.key === 'decision' && decisionFieldsOpen) && <div className="dlos-workflow-files">
        {step.files.map(slot => <label key={slot.key}>{slot.label}
          <input key={step.key + '-' + slot.key + '-' + (noDocument ? 'none' : 'file')} type="file" accept={fileAccept} disabled={noDocument} onChange={event => { const chosen = event.target.files?.[0]; if (chosen) setNoDocument(false); setFiles(current => { const next = { ...current }; if (chosen) next[slot.key] = chosen; else delete next[slot.key]; return next; }); }} />
          {files[slot.key] && <small>Selected: {files[slot.key].name}</small>}
        </label>)}
      </div>}
      {!initialStep && !(step.key === 'decision' && decisionFieldsOpen) && <button type="submit" className="dlos-workflow-submit" disabled={busy}>{busy ? 'Saving…' : 'Submit'}</button>}
      {!initialStep && <button type="button" className="dlos-workflow-attachments-button" aria-expanded={attachmentsOpen} onClick={() => setAttachmentsOpen(open => !open)}>{attachmentsOpen ? 'Hide attachments' : 'View attachments'}</button>}
      {attachmentsOpen && <div className="dlos-workflow-attachments">
        {stepDocuments.length ? stepDocuments.map(file => <button key={file.id} type="button" onClick={() => void downloadDlosDocument(item!, file).catch(cause => setError(cause instanceof Error ? cause.message : 'Download failed.'))}><Download size={14} /><span>{file.fileRole || file.kind} · {file.fileName}</span></button>) : <p>No attachments on record for this update.</p>}
      </div>}
    </form>}
    {!initialStep && <div className="dlos-workflow-detail-footer"><button type="button" className="dlos-workflow-close" disabled={busy} onClick={closeDetail}>Close</button></div>}
      </div>
    </div>}
  </Modal>;
};
