import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import type { LeaveRecord, Personnel } from '../../types/pais';
import { SearchableSelect } from '../common/SearchableSelect';

export const CALENDAR_LEAVE_TYPES = [
  'Service Leave',
  'Mandatory Leave',
  'Special Privilege Leave'
] as const;

interface LeaveCalendarFormProps {
  personnel: Personnel[];
  initialRecord?: LeaveRecord | null;
  onSubmit: (leave: LeaveRecord) => Promise<void>;
  onCancel: () => void;
}

type FormErrors = Partial<Record<
  'personnelId' | 'startDate' | 'endDate' | 'leaveType' | 'server',
  string
>>;

export const LeaveCalendarForm: React.FC<LeaveCalendarFormProps> = ({
  personnel,
  initialRecord,
  onSubmit,
  onCancel
}) => {
  const [personnelId, setPersonnelId] = useState(initialRecord?.personnelId || '');
  const [startDate, setStartDate] = useState(initialRecord?.startDate || '');
  const [endDate, setEndDate] = useState(initialRecord?.endDate || '');
  const [leaveType, setLeaveType] = useState(initialRecord?.leaveType || '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPersonnelId(initialRecord?.personnelId || '');
    setStartDate(initialRecord?.startDate || '');
    setEndDate(initialRecord?.endDate || '');
    setLeaveType(initialRecord?.leaveType || '');
    setErrors({});
  }, [initialRecord]);

  const personnelOptions = useMemo(() => personnel.map(person => ({
    value: person.id,
    label: `${person.rank} ${person.fullName}`,
    description: `${person.badgeNo} · ${person.division} · ${person.designation}`
  })), [personnel]);

  const leaveTypeOptions = CALENDAR_LEAVE_TYPES.map(type => ({
    value: type,
    label: type
  }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const resolvedEndDate = endDate || startDate;
    const nextErrors: FormErrors = {};
    if (!personnelId) nextErrors.personnelId = 'Select personnel.';
    if (!startDate) nextErrors.startDate = 'Start Date is required.';
    if (!leaveType) nextErrors.leaveType = 'Select a Type of Leave.';
    if (resolvedEndDate && startDate && resolvedEndDate < startDate) {
      nextErrors.endDate = 'End Date cannot be earlier than Start Date.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const days = Math.floor(
      (Date.parse(resolvedEndDate) - Date.parse(startDate)) / 86400000
    ) + 1;

    setIsSaving(true);
    try {
      await onSubmit({
        id: initialRecord?.id || `lve-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        personnelId,
        startDate,
        endDate: resolvedEndDate,
        leaveType,
        days,
        status: initialRecord?.status || 'Approved',
        purpose: initialRecord?.purpose || 'Scheduled leave calendar entry'
      });
    } catch (error) {
      setErrors({
        server: error instanceof Error ? error.message : 'Unable to save the leave record.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed">
        Leave records are encoded here. The calendar is a visual overview only and cannot be used to select or edit dates.
      </div>

      {errors.server && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {errors.server}
        </div>
      )}

      <SearchableSelect
        label="Name of Personnel"
        value={personnelId}
        options={personnelOptions}
        onChange={setPersonnelId}
        placeholder="Search personnel"
        required
        error={errors.personnelId}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-green-700 mb-1.5">
            Start Date of Leave <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={event => {
              setStartDate(event.target.value);
              if (!endDate) setEndDate(event.target.value);
            }}
            className={`w-full px-3 py-2.5 rounded-xl border bg-white text-xs outline-none focus:border-blue-500 ${
              errors.startDate ? 'border-rose-400' : 'border-slate-300'
            }`}
          />
          {errors.startDate && <p className="text-[11px] text-rose-600 mt-1">{errors.startDate}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-red-600 mb-1.5">
            End Date of Leave <span className="text-slate-400 font-medium">(if applicable)</span>
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={event => setEndDate(event.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl border bg-white text-xs outline-none focus:border-blue-500 ${
              errors.endDate ? 'border-rose-400' : 'border-slate-300'
            }`}
          />
          {errors.endDate && <p className="text-[11px] text-rose-600 mt-1">{errors.endDate}</p>}
        </div>
      </div>

      <SearchableSelect
        label="Type of Leave"
        value={leaveType}
        options={leaveTypeOptions}
        onChange={setLeaveType}
        placeholder="Select leave type"
        required
        error={errors.leaveType}
      />

      <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSaving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving Leave…' : initialRecord ? 'Update Leave' : 'Save Leave'}
        </button>
      </div>
    </form>
  );
};
