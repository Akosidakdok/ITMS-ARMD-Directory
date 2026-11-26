import { useMemo, useState } from 'react';
import type { Personnel } from '../../types/pais';
import { formatTemplatePersonnelName } from '../../utils/orderTemplatePersonnel';

export function PersonnelMultiSelect({ personnel, selectedIds, onChange }: { personnel: Personnel[]; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [unit, setUnit] = useState('');
  const home = (person: Personnel) => person.sub_unit || person.division || 'Needs assignment';
  const units = useMemo(() => [...new Set(personnel.map(home))].sort(), [personnel]);
  const shown = useMemo(() => personnel.filter(person => (!unit || home(person) === unit) && [formatTemplatePersonnelName(person), person.badgeNo, home(person)].join(' ').toLowerCase().includes(query.trim().toLowerCase())), [personnel, query, unit]);
  return <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
    <legend className="px-1 text-xs font-bold">Personnel source — {selectedIds.length} selected</legend>
    <label className="block text-xs font-semibold">Find personnel<input type="search" value={query} onChange={e => setQuery(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" placeholder="Name or badge number" /></label>
    <label className="block text-xs font-semibold">Filter by home unit<select value={unit} onChange={e => setUnit(e.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"><option value="">All units</option>{units.map(name => <option key={name}>{name}</option>)}</select></label>
    <div className="flex flex-wrap gap-2 text-xs"><button type="button" onClick={() => onChange([...new Set([...selectedIds, ...shown.map(p => p.id)])])} disabled={!shown.length} className="rounded border border-slate-300 px-2 py-1 text-blue-700 disabled:opacity-50">Select shown</button><button type="button" onClick={() => onChange([])} disabled={!selectedIds.length} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50">Clear selection</button></div>
    <div className="max-h-56 space-y-1 overflow-y-auto" role="group" aria-label="Personnel choices">
      {shown.map(person => <label key={person.id} className="flex cursor-pointer items-start gap-2 rounded p-2 text-xs hover:bg-slate-50"><input type="checkbox" className="mt-0.5" checked={selectedIds.includes(person.id)} onChange={e => onChange(e.target.checked ? [...selectedIds, person.id] : selectedIds.filter(id => id !== person.id))} /><span>{formatTemplatePersonnelName(person)}<span className="block text-slate-500">{person.badgeNo || 'No badge number'} · {home(person)}</span></span></label>)}
      {!shown.length && <p className="p-2 text-xs text-slate-500">No personnel match this search.</p>}
    </div>
    {selectedIds.length > 0 && <ul aria-label="Selected template personnel" className="space-y-1 border-t border-slate-200 pt-2 text-xs">{selectedIds.map(id => {
      const person = personnel.find(p => p.id === id);
      return <li key={id} className="flex items-start justify-between gap-2"><span>{person ? formatTemplatePersonnelName(person) : 'Personnel no longer in roster'}</span><button type="button" aria-label={`Remove ${person ? formatTemplatePersonnelName(person) : id}`} onClick={() => onChange(selectedIds.filter(value => value !== id))} className="rounded px-1 text-rose-700">Remove</button></li>;
    })}</ul>}
  </fieldset>;
}
