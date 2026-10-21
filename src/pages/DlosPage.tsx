import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FolderOpen, Plus, ShieldAlert } from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Button, EmptyState, PageHeader, TableLoadingState } from '../components/common/SystemUI';
import { Modal } from '../components/common/Modal';
import { DlosCaseDialog, type DlosDialogMode } from '../components/dlos/DlosCaseDialog';
import { DlosWorkflowDialog } from '../components/dlos/DlosWorkflowDialog';
import { DlosCaseFilters, DLOS_FILTER_KEYS } from '../components/dlos/DlosCaseFilters';
import { DlosPeriodPicker } from '../components/dlos/DlosPeriodPicker';
import { fetchDlosCase, fetchDlosCases, fetchDlosDocuments, fetchDlosHistory, fetchDlosPeriods, fetchDlosUpdates, fetchDlosWorkflow, runDlosAction, uploadDlosDocument } from '../services/dlosApi';
import type { DlosCase, DlosCaseDocument, DlosCaseEvent, DlosCasePage, DlosCaseUpdate, DlosClassification, DlosPeriod, DlosWorkflowRecord } from '../types/dlos';
import './ModulePages.css';
import './DlosPage.css';

const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2020, index, 1)));
const inputClass = 'w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900';
const displayDate = (value: string | null) => value || '—';
const displayAging = (value: number | null, missing: string) => value == null ? missing : `${value} calendar days`;

