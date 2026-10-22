import { useState, type FormEvent } from 'react';
import { ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../common/SystemUI';
import { Modal } from '../common/Modal';
import type { DlosClassification, DlosPenaltyEntry } from '../../types/dlos';
import { DLOS_STATUS_LABELS } from './dlosStatuses';

const primaryFields = [
  ['docketNumber', 'Docket number'], ['didmNsuDocketNumber', 'DIDM/NSU docket number'],
  ['lastName', 'Last name']
] as const;
export const DLOS_FILTER_KEYS = new Set<string>([...primaryFields.map(([name]) => name), 'caseStatus', 'rank', 'firstName', 'middleName', 'shoName', 'didmReferenceNumber', 'summaryHearingDocketNumber', 'unitOfficeCaseFrom', 'presidentialConfirmation', 'dateField', 'dateFrom', 'dateTo']);

interface Props {
  filters: Record<string, string>;
  classification: DlosClassification | null;
  appliedCount: number;
  penalties: DlosPenaltyEntry[];
  penaltiesLoading: boolean;
  penaltiesError: string;
  onChange: (filters: Record<string, string>) => void;
  onClassificationChange: (classification: DlosClassification) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}

export const DlosCaseFilters = ({ filters, classification, appliedCount, penalties, penaltiesLoading, penaltiesError, onChange, onClassificationChange, onSearch, onClear }: Props) => {
  const set = (key: string, value: string) => onChange({ ...filters, [key]: value });
  const [selectedPenalty, setSelectedPenalty] = useState<DlosPenaltyEntry | null>(null);
  const [selectedPenaltyCategory, setSelectedPenaltyCategory] = useState<DlosPenaltyEntry['category'] | null>(null);
  const penaltyCategories: DlosPenaltyEntry['category'][] = ['suspension', 'demotion', 'dismissal', 'exonerated'];
  const selectedEntries = penalties.filter(entry => entry.category === selectedPenaltyCategory);
  return <form className="dlos-filter-surface" onSubmit={onSearch}>
    <div className="dlos-filter-header">
      <div className="dlos-filter-header-copy"><div><h2>Penalty and case filters</h2><p>Choose a penalty category to see personnel. Choose a case type under More filters to search cases.</p></div>
        {appliedCount > 0 && <span className="dlos-applied-count">{appliedCount} active {appliedCount === 1 ? 'filter' : 'filters'}</span>}
      </div>
      <div className="dlos-penalty-filter" role="group" aria-labelledby="dlos-penalty-filter-label">
        <span className="dlos-penalty-filter-label" id="dlos-penalty-filter-label">Filter personnel by penalty</span>
        <div className="dlos-penalty-options">
          {penaltyCategories.map(category => <button key={category} type="button" aria-pressed={selectedPenaltyCategory === category}
            className="dlos-penalty-option" onClick={() => setSelectedPenaltyCategory(category)}><span>{category}</span><span className="dlos-penalty-count">{penaltiesLoading ? '…' : penalties.filter(entry => entry.category === category).length}</span></button>)}
        </div>
      </div>
    </div>
    <div className="dlos-filter-body">
      <section className="dlos-penalty-results" aria-live="polite">
        {!selectedPenaltyCategory ? <p className="dlos-penalty-empty">Select a penalty category above to view the personnel list.</p> : <>
          <div className="dlos-penalty-results-heading"><div><h3>{selectedPenaltyCategory} personnel</h3><p>Select a name to see the docket and penalty details.</p></div><span>{selectedEntries.length} {selectedEntries.length === 1 ? 'person' : 'people'}</span></div>
          {penaltiesLoading ? <p className="dlos-penalty-empty">Loading personnel…</p> : selectedEntries.length ? <ul className="dlos-penalty-people">{selectedEntries.map(entry => <li key={entry.id}><button type="button" className="dlos-penalty-person" onClick={() => setSelectedPenalty(entry)}><span>{entry.name}</span><ChevronRight size={16} aria-hidden="true" /></button></li>)}</ul> : <p className="dlos-penalty-empty">No recorded personnel in this category.</p>}
        </>}
        {penaltiesError && <p role="alert" className="mt-2 text-xs text-rose-700">{penaltiesError}</p>}
      </section>
      <details className="dlos-advanced-filters">
        <summary><SlidersHorizontal size={16} aria-hidden="true" /> More filters</summary>
        <div className="py-3">
          <span className="mb-2 block text-xs font-semibold text-slate-700">Case type</span>
          <div className="dlos-filter-classification-options">
            {([['grave', 'Grave'], ['less_grave', 'Less Grave']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={classification === value}
              className="dlos-filter-classification-option" onClick={() => onClassificationChange(value)}>{label}</button>)}
          </div>
        </div>
      </details>
      {!classification ? <p className="dlos-filter-classification-prompt" role="status">Choose Grave or Less Grave under More filters to search the monthly case list.</p> : <>
      <div className="dlos-filter-grid">{primaryFields.map(([key, label]) => <label key={key}>{label}
        <input maxLength={160} value={filters[key] || ''} onChange={event => set(key, event.target.value)} />
      </label>)}<label>Case status<select value={filters.caseStatus || ''} onChange={event => set('caseStatus', event.target.value)}><option value="">Any status</option>{DLOS_STATUS_LABELS.map(status => <option key={status} value={status}>{status}</option>)}</select></label></div>
      <div className="dlos-filter-actions"><Button type="submit" variant="primary" icon={Search}>Search</Button><Button type="button" onClick={onClear}>Clear filters</Button></div>
      </>}
    </div>
    <Modal isOpen={selectedPenalty !== null} onClose={() => setSelectedPenalty(null)} title={selectedPenalty?.name || 'Personnel penalty details'} subtitle={selectedPenalty ? `${selectedPenalty.category.toUpperCase()} · Docket ${selectedPenalty.docketNumber}` : undefined} maxWidth="md">
      {selectedPenalty && <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-500">Docket number</dt><dd className="mt-1">{selectedPenalty.docketNumber}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Penalty effectivity date</dt><dd className="mt-1">{selectedPenalty.effectivityDate || 'Not recorded'}</dd></div>{selectedPenalty.category === 'suspension' && <div><dt className="text-xs font-semibold text-slate-500">Suspension duration</dt><dd className="mt-1">{selectedPenalty.duration || 'Not recorded'}</dd></div>}</dl>}
    </Modal>
  </form>;
};
