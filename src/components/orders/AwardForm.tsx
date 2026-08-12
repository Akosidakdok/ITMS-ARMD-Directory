import React, { useMemo, useState } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import type { AwardOrderType, AwardRecord, Personnel } from '../../types/pais';
import { AWARD_TITLE_OPTIONS } from '../../data/awardTitles';
import { SearchableSelect } from '../common/SearchableSelect';

interface AwardFormProps {
  personnel: Personnel[];
  initialRecord?: AwardRecord;
  onSubmit: (award: Omit<AwardRecord, 'id' | 'status'> | AwardRecord) => Promise<void>;
  onCancel: () => void;
}

type AwardFormErrors = Partial<Record<
  'orderType' | 'title' | 'citationDetails' | 'awardName' | 'authorityDate' | 'personnelId' | 'server',
  string
>>;

export const AwardForm: React.FC<AwardFormProps> = ({
  personnel,
  initialRecord,
  onSubmit,
  onCancel
}) => {
  const [orderType, setOrderType] = useState<AwardOrderType | ''>(initialRecord?.orderType || '');
  const [title, setTitle] = useState(initialRecord?.title || '');
  const [citationDetails, setCitationDetails] = useState(initialRecord?.citationDetails || '');
  const [awardName, setAwardName] = useState(initialRecord?.awardName || '');
  const [authorityDate, setAuthorityDate] = useState(initialRecord?.authorityDate || '');
  const [personnelId, setPersonnelId] = useState(initialRecord?.personnelId || '');
  const [errors, setErrors] = useState<AwardFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const personnelOptions = useMemo(() => personnel.map(person => ({
    value: person.id,
    label: `${person.rank} ${person.fullName}`,
    description: `${person.badgeNo} - ${person.division} - ${person.designation}`
  })), [personnel]);

  const titleOptions = AWARD_TITLE_OPTIONS.map(option => ({ value: option, label: option }));
  const orderTypeOptions = [
    { value: 'General Order', label: 'General Order' },
    { value: 'Special Order', label: 'Special Order' },
    { value: 'Letter Order', label: 'Letter Order' }
  ];

  const handleTitleChange = (nextTitle: string) => {
    // Keep the generated Award Name in sync until the user customizes it.
    const shouldUpdateAwardName = !awardName.trim() || awardName === title;
    setTitle(nextTitle);
    if (shouldUpdateAwardName) setAwardName(nextTitle);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const nextErrors: AwardFormErrors = {};
    if (!orderType) nextErrors.orderType = 'Select an Order Type.';
    if (!title) nextErrors.title = 'Select an award title.';
    if (!citationDetails.trim()) nextErrors.citationDetails = 'Citation Details are required.';
    if (!awardName.trim()) nextErrors.awardName = 'Award Name is required.';
    if (!authorityDate) nextErrors.authorityDate = 'Authority Date is required.';
    if (!personnelId) nextErrors.personnelId = 'Select personnel.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const selectedPersonnel = personnel.find(person => person.id === personnelId);
    if (!selectedPersonnel) return;

    setIsSaving(true);
    try {
      await onSubmit({
        ...(initialRecord
          ? { id: initialRecord.id, status: initialRecord.status, updatedAt: new Date().toISOString() }
          : { createdAt: new Date().toISOString() }),
        orderType: orderType as AwardOrderType,
        title,
        citationDetails: citationDetails.trim(),
        awardName: awardName.trim(),
        authorityDate,
        personnelId,
        personnelName: `${selectedPersonnel.rank} ${selectedPersonnel.fullName}`
      });
    } catch (error) {
      setErrors({
        server: error instanceof Error ? error.message : 'Unable to save the award.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.server && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {errors.server}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Order Type"
          value={orderType}
          options={orderTypeOptions}
          onChange={value => setOrderType(value as AwardOrderType | '')}
          placeholder="Select order type"
          required
          error={errors.orderType}
        />
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Authority Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={authorityDate}
            onChange={event => setAuthorityDate(event.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl border bg-white text-xs outline-none focus:border-blue-500 ${
              errors.authorityDate ? 'border-rose-400' : 'border-slate-300'
            }`}
          />
          {errors.authorityDate && <p className="text-[11px] text-rose-600 mt-1">{errors.authorityDate}</p>}
        </div>
      </div>

      <SearchableSelect
        label="Title"
        value={title}
        options={titleOptions}
        onChange={handleTitleChange}
        placeholder="Search award titles"
        required
        error={errors.title}
      />

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Citation Details <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={citationDetails}
          onChange={event => setCitationDetails(event.target.value)}
          placeholder="Encode the complete award citation or description..."
          rows={5}
          className={`w-full px-3 py-2.5 rounded-xl border bg-white text-xs leading-relaxed outline-none resize-y focus:border-blue-500 ${
            errors.citationDetails ? 'border-rose-400' : 'border-slate-300'
          }`}
        />
        {errors.citationDetails && <p className="text-[11px] text-rose-600 mt-1">{errors.citationDetails}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Award Name <span className="text-rose-500">*</span>
          </label>
          <input
            value={awardName}
            onChange={event => setAwardName(event.target.value)}
            placeholder="Name of award"
            className={`w-full px-3 py-2.5 rounded-xl border bg-white text-xs outline-none focus:border-blue-500 ${
              errors.awardName ? 'border-rose-400' : 'border-slate-300'
            }`}
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Automatically filled from the selected title. You may edit it when needed.
          </p>
          {errors.awardName && <p className="text-[11px] text-rose-600 mt-1">{errors.awardName}</p>}
        </div>
        <SearchableSelect
          label="Name of Personnel"
          value={personnelId}
          options={personnelOptions}
          onChange={setPersonnelId}
          placeholder="Search personnel"
          required
          error={errors.personnelId}
        />
      </div>

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
          {isSaving ? 'Saving Award...' : initialRecord ? 'Update Award' : 'Save Award'}
        </button>
      </div>
    </form>
  );
};
