import { FormEvent, useEffect, useState } from 'react';
import { LoaderCircle, RefreshCw, ShieldAlert, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { createAdminAccount, fetchAdminAccounts, syncAdminProfiles, type AdminAccount } from '../services/api';
import { useAuthRole } from '../context/AuthRoleContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Button, EmptyState, FormSection, PageHeader, TableLoadingState } from '../components/common/SystemUI';

const fieldClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

export const AdminAccountsPage = () => {
  const { role } = useAuthRole();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', division: 'ARMD' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAccounts(await fetchAdminAccounts());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load administrator accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (role !== 'superadmin') {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800" role="alert">
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h1 className="text-sm font-semibold">Superadmin permission required</h1>
            <p className="mt-1 text-xs leading-5">Administrator account management is restricted to authorized Superadmin users.</p>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const created = await createAdminAccount(form);
      setAccounts(items => [created, ...items]);
      setForm({ displayName: '', email: '', password: '', division: 'ARMD' });
      setCreateOpen(false);
      setMessage('Administrator account created successfully in Supabase.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create the administrator account.');
    } finally {
      setSaving(false);
    }
  };

  const sync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const count = await syncAdminProfiles();
      setMessage(`${count} Supabase Auth profile${count === 1 ? '' : 's'} synchronized.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to synchronize profiles.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1680px] space-y-5">
      <PageHeader
        eyebrow="System administration"
        title="Administrator Accounts"
        description="Manage authorized administrator profiles linked to Supabase Auth. Access to this module is restricted to Superadmins."
        meta={<Badge variant="primary" size="sm"><ShieldCheck aria-hidden="true" className="h-3 w-3" /> Superadmin only</Badge>}
        reference="SYS-ACCESS-REGISTER"
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={sync} disabled={syncing}>
              {syncing ? 'Synchronizing…' : 'Sync profiles'}
            </Button>
            <Button variant="primary" icon={UserPlus} onClick={() => { setError(''); setCreateOpen(true); }}>
              Create administrator
            </Button>
          </>
        }
      />

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">{error}</div>}
      {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">{message}</div>}

      <section className="app-surface overflow-hidden" aria-labelledby="account-table-heading">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3.5">
          <UserCog aria-hidden="true" className="h-4 w-4 text-blue-700" />
          <div>
            <h2 id="account-table-heading" className="app-section-title">Admin and Superadmin profiles</h2>
            <p className="mt-0.5 text-xs text-slate-500">{accounts.length} authorized account{accounts.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        {loading ? (
          <TableLoadingState columns={6} rows={5} />
        ) : accounts.length ? (
          <div className="overflow-x-auto">
            <table className="record-table min-w-[900px] text-xs">
              <thead className="bg-slate-50 uppercase">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3">Administrator</th>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map(account => {
                  const isSuperadmin = account.role.toLowerCase() === 'superadmin';
                  const active = account.status.toLowerCase() === 'active';
                  return (
                    <tr key={account.id} className={isSuperadmin ? 'bg-blue-50/35' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${isSuperadmin ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {account.displayName.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="font-semibold text-slate-900">{account.displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">{account.division || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{account.email}</td>
                      <td className="px-4 py-3"><Badge variant={isSuperadmin ? 'primary' : 'neutral'} size="sm">{isSuperadmin ? 'Superadmin' : 'Administrator'}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={active ? 'success' : 'neutral'} size="sm">{account.status}</Badge></td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">{account.lastSignInAt ? new Date(account.lastSignInAt).toLocaleString('en-PH') : 'Never'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No administrator accounts found" description="Create an administrator account or synchronize existing Supabase Auth profiles." icon={UserCog} />
        )}
      </section>

      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Create administrator account"
        subtitle="Creates an authorized profile linked to Supabase Auth. The temporary password is never displayed after submission."
        maxWidth="lg"
      >
        <form onSubmit={submit} className="space-y-5">
          <FormSection title="Account information" description="Use the administrator's official PNP–ITMS identity and assigned division.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">
                Full name <span className="text-rose-600">*</span>
                <input required autoComplete="name" value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} className={fieldClass} />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Division <span className="text-rose-600">*</span>
                <select value={form.division} onChange={event => setForm({ ...form, division: event.target.value })} className={fieldClass}>
                  <option>ARMD</option><option>ITSD</option><option>PTD</option><option>SMD</option><option>DMD</option><option>ISSD</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                Email address <span className="text-rose-600">*</span>
                <input required type="email" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className={fieldClass} />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                Temporary password <span className="text-rose-600">*</span>
                <input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} className={fieldClass} aria-describedby="password-help" />
                <span id="password-help" className="mt-1 block text-[11px] font-normal text-slate-500">Use at least 8 characters. The password is sent securely and is not shown in the account table.</span>
              </label>
            </div>
          </FormSection>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {saving ? 'Creating account…' : 'Create administrator'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
