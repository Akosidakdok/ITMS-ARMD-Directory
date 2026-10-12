import React, { useState, useMemo } from 'react';
import { Filter, RotateCcw, ChevronRight, MapPin } from 'lucide-react';
import type { Personnel } from '../../types/pais';
import { 
  UNIT_CATEGORIES, 
  SUB_UNIT_CATEGORIES, 
  PNP_RANKS, 
  PCO_DISPLAY_RANKS,
  PNCO_DISPLAY_RANKS,
  NUP_DISPLAY_RANKS
} from '../../constants/ranks';
import { 
  getPersonnelStrengthSummary, 
  filterPersonnel, 
  PersonnelFilterCriteria 
} from '../../utils/personnelCounting';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/SystemUI';

interface AutomatedPersonnelCounterProps {
  personnelList: Personnel[];
  onSelectPersonnel?: (id: string) => void;
}

export const AutomatedPersonnelCounter: React.FC<AutomatedPersonnelCounterProps> = ({
  personnelList,
  onSelectPersonnel
}) => {
  // Filter state
  const [filters, setFilters] = useState<PersonnelFilterCriteria>({
    unitCategory: 'ALL',
    subUnitCategory: 'ALL',
    sub_unit: 'ALL',
    station: 'ALL',
    rankCategory: 'ALL',
    rank: 'ALL',
    gender: 'ALL',
    positionCategory: 'ALL'
  });

  const [activeViewTab, setActiveViewTab] = useState<'summary' | 'unit_rank' | 'rank_gender' | 'subunit_station' | 'roster'>('summary');

  // Compute available options from live data
  const availableSubUnits = useMemo(() => {
    const set = new Set<string>();
    personnelList.forEach(p => {
      const su = p.sub_unit || p.division;
      if (su && su.trim()) set.add(su.trim());
    });
    return Array.from(set).sort();
  }, [personnelList]);

  const availableStations = useMemo(() => {
    const set = new Set<string>();
    personnelList.forEach(p => {
      if (p.station && p.station.trim()) set.add(p.station.trim());
    });
    return Array.from(set).sort();
  }, [personnelList]);

  // Real-time strength summary matching active filters
  const strength = useMemo(() => {
    return getPersonnelStrengthSummary(personnelList, filters);
  }, [personnelList, filters]);

  // Filtered roster matching criteria
  const filteredRecords = useMemo(() => {
    return filterPersonnel(personnelList, filters);
  }, [personnelList, filters]);

  const activeFilterCount = Object.values(filters).filter(value => value && value !== 'ALL').length;
  const hasActiveFilters = activeFilterCount > 0;

  const resetAllFilters = () => {
    setFilters({
      unitCategory: 'ALL',
      subUnitCategory: 'ALL',
      sub_unit: 'ALL',
      station: 'ALL',
      rankCategory: 'ALL',
      rank: 'ALL',
      gender: 'ALL',
      positionCategory: 'ALL'
    });
  };

  // Preset trigger handler matching user requirements examples
  const applyPreset = (preset: 'pco' | 'pnco' | 'nup' | 'female' | 'male') => {
    switch (preset) {
      case 'pco':
        setFilters(prev => ({ ...prev, rankCategory: 'PCO', rank: 'ALL' }));
        break;
      case 'pnco':
        setFilters(prev => ({ ...prev, rankCategory: 'PNCO', rank: 'ALL' }));
        break;
      case 'nup':
        setFilters(prev => ({ ...prev, rankCategory: 'NUP', rank: 'ALL' }));
        break;
      case 'female':
        setFilters(prev => ({ ...prev, gender: 'Female' }));
        break;
      case 'male':
        setFilters(prev => ({ ...prev, gender: 'Male' }));
        break;
    }
  };

  return (
    <section className="dashboard-analytics record-section space-y-4 p-4 sm:p-5" aria-labelledby="auto-counting-heading">
      {/* Header */}
      <div className="dashboard-analytics-header">
        <div>
          <h2 id="auto-counting-heading">Personnel strength</h2>
          <p>Explore headcount by organization, rank, and gender.</p>
        </div>
        <div className="dashboard-matching-count" aria-live="polite">
          <strong>{strength.filteredCount}</strong> of {strength.totalCount} records
        </div>
      </div>

      {/* Quick Filter Presets (Directly matching PAIS 2.0 requirements examples) */}
      <div className="dashboard-quick-filters" aria-label="Quick personnel filters">
        <button type="button" aria-pressed={!hasActiveFilters} onClick={resetAllFilters}>All personnel</button>
        {([
          ['pco', 'PCO', filters.rankCategory === 'PCO'],
          ['pnco', 'PNCO', filters.rankCategory === 'PNCO'],
          ['nup', 'NUP', filters.rankCategory === 'NUP'],
          ['female', 'Female', filters.gender === 'Female'],
          ['male', 'Male', filters.gender === 'Male']
        ] as const).map(([preset, label, selected]) => (
          <button key={preset} type="button" aria-pressed={selected} onClick={() => applyPreset(preset)}>{label}</button>
        ))}
      </div>

      {/* Multi-Dimensional Filter Controls Grid */}
      <details className="dashboard-filter-disclosure">
        <summary><Filter aria-hidden="true" className="h-4 w-4" /><span>Advanced filters</span>
          {hasActiveFilters && <span className="dashboard-filter-count">{activeFilterCount} active</span>}
          <ChevronRight aria-hidden="true" className="dashboard-filter-chevron h-4 w-4" />
        </summary>
        <div className="dashboard-filter-fields">
          {hasActiveFilters && <button type="button" className="dashboard-filter-reset" onClick={resetAllFilters}><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />Reset filters</button>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Category of Unit */}
          <div>
            <label htmlFor="dashboard-filter-category-of-unit" className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Category of Unit</label>
            <select id="dashboard-filter-category-of-unit"
              value={filters.unitCategory || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, unitCategory: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[var(--input)] text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Unit Categories</option>
              {UNIT_CATEGORIES.map(uc => (
                <option key={uc} value={uc}>{uc}</option>
              ))}
            </select>
          </div>

          {/* Sub-unit Category */}
          <div>
            <label htmlFor="dashboard-filter-sub-unit-category" className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sub-unit Category</label>
            <select id="dashboard-filter-sub-unit-category"
              value={filters.subUnitCategory || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, subUnitCategory: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[var(--input)] text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Sub-unit Categories</option>
              {SUB_UNIT_CATEGORIES.map(suc => (
                <option key={suc} value={suc}>{suc}</option>
              ))}
            </select>
          </div>

          {/* Sub-unit */}
          <div>
            <label htmlFor="dashboard-filter-sub-unit" className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sub-unit</label>
            <select id="dashboard-filter-sub-unit"
              value={filters.sub_unit || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, sub_unit: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[var(--input)] text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Sub-units</option>
              {availableSubUnits.map(su => (
                <option key={su} value={su}>{su}</option>
              ))}
            </select>
          </div>

          {/* Station */}
          <div>
            <label htmlFor="dashboard-filter-station" className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Station</label>
            <select id="dashboard-filter-station"
              value={filters.station || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, station: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[var(--input)] text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Stations</option>
              {availableStations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Category of Rank */}
          <div>
            <label htmlFor="dashboard-filter-category-of-rank" className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Category of Rank</label>
            <select id="dashboard-filter-category-of-rank"
              value={filters.rankCategory || 'ALL'}
              onChange={e => {
                const rc = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  rankCategory: rc,
                  // reset specific rank if it doesn't match new category
                  rank: 'ALL'
                }));
              }}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[var(--input)] text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Rank Categories</option>
              <option value="PCO">PCO (Police Commissioned Officers)</option>
              <option value="PNCO">PNCO (Police Non-Commissioned Officers)</option>
              <option value="NUP">NUP (Non-Uniformed Personnel)</option>
            </select>
          </div>

          {/* Rank */}
          <div>
            <label htmlFor="dashboard-filter-rank" className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Rank</label>
            <select id="dashboard-filter-rank"
              value={filters.rank || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, rank: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[var(--input)] text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Ranks</option>
              {filters.rankCategory === 'PCO' ? (
                PCO_DISPLAY_RANKS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)
              ) : filters.rankCategory === 'PNCO' ? (
                PNCO_DISPLAY_RANKS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)
              ) : filters.rankCategory === 'NUP' ? (
                <option value="NUP">NUP (Non-Uniformed Personnel)</option>
              ) : (
                [...PCO_DISPLAY_RANKS, ...PNCO_DISPLAY_RANKS, ...NUP_DISPLAY_RANKS].map(r => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))
              )}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="dashboard-filter-gender" className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Gender</label>
            <select id="dashboard-filter-gender"
              value={filters.gender || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[var(--input)] text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Position Category */}
          <div>
            <label htmlFor="dashboard-filter-position-category" className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Position Category</label>
            <select id="dashboard-filter-position-category"
              value={filters.positionCategory || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, positionCategory: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[var(--input)] text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Positions</option>
              <option value="Main">Main (Primary)</option>
              <option value="In Addition/Concurrent">In Addition / Concurrent</option>
            </select>
          </div>
        </div>
        </div>
      </details>

      {/* Summary Count Cards Strip */}
      <dl className="dashboard-strength-summary" aria-label="Filtered personnel strength">
        {/* Total Filtered */}
        <div><dt>Matching</dt><dd>{strength.filteredCount}</dd><span>{strength.totalCount ? Math.round((strength.filteredCount / strength.totalCount) * 100) : 0}% of total</span></div>
        {/* PCO */}
        <div><dt>PCO</dt><dd>{strength.byRankCategory.PCO || 0}</dd><span>Commissioned</span></div>
        {/* PNCO */}
        <div><dt>PNCO</dt><dd>{strength.byRankCategory.PNCO || 0}</dd><span>Non-commissioned</span></div>
        {/* NUP */}
        <div><dt>NUP</dt><dd>{strength.byRankCategory.NUP || 0}</dd><span>Non-uniformed</span></div>
        {/* Male */}
        <div><dt>Male</dt><dd>{strength.byGender.Male || 0}</dd><span>Personnel</span></div>
        {/* Female */}
        <div><dt>Female</dt><dd>{strength.byGender.Female || 0}</dd><span>Personnel</span></div>
        {/* Main Postings */}
        <div><dt>Main / concurrent</dt><dd>{strength.byPositionCategory.Main || 0}<small> / </small>{strength.byPositionCategory['In Addition/Concurrent'] || 0}</dd><span>Primary / additional</span></div>
      </dl>

      {/* Tabs for Views / Visual Breakdowns */}
      <nav className="dashboard-analysis-views" aria-label="Personnel analysis views">
        {([
          ['summary', 'Overview'], ['unit_rank', 'Unit & rank'], ['rank_gender', 'Rank & gender'],
          ['subunit_station', 'Sub-units & stations'], ['roster', `Roster (${filteredRecords.length})`]
        ] as const).map(([view, label]) => (
          <button key={view} type="button" aria-pressed={activeViewTab === view}
            aria-controls="dashboard-analysis-content" onClick={() => setActiveViewTab(view)}>{label}</button>
        ))}
      </nav>

      {/* Tab Content */}
      <div id="dashboard-analysis-content" className="dashboard-analysis-content pt-2">
        {filteredRecords.length === 0 ? (
          <EmptyState
            title={personnelList.length ? 'No personnel match these filters' : 'No personnel records yet'}
            description={personnelList.length ? 'Adjust the filters or reset them to view all personnel.' : 'Strength analytics will appear once personnel records are added.'}
            action={hasActiveFilters ? <button type="button" className="dashboard-filter-reset" onClick={resetAllFilters}>Reset filters</button> : undefined}
          />
        ) : <>

        {/* Tab 1: Overview & Categories */}
        {activeViewTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Unit Category */}
            <div className="dashboard-breakdown space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>By unit category</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-2xs">{Object.keys(strength.byUnitCategory).length} units</span>
              </h3>
              <div className="space-y-2">
                {Object.entries(strength.byUnitCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([uc, count]) => {
                    const pct = strength.filteredCount ? Math.round((count / strength.filteredCount) * 100) : 0;
                    return (
                      <div key={uc}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{uc}</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(strength.byUnitCategory).length === 0 && (
                  <p className="text-xs text-slate-400 italic py-2">No matching unit category records.</p>
                )}
              </div>
            </div>

            {/* By Sub-unit Category */}
            <div className="dashboard-breakdown space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>By sub-unit category</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-2xs">{Object.keys(strength.bySubUnitCategory).length} categories</span>
              </h3>
              <div className="space-y-2">
                {Object.entries(strength.bySubUnitCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([suc, count]) => {
                    const pct = strength.filteredCount ? Math.round((count / strength.filteredCount) * 100) : 0;
                    return (
                      <div key={suc}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{suc}</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(strength.bySubUnitCategory).length === 0 && (
                  <p className="text-xs text-slate-400 italic py-2">No matching sub-unit category records.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Unit Category × Rank Category Matrix */}
        {activeViewTab === 'unit_rank' && (
          <div className="dashboard-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Personnel strength table">
            <table className="record-table text-xs">
              <thead className="bg-slate-50 text-slate-700 dark:bg-[var(--secondary)] dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th scope="col" className="py-2.5 px-4 text-left">Unit Category</th>
                  <th scope="col" className="py-2.5 px-4 text-center">PCO</th>
                  <th scope="col" className="py-2.5 px-4 text-center">PNCO</th>
                  <th scope="col" className="py-2.5 px-4 text-center">NUP</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Total Strength</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {UNIT_CATEGORIES.map(uc => {
                  const pcoCount = filteredRecords.filter(p => (p.unitCategory || 'ITMS HQ') === uc && (p.rankCategory || 'PNCO') === 'PCO').length;
                  const pncoCount = filteredRecords.filter(p => (p.unitCategory || 'ITMS HQ') === uc && (p.rankCategory || 'PNCO') === 'PNCO').length;
                  const nupCount = filteredRecords.filter(p => (p.unitCategory || 'ITMS HQ') === uc && (p.rankCategory || 'PNCO') === 'NUP').length;
                  const total = pcoCount + pncoCount + nupCount;
                  if (total === 0) return null;
                  return (
                    <tr key={uc} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{uc}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-purple-700 dark:text-purple-400 font-bold">{pcoCount || '—'}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-sky-700 dark:text-sky-400 font-bold">{pncoCount || '—'}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-emerald-700 dark:text-emerald-400 font-bold">{nupCount || '—'}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-extrabold text-blue-700 dark:text-blue-400">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Rank × Gender Matrix */}
        {activeViewTab === 'rank_gender' && (
          <div className="dashboard-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Personnel strength table">
            <table className="record-table text-xs">
              <thead className="bg-slate-50 text-slate-700 dark:bg-[var(--secondary)] dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th scope="col" className="py-2.5 px-4 text-left">Rank &amp; Category</th>
                  <th scope="col" className="py-2.5 px-4 text-center">Category</th>
                  <th scope="col" className="py-2.5 px-4 text-center">Male</th>
                  <th scope="col" className="py-2.5 px-4 text-center">Female</th>
                  <th scope="col" className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {PNP_RANKS.map(r => {
                  const maleCount = filteredRecords.filter(p => p.rank === r.code && (p.gender || 'Male').toLowerCase() === 'male').length;
                  const femaleCount = filteredRecords.filter(p => p.rank === r.code && (p.gender || '').toLowerCase() === 'female').length;
                  const total = maleCount + femaleCount;
                  if (total === 0) return null;
                  return (
                    <tr key={r.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-4">
                        <span className="font-extrabold text-slate-900 dark:text-white">{r.code}</span>
                        <span className="ml-1.5 text-slate-500 dark:text-slate-400 text-[11px]">({r.name})</span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <Badge 
                          variant={r.category === 'PCO' ? 'primary' : r.category === 'PNCO' ? 'neutral' : 'success'} 
                          size="sm"
                        >
                          {r.category}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-center font-mono text-blue-700 dark:text-blue-400 font-bold">{maleCount || '—'}</td>
                      <td className="py-2 px-4 text-center font-mono text-rose-700 dark:text-rose-400 font-bold">{femaleCount || '—'}</td>
                      <td className="py-2 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Sub-unit & Station Breakdown */}
        {activeViewTab === 'subunit_station' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="dashboard-breakdown space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">By sub-unit</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {Object.entries(strength.bySubUnit)
                  .sort((a, b) => b[1] - a[1])
                  .map(([su, count]) => (
                    <div key={su} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800/60">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{su}</span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="dashboard-breakdown space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">By station</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {Object.entries(strength.byStation)
                  .sort((a, b) => b[1] - a[1])
                  .map(([st, count]) => (
                    <div key={st} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800/60">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {st}
                      </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Matching Roster Table */}
        {activeViewTab === 'roster' && (
          <div className="dashboard-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Personnel strength table">
            <table className="record-table text-xs">
              <thead className="bg-slate-50 text-slate-700 dark:bg-[var(--secondary)] dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th scope="col" className="py-2.5 px-4 text-left">Rank &amp; Name</th>
                  <th scope="col" className="py-2.5 px-4 text-left">Badge No</th>
                  <th scope="col" className="py-2.5 px-4 text-left">Category</th>
                  <th scope="col" className="py-2.5 px-4 text-left">Unit Category</th>
                  <th scope="col" className="py-2.5 px-4 text-left">Sub-unit</th>
                  <th scope="col" className="py-2.5 px-4 text-left">Station</th>
                  <th scope="col" className="py-2.5 px-4 text-left">Gender</th>
                  {onSelectPersonnel && <th scope="col" className="py-2.5 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredRecords.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-4">
                      <span className="font-extrabold text-slate-900 dark:text-white">{p.rank} {p.fullName}</span>
                      {p.designation && <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{p.designation}</span>}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">{p.badgeNo || '—'}</td>
                    <td className="py-2.5 px-4">
                      <Badge 
                        variant={p.rankCategory === 'PCO' ? 'primary' : p.rankCategory === 'NUP' ? 'success' : 'neutral'} 
                        size="sm"
                      >
                        {p.rankCategory || 'PNCO'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.unitCategory || 'ITMS HQ'}</td>
                    <td className="py-2.5 px-4 text-blue-700 dark:text-blue-400 font-bold">{p.sub_unit || p.division || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{p.station || '—'}</td>
                    <td className="py-2.5 px-4">{p.gender || 'Male'}</td>
                    {onSelectPersonnel && (
                      <td className="py-2.5 px-4 text-right">
                        <button
                          aria-label={`View profile for ${p.rank} ${p.fullName}`}
                          onClick={() => onSelectPersonnel(p.id)}
                          className="px-2 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          View
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No personnel match the specified filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        </>}
      </div>
    </section>
  );
};
