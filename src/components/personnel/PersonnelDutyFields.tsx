import type { Personnel, PersonnelDutyAssignment } from '../../types/pais';
import { FormSection } from '../common/SystemUI';

interface Props { person: Partial<Personnel>; onChange: (patch: Partial<Personnel>) => void; }
const field = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
export function PersonnelDutyFields({ person, onChange }: Props) {
  const assignments = person.dutyAssignments || [];
  const updateAssignment = (index: number, patch: Partial<PersonnelDutyAssignment>) => onChange({ dutyAssignments: assignments.map((a, i) => i === index ? { ...a, ...patch } : a) });
  return <FormSection title="Headcount & Additional Duties">
    <p className="mb-3 text-xs text-slate-600">Keep the home sub-unit on the personnel record. Choose where this person is counted and record other duties here. Each person contributes one headcount.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold text-slate-700">Count under
        <input value={person.countedUnit || ''} onChange={e => onChange({ countedUnit: e.target.value })} placeholder={person.sub_unit || person.division || 'Default: home sub-unit'} className={field} />
        <span className="mt-1 block font-normal text-slate-500">Leave blank to count under the home sub-unit.</span>
      </label>
      <label className="text-xs font-semibold text-slate-700">Additional designations
        <textarea value={(person.additionalDesignations || []).join('\n')} onChange={e => onChange({ additionalDesignations: e.target.value.split('\n') })} rows={3} placeholder="One additional title per line" className={field} />
      </label>
    </div>
    <div className="mt-4 space-y-3">
      {assignments.map((assignment, index) => <fieldset key={index} className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-semibold">Duty {index + 1}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">Duty type<select value={assignment.kind} onChange={e => updateAssignment(index, { kind: e.target.value as PersonnelDutyAssignment['kind'] })} className={field}>{['Main', 'Detail', 'Additional', 'Technical assistance'].map(kind => <option key={kind}>{kind}</option>)}</select></label>
          <label className="text-xs font-semibold">Duty unit<input required value={assignment.unit} onChange={e => updateAssignment(index, { unit: e.target.value })} className={field} /></label>
          <label className="text-xs font-semibold">Duty designation<input value={assignment.designation || ''} onChange={e => updateAssignment(index, { designation: e.target.value })} className={field} /></label>
          <label className="text-xs font-semibold">Order reference<input value={assignment.orderRef || ''} onChange={e => updateAssignment(index, { orderRef: e.target.value })} placeholder="If available" className={field} /></label>
        </div>
        <button type="button" onClick={() => onChange({ dutyAssignments: assignments.filter((_, i) => i !== index) })} className="mt-2 rounded px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Remove duty {index + 1}</button>
      </fieldset>)}
      <button type="button" onClick={() => onChange({ dutyAssignments: [...assignments, { kind: 'Detail', unit: '' }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Add duty assignment</button>
    </div>
  </FormSection>;
}
