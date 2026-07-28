import React from 'react';
import { Personnel } from '../../types/pais';
import { Badge } from '../common/Badge';
import { calculateTimeInGrade } from '../../utils/timeInGrade';
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
  const { role } = useAuthRole();
  const tig = calculateTimeInGrade(personnel.lastPromotionDate ?? '2000-01-01');

  return (
    <div className="rounded-2xl p-6 space-y-6 border border-slate-200 bg-white relative overflow-hidden shadow-2xs">
      {/* Decorative police insignia overlay */}
      <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 pointer-events-none opacity-5">
        <ShieldCheck className="w-48 h-48 text-blue-600" />
      </div>

      {/* Profile Header Avatar & Main Identifiers */}
      <div className="flex flex-col items-center text-center space-y-3 relative z-10">
        <div className="relative group">
          <img
            src={personnel.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
            alt={personnel.fullName}
            className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-200 shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform"
          />
          <span className="absolute bottom-0 right-0 translate-x-1 translate-y-1">
            <Badge 
              variant={personnel.status === 'Active' ? 'success' : personnel.status === 'On Leave' ? 'warning' : 'neutral'} 
              size="sm"
            >
              {personnel.status}
            </Badge>
          </span>
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {personnel.rank}
            </span>
            <span className="text-xs font-mono text-slate-500 font-bold">Badge #{personnel.badgeNo}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{personnel.fullName}</h2>
          <p className="text-xs font-bold text-blue-700 mt-0.5">{personnel.designation}</p>
        </div>

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

      {/* Quick Reference Card Specs */}
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <Award className="w-4 h-4 text-blue-600" /> Salary Grade (SG)
          </span>
          <span className="font-bold text-slate-900 font-mono">SG {personnel.salaryGrade}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <IdCard className="w-4 h-4 text-sky-600" /> Plantilla Item No.
          </span>
          <span className="font-bold text-slate-800 font-mono text-[11px]">{personnel.plantilla}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 flex items-center gap-2 font-medium">
            <Building className="w-4 h-4 text-indigo-600" /> Division
          </span>
          <span className="font-bold text-blue-700">{personnel.division}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-slate-500 flex items-center gap-2 text-[11px] font-medium">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Current Detail / Posting
          </span>
          <p className="text-xs font-semibold text-slate-800 pl-5 leading-tight">{personnel.detail}</p>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time-In-Grade (TIG)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tig.eligibleForPromotion ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {tig.eligibleForPromotion ? 'Eligible' : 'Accruing'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 pl-5 font-mono">{tig.formatted}</p>
        </div>
      </div>
    </div>
  );
};


