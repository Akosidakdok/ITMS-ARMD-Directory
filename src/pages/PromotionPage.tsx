import React from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Clock } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { calculateTimeInGrade } from '../utils/timeInGrade';
import { EmptyState, PageHeader } from '../components/common/SystemUI';

export const PromotionPage: React.FC = () => {
  const { personnelList, promotionsList } = useAuthRole();

  const tigRoster = personnelList.map(p => {
    const tig = calculateTimeInGrade(p.lastPromotionDate ?? '');
    const pPromotions = promotionsList.filter(prom => prom.personnelId === p.id);
    return {
      personnel: p,
      tig,
      promotions: pPromotions
    };
  }).sort((a, b) => b.tig.totalDays - a.tig.totalDays);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Personnel records"
        title="Time-in-Grade & Rank Progression"
        description="Review calculated service time in the current rank against promotion board eligibility benchmarks."
        meta={<span className="text-[11px] text-slate-500">DPRM & NAPOLCOM benchmarks</span>}
        reference="TIG-ELIGIBILITY-ROSTER"
        actions={<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-700" /><span className="status-marker text-xs text-emerald-700">Automatic calculation active</span></div>}
      />

      <section className="app-surface overflow-hidden" aria-labelledby="tig-roster-heading">
        <div className="border-b border-slate-200 px-4 py-3.5">
          <h2 id="tig-roster-heading" className="app-section-title">Time-in-grade roster</h2>
          <p className="mt-0.5 text-xs text-slate-500">Personnel sorted by longest recorded service time in their current rank</p>
        </div>
        {tigRoster.length ? (
          <div className="overflow-x-auto">
            <table className="record-table min-w-[860px] text-xs">
              <thead className="bg-slate-50 uppercase">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3">Personnel</th>
                  <th className="px-4 py-3">Division / designation</th>
                  <th className="px-4 py-3">Last promotion</th>
                  <th className="px-4 py-3">Time in grade</th>
                  <th className="px-4 py-3">Promotion records</th>
                  <th className="px-4 py-3 text-right">Board status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tigRoster.map(({ personnel, tig, promotions }) => (
                  <tr key={personnel.id}>
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{personnel.rank} {personnel.lastName}, {personnel.firstName}</p><p className="mt-0.5 text-[10px] text-slate-500">{personnel.badgeNo || 'No badge recorded'}</p></td>
                    <td className="px-4 py-3"><p className="font-semibold text-blue-700">{personnel.division}</p><p className="mt-0.5 text-[10px] text-slate-500">{personnel.designation || 'Not assigned'}</p></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{personnel.lastPromotionDate || 'Not recorded'}</td>
                    <td className="px-4 py-3"><p className="font-mono font-semibold text-slate-900">{tig.formatted}</p><p className="mt-0.5 text-[10px] text-slate-500">{tig.totalDays.toLocaleString()} total days</p></td>
                    <td className="px-4 py-3 text-slate-600">{promotions.length}</td>
                    <td className="px-4 py-3 text-right"><Badge variant={tig.eligibleForPromotion ? 'success' : 'neutral'} size="sm">{tig.eligibleForPromotion ? 'Eligible for review' : 'Accruing service time'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No promotion records available" description="Personnel time-in-grade information will appear after profile dates are recorded." icon={Clock} />}
      </section>
    </div>
  );
};


