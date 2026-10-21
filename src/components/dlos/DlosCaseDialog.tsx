import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/SystemUI';
import { useAuthRole } from '../../context/AuthRoleContext';
import { downloadDlosDocument, runDlosAction, saveDlosCase } from '../../services/dlosApi';
import type { DlosCase, DlosCaseDocument, DlosCaseDraft, DlosCaseEvent, DlosCaseUpdate, DlosClassification, DlosPerson } from '../../types/dlos';

export type DlosDialogMode = 'create' | 'view' | 'edit' | 'respondents' | null;
const fieldClass = 'mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 disabled:bg-slate-50';
const blankPerson = (): DlosPerson => ({ personnelId: null, role: 'respondent', rank: '', firstName: '', middleName: '', lastName: '', nameSnapshot: '', unit: '', status: '' });
const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
export const blankDlosCase = (classification: DlosClassification, year: number, month: number): DlosCaseDraft => ({
  classification, caseDate: today().startsWith(`${year}-${String(month).padStart(2, '0')}`) ? today() : `${year}-${String(month).padStart(2, '0')}-01`,
  docketNumber: '', didmNsuDocketNumber: '', didmReferenceNumber: '', summaryHearingDocketNumber: '',
  presidentialConfirmation: 'not_applicable', unitOfficeCaseFrom: '', caseSource: '', complaintDate: null,
  forwardedToDlodDate: null, shoName: '', receivedByShoDate: null, resolvedByShoDate: null,
  decisionIssuedDate: null, signedByDaDate: null, dlodDocketNumber: '', complaintSource: '',
  initialComplaint: '', occurrenceAt: null, occurrencePlace: '', complaintDetails: '',
  sourceSystem: '', sourceRecordId: '', people: []
});
const draftFrom = (item: DlosCase): DlosCaseDraft => ({
  classification: item.classification, caseDate: item.caseDate, docketNumber: item.docketNumber,
  didmNsuDocketNumber: item.didmNsuDocketNumber, didmReferenceNumber: item.didmReferenceNumber,
  summaryHearingDocketNumber: item.summaryHearingDocketNumber, presidentialConfirmation: item.presidentialConfirmation,
  unitOfficeCaseFrom: item.unitOfficeCaseFrom, caseSource: item.caseSource, complaintDate: item.complaintDate,
  forwardedToDlodDate: item.forwardedToDlodDate, shoName: item.shoName, receivedByShoDate: item.receivedByShoDate,
  resolvedByShoDate: item.resolvedByShoDate, decisionIssuedDate: item.decisionIssuedDate,
  signedByDaDate: item.signedByDaDate, dlodDocketNumber: item.dlodDocketNumber,
  complaintSource: item.complaintSource, initialComplaint: item.initialComplaint,
  occurrenceAt: item.occurrenceAt, occurrencePlace: item.occurrencePlace, complaintDetails: item.complaintDetails,
  sourceSystem: item.sourceSystem, sourceRecordId: item.sourceRecordId, people: item.people.map(person => ({ ...person }))
});

interface Props {
  mode: DlosDialogMode;
  item: DlosCase | null;
  history: DlosCaseEvent[];
  updates: DlosCaseUpdate[];
  documents: DlosCaseDocument[];
  classification: DlosClassification;
  year: number;
  month: number;
  onClose: () => void;
  onSaved: (item: DlosCase) => void;
  onUpdated: (item: DlosCase) => void;
  onEdit: () => void;
}

