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
  const tig = calculateTimeInGrade(personnel.lastPromotionDate);

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6 border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 relative overflow-hidden theme-transition shadow-xs">
      {/* Decorative police insignia overlay */}
      <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 pointer-events-none opacity-5 dark:opacity-10">
        <ShieldCheck className="w-48 h-48 text-blue-600" />
      </div>

      {/* Profile Header Avatar & Main Identifiers */}
      <div className="flex flex-col items-center text-center space-y-3 relative z-10">
        <div className="relative group">
          <img
            src={personnel.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
            alt={personnel.fullName}
            className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-200 dark:border-blue-500/40 shadow-lg shadow-blue-500/10 group-hover:scale-105 transition-transform"
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
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30">
              {personnel.rank}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-bold">Badge #{personnel.badgeNo}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{personnel.fullName}</h2>
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-0.5">{personnel.designation}</p>
        </div>

        {role === 'admin' && onEdit && (
          <button
            onClick={onEdit}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Summary Record
          </button>
        )}
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Quick Reference Card Specs */}
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Salary Grade (SG)
          </span>
          <span className="font-bold text-slate-900 dark:text-white font-mono">SG {personnel.salaryGrade}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <IdCard className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Plantilla Item No.
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px]">{personnel.plantilla}</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Division
          </span>
          <span className="font-bold text-blue-700 dark:text-blue-400">{personnel.division}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Current Detail / Posting
          </span>
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 pl-5 leading-tight">{personnel.detail}</p>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time-In-Grade (TIG)
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tig.eligibleForPromotion ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              {tig.eligibleForPromotion ? 'Eligible' : 'Accruing'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white pl-5 font-mono">{tig.formatted}</p>
        </div>
      </div>
    </div>
  );
};

