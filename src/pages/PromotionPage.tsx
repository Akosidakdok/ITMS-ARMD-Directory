import React from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Clock } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { calculateTimeInGrade } from '../utils/timeInGrade';

export const PromotionPage: React.FC = () => {
  const { personnelList, promotionsList } = useAuthRole();

  const tigRoster = personnelList.map(p => {
    const tig = calculateTimeInGrade(p.lastPromotionDate ?? '2000-01-01');
    const pPromotions = promotionsList.filter(prom => prom.personnelId === p.id);
    return {
      personnel: p,
      tig,
      promotions: pPromotions
    };
  }).sort((a, b) => b.tig.totalDays - a.tig.totalDays);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
              Promotion & TIG Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">DPRM & NAPOLCOM Benchmarks</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Time-In-Grade Audit & Rank Progression</h1>
          <p className="text-xs text-slate-500 mt-0.5">Automated Time-In-Grade calculation based on last promotion date to evaluate promotion board eligibility</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-mono font-extrabold text-blue-700">Auto-Compute Engine Active</span>
        </div>
      </div>

      {/* TIG Roster List */}
      <div className="space-y-4">
        {tigRoster.map(({ personnel, tig }) => (
          <div
            key={personnel.id}
            className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex items-center gap-4">
              <img
                src={personnel.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                alt={personnel.fullName}
                className="w-12 h-12 rounded-2xl object-cover border border-blue-200"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {personnel.rank}
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">{personnel.fullName}</h3>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">{personnel.designation} • <strong className="text-slate-900">{personnel.division}</strong></p>
                <div className="text-[11px] text-slate-500 font-mono mt-1 font-semibold">
                  Last Promotion Date: <strong className="text-slate-900">{personnel.lastPromotionDate}</strong>
                </div>
              </div>
            </div>

            {/* Computed TIG Box */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Computed Time-In-Grade</span>
                <span className="text-base font-extrabold text-blue-700 font-mono">{tig.formatted}</span>
                <span className="text-[10px] text-slate-500 block font-mono font-semibold">({tig.totalDays} Total Days)</span>
              </div>

              <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                <Badge variant={tig.eligibleForPromotion ? 'success' : 'neutral'} size="md">
                  {tig.eligibleForPromotion ? 'Eligible for Board Review' : 'Accruing Service Time'}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


