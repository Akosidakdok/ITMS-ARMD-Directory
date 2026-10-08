import React, { useId } from 'react';
import type { PersonnelAgencyType } from '../../types/pais';

interface PersonnelAgencyFieldsProps {
  agencyType: PersonnelAgencyType;
  agencyName?: string;
  agencyOptions?: string[];
  onAgencyTypeChange: (value: PersonnelAgencyType) => void;
  onAgencyNameChange: (value: string) => void;
  disabled?: boolean;
}

export const PersonnelAgencyFields: React.FC<PersonnelAgencyFieldsProps> = ({
  agencyType,
  agencyName = '',
  agencyOptions = [],
  onAgencyTypeChange,
  onAgencyNameChange,
  disabled = false
}) => {
  const id = useId();
  const agencyNameId = `${id}-agency-name`;
  const agencyOptionsId = `${id}-agency-options`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div>
        <label htmlFor={`${id}-agency-type`} className="block text-2xs font-bold text-slate-700 mb-1">
          Agency
        </label>
        <select
          id={`${id}-agency-type`}
          value={agencyType}
          onChange={event => onAgencyTypeChange(event.target.value as PersonnelAgencyType)}
          disabled={disabled}
          className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
        >
          <option value="PNP">Philippine National Police (PNP)</option>
          <option value="OTHER_GOVERNMENT">Other Government Agency</option>
        </select>
      </div>

      {agencyType === 'OTHER_GOVERNMENT' && (
        <div>
          <label htmlFor={agencyNameId} className="block text-2xs font-bold text-slate-700 mb-1">
            Government Agency Name <span className="text-red-500">*</span>
          </label>
          <input
            id={agencyNameId}
            type="text"
            list={agencyOptionsId}
            value={agencyName}
            onChange={event => onAgencyNameChange(event.target.value)}
            disabled={disabled}
            required
            maxLength={160}
            autoComplete="organization"
            placeholder="Enter the official agency name"
            className="w-full p-2 border border-slate-300 rounded font-medium text-slate-800 bg-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
          />
          <datalist id={agencyOptionsId}>
            {agencyOptions.map(option => <option key={option} value={option} />)}
          </datalist>
          <p className="mt-1 text-[10px] text-slate-500">Choose a saved agency or enter a new one. Newly saved names will be available next time.</p>
        </div>
      )}
    </div>
  );
};
