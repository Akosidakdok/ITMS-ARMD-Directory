import React, { useState } from 'react';
import { Personnel, RankAbbr } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { Award, Plus, Calendar, Clock, ShieldCheck, TrendingUp } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { calculateTimeInGrade } from '../../utils/timeInGrade';

interface PromotionSubTabProps {
  personnel: Personnel;
}

export const PromotionSubTab: React.FC<PromotionSubTabProps> = ({ personnel }) => {
  const { role, promotionsList, addPromotion } = useAuthRole();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const personnelPromotions = promotionsList.filter(p => p.personnelId === personnel.id);
  const currentTig = calculateTimeInGrade(personnel.lastPromotionDate);

  const [rankFrom, setRankFrom] = useState<RankAbbr>(personnel.rank);
  const [rankTo, setRankTo] = useState<RankAbbr>('PCOL');
  const [promotionDate, setPromotionDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleAddPromotion = (e: React.FormEvent) => {
    e.preventDefault();
    addPromotion({
      id: `prm-${Date.now()}`,
      personnelId: personnel.id,
      rankFrom,
      rankTo,
      promotionDate,
      orderNumber,
      timeInGradeAtPromotion: currentTig.formatted,
      remarks
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Current Rank & TIG Live Calculation Box */}
      <div className="p-5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-500/40 flex items-center justify-center">
            <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Current Active Rank</div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {personnel.rank} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">({personnel.rankFullName})</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Last Promotion Date: <strong className="text-slate-900 dark:text-slate-200 font-mono">{personnel.lastPromotionDate}</strong></p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-left md:text-right space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Auto-Calculated Time-In-Grade (TIG)</span>
          <div className="text-lg font-extrabold text-blue-700 dark:text-blue-300 font-mono">{currentTig.formatted}</div>
          <div className="text-[10px] text-slate-500">
            {currentTig.eligibleForPromotion ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center md:justify-end gap-1">
                <ShieldCheck className="w-3 h-3" /> Eligible for Next Rank Promotion Board
              </span>
            ) : (
              <span>Accruing required TIG period</span>
            )}
          </div>
        </div>
      </div>

      {/* Promotion Timeline & History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Rank Advancement History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Historical promotions and DPRM Special Order references</p>
          </div>

          {role === 'admin' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Record Promotion
            </button>
          )}
        </div>

        {personnelPromotions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">No prior promotion history recorded for this personnel entry.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-300 dark:border-slate-800 ml-4 space-y-6 py-2">
            {personnelPromotions.map((prm) => (
              <div key={prm.id} className="relative pl-6">
                <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white dark:border-slate-950"></span>
                <div className="p-4 rounded-xl glass-panel bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {prm.rankFrom}
                      </span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">➔</span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30">
                        {prm.rankTo}
                      </span>
                    </div>

                    <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> {prm.promotionDate}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    Order Ref: <strong className="font-mono text-slate-900 dark:text-slate-100">{prm.orderNumber}</strong>
                  </div>

                  {prm.timeInGradeAtPromotion && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      TIG at Promotion: <span className="text-blue-700 dark:text-blue-300 font-bold">{prm.timeInGradeAtPromotion}</span>
                    </div>
                  )}

                  {prm.remarks && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/60">
                      {prm.remarks}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Rank Promotion"
        subtitle={`Promote ${personnel.fullName} to Next Rank`}
      >
        <form onSubmit={handleAddPromotion} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Previous Rank</label>
              <input
                type="text"
                value={rankFrom}
                onChange={e => setRankFrom(e.target.value as RankAbbr)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">New Rank</label>
              <input
                type="text"
                value={rankTo}
                onChange={e => setRankTo(e.target.value as RankAbbr)}
                placeholder="e.g. PCOL"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Date of Promotion</label>
            <input
              type="date"
              value={promotionDate}
              onChange={e => setPromotionDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">DPRM Special Order Number</label>
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="e.g. SO-DPRM-2026-092"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Remarks / Napolcom Resolution</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Promoted per Napolcom Resolution No..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold h-20 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Submit Promotion Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