export const DlosCaseDialog = ({ mode, item, history, updates, documents, classification, year, month, onClose, onSaved, onUpdated, onEdit }: Props) => {
  const { personnelList, authUser } = useAuthRole();
  const [draft, setDraft] = useState<DlosCaseDraft>(() => blankDlosCase(classification, year, month));
  const [note, setNote] = useState('');
  const [updateDate, setUpdateDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'complaint' | 'complainant' | 'respondent' | 'witness' | 'attachments'>('complaint');
  const [personnelSearch, setPersonnelSearch] = useState('');
  const readonly = mode === 'view';
  const canWrite = authUser?.dlosRole === 'encoder' || authUser?.dlosRole === 'reviewer';
  useEffect(() => {
    setDraft(item ? draftFrom(item) : blankDlosCase(classification, year, month));
    setNote(''); setUpdateDate(today()); setError(''); setTab('complaint'); setPersonnelSearch('');
  }, [item?.id, mode, classification, year, month]);
  const update = (field: keyof DlosCaseDraft, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const updatePerson = (index: number, patch: Partial<DlosPerson>) => setDraft(current => ({
    ...current, people: current.people.map((person, position) => position === index ? { ...person, ...patch } : person)
  }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || readonly) return;
    setSaving(true); setError('');
    try { onSaved(await saveDlosCase(draft, mode === 'create' ? undefined : item || undefined)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save case.'); }
    finally { setSaving(false); }
  };
  const addNote = async () => {
    if (!item || saving) return;
    setSaving(true); setError('');
    try { onUpdated(await runDlosAction(item, 'add_update', { updateDate, note })); setNote(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to add update.'); }
    finally { setSaving(false); }
  };
  return <Modal isOpen={mode !== null} onClose={() => !saving && onClose()}
    title={mode === 'create' ? 'Encode DLOS case' : mode === 'edit' ? 'Edit Case Details' : mode === 'respondents' ? 'Manage Respondents' : `Case Details: ${item?.docketNumber || ''}`}
    subtitle="Case registration date determines year and month." maxWidth="4xl">
    <form onSubmit={submit} className="max-h-[75vh] space-y-5 overflow-y-auto p-4 sm:p-5">
      {error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {mode === 'view' && <div role="tablist" aria-label="Case details" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">{([
        ['complaint', 'Complaint Details'], ['complainant', 'Complainant'], ['respondent', 'Respondent'],
        ['witness', 'Witness'], ['attachments', 'Attachments']
      ] as const).map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === key ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}</div>}
      {mode !== 'respondents' && (mode !== 'view' || tab === 'complaint') && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold">Classification<input className={fieldClass} disabled value={classification === 'grave' ? 'Grave' : 'Less Grave'} /></label>
        <label className="text-xs font-semibold">Case registration date *<input className={fieldClass} type="date" required disabled={readonly} value={draft.caseDate} onChange={event => update('caseDate', event.target.value)} /></label>
        <label className="text-xs font-semibold">Docket number *<input className={fieldClass} required maxLength={160} disabled={readonly} value={draft.docketNumber} onChange={event => update('docketNumber', event.target.value)} /></label>
        {([
          ['didmNsuDocketNumber', 'DIDM/NSU docket number'], ['didmReferenceNumber', 'DIDM reference number'],
          ['summaryHearingDocketNumber', 'Summary hearing docket number'], ['unitOfficeCaseFrom', 'Unit/Office case from'],
          ['caseSource', 'Case source'], ['shoName', 'Name of SHO'], ['sourceSystem', 'Source system'], ['sourceRecordId', 'Source record ID'],
          ['dlodDocketNumber', 'DLOD docket number'], ['complaintSource', 'Sources of complaint'],
          ['initialComplaint', 'Initial complaint'], ['occurrencePlace', 'Place of occurrence']
        ] as const).map(([field, label]) => <label key={field} className="text-xs font-semibold">{label}
          <input className={fieldClass} maxLength={field === 'initialComplaint' ? 500 : 160} disabled={readonly || (mode === 'edit' && field === 'shoName')} value={draft[field]} onChange={event => update(field, event.target.value)} />
        </label>)}
        <label className="text-xs font-semibold">Presidential confirmation
          <select className={fieldClass} disabled={readonly} value={draft.presidentialConfirmation} onChange={event => update('presidentialConfirmation', event.target.value)}>
            <option value="not_applicable">Not applicable</option><option value="pending">Pending</option><option value="confirmed">Yes</option><option value="not_confirmed">No</option>
          </select>
        </label>
        {([
          ['complaintDate', 'Complaint date'], ['forwardedToDlodDate', 'Forwarded to DLOD date'],
          ['receivedByShoDate', 'Received by SHO date'], ['resolvedByShoDate', 'Resolved by SHO date'],
          ['decisionIssuedDate', 'Decision issued date'], ['signedByDaDate', 'Date signed by DA']
        ] as const).map(([field, label]) => <label key={field} className="text-xs font-semibold">{label}
          <input className={fieldClass} type="date" disabled={readonly} value={draft[field] || ''} onChange={event => update(field, event.target.value)} />
        </label>)}
        <label className="text-xs font-semibold">Date and time of occurrence<input className={fieldClass} type="datetime-local" disabled={readonly} value={draft.occurrenceAt?.slice(0, 16) || ''} onChange={event => update('occurrenceAt', event.target.value)} /></label>
        <label className="text-xs font-semibold sm:col-span-2 lg:col-span-3">Complaint details<textarea className={fieldClass} rows={4} maxLength={5000} disabled={readonly} value={draft.complaintDetails} onChange={event => update('complaintDetails', event.target.value)} /></label>
        {mode === 'view' && canWrite && <div className="sm:col-span-2 lg:col-span-3"><Button type="button" onClick={onEdit}>Edit Complaint Details</Button></div>}
      </div>}
      {(mode !== 'view' || ['complainant', 'respondent', 'witness'].includes(tab)) && <section className="space-y-3 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between"><div><h4 className="text-sm font-semibold">Name/s</h4><p className="text-xs text-slate-500">PAIS personnel links optional.</p></div>
          {!readonly && <Button type="button" icon={Plus} onClick={() => setDraft(current => ({ ...current, people: [...current.people, blankPerson()] }))}>Add name</Button>}
        </div>
        {!readonly && <label className="block text-xs font-semibold">Search PNP personnel<input className={fieldClass} type="search" value={personnelSearch} onChange={event => setPersonnelSearch(event.target.value)} placeholder="Rank or name" /></label>}
        {!draft.people.some(person => mode === 'view' ? person.role === tab : mode !== 'respondents' || person.role === 'respondent') && <p className="text-xs text-slate-500">No names entered.</p>}
        {draft.people.map((person, index) => ({ person, index })).filter(({ person }) => mode === 'view' ? person.role === tab : mode !== 'respondents' || person.role === 'respondent').map(({ person, index }) => <div key={person.id || index} className="rounded border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex justify-between"><strong className="text-xs">Person {index + 1}</strong>{!readonly && <button type="button" className="text-xs text-rose-700" onClick={() => setDraft(current => ({ ...current, people: current.people.filter((_, position) => position !== index) }))}><Trash2 className="inline h-3 w-3" /> Remove</button>}</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold">PAIS personnel link<select className={fieldClass} disabled={readonly} value={person.personnelId || ''} onChange={event => {
              const selected = personnelList.find(entry => entry.id === event.target.value);
              updatePerson(index, selected ? { personnelId: selected.id, rank: selected.rank || '', firstName: selected.firstName || '', middleName: selected.middleName || '', lastName: selected.lastName || '', nameSnapshot: selected.fullName || '', unit: selected.sub_unit || selected.division || selected.station || '' } : { personnelId: null });
            }}><option value="">Unlinked / external</option>{personnelList.filter(entry => entry.id === person.personnelId || `${entry.rank} ${entry.fullName}`.toLowerCase().includes(personnelSearch.toLowerCase())).slice(0, 60).map(entry => <option key={entry.id} value={entry.id}>{entry.rank} {entry.fullName}</option>)}</select></label>
            <label className="text-xs font-semibold">Role<select className={fieldClass} disabled={readonly || mode === 'respondents'} value={person.role} onChange={event => updatePerson(index, { role: event.target.value as DlosPerson['role'] })}><option value="respondent">Respondent</option><option value="complainant">Complainant</option><option value="witness">Witness</option><option value="involved">Involved</option></select></label>
            {(['rank', 'firstName', 'middleName', 'lastName', 'nameSnapshot'] as const).map(field => <label key={field} className="text-xs font-semibold">{field === 'nameSnapshot' ? 'Full name *' : field.replace(/([A-Z])/g, ' $1')}
              <input className={fieldClass} maxLength={field === 'nameSnapshot' ? 240 : 160} disabled={readonly} value={person[field]} onChange={event => updatePerson(index, { [field]: event.target.value })} />
            </label>)}
            <label className="text-xs font-semibold">Unit<input className={fieldClass} maxLength={160} disabled={readonly} value={person.unit || ''} onChange={event => updatePerson(index, { unit: event.target.value })} /></label>
            {person.role === 'respondent' && <label className="text-xs font-semibold">Status<input className={fieldClass} maxLength={120} disabled={readonly} value={person.status || ''} onChange={event => updatePerson(index, { status: event.target.value })} /></label>}
          </div>
        </div>)}
      </section>}
      {item && mode === 'edit' && <section className="space-y-2 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-semibold">Dated case updates</h4>
        {mode === 'edit' && <div className="grid gap-2 sm:grid-cols-[170px_1fr_auto] sm:items-end"><label className="text-xs font-semibold">Date<input className={fieldClass} type="date" value={updateDate} onChange={event => setUpdateDate(event.target.value)} /></label><label className="text-xs font-semibold">Note<input className={fieldClass} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></label><Button type="button" disabled={saving || !note.trim() || !updateDate} onClick={() => void addNote()}>Add note</Button></div>}
        {updates.length ? updates.map(entry => <p key={entry.id} className="rounded border border-slate-200 p-2 text-xs"><strong>{entry.updateDate}</strong> · {entry.note} · {entry.actorName}</p>) : <p className="text-xs text-slate-500">No dated updates.</p>}
      </section>}
      {item && mode === 'view' && tab === 'attachments' && <section className="space-y-2 border-t border-slate-200 pt-4"><h4 className="text-sm font-semibold">Case documents</h4>
        {documents.length ? documents.map(file => <button key={file.id} type="button" className="block text-left text-xs text-blue-700 underline" onClick={() => void downloadDlosDocument(item, file).catch(cause => setError(cause instanceof Error ? cause.message : 'Download failed.'))}>{file.stepKey || file.kind} · {file.fileName}{file.documentDate ? ` · ${file.documentDate}` : ''}</button>) : <p className="text-xs text-slate-500">No documents uploaded.</p>}
      </section>}
      {item && mode === 'view' && <section className="space-y-2 border-t border-slate-200 pt-4"><h4 className="text-sm font-semibold">Case activity</h4><p className="text-xs text-slate-500">Encoded by {item.encoderName} · Updated {new Date(item.updatedAt).toLocaleString('en-PH')}</p>
        {history.length ? history.map(entry => <p key={entry.id} className="rounded border border-slate-200 p-2 text-xs">{entry.eventType.replace(/_/g, ' ')} · {entry.actorName} · {new Date(entry.createdAt).toLocaleString('en-PH')}{entry.fromStatus !== entry.toStatus && entry.toStatus ? ` · ${entry.fromStatus || 'New'} → ${entry.toStatus}` : ''}{entry.reason ? ` · ${entry.reason}` : ''}</p>) : <p className="text-xs text-slate-500">No recorded activity.</p>}
      </section>}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><Button type="button" onClick={onClose} disabled={saving}>{readonly ? 'Close' : 'Cancel'}</Button>{!readonly && <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save case'}</Button>}</div>
    </form>
  </Modal>;
};
