import React, { useState, useMemo, useRef } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import {
  GraduationCap, BookOpen, Search, ArrowUpDown, Plus,
  Pencil, Trash2, Upload, X, Check, AlertTriangle,
  ChevronDown, Download, FileText, Loader2, CheckSquare,
  Square, FileSpreadsheet
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import type { EducationRecord, TrainingRecord } from '../types/pais';
import { parseEducationCsv, generateEducationCsvTemplate } from '../utils/educationCsv';
import { parseTrainingCsv, generateTrainingCsvTemplate } from '../utils/trainingCsv';
import type { BulkUpsertResult } from '../services/api';
import { hasManagementAccess } from '../utils/accessControl';
import {
  exportEducationCsv, exportTrainingCsv, exportCombinedCsv,
  exportEducationPdf, exportTrainingPdf, exportCombinedPdf,
  type ExportPersonnelData
} from '../utils/educationExport';

// ─── Types ──────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'division' | 'eduCount' | 'trnCount';
type SortDir = 'asc' | 'desc';
type ModalMode = 'add-edu' | 'edit-edu' | 'add-trn' | 'edit-trn' | null;
type BulkTab = 'education' | 'training';
type ExportContent = 'education' | 'training' | 'both';
type ExportFormat = 'csv' | 'pdf';

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

const ConfirmDialog: React.FC<{
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <p className="text-sm text-slate-700 font-medium">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-semibold">
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Edit / Add Modal ────────────────────────────────────────────────────────

interface EduFormData {
  academicLevel: string; institution: string; degree: string; major: string;
  startYear: string; yearGraduated: string; honors: string; highest: boolean; ranking: string;
}
interface TrnFormData {
  courseName: string; category: string; provider: string;
  location: string; startDate: string; completionDate: string; hours: string;
  source: string; certificateNo: string; authorityDate: string; issuedBy: string; attachment: string;
}

const ACADEMIC_LEVELS = ['Elementary', 'High School', 'College'] as const;

const EduModal: React.FC<{
  mode: 'add-edu' | 'edit-edu';
  personnelId: string;
  personnelName: string;
  existing?: EducationRecord;
  existingRecords?: EducationRecord[];
  onSave: (records: Partial<EducationRecord>[]) => Promise<void>;
  onClose: () => void;
}> = ({ mode, personnelId, personnelName, existing, existingRecords = [], onSave, onClose }) => {
  const toFormData = (record: EducationRecord | undefined, academicLevel: string): EduFormData => ({
    academicLevel: record?.academicLevel ?? academicLevel,
    degree: record?.degree ?? '',
    institution: record?.institution ?? '',
    major: record?.major ?? '',
    startYear: record?.startYear?.toString() ?? '',
    yearGraduated: record?.yearGraduated?.toString() ?? '',
    honors: record?.honors ?? '',
    highest: record?.highest ?? academicLevel === 'College',
    ranking: record?.ranking?.toString() ?? '0',
  });
  const batchRecords = ACADEMIC_LEVELS.map(level => existingRecords.find(
    record => String(record.academicLevel || '').trim().toLowerCase() === level.toLowerCase()
  ));
  const recordIds = mode === 'edit-edu' ? [existing?.id] : batchRecords.map(record => record?.id);
  const [forms, setForms] = useState<EduFormData[]>(() => {
    if (existing) {
      return [toFormData(existing, existing.academicLevel ?? '')];
    }

    return ACADEMIC_LEVELS.map((level, index) => toFormData(batchRecords[index], level));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (index: number, patch: Partial<EduFormData>) => {
    setForms(current => current.map((form, formIndex) => formIndex === index ? { ...form, ...patch } : form));
  };

  const updateHighest = (index: number, checked: boolean) => {
    setForms(current => current.map((form, formIndex) => ({
      ...form,
      highest: checked ? formIndex === index : formIndex === index ? false : form.highest,
    })));
  };

  const handleSave = async () => {
    for (const form of forms) {
      if (!form.academicLevel.trim()) {
        setError('Academic Level is required.');
        return;
      }
      if (form.startYear && form.yearGraduated && Number(form.startYear) > Number(form.yearGraduated)) {
        setError(`${form.academicLevel}: Start Year cannot be later than End Year.`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(forms.map((form, index) => ({
        id: recordIds[index],
        personnelId,
        academicLevel: form.academicLevel.trim(),
        degree: form.degree.trim() || undefined,
        institution: form.institution.trim() || undefined,
        major: form.major.trim() || undefined,
        startYear: form.startYear ? parseInt(form.startYear) : undefined,
        yearGraduated: form.yearGraduated ? parseInt(form.yearGraduated) : undefined,
        honors: form.honors.trim() || undefined,
        highest: form.highest,
        ranking: form.ranking ? parseInt(form.ranking) : undefined,
      })));
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-800">
              {mode === 'add-edu' ? 'Add Academic Attainment' : 'Edit Education Record'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/60 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          <p className="text-xs text-blue-700 font-bold bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">Personnel: {personnelName}</p>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {mode === 'add-edu' && (
            <p className="text-xs text-slate-500">Enter all three levels here, then save them together. Course and Major may be left blank for lower levels.</p>
          )}

          <div className="space-y-4">
            {forms.map((form, index) => (
              <section key={`${form.academicLevel}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  {mode === 'edit-edu' ? (
                    <label className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Academic Level
                      <select
                        value={form.academicLevel}
                        onChange={event => updateForm(index, { academicLevel: event.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="">Select level</option>
                        {ACADEMIC_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                      </select>
                    </label>
                  ) : (
                    <h3 className="text-sm font-extrabold text-slate-800">{form.academicLevel}</h3>
                  )}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.highest}
                      onChange={event => updateHighest(index, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Highest academic attainment
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'School', key: 'institution', placeholder: 'School name', span: 'lg:col-span-2' },
                    { label: 'Course', key: 'degree', placeholder: 'Course or program', span: '' },
                    { label: 'Major', key: 'major', placeholder: 'Major or specialization', span: '' },
                    { label: 'Start Year', key: 'startYear', placeholder: 'e.g. 2011', type: 'number', span: '' },
                    { label: 'End Year', key: 'yearGraduated', placeholder: 'e.g. 2015', type: 'number', span: '' },
                    { label: 'Grade', key: 'honors', placeholder: 'Grade or result', span: '' },
                    { label: 'Ranking', key: 'ranking', placeholder: 'e.g. 0', type: 'number', span: '' },
                  ].map(field => (
                    <div key={field.key} className={field.span}>
                      <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{field.label}</label>
                      <input
                        type={field.type ?? 'text'}
                        value={form[field.key as Exclude<keyof EduFormData, 'highest'>] as string}
                        onChange={event => updateForm(index, { [field.key]: event.target.value })}
                        placeholder={field.placeholder}
                        min={field.type === 'number' ? '0' : undefined}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : mode === 'add-edu' ? 'Save 3 Records' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TrnModal: React.FC<{
  mode: 'add-trn' | 'edit-trn';
  personnelId: string;
  personnelName: string;
  existing?: TrainingRecord;
  onSave: (data: Partial<TrainingRecord>) => Promise<void>;
  onClose: () => void;
}> = ({ mode, personnelId, personnelName, existing, onSave, onClose }) => {
  const [form, setForm] = useState<TrnFormData>({
    courseName: existing?.courseName ?? '',
    category: existing?.category ?? '',
    provider: existing?.provider ?? '',
    location: existing?.location ?? '',
    startDate: existing?.startDate ?? '',
    completionDate: existing?.completionDate ?? '',
    hours: existing?.hours?.toString() ?? '',
    source: existing?.source ?? '',
    certificateNo: existing?.certificateNo ?? '',
    authorityDate: existing?.authorityDate ?? '',
    issuedBy: existing?.issuedBy ?? '',
    attachment: existing?.attachment ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.category.trim()) { setError('Training Type is required.'); return; }
    if (!form.courseName.trim()) { setError('Training Title is required.'); return; }
    if (!form.provider.trim()) { setError('School is required.'); return; }
    if (form.startDate && form.completionDate && form.startDate > form.completionDate) {
      setError('Inclusive Start Date cannot be later than Inclusive End Date.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: existing?.id,
        personnelId,
        courseName: form.courseName.trim(),
        category: form.category.trim() || undefined,
        provider: form.provider.trim(),
        location: form.location.trim() || undefined,
        startDate: form.startDate || undefined,
        completionDate: form.completionDate || undefined,
        hours: form.hours ? parseFloat(form.hours) : undefined,
        source: form.source.trim() || undefined,
        certificateNo: form.certificateNo.trim() || undefined,
        authorityDate: form.authorityDate || undefined,
        issuedBy: form.issuedBy.trim() || undefined,
        attachment: form.attachment.trim() || undefined,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-800">
              {mode === 'add-trn' ? 'Add Training Record' : 'Edit Training Record'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/60 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          <p className="text-xs text-indigo-700 font-bold bg-indigo-50 rounded-lg px-3 py-1.5 border border-indigo-100">Personnel: {personnelName}</p>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Training Type *', key: 'category', placeholder: 'e.g. Specialized, Mandatory, Seminars' },
              { label: 'Training Title *', key: 'courseName', placeholder: 'e.g. Data Privacy Act Awareness Seminar' },
              { label: 'School *', key: 'provider', placeholder: 'e.g. ITMS or PNP Training Service' },
              { label: 'Location', key: 'location', placeholder: 'e.g. Camp Crame, Quezon City' },
              { label: 'Inclusive Start Date', key: 'startDate', placeholder: 'YYYY-MM-DD', type: 'date' },
              { label: 'Inclusive End Date', key: 'completionDate', placeholder: 'YYYY-MM-DD', type: 'date' },
              { label: 'Number of Hours', key: 'hours', placeholder: 'e.g. 112', type: 'number' },
              { label: 'Source', key: 'source', placeholder: 'e.g. GO or CE' },
              { label: 'Auth Number', key: 'certificateNo', placeholder: 'e.g. 2024-286' },
              { label: 'Auth Date', key: 'authorityDate', placeholder: 'YYYY-MM-DD', type: 'date' },
              { label: 'Issued By', key: 'issuedBy', placeholder: 'e.g. PNP TS or DICTM' },
              { label: 'Attachment', key: 'attachment', placeholder: 'Document name, reference, or URL' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">{f.label}</label>
                <input
                  type={f.type ?? 'text'}
                  value={form[f.key as keyof TrnFormData]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  min={f.key === 'hours' ? '0' : undefined}
                  step={f.key === 'hours' ? '0.5' : undefined}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────

const BulkUploadModal: React.FC<{
  onClose: () => void;
  onComplete: (result: BulkUpsertResult, type: BulkTab) => void;
  bulkUpsertEducation: (records: Partial<EducationRecord>[]) => Promise<BulkUpsertResult>;
  bulkUpsertTraining: (records: Partial<TrainingRecord>[]) => Promise<BulkUpsertResult>;
  backendConnected: boolean;
}> = ({ onClose, onComplete, bulkUpsertEducation, bulkUpsertTraining, backendConnected }) => {
  const [tab, setTab] = useState<BulkTab>('education');
  const [parseResult, setParseResult] = useState<{
    valid: number; invalid: number; dropped: number;
    issues: Array<{ row: number; field: string; message: string }>;
    rows: Partial<EducationRecord>[] | Partial<TrainingRecord>[];
  } | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUpsertResult | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (tab === 'education') {
        const parsed = parseEducationCsv(text);
        setParseResult({
          valid: parsed.validRows.length,
          invalid: parsed.invalidRows.length,
          dropped: parsed.droppedCount,
          issues: parsed.invalidRows,
          rows: parsed.validRows,
        });
      } else {
        const parsed = parseTrainingCsv(text);
        setParseResult({
          valid: parsed.validRows.length,
          invalid: parsed.invalidRows.length,
          dropped: parsed.droppedCount,
          issues: parsed.invalidRows,
          rows: parsed.validRows,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!parseResult || parseResult.rows.length === 0) return;
    setUploading(true);
    setError('');
    try {
      let res: BulkUpsertResult;
      if (tab === 'education') {
        res = await bulkUpsertEducation(parseResult.rows as Partial<EducationRecord>[]);
      } else {
        res = await bulkUpsertTraining(parseResult.rows as Partial<TrainingRecord>[]);
      }
      setResult(res);
      onComplete(res, tab);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bulk upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const content = tab === 'education' ? generateEducationCsvTemplate() : generateTrainingCsvTemplate();
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tab === 'education' ? 'education_template.csv' : 'training_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFile = () => {
    setFileName('');
    setParseResult(null);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-slate-800">Bulk Upload — Education &amp; Training</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/60 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {!backendConnected && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Backend is offline. Bulk upload requires an active server connection.
            </div>
          )}

          {/* Tab */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            {(['education', 'training'] as BulkTab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); resetFile(); }}
                className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all capitalize ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Template download */}
          <div className="flex items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download {tab === 'education' ? 'Education' : 'Training'} CSV Template
            </button>
            <span className="text-[11px] text-slate-400">— upload this filled template below</span>
          </div>

          {/* Parsing Rules Info */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-[11px] text-sky-700 leading-relaxed font-medium space-y-0.5">
            <p className="font-extrabold text-sky-800 mb-1">📋 Tolerant Parsing Rules</p>
            <p>• <strong>Extra/unknown columns</strong> (e.g. salary, address) → silently <strong>dropped</strong></p>
            <p>• <strong>Blank rows</strong> or spacer rows → silently <strong>dropped</strong></p>
            <p>• Rows with <strong>no {tab === 'education' ? 'degree/institution' : 'courseName/provider'}</strong> → silently <strong>dropped</strong></p>
            <p>• Person exists + record matches → <strong>REPLACE</strong> | No match → <strong>ADD</strong> | Person not found → <strong>SKIP</strong></p>
          </div>

          {/* Drop Zone */}
          {!result && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              {fileName ? (
                <div>
                  <p className="text-sm font-bold text-slate-700">{fileName}</p>
                  <button onClick={e => { e.stopPropagation(); resetFile(); }} className="text-xs text-red-500 hover:underline mt-1">Remove</button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-500">Drag &amp; drop CSV here, or click to browse</p>
                  <p className="text-xs text-slate-400 mt-1">Accepts .csv files</p>
                </>
              )}
            </div>
          )}

          {/* Parse Preview */}
          {parseResult && !result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '✅ Valid Rows', value: parseResult.valid, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { label: '⚠️ Invalid Rows', value: parseResult.invalid, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { label: '⚫ Dropped Rows', value: parseResult.dropped, color: 'bg-slate-50 text-slate-600 border-slate-200' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                    <div className="text-2xl font-extrabold">{s.value}</div>
                    <div className="text-[11px] font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>

              {parseResult.issues.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 max-h-36 overflow-y-auto">
                  <p className="text-xs font-extrabold text-amber-700 mb-2">⚠️ Rows with issues (will be skipped):</p>
                  {parseResult.issues.map((iss, i) => (
                    <p key={i} className="text-[11px] text-amber-700 font-mono">
                      Row {iss.row} [{iss.field}]: {iss.message}
                    </p>
                  ))}
                </div>
              )}

              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

              {parseResult.valid > 0 && (
                <button
                  onClick={handleUpload}
                  disabled={uploading || !backendConnected}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? `Uploading ${parseResult.valid} records…` : `Upload ${parseResult.valid} valid records`}
                </button>
              )}
            </div>
          )}

          {/* Result Summary */}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '✅ Added', value: result.addedCount, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { label: '🔄 Replaced', value: result.replacedCount, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { label: '❌ Skipped', value: result.skippedCount, color: 'bg-red-50 text-red-600 border-red-200' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                    <div className="text-2xl font-extrabold">{s.value}</div>
                    <div className="text-[11px] font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>
              {result.skippedCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-36 overflow-y-auto">
                  <p className="text-xs font-extrabold text-red-700 mb-2">❌ Skipped rows:</p>
                  {result.skipped.map((s, i) => (
                    <p key={i} className="text-[11px] text-red-700 font-mono">
                      {JSON.stringify(s)}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500 text-center">The education list has been refreshed with the latest data.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex justify-end gap-2">
          {result ? (
            <button onClick={onClose} className="px-5 py-2 text-sm rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors">
              Done
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Export Modal ─────────────────────────────────────────────────────────────

const ExportModal: React.FC<{
  rows: ExportPersonnelData[];
  onClose: () => void;
}> = ({ rows, onClose }) => {
  const [content, setContent] = useState<ExportContent>('both');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const now = new Date().toISOString().slice(0, 10);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'csv') {
        if (content === 'education') exportEducationCsv(rows, `education_${now}.csv`);
        else if (content === 'training') exportTrainingCsv(rows, `training_${now}.csv`);
        else exportCombinedCsv(rows, `education_training_${now}.csv`);
      } else {
        if (content === 'education') await exportEducationPdf(rows, `education_${now}.pdf`);
        else if (content === 'training') await exportTrainingPdf(rows, `training_${now}.pdf`);
        else await exportCombinedPdf(rows, `education_training_${now}.pdf`);
      }
      setDone(true);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  const contentOptions: { key: ExportContent; label: string; desc: string }[] = [
    { key: 'both',      label: 'Education + Training', desc: 'Full report — both sections' },
    { key: 'education', label: 'Education Only',       desc: 'Academic degrees & certifications' },
    { key: 'training',  label: 'Training Only',        desc: 'Courses & specialized trainings' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-violet-600" />
            <h2 className="text-sm font-extrabold text-slate-800">Export Records</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/60 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Personnel count */}
          <div className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-100 rounded-xl">
            <CheckSquare className="w-4 h-4 text-violet-600 flex-shrink-0" />
            <p className="text-xs font-bold text-violet-700">
              Exporting records for <span className="text-violet-900 font-extrabold">{rows.length} personnel</span>
            </p>
          </div>

          {/* Content selection */}
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">What to Export</p>
            <div className="space-y-2">
              {contentOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setContent(opt.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    content === opt.key
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    content === opt.key ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                  }`}>
                    {content === opt.key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${content === opt.key ? 'text-violet-700' : 'text-slate-700'}`}>{opt.label}</p>
                    <p className="text-[11px] text-slate-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format selection */}
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">File Format</p>
            <div className="grid grid-cols-2 gap-2">
              {([['pdf', 'PDF Document', 'Formatted, printable report'], ['csv', 'CSV Spreadsheet', 'Raw data for Excel/Sheets']] as const).map(([key, label, desc]) => (
                <button
                  key={key}
                  onClick={() => setFormat(key as ExportFormat)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    format === key ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {key === 'pdf'
                      ? <FileText className={`w-4 h-4 ${format === key ? 'text-red-500' : 'text-slate-400'}`} />
                      : <FileSpreadsheet className={`w-4 h-4 ${format === key ? 'text-green-600' : 'text-slate-400'}`} />
                    }
                    <span className={`text-xs font-extrabold ${format === key ? 'text-violet-700' : 'text-slate-700'}`}>{label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {done && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Check className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-700">File downloaded successfully!</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-5 py-2 text-sm rounded-xl bg-violet-600 text-white font-extrabold hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm"
          >
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Download className="w-4 h-4" /> Export {format.toUpperCase()}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const EducationPage: React.FC = () => {
  const {
    personnelList, educationList, trainingList, role,
    addEducation, updateEducation, deleteEducation, bulkUpsertEducation,
    addTraining, updateTraining, deleteTraining, bulkUpsertTraining,
    backendConnected,
  } = useAuthRole();

  const isAdmin = hasManagementAccess(role);

  // ── Controls ──
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [sortOpen, setSortOpen] = useState(false);

  // ── Selection & Export ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(filteredPersonnel.map(p => p.id)));
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false); };

  const exportRows = useMemo<ExportPersonnelData[]>(() => {
    const scope = selectedIds.size > 0
      ? personnelList.filter(p => selectedIds.has(p.id))
      : personnelList;
    return scope.map(p => ({
      personnel: p,
      education: educationList.filter(e => e.personnelId === p.id),
      training: trainingList.filter(t => t.personnelId === p.id),
    }));
  }, [selectedIds, personnelList, educationList, trainingList]);


  // ── Modals ──
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activePersonnelId, setActivePersonnelId] = useState('');
  const [editingEdu, setEditingEdu] = useState<EducationRecord | undefined>(undefined);
  const [editingTrn, setEditingTrn] = useState<TrainingRecord | undefined>(undefined);
  const [bulkOpen, setBulkOpen] = useState(false);

  // ── Confirm Delete ──
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'edu' | 'trn'; id: string; label: string } | null>(null);

  // ── Computed / Sorted List ──
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name (A–Z)' },
    { key: 'division', label: 'Division' },
    { key: 'eduCount', label: 'Education Count' },
    { key: 'trnCount', label: 'Training Count' },
  ];

  const filteredPersonnel = useMemo(() => {
    let list = personnelList.filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.fullName?.toLowerCase().includes(q) ||
        p.rank?.toLowerCase().includes(q) ||
        p.division?.toLowerCase().includes(q) ||
        p.designation?.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortKey === 'name') { av = a.fullName ?? ''; bv = b.fullName ?? ''; }
      else if (sortKey === 'division') { av = a.division ?? ''; bv = b.division ?? ''; }
      else if (sortKey === 'eduCount') {
        av = educationList.filter(e => e.personnelId === a.id).length;
        bv = educationList.filter(e => e.personnelId === b.id).length;
      } else if (sortKey === 'trnCount') {
        av = trainingList.filter(t => t.personnelId === a.id).length;
        bv = trainingList.filter(t => t.personnelId === b.id).length;
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return list;
  }, [personnelList, educationList, trainingList, search, sortKey, sortDir]);

  const totalEdu = educationList.length;
  const totalTrn = trainingList.length;
  const withEdu = personnelList.filter(p => educationList.some(e => e.personnelId === p.id)).length;

  // ── Handlers ──
  const handleSaveEdu = async (records: Partial<EducationRecord>[]) => {
    await Promise.all(records.map(async data => {
      if (data.id) {
        await updateEducation(data as EducationRecord);
        return;
      }

      const newRec: EducationRecord = {
        id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        personnelId: data.personnelId!,
        academicLevel: data.academicLevel,
        degree: data.degree,
        institution: data.institution,
        major: data.major,
        startYear: data.startYear,
        yearGraduated: data.yearGraduated,
        honors: data.honors,
        highest: data.highest,
        ranking: data.ranking,
      };
      await addEducation(newRec);
    }));
  };

  const handleSaveTrn = async (data: Partial<TrainingRecord>) => {
    if (data.id) {
      await updateTraining(data as TrainingRecord);
    } else {
      const newRec: TrainingRecord = {
        id: `trn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        personnelId: data.personnelId!,
        courseName: data.courseName!,
        category: data.category,
        provider: data.provider!,
        location: data.location,
        startDate: data.startDate,
        completionDate: data.completionDate,
        hours: data.hours,
        source: data.source,
        certificateNo: data.certificateNo,
        authorityDate: data.authorityDate,
        issuedBy: data.issuedBy,
        attachment: data.attachment,
      };
      await addTraining(newRec);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'edu') await deleteEducation(confirmDelete.id);
    else await deleteTraining(confirmDelete.id);
    setConfirmDelete(null);
  };

  const openAddEdu = (personnelId: string) => {
    setActivePersonnelId(personnelId); setEditingEdu(undefined); setModalMode('add-edu');
  };
  const openEditEdu = (edu: EducationRecord) => {
    setActivePersonnelId(edu.personnelId); setEditingEdu(edu); setModalMode('edit-edu');
  };
  const openAddTrn = (personnelId: string) => {
    setActivePersonnelId(personnelId); setEditingTrn(undefined); setModalMode('add-trn');
  };
  const openEditTrn = (trn: TrainingRecord) => {
    setActivePersonnelId(trn.personnelId); setEditingTrn(trn); setModalMode('edit-trn');
  };

  const activePersonnel = personnelList.find(p => p.id === activePersonnelId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header Banner ── */}
      <div className="app-page-header app-surface p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">Education &amp; Skill Matrix</span>
              <span className="text-xs text-slate-500 font-mono">ITMS Technical Qualifications</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Academic Degrees &amp; Cyber Certifications</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage academic degrees, professional IT certifications, and technical courses</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setSelectMode(v => !v); if (selectMode) clearSelection(); }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectMode
                    ? 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {selectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {selectMode ? 'Selecting…' : 'Select'}
              </button>
              <button
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                {selectedIds.size > 0 ? `Export (${selectedIds.size})` : 'Export All'}
              </button>
              <button
                onClick={() => setBulkOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <Upload className="w-4 h-4" /> Bulk Upload
              </button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-slate-100">
          {[
            { label: 'Total Personnel', value: personnelList.length, color: 'text-slate-700' },
            { label: 'Have Education Record', value: withEdu, color: 'text-blue-700' },
            { label: 'Education Records', value: totalEdu, color: 'text-blue-700' },
            { label: 'Training Records', value: totalTrn, color: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg min-w-[90px]">
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-[11px] text-slate-500 text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toolbar: Search + Sort ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, rank, division…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setSortOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-all whitespace-nowrap"
          >
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            Sort: {sortOptions.find(s => s.key === sortKey)?.label}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px]">
              {sortOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (sortKey === opt.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortKey(opt.key); setSortDir('asc'); }
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${sortKey === opt.key ? 'text-blue-700 font-bold' : 'text-slate-700'}`}
                >
                  {opt.label}
                  {sortKey === opt.key && (
                    <span className="text-xs text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count + selection bar */}
      <div className="flex items-center justify-between -mt-3">
        <p className="text-xs text-slate-500">
          Showing {filteredPersonnel.length} of {personnelList.length} personnel
          {selectedIds.size > 0 && <span className="ml-2 font-bold text-violet-600">• {selectedIds.size} selected</span>}
        </p>
        {selectMode && (
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline font-semibold">Select all visible</button>
            <span className="text-slate-300">|</span>
            <button onClick={clearSelection} className="text-xs text-red-500 hover:underline font-semibold">Clear</button>
          </div>
        )}
      </div>

      {/* ── Personnel Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPersonnel.map((person) => {
          const pEdus = educationList.filter(e => e.personnelId === person.id);
          const pTrns = trainingList.filter(t => t.personnelId === person.id);

          return (
            <div
              key={person.id}
              onClick={() => selectMode && toggleSelect(person.id)}
              className={`p-5 rounded-2xl border-2 bg-white space-y-4 shadow-2xs hover:shadow-md transition-all ${
                selectMode ? 'cursor-pointer' : ''
              } ${
                selectedIds.has(person.id)
                  ? 'border-violet-400 shadow-violet-100 bg-violet-50/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="pb-3 border-b border-slate-100 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Selection checkbox */}
                  {selectMode && (
                    <button
                      onClick={e => { e.stopPropagation(); toggleSelect(person.id); }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {selectedIds.has(person.id)
                        ? <CheckSquare className="w-4 h-4 text-violet-600" />
                        : <Square className="w-4 h-4 text-slate-400" />
                      }
                    </button>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">{person.rank} {person.fullName}</div>
                    <div className="text-xs text-blue-700 font-bold">{person.designation} • {person.division}</div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-mono font-bold">{pEdus.length} edu</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-mono font-bold">{pTrns.length} trn</span>
                </div>
              </div>

              {/* Degrees */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> Academic Attainment
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => openAddEdu(person.id)}
                      className="flex items-center gap-1 text-[10px] font-extrabold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors border border-blue-100"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
                {pEdus.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No formal degree record logged.</p>
                ) : (
                  pEdus.map(edu => (
                    <div key={edu.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 group relative">
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">
                            {[edu.academicLevel, edu.degree].filter(Boolean).join(' — ') || 'Academic Record'}
                          </span>
                          {edu.institution && <span className="text-[11px] text-blue-700 font-extrabold block">{edu.institution}</span>}
                          {edu.major && <span className="text-[10px] text-slate-500 block">Major: {edu.major}</span>}
                          {edu.honors && <span className="text-[10px] text-slate-500 italic">Grade: {edu.honors}</span>}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {(edu.startYear || edu.yearGraduated) && (
                            <span className="font-mono text-slate-600 font-bold text-[11px]">
                              {edu.startYear ?? '—'}–{edu.yearGraduated ?? '—'}
                            </span>
                          )}
                          {edu.highest && <Badge variant="info" size="sm">Highest</Badge>}
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditEdu(edu)} className="p-1 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors" title="Edit">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete({
                                  type: 'edu',
                                  id: edu.id,
                                  label: [edu.academicLevel, edu.degree, edu.institution].filter(Boolean).join(' — ') || 'this academic record'
                                })}
                                className="p-1 rounded-lg hover:bg-red-100 text-red-400 transition-colors" title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {(edu.certifications?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {edu.certifications?.map((c, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-mono font-extrabold">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Training */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Specialized IT Trainings
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => openAddTrn(person.id)}
                      className="flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors border border-indigo-100"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
                {pTrns.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No completed training bootcamp logs.</p>
                ) : (
                  pTrns.map(trn => (
                    <div key={trn.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between text-xs gap-2 group">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{trn.courseName}</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {[trn.category, trn.provider, trn.location].filter(Boolean).join(' • ')}
                        </span>
                        {(trn.startDate || trn.completionDate) && (
                          <span className="text-[10px] text-slate-400 block">{trn.startDate ?? '—'} to {trn.completionDate ?? '—'}</span>
                        )}
                        {trn.certificateNo && <span className="text-[10px] text-slate-400 font-mono">Auth #{trn.certificateNo}</span>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {trn.hours && <Badge variant="info" size="sm">{trn.hours} hrs</Badge>}
                        {isAdmin && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditTrn(trn)} className="p-1 rounded-lg hover:bg-indigo-100 text-indigo-500 transition-colors" title="Edit">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: 'trn', id: trn.id, label: trn.courseName })}
                              className="p-1 rounded-lg hover:bg-red-100 text-red-400 transition-colors" title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {filteredPersonnel.length === 0 && (
          <div className="col-span-2 py-16 text-center">
            <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold">No personnel found matching "{search}"</p>
            <button onClick={() => setSearch('')} className="mt-2 text-sm text-blue-600 hover:underline">Clear search</button>
          </div>
        )}
      </div>

      {/* ── Floating Selection Toolbar ── */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
          <CheckSquare className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold">{selectedIds.size} personnel selected</span>
          <div className="w-px h-5 bg-slate-700" />
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-extrabold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Selected
          </button>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-700 text-sm font-semibold text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {(modalMode === 'add-edu' || modalMode === 'edit-edu') && activePersonnel && (
        <EduModal
          mode={modalMode}
          personnelId={activePersonnelId}
          personnelName={`${activePersonnel.rank} ${activePersonnel.fullName}`}
          existing={editingEdu}
          existingRecords={educationList.filter(record => record.personnelId === activePersonnelId)}
          onSave={handleSaveEdu}
          onClose={() => setModalMode(null)}
        />
      )}
      {(modalMode === 'add-trn' || modalMode === 'edit-trn') && activePersonnel && (
        <TrnModal
          mode={modalMode}
          personnelId={activePersonnelId}
          personnelName={`${activePersonnel.rank} ${activePersonnel.fullName}`}
          existing={editingTrn}
          onSave={handleSaveTrn}
          onClose={() => setModalMode(null)}
        />
      )}
      {bulkOpen && (
        <BulkUploadModal
          onClose={() => setBulkOpen(false)}
          onComplete={() => setBulkOpen(false)}
          bulkUpsertEducation={bulkUpsertEducation}
          bulkUpsertTraining={bulkUpsertTraining}
          backendConnected={backendConnected}
        />
      )}
      {exportOpen && (
        <ExportModal
          rows={exportRows}
          onClose={() => setExportOpen(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${confirmDelete.label}"? This cannot be undone.`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};
