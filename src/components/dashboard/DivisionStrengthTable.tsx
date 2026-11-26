import React, { useMemo } from 'react';
import type { Personnel } from '../../types/pais';
import type { PersonnelFilterCriteria } from '../../utils/personnelCounting';
import { getDivisionStrength, getPersonnelDesignations, resolveCountedOrganization, type StrengthScope } from '../../utils/personnelStrength';
import './DivisionStrengthTable.css';

interface Props { personnel: Personnel[]; scope: StrengthScope; onScopeChange: (scope: StrengthScope) => void; criteria?: PersonnelFilterCriteria; onSelectPersonnel?: (id: string) => void; }
export function DivisionStrengthTable({ personnel, scope, onScopeChange, criteria, onSelectPersonnel }: Props) {
  const strength = useMemo(() => getDivisionStrength(personnel, scope, criteria), [personnel, scope, criteria]);
  return <section className="record-section space-y-3 p-4" aria-label="Division personnel strength">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold">Division personnel strength</h3><p className="text-xs text-slate-600">One person, one counted unit. Expand a division to see offices and personnel.</p></div>
      <label className="text-xs font-semibold">Personnel included<select aria-label="Personnel included" value={scope} onChange={e => onScopeChange(e.target.value as StrengthScope)} className="ml-2 rounded border border-slate-300 bg-white px-3 py-2"><option value="current">Current strength</option><option value="all">All personnel</option><option value="retired">Retired</option></select></label>
    </div>
    <div className="overflow-x-auto" role="region" aria-label="Division totals" tabIndex={0}><table className="record-table division-strength-table text-xs">
      <colgroup><col style={{ width: '56%' }} /><col span={4} style={{ width: '11%' }} /></colgroup>
      <thead><tr><th scope="col">Division / Group</th><th scope="col">PCO</th><th scope="col">PNCO</th><th scope="col">NUP</th><th scope="col">Total</th></tr></thead>
      <tbody>{strength.groups.map(group => <tr key={group.group}>
        <td className="align-top"><details><summary className="cursor-pointer py-2 font-semibold">{group.group}</summary>
          {strength.rows.filter(row => row.group === group.group).map(row => <details key={row.section} className="ml-3 border-l border-slate-200 pl-3"><summary className="cursor-pointer py-2">{row.section} — PCO {row.pcoCount}; PNCO {row.pncoCount}; NUP {row.nupCount}; Total {row.total}</summary>
            <ul className="space-y-2 pb-3">{row.personnel.map(person => <li key={person.id}>
              {onSelectPersonnel ? <button type="button" onClick={() => onSelectPersonnel(person.id)} className="text-left font-semibold text-blue-700 underline">{person.rank} {person.lastName}, {[person.firstName, person.middleName].filter(Boolean).join(' ')}</button> : <span className="font-semibold">{person.rank} {person.lastName}, {[person.firstName, person.middleName].filter(Boolean).join(' ')}</span>}
              <p className="text-slate-600">Count under: {resolveCountedOrganization(person).countedUnit} · {person.status}</p><p className="text-slate-600">{getPersonnelDesignations(person)}</p>
            </li>)}</ul>
          </details>)}
          {group.total === 0 && <p className="py-2 text-slate-500">No personnel in this selection.</p>}
          {group.group === 'Needs assignment' && <p className="py-2 text-slate-600">No home sub-unit or counted unit is recorded. These personnel are included in the total.</p>}
        </details></td><td>{group.pcoCount}</td><td>{group.pncoCount}</td><td>{group.nupCount}</td><td className="font-semibold">{group.total}</td>
      </tr>)}</tbody>
      <tfoot><tr className="font-semibold"><th scope="row">Total personnel</th><td>{strength.groups.reduce((n,g) => n+g.pcoCount,0)}</td><td>{strength.groups.reduce((n,g) => n+g.pncoCount,0)}</td><td>{strength.groups.reduce((n,g) => n+g.nupCount,0)}</td><td>{strength.total}</td></tr></tfoot>
    </table></div>
    <p role="status" className="text-xs text-slate-600">Division totals, including records needing assignment or mapping: {strength.groups.reduce((n,g) => n+g.total,0)} of {strength.total} personnel. {scope === 'current' ? 'Retired records are excluded; personnel due for retirement remain included.' : scope === 'all' ? 'Retired records are included.' : 'Only retired records are included.'}</p>
  </section>;
}
