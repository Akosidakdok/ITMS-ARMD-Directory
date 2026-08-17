import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Edit, LoaderCircle, Lock, Search, ShieldAlert, Trash2, Unlock, UserPlus } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { FormSection, PageHeader } from '../components/common/SystemUI';
import { useAuthRole } from '../context/AuthRoleContext';
import { Personnel, RankAbbr } from '../types/pais';

const rankNames: Record<string, string> = {
  PGEN: 'Police General', PLTGEN: 'Police Lieutenant General', PMGEN: 'Police Major General',
  PBGEN: 'Police Brigadier General', PCOL: 'Police Colonel', PLTCOL: 'Police Lieutenant Colonel',
  PMAJ: 'Police Major', PCPT: 'Police Captain', PLT: 'Police Lieutenant',
  PEMS: 'Police Executive Master Sergeant', PCMS: 'Police Chief Master Sergeant',
  PSMS: 'Police Senior Master Sergeant', PMSg: 'Police Master Sergeant', PSSg: 'Police Staff Sergeant',
  PCpl: 'Police Corporal', Pat: 'Patrolman/Patrolwoman', NUP: 'Non-Uniformed Personnel'
};

const createEmptyPersonnel = (): Personnel => ({
  id: `pnp-${Date.now()}`, rank: 'PLT', rankFullName: rankNames.PLT,
  firstName: '', middleName: '', lastName: '', fullName: '', badgeNo: '', salaryGrade: 22,
  plantilla: '', division: 'ITSD', detail: 'ITMS Headquarters - Camp Crame', designation: '',
  address: '', gender: 'Male', contactNumber: '', birthday: '', dateOfEntry: '',
  enterInOfficerPositionDate: '', lastPromotionDate: '', status: 'Active'
});

const fieldClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

interface FormFieldsProps {
  draft: Personnel;
  setDraft: React.Dispatch<React.SetStateAction<Personnel>>;
}

