import { useEffect, useRef, type FormEvent } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../common/SystemUI';
import type { DlosClassification } from '../../types/dlos';
import { PNP_RANKS } from '../../constants/ranks';
import { DLOS_STATUS_LABELS } from './dlosStatuses';

const primaryFields = [
  ['docketNumber', 'Docket number'], ['didmNsuDocketNumber', 'DIDM/NSU docket number'],
  ['lastName', 'Last name']
] as const;
const extraFields = [
  ['rank', 'Rank'], ['firstName', 'First name'], ['middleName', 'Middle name'],
  ['shoName', 'Name of SHO'], ['didmReferenceNumber', 'DIDM reference number'],
  ['summaryHearingDocketNumber', 'Summary hearing docket number'], ['unitOfficeCaseFrom', 'Unit/Office case from']
] as const;
const dateFields = [
  ['signedByDaDate', 'Date signed by DA'], ['complaintDate', 'Date complaint'],
  ['forwardedToDlodDate', 'Date forwarded'], ['receivedByShoDate', 'Date received by SHO'],
  ['resolvedByShoDate', 'Date resolved by SHO']
] as const;
const advancedNames = [...extraFields.map(([name]) => name), 'presidentialConfirmation', 'dateField', 'dateFrom', 'dateTo'];
export const DLOS_FILTER_KEYS = new Set<string>([...primaryFields.map(([name]) => name), 'caseStatus', ...advancedNames]);

interface Props {
  filters: Record<string, string>;
  classification: DlosClassification | null;
  appliedCount: number;
  onChange: (filters: Record<string, string>) => void;
  onClassificationChange: (classification: DlosClassification) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}

export const DlosCaseFilters = ({ filters, classification, appliedCount, onChange, onClassificationChange, onSearch, onClear }: Props) => {
  const set = (key: string, value: string) => onChange({ ...filters, [key]: value });
  const advancedActive = advancedNames.some(key => Boolean(filters[key]));
  const advancedRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (advancedActive && advancedRef.current) advancedRef.current.open = true; }, [advancedActive]);
  return <form className="dlos-filter-surface" onSubmit={onSearch}>
    <div className="dlos-filter-header">
      <div className="dlos-filter-header-copy"><div><h2>Case monitoring filters</h2><p>Choose a case type and search criteria.</p></div>
        {appliedCount > 0 && <span className="dlos-applied-count">{appliedCount} active {appliedCount === 1 ? 'filter' : 'filters'}</span>}
      </div>
      <div className="dlos-filter-classification" role="group" aria-labelledby="dlos-filter-classification-label">
        <span className="dlos-filter-classification-label" id="dlos-filter-classification-label">Case type</span>
        <div className="dlos-filter-classification-options">
          {([['grave', 'Grave'], ['less_grave', 'Less Grave']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={classification === value}
            className="dlos-filter-classification-option" onClick={() => onClassificationChange(value)}>{label}</button>)}
        </div>
      </div>
    </div>
    <div className="dlos-filter-body">
      {!classification ? <p className="dlos-filter-classification-prompt" role="status">Select Grave or Less Grave to load the monthly case list.</p> : <>
      <div className="dlos-filter-grid">{primaryFields.map(([key, label]) => <label key={key}>{label}
        <input maxLength={160} value={filters[key] || ''} onChange={event => set(key, event.target.value)} />
      </label>)}<label>Case status<select value={filters.caseStatus || ''} onChange={event => set('caseStatus', event.target.value)}><option value="">Any status</option>{DLOS_STATUS_LABELS.map(status => <option key={status} value={status}>{status}</option>)}</select></label></div>
      <details ref={advancedRef} className="dlos-advanced-filters">
        <summary><SlidersHorizontal size={16} aria-hidden="true" /> More filters</summary>
        <div className="dlos-filter-grid">{extraFields.map(([key, label]) => <label key={key}>{label}
          {key === 'rank' ? <select value={filters.rank || ''} onChange={event => set('rank', event.target.value)}>
            <option value="">---ALL---</option>
            {filters.rank && !PNP_RANKS.some(rank => rank.code.toLowerCase() === filters.rank.toLowerCase()) && <option value={filters.rank}>{filters.rank}</option>}
            {PNP_RANKS.map(rank => <option key={rank.code} value={rank.code}>{rank.code === 'Pat' ? 'Patrolman/Patrolwoman' : rank.name}</option>)}
          </select> : <input maxLength={160} value={filters[key] || ''} onChange={event => set(key, event.target.value)} />}
        </label>)}
          <label>For Presidential Confirmation (if applicable)<select value={filters.presidentialConfirmation || ''} onChange={event => set('presidentialConfirmation', event.target.value)}><option value="">Any</option><option value="confirmed">Yes</option><option value="not_confirmed">No</option></select></label>
          <label>Filter date by<select value={filters.dateField || ''} onChange={event => onChange(event.target.value ? { ...filters, dateField: event.target.value } : { ...filters, dateField: '', dateFrom: '', dateTo: '' })}><option value="">Select date</option>{dateFields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Date from<input type="date" disabled={!filters.dateField} max={filters.dateTo || undefined} value={filters.dateFrom || ''} onChange={event => set('dateFrom', event.target.value)} /></label>
          <label>Date to<input type="date" disabled={!filters.dateField} min={filters.dateFrom || undefined} value={filters.dateTo || ''} onChange={event => set('dateTo', event.target.value)} /></label>
        </div>
      </details>
      <div className="dlos-filter-actions"><Button type="submit" variant="primary" icon={Search}>Search</Button><Button type="button" onClick={onClear}>Clear filters</Button></div>
      </>}
    </div>
  </form>;
};
