import React, { useState } from 'react';
import { Personnel, PromotionRecord, RankAbbr } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { Award, Plus, Calendar, Edit3, ShieldCheck, TrendingUp, Trash2, AlertCircle, Clock, Info } from 'lucide-react';
import { Modal } from '../common/Modal';
import { calculateTimeInGrade } from '../../utils/timeInGrade';
import { hasManagementAccess } from '../../utils/accessControl';
import { PNP_RANKS, getRankFullName, getNextRank, getMinimumTigYears } from '../../constants/ranks';
import { NotificationToast } from '../common/NotificationToast';

interface PromotionSubTabProps {
  personnel: Personnel;
}

export const PromotionSubTab: React.FC<PromotionSubTabProps> = ({ personnel }) => {
  const { role, promotionsList, addPromotion, updatePromotion, deletePromotion } = useAuthRole();
  const canManage = hasManagementAccess(role);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRecord | null>(null);
  const [deletingPromotion, setDeletingPromotion] = useState<PromotionRecord | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const personnelPromotions = promotionsList
    .filter(p => p.personnelId === personnel.id)
    .sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());

  const currentRankTigYears = getMinimumTigYears(personnel.rank);
  const currentTig = calculateTimeInGrade(personnel.lastPromotionDate ?? '', undefined, currentRankTigYears);

  const [rankFrom, setRankFrom] = useState<RankAbbr>(personnel.rank);
  const [rankTo, setRankTo] = useState<RankAbbr>(getNextRank(personnel.rank) || 'PCOL');
  const [promotionDate, setPromotionDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const openAddModal = () => {
    setEditingPromotion(null);
    setRankFrom(personnel.rank);
    setRankTo(getNextRank(personnel.rank) || 'PCOL');
    setPromotionDate(new Date().toISOString().split('T')[0]);
    setOrderNumber('');
    setRemarks('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (promotion: PromotionRecord) => {
    setEditingPromotion(promotion);
    setRankFrom(promotion.rankFrom);
    setRankTo(promotion.rankTo);
    setPromotionDate(promotion.promotionDate);
    setOrderNumber(promotion.orderNumber);
    setRemarks(promotion.remarks || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!rankFrom || !rankTo || !promotionDate || !orderNumber.trim()) {
      setFormError('All required fields (Previous Rank, New Rank, Effective Date, Order Number) must be filled.');
      return;
    }

    if (rankFrom === rankTo) {
      setFormError('Previous rank and new promoted rank cannot be identical.');
      return;
    }

    // Calculate TIG at time of promotion
    const tigAtPromotion = calculateTimeInGrade(personnel.lastPromotionDate ?? personnel.dateOfEntry ?? '', promotionDate);

    const record: PromotionRecord = {
      id: editingPromotion?.id || `prm-${Date.now()}`,
      personnelId: personnel.id,
      rankFrom,
      rankTo,
      promotionDate,
      orderNumber: orderNumber.trim(),
      timeInGradeAtPromotion: tigAtPromotion.formatted !== 'N/A' ? tigAtPromotion.formatted : currentTig.formatted,
      remarks: remarks.trim() || undefined
    };

    try {
      if (editingPromotion) {
        await updatePromotion(record);
        setToast({ type: 'success', message: `Promotion record updated successfully. Active rank synchronized.` });
      } else {
        await addPromotion(record);
        setToast({ type: 'success', message: `Personnel promoted to ${rankTo} (${getRankFullName(rankTo)}). Active rank synchronized.` });
      }
      setIsModalOpen(false);
      setEditingPromotion(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save promotion record. Please check values.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingPromotion) return;
    try {
      await deletePromotion(deletingPromotion.id);
      setToast({
        type: 'success',
        message: `Promotion record deleted. Personnel active rank automatically rolled back.`
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete promotion record.'
      });
    } finally {
      setDeletingPromotion(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <NotificationToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Current Rank & TIG Live Calculation Box */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-700 border border-blue-800 flex items-center justify-center shadow-md shrink-0">
            <Award className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">Current Active Rank</div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="font-mono text-blue-900">{personnel.rank}</span>
              <span className="text-sm font-semibold text-slate-600">({getRankFullName(personnel.rank)})</span>
            </h3>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
              <span>Last Promotion: <strong className="text-slate-900 font-mono font-bold">{personnel.lastPromotionDate || 'Initial entry / not recorded'}</strong></span>
              <span>•</span>
              <span>Required TIG: <strong className="text-blue-700 font-bold">{currentRankTigYears} years</strong></span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 text-white text-left md:text-right space-y-1 shadow-md border border-slate-800 min-w-[240px]">
          <span className="text-[11px] font-bold text-slate-400 block flex items-center md:justify-end gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" /> Auto-Calculated Time-in-Grade
          </span>
          <div className="text-xl font-black text-sky-300 font-mono tracking-wide">
            {currentTig.isFuture ? 'Pending Effective Date' : currentTig.formatted}
          </div>
          <div className="text-[11px] pt-0.5">
            {currentTig.isFuture ? (
              <span className="text-amber-400 font-semibold flex items-center md:justify-end gap-1">
                <Info className="w-3.5 h-3.5" /> Effective date is in the future
              </span>
            ) : currentTig.eligibleForPromotion ? (
              <span className="text-emerald-400 font-bold flex items-center md:justify-end gap-1">
                <ShieldCheck className="w-4 h-4" /> Eligible for Next Rank Promotion Board
              </span>
            ) : (
              <span className="text-slate-300 font-medium">
                Accruing required TIG ({currentTig.totalDays.toLocaleString()} days served)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Promotion Timeline & History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Rank Advancement History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Verified historical promotions, effective dates, and DPRM Special Orders</p>
          </div>

          {canManage && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Record Promotion
            </button>
          )}
        </div>

        {personnelPromotions.length === 0 ? (
          <div className="p-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
            <Award className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h4 className="text-xs font-bold text-slate-700">No promotion history recorded</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              This personnel record is currently at baseline entry rank. Use "Record Promotion" to log official rank advancement orders.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-300 ml-4 space-y-6 py-2">
            {personnelPromotions.map((prm, idx) => (
              <div key={prm.id} className="relative pl-6">
                <span className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full border-4 border-white shadow-xs ${idx === 0 ? 'bg-emerald-600' : 'bg-blue-600'}`}></span>
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-md bg-slate-800 text-white shadow-xs">
                        {prm.rankFrom}
                      </span>
                      <span className="text-xs text-blue-600 font-bold">➔</span>
                      <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-md bg-blue-600 text-white shadow-xs">
                        {prm.rankTo}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        ({getRankFullName(prm.rankTo)})
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Current Active Rank
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" /> Effective: {prm.promotionDate}
                      </span>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(prm)}
                            aria-label="Edit promotion record"
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit promotion details"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPromotion(prm)}
                            aria-label="Delete promotion record"
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete promotion record (will roll back active rank)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500">Order Reference: </span>
                      <strong className="font-mono text-slate-900 font-bold">{prm.orderNumber}</strong>
                    </div>

                    {prm.timeInGradeAtPromotion && (
                      <div className="font-mono">
                        <span className="text-slate-500">TIG Accrued at Promotion: </span>
                        <span className="text-blue-700 font-bold">{prm.timeInGradeAtPromotion}</span>
                      </div>
                    )}
                  </div>

                  {prm.remarks && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-normal leading-relaxed">
                      {prm.remarks}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPromotion ? 'Edit Rank Promotion' : 'Record Rank Promotion'}
        subtitle={`Promote ${personnel.fullName} (${personnel.badgeNo || 'No Badge'})`}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Previous Rank *</label>
              <select
                value={rankFrom}
                onChange={e => setRankFrom(e.target.value as RankAbbr)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              >
                {PNP_RANKS.map(r => (
                  <option key={r.code} value={r.code}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Promoted Rank *</label>
              <select
                value={rankTo}
                onChange={e => setRankTo(e.target.value as RankAbbr)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              >
                {PNP_RANKS.map(r => (
                  <option key={r.code} value={r.code}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Effective Promotion Date *</label>
              <input
                type="date"
                value={promotionDate}
                onChange={e => setPromotionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">DPRM Special Order Number *</label>
              <input
                type="text"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="e.g. SO-DPRM-2026-092"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Resolution Authority</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Promoted per Napolcom Resolution No. 2026-441 / DPRM General Orders"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-normal h-20 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-700" /> Automatic Personnel Rank Synchronization
            </div>
            <p className="text-[11px] text-blue-800 leading-normal">
              Recording this promotion will automatically update the personnel's active rank to <strong>{rankTo}</strong> ({getRankFullName(rankTo)}) and reset their Time-in-Grade counter to <strong>{promotionDate || 'the specified effective date'}</strong>.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              {editingPromotion ? 'Save Promotion Changes' : 'Confirm & Promote'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingPromotion && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingPromotion(null)}
          title="Confirm Promotion Record Deletion"
          subtitle={`Order: ${deletingPromotion.orderNumber}`}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Warning: Rank Rollback Action
              </div>
              <p className="leading-relaxed">
                You are about to delete promotion record from <strong>{deletingPromotion.rankFrom}</strong> to <strong>{deletingPromotion.rankTo}</strong> dated <strong>{deletingPromotion.promotionDate}</strong>.
              </p>
              <p className="leading-relaxed text-rose-700 font-medium">
                The personnel's active rank will automatically roll back to their previous rank <strong>({deletingPromotion.rankFrom})</strong> or remaining latest promotion.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPromotion(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Confirm Delete & Roll Back Rank
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