const PersonnelFormFields: React.FC<FormFieldsProps> = ({ draft, setDraft }) => {
  const set = <K extends keyof Personnel>(key: K, value: Personnel[K]) => setDraft(current => ({ ...current, [key]: value }));
  const required = <span className="text-rose-600"> *</span>;
  return <div className="space-y-6">
    <FormSection title="Personal information">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-slate-700">First name{required}<input required value={draft.firstName} onChange={event => set('firstName', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700">Middle name<input value={draft.middleName || ''} onChange={event => set('middleName', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700">Last name{required}<input required value={draft.lastName} onChange={event => set('lastName', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700">Gender<select value={draft.gender || 'Male'} onChange={event => set('gender', event.target.value)} className={fieldClass}><option>Male</option><option>Female</option></select></label>
        <label className="text-xs font-semibold text-slate-700">Birthday<input type="date" value={draft.birthday || ''} onChange={event => set('birthday', event.target.value)} className={fieldClass} /></label>
      </div>
    </FormSection>
    <FormSection title="Service information">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-slate-700">Rank<select value={draft.rank} onChange={event => { const rank = event.target.value as RankAbbr; setDraft(current => ({ ...current, rank, rankFullName: rankNames[rank] || current.rankFullName })); }} className={fieldClass}>{Object.keys(rankNames).map(rank => <option key={rank} value={rank}>{rank}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Badge / serial no.{required}<input required value={draft.badgeNo} onChange={event => set('badgeNo', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700">Salary grade{required}<input required min="1" type="number" value={draft.salaryGrade || ''} onChange={event => set('salaryGrade', Number(event.target.value))} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700">Plantilla item no.{required}<input required value={draft.plantilla || ''} onChange={event => set('plantilla', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700">Division<select value={draft.division} onChange={event => set('division', event.target.value)} className={fieldClass}><option value="ITSD">ITSD</option><option value="PTD">PTD</option><option value="SMD">SMD</option><option value="DMD">DMD</option><option value="ARMD">ARMD</option><option value="ISSD">ISSD</option><option value="ITMS">ITMS</option><option value="CSD">CSD</option></select></label>
        <label className="text-xs font-semibold text-slate-700">Status<select value={draft.status} onChange={event => set('status', event.target.value)} className={fieldClass}><option>Active</option><option>On Leave</option><option>Detailed Out</option><option>Suspended</option></select></label>
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Designation{required}<input required value={draft.designation} onChange={event => set('designation', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700">Date of entry<input type="date" value={draft.dateOfEntry || ''} onChange={event => set('dateOfEntry', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">Office / detail<input value={draft.detail || ''} onChange={event => set('detail', event.target.value)} className={fieldClass} /></label>
      </div>
    </FormSection>
    <FormSection title="Contact information">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">Contact number<input value={draft.contactNumber || ''} onChange={event => set('contactNumber', event.target.value)} className={fieldClass} /></label>
        <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Address<input value={draft.address || ''} onChange={event => set('address', event.target.value)} className={fieldClass} /></label>
      </div>
    </FormSection>
  </div>;
};

export const ManagementPage: React.FC = () => {
  const { role, personnelList, addPersonnel, updatePersonnel, deletePersonnel, backendConnected } = useAuthRole();
  const canManage = role === 'admin' || role === 'superadmin';
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState<Personnel>(createEmptyPersonnel);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Personnel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredPersonnel = personnelList.filter(person => {
    const query = searchQuery.trim().toLowerCase();
    return !query || [person.fullName, person.firstName, person.lastName, person.badgeNo, person.division, person.designation].some(value => String(value || '').toLowerCase().includes(query));
  });

  const openCreate = () => { setDraft(createEmptyPersonnel()); setEditorMode('create'); setNotice(null); };
  const openEdit = (person: Personnel) => { setDraft({ ...person }); setEditorMode('edit'); setNotice(null); };

  const savePersonnel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editorMode || isSaving) return;
    const firstName = draft.firstName.trim().toUpperCase();
    const middleName = String(draft.middleName || '').trim().toUpperCase();
    const lastName = draft.lastName.trim().toUpperCase();
    const savedDraft: Personnel = { ...draft, firstName, middleName, lastName, fullName: [draft.rank, firstName, middleName, lastName].filter(Boolean).join(' '), badgeNo: draft.badgeNo.trim(), plantilla: String(draft.plantilla || '').trim(), designation: draft.designation.trim() };
    setIsSaving(true); setNotice(null);
    try {
      if (editorMode === 'create') await addPersonnel(savedDraft); else await updatePersonnel(savedDraft);
      const wasCreate = editorMode === 'create';
      setEditorMode(null);
      setNotice({ type: 'success', text: wasCreate ? 'Personnel profile created in Supabase.' : 'Personnel information updated in Supabase.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save the personnel record.' });
    } finally { setIsSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true); setNotice(null);
    try {
      await deletePersonnel(deleteTarget.id);
      setDeleteTarget(null);
      setNotice({ type: 'success', text: 'Personnel profile deleted from Supabase.' });
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to delete the personnel record.' });
    } finally { setIsDeleting(false); }
  };

  return <div className="space-y-6 animate-fade-in">
    <PageHeader
      eyebrow="System administration"
      title="Personnel Management Center"
      description="Create and maintain personnel records synchronized with Supabase according to your assigned role permissions."
      meta={<span className="text-[11px] text-slate-500">Role-based access control</span>}
      actions={<div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><span className={canManage ? 'text-blue-700' : 'text-slate-600'}>{canManage ? `${role === 'superadmin' ? 'Superadmin' : 'Administrator'} editor` : 'View-only access'}</span><span className="text-slate-300">•</span><span className={backendConnected ? 'text-emerald-700' : 'text-amber-700'}>{backendConnected ? 'Server verified' : 'Server offline'}</span></div>}
    />
    {!canManage && <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold text-blue-800 shadow-2xs"><ShieldAlert className="h-4 w-4 shrink-0 text-blue-600" /><span><strong>Read-Only Permission Enabled:</strong> Sign in with an administrator or superadmin account to modify personnel records.</span></div>}
    {notice && <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{notice.text}</div>}
    <div className="space-y-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-6">
      <div className="flex flex-col items-center justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search personnel records" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search personnel records…" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>{canManage ? <button onClick={openCreate} disabled={!backendConnected} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><UserPlus className="h-4 w-4" />Add personnel</button> : <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Lock className="h-3.5 w-3.5" /> Editing restricted in view-only mode</span>}</div>
      <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-700"><th className="px-4 py-3">Rank & Full Name</th><th className="px-4 py-3">Badge No</th><th className="px-4 py-3">Plantilla Item</th><th className="px-4 py-3">Division</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 font-medium text-slate-900">
        {filteredPersonnel.map(person => <tr key={person.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="font-extrabold">{person.rank} {person.lastName}, {person.firstName}</div><div className="text-[10px] font-medium text-slate-500">{person.rankFullName}</div></td><td className="px-4 py-3 font-mono text-slate-700">{person.badgeNo}</td><td className="px-4 py-3 font-mono text-[11px] font-extrabold text-sky-700">{person.plantilla}</td><td className="px-4 py-3 text-blue-700">{person.division}</td><td className="px-4 py-3 font-medium text-slate-700">{person.designation}</td><td className="px-4 py-3 text-center"><Badge variant={person.status === 'Active' ? 'success' : 'warning'} size="sm">{person.status}</Badge></td><td className="px-4 py-3 text-right">{canManage ? <div className="flex items-center justify-end gap-2"><button onClick={() => openEdit(person)} title="Edit Personnel Record" className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50"><Edit className="h-4 w-4" /></button><button onClick={() => setDeleteTarget(person)} title="Delete Record" className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div> : <span className="text-[11px] italic text-slate-400">View Only</span>}</td></tr>)}
        {filteredPersonnel.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center font-medium text-slate-500">No personnel records match your search.</td></tr>}
      </tbody></table></div>
    </div>
    <Modal isOpen={editorMode !== null} onClose={() => !isSaving && setEditorMode(null)} title={editorMode === 'edit' ? 'Edit personnel information' : 'Add personnel record'} subtitle="Required fields are marked with an asterisk. Changes are saved directly to Supabase." maxWidth="4xl"><form onSubmit={savePersonnel} className="space-y-5"><PersonnelFormFields draft={draft} setDraft={setDraft} /><div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white pt-4"><button type="button" disabled={isSaving} onClick={() => setEditorMode(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={isSaving || !backendConnected} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}{editorMode === 'edit' ? 'Save changes' : 'Create personnel'}</button></div></form></Modal>
    <Modal isOpen={deleteTarget !== null} onClose={() => !isDeleting && setDeleteTarget(null)} title="Delete personnel record?" subtitle="This permanently removes the personnel record from Supabase." maxWidth="md"><div className="space-y-5"><div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p className="font-semibold">{deleteTarget?.rank} {deleteTarget?.firstName} {deleteTarget?.lastName}</p><p className="mt-1 text-xs text-rose-700">Badge no. {deleteTarget?.badgeNo || 'Not provided'}</p><p className="mt-3 text-xs text-rose-800">This action cannot be undone.</p></div><div className="flex justify-end gap-2"><button disabled={isDeleting} onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button disabled={isDeleting} onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete personnel</button></div></div></Modal>
  </div>;
};
