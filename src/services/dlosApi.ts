import { API_BASE_URL, apiFetch } from './api';
import type { DlosAccount, DlosCase, DlosCaseDocument, DlosCaseDraft, DlosCaseEvent, DlosCasePage, DlosCaseUpdate, DlosPenaltyEntry, DlosPeriod, DlosRole, DlosWorkflowRecord } from '../types/dlos';
import { fetchCombinedDlosCases } from '../utils/dlosCombinedCases';

const read = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || `DLOS request failed (${response.status}).`);
  return body.data as T;
};

export const fetchDlosPeriods = async () => read<DlosPeriod[]>(await apiFetch(`${API_BASE_URL}/dlos/options`));

export const fetchDlosPenaltyDirectory = async (year: number) => read<DlosPenaltyEntry[]>(await apiFetch(`${API_BASE_URL}/dlos/penalties?year=${year}`));

const fetchDlosCasePage = async (params: URLSearchParams) =>
  read<DlosCasePage>(await apiFetch(`${API_BASE_URL}/dlos/cases?${params.toString()}`));

export const fetchDlosCases = async (params: URLSearchParams) =>
  !params.get('classification') || params.get('classification') === 'all'
    ? fetchCombinedDlosCases(params, fetchDlosCasePage)
    : fetchDlosCasePage(params);

export const fetchDlosCase = async (id: string) =>
  read<DlosCase>(await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(id)}`));

export const fetchDlosHistory = async (id: string) =>
  read<DlosCaseEvent[]>(await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(id)}/history`));

export const fetchDlosUpdates = async (id: string) =>
  read<DlosCaseUpdate[]>(await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(id)}/updates`));

export const fetchDlosDocuments = async (id: string) =>
  read<DlosCaseDocument[]>(await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(id)}/documents`));

export const fetchDlosWorkflow = async (id: string) =>
  read<DlosWorkflowRecord[]>(await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(id)}/workflow`));

export const saveDlosCase = async (draft: DlosCaseDraft, existing?: DlosCase) =>
  read<DlosCase>(await apiFetch(`${API_BASE_URL}/dlos/cases${existing ? `/${encodeURIComponent(existing.id)}` : ''}`, {
    method: existing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draft, version: existing?.version })
  }));

export const runDlosAction = async (item: DlosCase, action: 'record_sho_received' | 'add_update' | 'refer_case' | 'set_status', payload: Record<string, string>) =>
  read<DlosCase>(await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(item.id)}/actions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: item.version, ...payload })
  }));

export const uploadDlosDocument = async (item: DlosCase, kind: 'transmittal' | 'pce', documentDate: string, file: File) => {
  const body = new FormData();
  body.append('kind', kind);
  body.append('documentDate', documentDate);
  body.append('file', file);
  return read<DlosCaseDocument>(await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(item.id)}/documents`, {
    method: 'POST', body
  }));
};

export const saveDlosWorkflow = async (
  item: DlosCase, step: string, fields: Record<string, string>, files: Record<string, File>, noDocument: boolean
) => {
  const body = new FormData();
  body.append('version', String(item.version));
  body.append('fields', JSON.stringify(fields));
  body.append('noDocument', String(noDocument));
  Object.entries(files).forEach(([role, file]) => body.append(role, file));
  return read<DlosCase>(await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(item.id)}/workflow/${encodeURIComponent(step)}`, {
    method: 'POST', body
  }));
};

export const downloadDlosDocument = async (item: DlosCase, file: DlosCaseDocument) => {
  const response = await apiFetch(`${API_BASE_URL}/dlos/cases/${encodeURIComponent(item.id)}/documents/${encodeURIComponent(file.id)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Unable to download document.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a');
  link.href = url;
  link.download = file.fileName;
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const fetchDlosAccounts = async () =>
  read<DlosAccount[]>(await apiFetch(`${API_BASE_URL}/admin-users/dlos`));

export const createDlosAccount = async (input: { email: string; password: string; displayName: string; dlosRole: DlosRole }) =>
  read<DlosAccount>(await apiFetch(`${API_BASE_URL}/admin-users/dlos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
  }));

export const setDlosAccountRole = async (id: string, dlosRole: DlosRole | null) =>
  read<unknown>(await apiFetch(`${API_BASE_URL}/admin-users/dlos/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dlosRole })
  }));
