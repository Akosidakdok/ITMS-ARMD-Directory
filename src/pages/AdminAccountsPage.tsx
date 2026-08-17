import { FormEvent, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { createAdminAccount, fetchAdminAccounts, syncAdminProfiles, type AdminAccount } from '../services/api';
import { useAuthRole } from '../context/AuthRoleContext';

export const AdminAccountsPage = () => {
  const { role } = useAuthRole();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', division: 'ARMD' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try { setAccounts(await fetchAdminAccounts()); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load accounts.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  if (role !== 'superadmin') return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">Superadmin permission is required.</div>;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    try { const created = await createAdminAccount(form); setAccounts(items => [created, ...items]); setForm({ displayName: '', email: '', password: '', division: 'ARMD' }); setMessage('Administrator profile created in Supabase.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create account.'); }
  };
  const sync = async () => { setError(''); try { const count = await syncAdminProfiles(); setMessage(`${count} Supabase Auth profile(s) synchronized.`); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to synchronize profiles.'); } };

  return <div className="mx-auto max-w-[1600px] space-y-6">
    <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#061942] to-blue-800 p-6 text-white sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><ShieldCheck className="h-9 w-9"/><div><p className="text-xs font-bold uppercase tracking-widest text-blue-200">Superadmin Management</p><h1 className="text-2xl font-extrabold">Administrator Accounts</h1><p className="mt-1 text-sm text-blue-100">Manage profiles linked to Supabase Auth.</p></div></div><button onClick={sync} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold hover:bg-white/25"><RefreshCw className="h-4 w-4"/> Sync profiles</button></header>
    {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-5"><input required placeholder="Full name" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} className="rounded-xl border border-slate-300 px-3 py-2.5"/><input required type="email" placeholder="Email address" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="rounded-xl border border-slate-300 px-3 py-2.5"/><select value={form.division} onChange={e=>setForm({...form,division:e.target.value})} className="rounded-xl border border-slate-300 px-3 py-2.5"><option>ARMD</option><option>ITSD</option><option>PTD</option><option>SMD</option><option>DMD</option><option>ISSD</option></select><input required minLength={8} type="password" placeholder="Temporary password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="rounded-xl border border-slate-300 px-3 py-2.5"/><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 font-bold text-white"><UserPlus className="h-4 w-4"/> Create admin</button></form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 p-4 font-bold"><UserCog className="h-5 w-5 text-blue-600"/> Admin and Superadmin Profiles</div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Administrator</th><th className="px-5 py-3">Division</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Last sign in</th></tr></thead><tbody className="divide-y divide-slate-100">{loading?<tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading Supabase profiles…</td></tr>:accounts.map(account=><tr key={account.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{account.displayName.split(/\s+/).map(p=>p[0]).join('').slice(0,2).toUpperCase()}</span><span className="font-bold text-slate-900">{account.displayName}</span></div></td><td className="px-5 py-4 text-slate-600">{account.division}</td><td className="px-5 py-4 text-slate-600">{account.email}</td><td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{account.role}</span></td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{account.status}</span></td><td className="px-5 py-4 text-xs text-slate-500">{account.lastSignInAt?new Date(account.lastSignInAt).toLocaleString():'Never'}</td></tr>)}</tbody></table></div></section>
  </div>;
};