type ActionMode = 'record_sho_received' | 'upload' | 'refer_case' | null;
export const DlosPage = () => {
  const { authUser } = useAuthRole();
  const { year: yearParam, month: monthParam, classification: legacyClassificationParam } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [periods, setPeriods] = useState<DlosPeriod[]>([]);
  const [optionsError, setOptionsError] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [pageData, setPageData] = useState<DlosCasePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<DlosDialogMode>(null);
  const [item, setItem] = useState<DlosCase | null>(null);
  const [history, setHistory] = useState<DlosCaseEvent[]>([]);
  const [updates, setUpdates] = useState<DlosCaseUpdate[]>([]);
  const [documents, setDocuments] = useState<DlosCaseDocument[]>([]);
  const [workflow, setWorkflow] = useState<DlosWorkflowRecord[]>([]);
  const [workflowMode, setWorkflowMode] = useState<'updates' | 'sho' | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [actionValue, setActionValue] = useState('');
  const [kind, setKind] = useState<'transmittal' | 'pce'>('transmittal');
  const [file, setFile] = useState<File | null>(null);
  const [documentDate, setDocumentDate] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const canWrite = authUser?.dlosRole === 'encoder' || authUser?.dlosRole === 'reviewer';
  const year = Number(yearParam);
  const month = Number(monthParam);
  const classificationParam = searchParams.get('classification') || legacyClassificationParam || '';
  const classification = classificationParam as DlosClassification;
  const validYear = Number.isInteger(year) && year >= 1900 && year <= 2100;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const validClassification = classificationParam === 'grave' || classificationParam === 'less_grave';
  const query = searchParams.toString();
  const currentYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(new Date()));
  const appliedCount = [...searchParams.entries()].filter(([key, value]) => value && DLOS_FILTER_KEYS.has(key)).length + (validClassification ? 1 : 0);

  useEffect(() => {
    if (!authUser?.dlosRole) return;
    setLoadingOptions(true);
    fetchDlosPeriods().then(setPeriods).catch(cause => setOptionsError(cause instanceof Error ? cause.message : 'Unable to load periods.')).finally(() => setLoadingOptions(false));
  }, [authUser?.dlosRole]);
  useEffect(() => { setFilters(Object.fromEntries(searchParams.entries())); }, [query]);
  const loadCases = useCallback(async () => {
    if (!validYear || !validMonth || !validClassification || !authUser?.dlosRole) return;
    setLoading(true); setError(''); setPageData(null);
    try {
      const params = new URLSearchParams(query);
      params.set('year', String(year)); params.set('month', String(month)); params.set('classification', classification);
      setPageData(await fetchDlosCases(params));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load IDMIS Terminal cases.'); }
    finally { setLoading(false); }
  }, [year, month, classification, validYear, validMonth, validClassification, authUser?.dlosRole, query]);
  useEffect(() => { void loadCases(); }, [loadCases]);
  const loadRelated = async (selected: DlosCase) => {
    const [full, events, notes, files, steps] = await Promise.all([
      fetchDlosCase(selected.id), fetchDlosHistory(selected.id), fetchDlosUpdates(selected.id),
      fetchDlosDocuments(selected.id), fetchDlosWorkflow(selected.id)
    ]);
    setItem(full); setHistory(events); setUpdates(notes); setDocuments(files); setWorkflow(steps);
  };
  const openCase = async (selected: DlosCase, nextMode: DlosDialogMode) => {
    setError('');
    try { await loadRelated(selected); setMode(nextMode); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open case.'); }
  };
  const openWorkflow = async (selected: DlosCase, nextMode: 'updates' | 'sho') => {
    setError('');
    try { await loadRelated(selected); setWorkflowMode(nextMode); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open case workflow.'); }
  };
  const saved = (savedCase: DlosCase) => {
    setMode(null); setItem(null); void loadCases();
    const savedYear = Number(savedCase.caseDate.slice(0, 4));
    const savedMonth = Number(savedCase.caseDate.slice(5, 7));
    if (savedYear !== year || savedMonth !== month) navigate(`/dlos/${savedYear}/${savedMonth}?classification=${savedCase.classification}`);
  };
  const selectClassification = (selected: DlosClassification) => {
    const next = new URLSearchParams(searchParams);
    next.set('classification', selected);
    next.delete('page');
    navigate({ pathname: `/dlos/${year}/${month}`, search: `?${next.toString()}` });
  };
  const updated = (changed: DlosCase) => { setItem(changed); void loadRelated(changed); void loadCases(); };
  const openAction = (selected: DlosCase, action: ActionMode) => {
    setItem(selected); setActionMode(action); setActionValue(action === 'record_sho_received' ? selected.receivedByShoDate || '' : '');
    setActionError(''); setFile(null); setDocumentDate('');
  };
  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!item || !actionMode || actionBusy) return;
    setActionBusy(true); setActionError('');
    try {
      if (actionMode === 'upload') {
        if (!file || file.size > 10 * 1024 * 1024) throw new Error('Choose a PDF or image up to 10 MB.');
        await uploadDlosDocument(item, kind, documentDate, file);
      } else {
        const changed = await runDlosAction(item, actionMode, actionMode === 'refer_case' ? { reason: actionValue } : { receivedByShoDate: actionValue });
        setItem(changed);
      }
      setActionMode(null); void loadCases();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Action failed.'); }
    finally { setActionBusy(false); }
  };

  if (!authUser?.dlosRole) return <div role="alert" className="mx-auto max-w-2xl rounded border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><ShieldAlert className="mb-2 h-5 w-5" />IDMIS Terminal access required. <Link to="/" className="underline">Return to dashboard</Link>.</div>;
  if (yearParam && !validYear || monthParam && !validMonth || classificationParam && !validClassification) return <div role="alert" className="p-5 text-sm">Invalid IDMIS Terminal path. <Link to="/dlos" className="text-blue-700 underline">Choose a year</Link>.</div>;

  return <div className="module-page dlos-page mx-auto w-full max-w-[1800px] space-y-5">
    <PageHeader title={validYear && validMonth ? 'Case Monitoring' : yearParam ? 'Choose month' : 'Choose year'}
      description={validYear && validMonth ? `Cases registered in ${months[month - 1]} ${year}. Use the filters below to narrow the list.` : 'Browse cases by registration date.'}
      actions={validClassification && canWrite ? <Button icon={Plus} variant="primary" onClick={() => { setItem(null); setMode('create'); }}>Encode case</Button> : undefined} />
    <nav aria-label="IDMIS Terminal path" className="dlos-breadcrumb">
      <Link to="/dlos" className="underline">IDMIS</Link>{yearParam && <><span>›</span><Link to={`/dlos/${year}`} className="underline">{year}</Link></>}
      {monthParam && <><span>›</span><Link to={`/dlos/${year}/${month}`} className="underline">{months[month - 1]}</Link></>}
    </nav>
    {optionsError && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{optionsError}</p>}
    {(!yearParam || !monthParam) && <DlosPeriodPicker year={yearParam ? year : undefined}
      periods={periods} currentYear={currentYear} countsReady={!loadingOptions && !optionsError} />}
    {validYear && validMonth && <DlosCaseFilters filters={filters} classification={validClassification ? classification : null} appliedCount={appliedCount}
      onChange={setFilters} onClassificationChange={selectClassification}
      onSearch={event => {
        event.preventDefault();
        const next = new URLSearchParams(Object.entries(filters).filter(([key, value]) => value && DLOS_FILTER_KEYS.has(key)));
        next.set('classification', classification);
        for (const key of ['sort', 'direction', 'pageSize']) {
          const value = searchParams.get(key);
          if (value) next.set(key, value);
        }
        next.delete('page');
        setSearchParams(next);
      }}
      onClear={() => { setFilters({}); navigate(`/dlos/${year}/${month}`); }} />}
    {validClassification && <>
      <section className="dlos-list-surface">
        <div className="dlos-list-toolbar">
          <div className="dlos-list-heading"><strong>{pageData?.total ?? 0} cases</strong><span>Scroll for all case details</span></div>
          <div className="dlos-list-controls">
            <label htmlFor="dlos-sort">Sort</label>
            <select id="dlos-sort" className="dlos-list-sort-select" value={searchParams.get('sort') || 'caseDate'} onChange={event => setSearchParams(current => { const next = new URLSearchParams(current); next.set('sort', event.target.value); next.delete('page'); return next; })}>
              <option value="caseDate">Registration date</option><option value="docketNumber">Docket number</option><option value="caseStatus">Case status</option><option value="updatedAt">Last updated</option>
            </select>
            <select aria-label="Sort direction" className="dlos-list-direction-select" value={searchParams.get('direction') || 'desc'} onChange={event => setSearchParams(current => { const next = new URLSearchParams(current); next.set('direction', event.target.value); return next; })}>
              <option value="desc">Descending</option><option value="asc">Ascending</option>
            </select>
            <select aria-label="Page size" className="dlos-list-page-size-select" value={searchParams.get('pageSize') || '10'} onChange={event => setSearchParams(current => { const next = new URLSearchParams(current); next.set('pageSize', event.target.value); next.delete('page'); return next; })}>
              <option>10</option><option>25</option><option>50</option>
            </select>
          </div>
        </div>
        {error && <p role="alert" className="p-4 text-xs text-rose-700">{error}</p>}
        {loading ? <TableLoadingState /> : error ? null : !pageData?.items.length ? <EmptyState icon={FolderOpen} title="No cases found" description="Adjust filters or encode a case in this month." /> : <div className="dlos-table-scroll"><table className="dlos-table min-w-[1900px] w-full text-left text-xs"><thead><tr>{['Docket number','DIDM/NSU docket','DIDM reference','Name/s','Unit/Office','Case source','Case status','Complaint','Forwarded to DLOD','Name of SHO','Received by SHO','Resolved by SHO','SHO aging','Review aging','Encoder','Actions'].map(label => <th key={label} scope="col" className="whitespace-nowrap border-b border-slate-200 px-3 py-3">{label}</th>)}</tr></thead><tbody>{pageData.items.map(row => <tr key={row.id} className="border-b border-slate-100 align-top"><td className="font-semibold">{row.docketNumber}<div className="font-normal text-slate-500">{row.caseDate}</div></td><td className="px-3 py-3">{row.didmNsuDocketNumber || '—'}</td><td className="px-3 py-3">{row.didmReferenceNumber || '—'}</td><td className="px-3 py-3">{row.people.map(person => person.nameSnapshot).join(', ') || '—'}</td><td className="px-3 py-3">{row.unitOfficeCaseFrom || '—'}</td><td className="px-3 py-3">{row.caseSource || '—'}</td><td className="px-3 py-3">{row.caseStatus}</td><td className="px-3 py-3">{displayDate(row.complaintDate)}</td><td className="px-3 py-3">{displayDate(row.forwardedToDlodDate)}</td><td className="px-3 py-3">{row.shoName || '—'}</td><td className="px-3 py-3">{displayDate(row.receivedByShoDate)}</td><td className="px-3 py-3">{displayDate(row.resolvedByShoDate)}</td><td className="px-3 py-3" title={`As of ${row.aging.asOfDate}`}>{displayAging(row.aging.forShoDays, 'Case not yet receive by SHO')}</td><td className="px-3 py-3" title={`As of ${row.aging.asOfDate}`}>{displayAging(row.aging.forReviewDays, 'Decision Not Yet Issued')}</td><td className="px-3 py-3">{row.encoderName}</td><td className="px-3 py-3"><details className="relative"><summary className="cursor-pointer font-semibold text-blue-700">Actions</summary><div className="min-w-48 rounded border border-slate-200 bg-white p-1 shadow-lg">{(['Case Details','Refer Case','Case Updates','Change Assigned SHO','Date Receive by SHO','Respondent','Upload Transmittal/PCE'] as const).map((label, index) => <button key={label} type="button" disabled={!canWrite && index !== 0} className="block w-full rounded px-3 py-2 text-left hover:bg-blue-50 disabled:text-slate-400" onClick={() => { if (index === 0) void openCase(row, 'view'); if (index === 1) openAction(row, 'refer_case'); if (index === 2) void openWorkflow(row, 'updates'); if (index === 3) void openWorkflow(row, 'sho'); if (index === 4) openAction(row, 'record_sho_received'); if (index === 5) void openCase(row, 'respondents'); if (index === 6) openAction(row, 'upload'); }}>{label}</button>)}</div></details></td></tr>)}</tbody></table></div>}
        <div className="dlos-list-pagination"><Button disabled={(pageData?.page || 1) <= 1 || loading} onClick={() => setSearchParams(current => { const next = new URLSearchParams(current); next.set('page', String(Math.max(1, Number(current.get('page') || 1) - 1))); return next; })}>Previous</Button><span>Page {pageData?.page || 1} of {Math.max(1, Math.ceil((pageData?.total || 0) / (pageData?.pageSize || 10)))}</span><Button disabled={!pageData || pageData.page * pageData.pageSize >= pageData.total || loading} onClick={() => setSearchParams(current => { const next = new URLSearchParams(current); next.set('page', String(Number(current.get('page') || 1) + 1)); return next; })}>Next</Button></div>
      </section>
      <DlosCaseDialog mode={mode} item={item} history={history} updates={updates} documents={documents} classification={classification} year={year} month={month} onClose={() => setMode(null)} onSaved={saved} onUpdated={updated} onEdit={() => setMode('edit')} />
      <DlosWorkflowDialog item={workflowMode ? item : null} records={workflow} documents={documents}
        initialStep={workflowMode === 'sho' ? 'sho_amendment' : undefined} onClose={() => setWorkflowMode(null)}
        onSaved={updated} onEditCase={() => { setWorkflowMode(null); setMode('edit'); }} />
      <Modal isOpen={actionMode !== null} onClose={() => !actionBusy && setActionMode(null)} title={actionMode === 'refer_case' ? 'Refer Case' : actionMode === 'record_sho_received' ? 'Date Receive by SHO' : 'Upload Transmittal/PCE'} subtitle={item?.docketNumber} maxWidth="md"><form onSubmit={submitAction} className="space-y-4 p-5">{actionError && <p role="alert" className="text-xs text-rose-700">{actionError}</p>}{actionMode === 'refer_case' && <label className="block text-xs font-semibold">Reason referring the case<textarea className={inputClass} required maxLength={2000} rows={4} value={actionValue} onChange={event => setActionValue(event.target.value)} /></label>}{actionMode === 'record_sho_received' && <label className="block text-xs font-semibold">Date received by SHO<input className={inputClass} required type="date" value={actionValue} onChange={event => setActionValue(event.target.value)} /></label>}{actionMode === 'upload' && <><label className="block text-xs font-semibold">Document type<select className={inputClass} value={kind} onChange={event => setKind(event.target.value as 'transmittal' | 'pce')}><option value="transmittal">Transmittal</option><option value="pce">PCE</option></select></label><label className="block text-xs font-semibold">Document date<input className={inputClass} type="date" required value={documentDate} onChange={event => setDocumentDate(event.target.value)} /></label><label className="block text-xs font-semibold">PDF or image, up to 10 MB<input className={inputClass} type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] || null)} /></label></>}<div className="flex justify-end gap-2"><Button type="button" onClick={() => setActionMode(null)}>Cancel</Button><Button type="submit" variant="primary" disabled={actionBusy}>{actionBusy ? 'Saving…' : 'Save'}</Button></div></form></Modal>
    </>}
    {loadingOptions && !yearParam && <p className="text-xs text-slate-500">Loading available years…</p>}
  </div>;
};
