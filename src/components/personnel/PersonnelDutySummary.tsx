import type { Personnel } from '../../types/pais';
import { getPersonnelDesignations, resolveCountedOrganization } from '../../utils/personnelStrength';

export function PersonnelDutySummary({ person }: { person: Personnel }) {
  return <div className="space-y-1 text-xs">
    <p><strong>Count under:</strong> {resolveCountedOrganization(person).countedUnit}</p>
    <p><strong>Designations:</strong> {getPersonnelDesignations(person) || 'Not recorded'}</p>
    {(person.dutyAssignments || []).map((duty, index) => <p key={index}><strong>{duty.kind}:</strong> {duty.unit}{duty.designation ? ` · ${duty.designation}` : ''}{duty.orderRef ? ` · Order: ${duty.orderRef}` : ''}</p>)}
  </div>;
}
