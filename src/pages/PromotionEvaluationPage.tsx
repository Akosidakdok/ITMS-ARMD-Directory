import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calculator, Save } from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Badge } from '../components/common/Badge';
import { Button, PageHeader } from '../components/common/SystemUI';
import { NotificationToast } from '../components/common/NotificationToast';
import { hasManagementAccess } from '../utils/accessControl';
import {
  createPromotionEvaluationApi,
  fetchPromotionEvaluationPreview,
  fetchPromotionEvaluations,
  updatePromotionEvaluationApi
} from '../services/api';
import type { PromotionEvaluation, PromotionEvaluationStatus } from '../types/pais';

const today = new Date().toISOString().slice(0, 10);

const renderFactorValue = (factor: PromotionEvaluation['calculation']['factors'][number]) => {
  const value = factor.value as any;
  if (factor.key === 'awards') {
    return (
      <div>
        <strong>{value?.count || 0} award(s) recorded</strong>
        {value?.awards?.length > 0 && <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">{value.awards.map((award: any) => <li key={award.id}>{award.awardName} ({award.authorityDate || 'date unavailable'})</li>)}</ul>}
      </div>
    );
  }
  if (factor.key === 'diversity') {
    return <div className="grid grid-cols-3 gap-2">{['Luzon', 'Visayas', 'Mindanao'].map(region => <div key={region} className="rounded border border-slate-200 bg-slate-50 px-2 py-1"><span className="block text-[10px] text-slate-500">{region}</span><strong>{value?.[region]?.duration || 'Not available'}</strong></div>)}</div>;
  }
  if (factor.key === 'seniority') {
    return <div><strong>{value?.duration || 'Not available'}</strong><span className="ml-2 text-[10px] text-slate-500">since {value?.promotionDate || 'no promotion date'}</span></div>;
  }
  return <span>{value === null || value === undefined || value === '' ? 'Not provided' : String(value)}</span>;
};

export const PromotionEvaluationPage: React.FC = () => {
  const { role, personnelList } = useAuthRole();
  const canManage = hasManagementAccess(role);
  const [personnelId, setPersonnelId] = useState(personnelList[0]?.id || '');
  const [evaluationDate, setEvaluationDate] = useState(today);
  const [evaluation, setEvaluation] = useState<PromotionEvaluation | null>(null);
  const [savedEvaluations, setSavedEvaluations] = useState<PromotionEvaluation[]>([]);
  const [status, setStatus] = useState<PromotionEvaluationStatus>('Draft');
  const [remarks, setRemarks] = useState('');
  const [interviewRating, setInterviewRating] = useState('');
  const [serviceReputation, setServiceReputation] = useState('');
  const [otherQualifications, setOtherQualifications] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedPersonnel = personnelList.find(person => person.id === personnelId);

  const calculate = async () => {
    if (!personnelId) return;
    setLoading(true);
    try {
      const preview = await fetchPromotionEvaluationPreview(personnelId, evaluationDate);
      setEvaluation(preview);
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to calculate evaluation.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { calculate(); }, [personnelId, evaluationDate]);

  useEffect(() => {
    if (!personnelId) return;
    fetchPromotionEvaluations(personnelId).then(setSavedEvaluations).catch(() => setSavedEvaluations([]));
  }, [personnelId]);

  const save = async () => {
    if (!evaluation || !selectedPersonnel || !canManage) return;
    setLoading(true);
    const externalFactors = {
      interviewRating: { value: interviewRating || null, points: null, source: 'Manual/external input' },
      serviceReputation: { value: serviceReputation || null, points: null, source: 'Manual/external input' },
      otherQualifications: { value: otherQualifications || null, points: null, source: 'Manual/external input' }
    };
    try {
      const saved = await createPromotionEvaluationApi({ personnelId, evaluationDate, status, remarks, externalFactors });
      setSavedEvaluations(previous => [saved, ...previous]);
      setToast({ type: 'success', message: 'Promotion evaluation saved.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to save evaluation.' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (saved: PromotionEvaluation, nextStatus: PromotionEvaluationStatus) => {
    if (!canManage) return;
    try {
      const updated = await updatePromotionEvaluationApi(saved.id, { status: nextStatus });
      setSavedEvaluations(previous => previous.map(item => item.id === updated.id ? updated : item));
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to update status.' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader eyebrow="Promotion board support" title="Promotion Evaluation" description="Review PAIS-derived evidence and separately recorded external factors. Reference worksheet maxima are loaded; source-to-points formulas remain subject to confirmation." reference="PROMOTION-EVALUATION" />
      {toast && <NotificationToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <section className="record-section grid gap-4 p-4 md:grid-cols-4">
        <label className="text-xs font-semibold text-slate-700">Personnel<select value={personnelId} onChange={event => setPersonnelId(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm">{personnelList.map(person => <option key={person.id} value={person.id}>{person.rank} {person.fullName}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Evaluation date<input type="date" value={evaluationDate} onChange={event => setEvaluationDate(event.target.value)} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-700">Status<select value={status} onChange={event => setStatus(event.target.value as PromotionEvaluationStatus)} disabled={!canManage} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"><option>Draft</option><option>For Review</option><option>Approved</option><option>Rejected</option></select></label>
        <div className="flex items-end"><Button variant="secondary" icon={Calculator} onClick={calculate} disabled={loading}>Recalculate</Button></div>
      </section>

      {evaluation && <>
        <section className="record-section p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold text-slate-900">{selectedPersonnel?.rank} {selectedPersonnel?.fullName}</h2><p className="text-xs text-slate-500">Calculated from PAIS records as of {evaluationDate}</p></div><div className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-center"><span className="block text-[10px] font-semibold uppercase text-blue-700">Calculated points</span><strong className="text-2xl text-blue-900">{evaluation.calculation.totalPoints}</strong><span className="block text-[10px] text-blue-700">Pending unmapped formulas</span></div></div>
          <div className="overflow-x-auto"><table className="record-table text-xs"><thead><tr><th>Factor</th><th>Value</th><th>Source</th><th>Points / maximum</th><th>Status</th></tr></thead><tbody>{evaluation.calculation.factors.map(factor => <tr key={factor.key}><td className="font-semibold">{factor.label}</td><td className="min-w-56">{renderFactorValue(factor)}</td><td><Badge variant={factor.source.includes('PAIS') ? 'success' : 'warning'} size="sm">{factor.source}</Badge></td><td className="font-mono font-bold">{factor.points ?? 'Pending'}{factor.maxPoints !== undefined ? ` / ${factor.maxPoints}` : ''}</td><td>{factor.status || 'Review'}</td></tr>)}</tbody></table></div>
          {evaluation.calculation.warnings.length > 0 && <div className="mt-4 space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Review warnings</p>{evaluation.calculation.warnings.map((warning, index) => <p key={`${warning.code}-${index}`}>• {warning.message}</p>)}</div>}
        </section>

        <section className="record-section grid gap-4 p-4 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700">Interview rating (external)<input value={interviewRating} onChange={event => setInterviewRating(event.target.value)} disabled={!canManage} className="mt-1 w-full rounded border border-slate-300 p-2" placeholder="Enter rating" /></label>
          <label className="text-xs font-semibold text-slate-700">Service reputation (external)<input value={serviceReputation} onChange={event => setServiceReputation(event.target.value)} disabled={!canManage} className="mt-1 w-full rounded border border-slate-300 p-2" placeholder="Enter assessment" /></label>
          <label className="text-xs font-semibold text-slate-700">Other qualifications (external)<input value={otherQualifications} onChange={event => setOtherQualifications(event.target.value)} disabled={!canManage} className="mt-1 w-full rounded border border-slate-300 p-2" placeholder="Enter qualification" /></label>
          <label className="text-xs font-semibold text-slate-700 md:col-span-3">Remarks<textarea value={remarks} onChange={event => setRemarks(event.target.value)} disabled={!canManage} className="mt-1 min-h-20 w-full rounded border border-slate-300 p-2" /></label>
          {canManage && <div className="md:col-span-3"><Button variant="primary" icon={Save} onClick={save} disabled={loading}>Save evaluation</Button></div>}
        </section>
      </>}

      <section className="record-section p-4"><h2 className="mb-3 text-sm font-bold text-slate-900">Saved evaluations</h2>{savedEvaluations.length === 0 ? <p className="text-xs text-slate-500">No saved evaluations for this personnel member.</p> : <div className="space-y-2">{savedEvaluations.map(saved => <div key={saved.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-xs"><span><strong>{saved.evaluationDate}</strong> · {saved.calculation.totalPoints} points</span><span className="flex items-center gap-2"><Badge variant={saved.status === 'Approved' ? 'success' : 'neutral'} size="sm">{saved.status}</Badge>{canManage && <select value={saved.status} onChange={event => updateStatus(saved, event.target.value as PromotionEvaluationStatus)} className="rounded border border-slate-300 p-1"><option>Draft</option><option>For Review</option><option>Approved</option><option>Rejected</option></select>}</span></div>)}</div>}</section>
    </div>
  );
};
