import type { FormEvent } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '../common/SystemUI';
import { OFFICE_DIVISION_OPTIONS, PNP_RANKS } from '../../constants/ranks';
import type { DlosCaseView } from '../../types/dlos';
import { DLOS_STATUS_LABELS } from './dlosStatuses';

const textFields = [
  ['firstName', 'First name', 'Enter first name'],
  ['middleName', 'Middle name', 'Enter middle name'],
  ['lastName', 'Last name', 'Enter last name'],
  ['didmNsuDocketNumber', 'DIDM/NSU docket number', 'Enter docket number'],
  ['summaryHearingDocketNumber', 'Docket number under summary hearing', 'Enter docket number'],
  ['didmReferenceNumber', 'DIDM reference number', 'Enter reference number']
] as const;

const dateFields = [
  ['caseDate', 'Registration date'],
  ['signedByDaDate', 'Date signed by DA'],
  ['complaintDate', 'Complaint date'],
  ['forwardedToDlodDate', 'Forwarded to DLOD'],
  ['receivedByShoDate', 'Received by SHO'],
  ['resolvedByShoDate', 'Resolved by SHO'],
  ['decisionIssuedDate', 'Decision issued date']
] as const;

export const DLOS_FILTER_KEYS = new Set<string>([
  ...textFields.map(([name]) => name), 'docketNumber', 'shoName', 'caseStatus', 'rank',
  'unitOfficeCaseFrom', 'presidentialConfirmation', 'dateField', 'dateFrom', 'dateTo'
]);

interface Props {
  filters: Record<string, string>;
  classification: DlosCaseView;
  appliedCount: number;
  onChange: (filters: Record<string, string>) => void;
  onClassificationChange: (classification: DlosCaseView) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}

export const DlosCaseFilters = ({ filters, classification, appliedCount, onChange, onClassificationChange, onSearch, onClear }: Props) => {
  const set = (key: string, value: string) => onChange({ ...filters, [key]: value });
  const textField = (key: typeof textFields[number][0]) => {
    const [, label, placeholder] = textFields.find(([name]) => name === key)!;
    return <label key={key}>{label}<input maxLength={160} placeholder={placeholder} value={filters[key] || ''} onChange={event => set(key, event.target.value)} /></label>;
  };

  return <form className="dlos-filter-surface" onSubmit={onSearch}>
    <div className="dlos-filter-header">
      <div className="dlos-filter-header-copy"><div><h2>Case type</h2><p>View all cases or focus on one classification.</p></div>
        {appliedCount > 0 && <span className="dlos-applied-count">{appliedCount} active {appliedCount === 1 ? 'filter' : 'filters'}</span>}
      </div>
      <div className="dlos-filter-classification-options" role="group" aria-label="Case type">
        {([['all', 'All cases'], ['grave', 'Grave'], ['less_grave', 'Less Grave']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={classification === value}
          className="dlos-filter-classification-option" onClick={() => onClassificationChange(value)}>{label}</button>)}
      </div>
    </div>
    <fieldset className="dlos-filter-body">
      <legend className="dlos-filter-legend"><Search size={13} aria-hidden="true" /> Search</legend>
      <div className="dlos-filter-row dlos-filter-row-four">
        <label>Rank<select value={filters.rank || ''} onChange={event => set('rank', event.target.value)}>
          <option value="">All ranks</option>{PNP_RANKS.map(rank => <option key={rank.code} value={rank.code}>{rank.name} ({rank.code})</option>)}
        </select></label>
        {textField('firstName')}{textField('middleName')}{textField('lastName')}
      </div>
      <div className="dlos-filter-row dlos-filter-row-three">
        {textField('didmNsuDocketNumber')}
        <label>For presidential confirmation (if applicable)<select value={filters.presidentialConfirmation || ''} onChange={event => set('presidentialConfirmation', event.target.value)}>
          <option value="">All</option><option value="not_applicable">Not applicable</option><option value="pending">Pending</option>
          <option value="confirmed">Yes</option><option value="not_confirmed">No</option>
        </select></label>
        {textField('summaryHearingDocketNumber')}
      </div>
      <div className="dlos-filter-row dlos-filter-row-three">
        {textField('didmReferenceNumber')}
        <label>Unit/Office case from<span className="dlos-filter-combobox"><input list="dlos-unit-office-options" maxLength={160} placeholder="Select or enter a unit/office" value={filters.unitOfficeCaseFrom || ''} onChange={event => set('unitOfficeCaseFrom', event.target.value)} /><ChevronDown size={15} aria-hidden="true" /></span>
          <datalist id="dlos-unit-office-options">{OFFICE_DIVISION_OPTIONS.map(option => <option key={option.value} value={option.value} label={option.name} />)}</datalist>
        </label>
        <label>Case status<select value={filters.caseStatus || ''} onChange={event => set('caseStatus', event.target.value)}>
          <option value="">All statuses</option>{DLOS_STATUS_LABELS.map(status => <option key={status} value={status}>{status}</option>)}
        </select></label>
      </div>
      <div className="dlos-filter-row dlos-filter-row-last">
        <label>Filter date by<select value={filters.dateField || ''} onChange={event => onChange({ ...filters, dateField: event.target.value, ...(!event.target.value && { dateFrom: '', dateTo: '' }) })}>
          <option value="">All dates</option>{dateFields.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <div className="dlos-filter-date-range"><span>Date range from &amp; to</span><div>
          <input aria-label="Date from" type="date" disabled={!filters.dateField} max={filters.dateTo || undefined} value={filters.dateFrom || ''} onChange={event => set('dateFrom', event.target.value)} />
          <span aria-hidden="true">to</span>
          <input aria-label="Date to" type="date" disabled={!filters.dateField} min={filters.dateFrom || undefined} value={filters.dateTo || ''} onChange={event => set('dateTo', event.target.value)} />
        </div></div>
        <div className="dlos-filter-actions"><Button type="button" onClick={onClear}>Clear filter</Button><Button type="submit" variant="primary" icon={Search}>Search</Button></div>
      </div>
      <details className="dlos-filter-more"><summary>More filters</summary><div className="dlos-filter-row dlos-filter-row-three">
        <label>DLOS docket number<input maxLength={160} placeholder="Enter docket number" value={filters.docketNumber || ''} onChange={event => set('docketNumber', event.target.value)} /></label>
        <label>Name of SHO<input maxLength={160} placeholder="Enter SHO name" value={filters.shoName || ''} onChange={event => set('shoName', event.target.value)} /></label>
      </div></details>
    </fieldset>
  </form>;
};
