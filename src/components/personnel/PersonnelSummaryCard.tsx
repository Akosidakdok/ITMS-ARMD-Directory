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

interface PersonnelSummaryCardProps {
  personnel: Personnel;
  onEdit?: () => void;
}

export const PersonnelSummaryCard: React.FC<PersonnelSummaryCardProps> = ({ personnel, onEdit }) => {
  const { role, assignmentsList, ordersList, leaveList, awardsList } = useAuthRole();
  const personnelAssignments = assignmentsList.filter(record => record.personnelId === personnel.id);
  const personnelOrders = ordersList.filter(record =>
    record.personnelIds?.includes(personnel.id) ||
    record.subject.toLowerCase().includes(personnel.lastName.toLowerCase()) ||
    record.description?.toLowerCase().includes(personnel.lastName.toLowerCase())
  );
  const personnelLeaves = leaveList.filter(record => record.personnelId === personnel.id);
  const personnelAwards = awardsList.filter(record => record.personnelId === personnel.id);

  return (
    <div className="rounded-2xl p-6 space-y-6 border border-slate-200 bg-white relative overflow-hidden shadow-2xs">
      {/* Decorative police insignia overlay */}
      <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 pointer-events-none opacity-5">
        <ShieldCheck className="w-48 h-48 text-blue-600" />
      </div>

      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-3 relative z-10">
        <Badge
          variant={personnel.status === 'Active' ? 'success' : personnel.status === 'On Leave' ? 'warning' : 'neutral'}
          size="sm"
        >
          {personnel.status}
        </Badge>

        {role === 'admin' && onEdit && (
          <button
            onClick={onEdit}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-xs font-semibold text-blue-700 border border-slate-200 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Summary Record
          </button>
        )}
      </div>

      <hr className="border-slate-200" />

      {/* Summary Profile Fields — Rank, Name, Badge No., SG, Plantilla, Division, Detail, Designation */}
      <div className="space-y-3 text-xs">

        {/* Rank */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <Award className="w-4 h-4 text-blue-600" /> Rank
          </span>
          <span className="font-extrabold text-blue-700">{personnel.rank}</span>
        </div>

        {/* Name */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-slate-500" /> Name
          </span>
          <p className="font-bold text-slate-900 pl-6 leading-tight">{personnel.fullName}</p>
        </div>

        {/* Badge No. */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <IdCard className="w-4 h-4 text-sky-600" /> Badge No.
          </span>
          <span className="font-bold text-slate-800 font-mono text-[11px]">{personnel.badgeNo}</span>
        </div>

        {/* SG (Salary Grade) */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <Award className="w-4 h-4 text-indigo-600" /> SG
          </span>
          <span className="font-bold text-slate-900 font-mono">SG {personnel.salaryGrade}</span>
        </div>

        {/* Plantilla */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <IdCard className="w-4 h-4 text-sky-600" /> Plantilla
          </span>
          <span className="font-bold text-slate-800 font-mono text-[11px]">{personnel.plantilla}</span>
        </div>

        {/* Division */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <Building className="w-4 h-4 text-indigo-600" /> Division
          </span>
          <span className="font-bold text-blue-700">{personnel.division}</span>
        </div>

        {/* Detail */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <span className="text-slate-500 flex items-center gap-2 text-[11px] font-medium">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Detail
          </span>
          <p className="text-xs font-semibold text-slate-800 pl-5 leading-tight">{personnel.detail}</p>
        </div>

        {/* Designation */}
        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-0.5">
          <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Designation
          </span>
          <p className="text-sm font-bold text-slate-900 pl-5">{personnel.designation}</p>
        </div>

      </div>

      <div className="space-y-3 text-xs">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Connected Records</h3>
        {[
          ['Assignments', personnelAssignments.length, personnelAssignments[0]?.position || 'No assignment records'],
          ['Orders', personnelOrders.length, personnelOrders[0]?.subject || 'No linked orders'],
          ['Leave', personnelLeaves.length, personnelLeaves[0] ? `${personnelLeaves[0].leaveType} (${personnelLeaves[0].startDate})` : 'No leave records'],
          ['Awards', personnelAwards.length, personnelAwards[0]?.awardName || 'No award records']
        ].map(([label, count, detail]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-700">{label}</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">{count}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};


