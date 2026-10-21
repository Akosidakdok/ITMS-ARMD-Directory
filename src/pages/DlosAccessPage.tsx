import { useEffect, useState, type FormEvent } from 'react';
import { RefreshCw, ShieldAlert, UserPlus } from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Button, EmptyState, PageHeader } from '../components/common/SystemUI';
import { Modal } from '../components/common/Modal';
import { createDlosAccount, fetchDlosAccounts, setDlosAccountRole } from '../services/dlosApi';
import type { DlosAccount, DlosRole } from '../types/dlos';
import './ModulePages.css';
import './DlosPage.css';

const inputClass = 'mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm';
export const DlosAccessPage = () => {
  const { role } = useAuthRole();
  const [accounts, setAccounts] = useState<DlosAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', dlosRole: 'encoder' as DlosRole });
  const load = async () => {
    setLoading(true); setError('');
    try { setAccounts(await fetchDlosAccounts()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load accounts.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (role === 'superadmin') void load(); }, [role]);
  const create = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    setSaving('create'); setError(''); setMessage('');
    try {
      const account = await createDlosAccount(form);
      setAccounts(current => [account, ...current]); setCreateOpen(false);
      setForm({ displayName: '', email: '', password: '', dlosRole: 'encoder' });
      setMessage('IDMIS Terminal account created.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create account.'); }
    finally { setSaving(''); }
  };
  const changeRole = async (account: DlosAccount, next: DlosRole | null) => {
    setSaving(account.id); setError(''); setMessage('');
    try {
      await setDlosAccountRole(account.id, next);
      setAccounts(current => current.map(entry => entry.id === account.id ? { ...entry, dlosRole: next } : entry));
      setMessage(next ? `IDMIS terminal ${next} access assigned to ${account.email}.` : `IDMIS terminal access revoked for ${account.email}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update IDMIS terminal access.'); }
    finally { setSaving(''); }
  };
  if (role !== 'superadmin') return <div role="alert" className="mx-auto max-w-2xl rounded border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><ShieldAlert className="mb-2 h-5 w-5" />Superadmin permission required.</div>;
  const visible = accounts.filter(account => `${account.displayName} ${account.email}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="module-page dlos-access-page mx-auto w-full max-w-6xl space-y-5">
    <PageHeader title="IDMIS Terminal Access" description="Create special accounts and grant or revoke IDMIS Terminal access. PAIS roles do not grant access automatically."
      actions={<><Button icon={RefreshCw} disabled={loading} onClick={() => void load()}>Refresh</Button><Button icon={UserPlus} variant="primary" onClick={() => setCreateOpen(true)}>Create special account</Button></>} />
    {error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-800">{message}</p>}
    <section className="dlos-access-surface"><div className="dlos-access-toolbar"><label className="block max-w-md text-xs font-semibold">Find account<input className={inputClass} value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or email" /></label><span>{accounts.filter(account => account.dlosRole).length} with IDMIS access · {accounts.length} total accounts</span></div>
      {loading ? <p className="p-5 text-xs text-slate-500">Loading accounts…</p> : !visible.length ? <EmptyState title="No accounts found" /> : <div className="overflow-x-auto"><table className="dlos-access-table w-full text-left text-xs"><thead><tr><th scope="col" className="p-3">Account</th><th scope="col" className="p-3">PAIS role</th><th scope="col" className="p-3">IDMIS access</th></tr></thead><tbody>{visible.map(account => <tr key={account.id} className="border-t border-slate-200"><td className="p-3"><strong>{account.displayName}</strong><span className="block text-slate-500">{account.email}</span></td><td className="p-3">{account.role}</td><td className="p-3"><select aria-label={`IDMIS access for ${account.email}`} className={inputClass} disabled={saving === account.id} value={account.dlosRole || ''} onChange={event => void changeRole(account, event.target.value ? event.target.value as DlosRole : null)}><option value="">No access</option><option value="viewer">Viewer</option><option value="encoder">Encoder</option><option value="reviewer">Reviewer</option></select></td></tr>)}</tbody></table></div>}
    </section>
    <Modal isOpen={createOpen} onClose={() => !saving && setCreateOpen(false)} title="Create IDMIS Terminal account" maxWidth="md"><form className="space-y-4 p-5" onSubmit={create}><label className="block text-xs font-semibold">Display name<input className={inputClass} required maxLength={120} value={form.displayName} onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))} /></label><label className="block text-xs font-semibold">Email<input className={inputClass} type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label><label className="block text-xs font-semibold">Password (at least 8 characters)<input className={inputClass} type="password" minLength={8} required value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></label><label className="block text-xs font-semibold">IDMIS Terminal role<select className={inputClass} value={form.dlosRole} onChange={event => setForm(current => ({ ...current, dlosRole: event.target.value as DlosRole }))}><option value="viewer">Viewer</option><option value="encoder">Encoder</option><option value="reviewer">Reviewer</option></select></label><div className="flex justify-end gap-2"><Button type="button" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={Boolean(saving)}>{saving ? 'Creating…' : 'Create account'}</Button></div></form></Modal>
  </div>;
};
