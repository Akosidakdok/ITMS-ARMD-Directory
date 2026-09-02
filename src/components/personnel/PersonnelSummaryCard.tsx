import React from 'react';
import { Personnel } from '../../types/pais';
import { Badge } from '../common/Badge';
import { 
  ShieldCheck, 
  MapPin, 
  Building, 
  Award, 
  Clock,
  IdCard,
  Edit
} from 'lucide-react';
import { useAuthRole } from '../../context/AuthRoleContext';
import { hasManagementAccess } from '../../utils/accessControl';

interface PersonnelSummaryCardProps {
  personnel: Personnel;
  onEdit?: () => void;
}

export const PersonnelSummaryCard: React.FC<PersonnelSummaryCardProps> = ({ personnel, onEdit }) => {
  const { role, assignmentsList, ordersList, leaveList, awardsList } = useAuthRole();
  const canManage = hasManagementAccess(role);
  const personnelAssignments = assignmentsList.filter(record => record.personnelId === personnel.id);
  const personnelOrders = ordersList.filter(record =>
    record.personnelIds?.includes(personnel.id) ||
    record.subject.toLowerCase().includes(personnel.lastName.toLowerCase()) ||
    record.description?.toLowerCase().includes(personnel.lastName.toLowerCase())
  );
  const personnelLeaves = leaveList.filter(record => record.personnelId === personnel.id);
  const personnelAwards = awardsList.filter(record => record.personnelId === personnel.id);

  return (
    <article className="overflow-hidden rounded-md border border-slate-300 bg-white">
      <header className="border-b border-slate-300 bg-[#fcfbf7] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="record-kicker">Official personnel summary</p>
            <h2 className="mt-1 text-base font-bold uppercase leading-tight text-slate-900">{personnel.rank} {personnel.fullName}</h2>
            <p className="mt-1 font-mono text-[10px] text-slate-500">BADGE {personnel.badgeNo || 'NOT RECORDED'} · PLANTILLA {personnel.plantilla || 'NOT RECORDED'}</p>
          </div>
          <Badge variant={personnel.status === 'Active' ? 'success' : personnel.status === 'On Leave' ? 'warning' : 'neutral'} size="sm">{personnel.status}</Badge>
        </div>
        {canManage && onEdit && (
          <button onClick={onEdit} className="mt-3 inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50">
            <Edit className="h-3.5 w-3.5" /> Edit summary record
          </button>
        )}
      </header>

      <dl className="grid grid-cols-2 border-b border-slate-300 text-xs">
        {[
          ['Rank', personnel.rankFullName || personnel.rank],
          ['Salary grade', `SG ${personnel.salaryGrade}`],
          ['Division', personnel.division || 'Not recorded'],
          ['Detail / sub-unit', personnel.detail || 'Not recorded'],
          ['Designation', personnel.designation || 'Not assigned'],
          ['Duty status', personnel.status]
        ].map(([label, value], index) => (
          <div key={label} className={`border-b border-slate-200 p-3 ${index % 2 === 0 ? 'border-r' : ''}`}>
            <dt className="record-kicker text-slate-500">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="p-4 text-xs" aria-labelledby="connected-records-heading">
        <h3 id="connected-records-heading" className="record-kicker text-slate-500">Connected records</h3>
        <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
        {[
          ['Assignments', personnelAssignments.length, personnelAssignments[0]?.position || 'No assignment records'],
          ['Orders', personnelOrders.length, personnelOrders[0]?.subject || 'No linked orders'],
          ['Leave', personnelLeaves.length, personnelLeaves[0] ? `${personnelLeaves[0].leaveType} (${personnelLeaves[0].startDate})` : 'No leave records'],
          ['Awards', personnelAwards.length, personnelAwards[0]?.awardName || 'No award records']
        ].map(([label, count, detail]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] gap-x-3 px-1 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-700">{label}</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-blue-800">{count}</span>
            <p className="col-span-2 mt-0.5 line-clamp-2 text-[11px] text-slate-500">{detail}</p>
          </div>
        ))}
        </div>
      </section>
    </article>
  );
};


