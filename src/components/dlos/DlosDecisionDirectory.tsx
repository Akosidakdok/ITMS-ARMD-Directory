import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import type { DlosPenaltyEntry } from '../../types/dlos';

interface Props {
  year: number;
  penalties: DlosPenaltyEntry[];
  loading: boolean;
  error: string;
}

const categories: DlosPenaltyEntry['category'][] = ['suspension', 'demotion', 'dismissal', 'exonerated'];

export const DlosDecisionDirectory = ({ year, penalties, loading, error }: Props) => {
  const [selectedCategory, setSelectedCategory] = useState<DlosPenaltyEntry['category'] | null>(null);
  const [selectedPenalty, setSelectedPenalty] = useState<DlosPenaltyEntry | null>(null);
  const [search, setSearch] = useState('');
  const selectedEntries = penalties.filter(entry => entry.category === selectedCategory);
  const visibleEntries = selectedEntries.filter(entry => `${entry.name} ${entry.docketNumber}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <section className="dlos-decision-surface" aria-labelledby="dlos-decisions-heading">
    <div className="dlos-picker-heading"><div><h2 id="dlos-decisions-heading">{year} decisions</h2><p>View personnel by penalty category.</p></div></div>
    <div className="dlos-filter-body">
      <div className="dlos-penalty-filter" role="group" aria-labelledby="dlos-penalty-filter-label">
        <span className="dlos-penalty-filter-label" id="dlos-penalty-filter-label">Filter personnel by penalty</span>
        <div className="dlos-penalty-options">
          {categories.map(category => <button key={category} type="button" aria-pressed={selectedCategory === category}
            className="dlos-penalty-option" onClick={() => { setSelectedCategory(category); setSelectedPenalty(null); setSearch(''); }}><span>{category}</span><span className="dlos-penalty-count">{loading ? '…' : penalties.filter(entry => entry.category === category).length}</span></button>)}
        </div>
      </div>
      <div className="dlos-penalty-results" aria-live="polite">
        {!selectedCategory ? <p className="dlos-penalty-empty">Select a penalty category above to view the personnel list.</p> : <>
          <div className="dlos-penalty-results-heading"><div><h3>{selectedCategory} personnel</h3><p>Select a name to see the docket and penalty details.</p></div><span>{selectedEntries.length} {selectedEntries.length === 1 ? 'person' : 'people'}</span></div>
          {selectedEntries.length > 0 && <label className="dlos-decision-search">Search personnel or docket<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or docket number" /></label>}
          {loading ? <p className="dlos-penalty-empty">Loading personnel…</p> : visibleEntries.length ? <ul className="dlos-penalty-people">{visibleEntries.map(entry => <li key={entry.id}><button type="button" className="dlos-penalty-person" onClick={() => setSelectedPenalty(entry)}><span>{entry.name}</span><ChevronRight size={16} aria-hidden="true" /></button></li>)}</ul> : !error && <p className="dlos-penalty-empty">{search ? 'No personnel match this search.' : 'No recorded personnel in this category.'}</p>}
        </>}
        {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
      </div>
    </div>
    <Modal isOpen={selectedPenalty !== null} onClose={() => setSelectedPenalty(null)} title={selectedPenalty?.name || 'Personnel penalty details'} subtitle={selectedPenalty ? `${selectedPenalty.category.toUpperCase()} · Docket ${selectedPenalty.docketNumber}` : undefined} maxWidth="md">
      {selectedPenalty && <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-500">Docket number</dt><dd className="mt-1">{selectedPenalty.docketNumber}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Penalty effectivity date</dt><dd className="mt-1">{selectedPenalty.effectivityDate || 'Not recorded'}</dd></div>{selectedPenalty.category === 'suspension' && <div><dt className="text-xs font-semibold text-slate-500">Suspension duration</dt><dd className="mt-1">{selectedPenalty.duration || 'Not recorded'}</dd></div>}</dl>}
    </Modal>
  </section>;
};
