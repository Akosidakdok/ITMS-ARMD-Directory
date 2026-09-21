import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Filter, 
  RotateCcw, 
  Building2, 
  BadgeCheck, 
  ChevronRight, 
  ShieldCheck, 
  UserCheck, 
  MapPin, 
  Sparkles,
  BarChart3,
  Layers
} from 'lucide-react';
import type { Personnel } from '../../types/pais';
import { 
  UNIT_CATEGORIES, 
  SUB_UNIT_CATEGORIES, 
  RANK_CATEGORIES, 
  PNP_RANKS, 
  getPcoRanks, 
  getPncoRanks,
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

  const hasActiveFilters = Object.entries(filters).some(([_, v]) => v && v !== 'ALL');

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
  const applyPreset = (preset: 'unit_rank' | 'unit_sub_st' | 'rank_gender' | 'pco' | 'pnco' | 'nup' | 'female' | 'male') => {
    switch (preset) {
      case 'unit_rank':
        setActiveViewTab('unit_rank');
        break;
      case 'unit_sub_st':
        setActiveViewTab('subunit_station');
        break;
      case 'rank_gender':
        setActiveViewTab('rank_gender');
        break;
      case 'pco':
        setFilters(prev => ({ ...prev, rankCategory: 'PCO' }));
        break;
      case 'pnco':
        setFilters(prev => ({ ...prev, rankCategory: 'PNCO' }));
        break;
      case 'nup':
        setFilters(prev => ({ ...prev, rankCategory: 'NUP' }));
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
    <section className="record-section space-y-4 p-4 sm:p-6" aria-labelledby="auto-counting-heading">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h2 id="auto-counting-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Automated Personnel Counting &amp; Strength Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time headcount auto-computed across Unit Categories, Sub-unit Categories, Stations, Rank Categories, Ranks, and Gender.
          </p>
        </div>

        {/* Live Filter Counter Badge & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/60 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-semibold">Active Strength:</span>
            <span className="font-extrabold text-blue-700 dark:text-blue-400 font-mono text-sm">{strength.filteredCount}</span>
            <span className="text-slate-400 dark:text-slate-600">/</span>
            <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">{strength.totalCount} total</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Presets (Directly matching PAIS 2.0 requirements examples) */}
      <div>
        <span className="text-2xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 block">
          Quick Filter &amp; Analysis Presets
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { resetAllFilters(); setActiveViewTab('summary'); }}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              !hasActiveFilters && activeViewTab === 'summary'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            All Personnel
          </button>
          <button
            type="button"
            onClick={() => applyPreset('unit_rank')}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              activeViewTab === 'unit_rank'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            Unit Category + Rank Category
          </button>
          <button
            type="button"
            onClick={() => applyPreset('unit_sub_st')}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              activeViewTab === 'subunit_station'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            Unit Category + Sub-unit + Station
          </button>
          <button
            type="button"
            onClick={() => applyPreset('rank_gender')}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              activeViewTab === 'rank_gender'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            Rank + Gender
          </button>
          <button
            type="button"
            onClick={() => applyPreset('pco')}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              filters.rankCategory === 'PCO'
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            PCO ({strength.byRankCategory.PCO || 0})
          </button>
          <button
            type="button"
            onClick={() => applyPreset('pnco')}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              filters.rankCategory === 'PNCO'
                ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            PNCO ({strength.byRankCategory.PNCO || 0})
          </button>
          <button
            type="button"
            onClick={() => applyPreset('nup')}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              filters.rankCategory === 'NUP'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            NUP ({strength.byRankCategory.NUP || 0})
          </button>
          <button
            type="button"
            onClick={() => applyPreset('female')}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              filters.gender === 'Female'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            Female ({strength.byGender.Female || 0})
          </button>
          <button
            type="button"
            onClick={() => applyPreset('male')}
            className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors cursor-pointer ${
              filters.gender === 'Male'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-[#131f2e] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            Male ({strength.byGender.Male || 0})
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Controls Grid */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-[#101b27] p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Category of Unit */}
          <div>
            <label className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Category of Unit</label>
            <select
              value={filters.unitCategory || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, unitCategory: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[#162537] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Unit Categories</option>
              {UNIT_CATEGORIES.map(uc => (
                <option key={uc} value={uc}>{uc}</option>
              ))}
            </select>
          </div>

          {/* Sub-unit Category */}
          <div>
            <label className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sub-unit Category</label>
            <select
              value={filters.subUnitCategory || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, subUnitCategory: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[#162537] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Sub-unit Categories</option>
              {SUB_UNIT_CATEGORIES.map(suc => (
                <option key={suc} value={suc}>{suc}</option>
              ))}
            </select>
          </div>

          {/* Sub-unit */}
          <div>
            <label className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sub-unit</label>
            <select
              value={filters.sub_unit || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, sub_unit: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[#162537] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Sub-units</option>
              {availableSubUnits.map(su => (
                <option key={su} value={su}>{su}</option>
              ))}
            </select>
          </div>

          {/* Station */}
          <div>
            <label className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Station</label>
            <select
              value={filters.station || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, station: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[#162537] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Stations</option>
              {availableStations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Category of Rank */}
          <div>
            <label className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Category of Rank</label>
            <select
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
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[#162537] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Rank Categories</option>
              <option value="PCO">PCO (Police Commissioned Officers)</option>
              <option value="PNCO">PNCO (Police Non-Commissioned Officers)</option>
              <option value="NUP">NUP (Non-Uniformed Personnel)</option>
            </select>
          </div>

          {/* Rank */}
          <div>
            <label className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Rank</label>
            <select
              value={filters.rank || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, rank: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[#162537] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
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
            <label className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Gender</label>
            <select
              value={filters.gender || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[#162537] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Position Category */}
          <div>
            <label className="block text-2xs font-bold text-slate-600 dark:text-slate-300 mb-1">Position Category</label>
            <select
              value={filters.positionCategory || 'ALL'}
              onChange={e => setFilters(prev => ({ ...prev, positionCategory: e.target.value }))}
              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-[#162537] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="ALL">All Positions</option>
              <option value="Main">Main (Primary)</option>
              <option value="In Addition/Concurrent">In Addition / Concurrent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Count Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Filtered */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/40 p-3 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-blue-800 dark:text-blue-300 tracking-wider block">Filtered Headcount</span>
          <span className="text-xl font-mono font-extrabold text-blue-900 dark:text-blue-100 block mt-1">{strength.filteredCount}</span>
          <span className="text-2xs text-blue-700 dark:text-blue-400">
            {strength.totalCount ? Math.round((strength.filteredCount / strength.totalCount) * 100) : 0}% of total
          </span>
        </div>

        {/* PCO */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 dark:border-purple-900/60 dark:bg-purple-950/40 p-3 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-purple-800 dark:text-purple-300 tracking-wider block">PCO</span>
          <span className="text-xl font-mono font-extrabold text-purple-900 dark:text-purple-100 block mt-1">{strength.byRankCategory.PCO || 0}</span>
          <span className="text-2xs text-purple-700 dark:text-purple-400">Commissioned</span>
        </div>

        {/* PNCO */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/40 p-3 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-sky-800 dark:text-sky-300 tracking-wider block">PNCO</span>
          <span className="text-xl font-mono font-extrabold text-sky-900 dark:text-sky-100 block mt-1">{strength.byRankCategory.PNCO || 0}</span>
          <span className="text-2xs text-sky-700 dark:text-sky-400">Non-Commissioned</span>
        </div>

        {/* NUP */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-3 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300 tracking-wider block">NUP</span>
          <span className="text-xl font-mono font-extrabold text-emerald-900 dark:text-emerald-100 block mt-1">{strength.byRankCategory.NUP || 0}</span>
          <span className="text-2xs text-emerald-700 dark:text-emerald-400">Non-Uniformed</span>
        </div>

        {/* Male */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#131f2e] p-3 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider block">Male</span>
          <span className="text-xl font-mono font-extrabold text-slate-800 dark:text-white block mt-1">{strength.byGender.Male || 0}</span>
          <span className="text-2xs text-slate-500 dark:text-slate-400">Personnel</span>
        </div>

        {/* Female */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/40 p-3 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase text-rose-800 dark:text-rose-300 tracking-wider block">Female</span>
          <span className="text-xl font-mono font-extrabold text-rose-900 dark:text-rose-100 block mt-1">{strength.byGender.Female || 0}</span>
          <span className="text-2xs text-rose-700 dark:text-rose-400">Personnel</span>
        </div>

        {/* Main Postings */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#131f2e] p-3 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider block">Main / Concurrent</span>
          <span className="text-xl font-mono font-extrabold text-slate-800 dark:text-white block mt-1">
            {strength.byPositionCategory.Main || 0} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/</span> {strength.byPositionCategory['In Addition/Concurrent'] || 0}
          </span>
          <span className="text-2xs text-slate-500 dark:text-slate-400">Primary / Add'l</span>
        </div>
      </div>

      {/* Tabs for Views / Visual Breakdowns */}
      <div className="border-b border-slate-200 dark:border-slate-800 pt-2 flex items-center gap-1 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveViewTab('summary')}
          className={`px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
            activeViewTab === 'summary'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-950/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Overview &amp; Categories
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('unit_rank')}
          className={`px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
            activeViewTab === 'unit_rank'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-950/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Unit Category × Rank Category
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('rank_gender')}
          className={`px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
            activeViewTab === 'rank_gender'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-950/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Rank × Gender
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('subunit_station')}
          className={`px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
            activeViewTab === 'subunit_station'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-950/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Sub-unit &amp; Station Strength
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('roster')}
          className={`px-3 py-2 border-b-2 font-bold transition-colors cursor-pointer ${
            activeViewTab === 'roster'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 dark:border-blue-400 dark:text-blue-300 dark:bg-blue-950/40 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Matching Roster ({filteredRecords.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {/* Tab 1: Overview & Categories */}
        {activeViewTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Unit Category */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131f2e] p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Strength by Category of Unit</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-2xs">{Object.keys(strength.byUnitCategory).length} units</span>
              </h4>
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
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131f2e] p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Strength by Sub-unit Category</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-2xs">{Object.keys(strength.bySubUnitCategory).length} categories</span>
              </h4>
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
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131f2e] overflow-x-auto shadow-2xs">
            <table className="record-table text-xs">
              <thead className="bg-slate-50 text-slate-700 dark:bg-[#0f1926] dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 text-left">Unit Category</th>
                  <th className="py-2.5 px-4 text-center">PCO</th>
                  <th className="py-2.5 px-4 text-center">PNCO</th>
                  <th className="py-2.5 px-4 text-center">NUP</th>
                  <th className="py-2.5 px-4 text-right">Total Strength</th>
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
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131f2e] overflow-x-auto shadow-2xs">
            <table className="record-table text-xs">
              <thead className="bg-slate-50 text-slate-700 dark:bg-[#0f1926] dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 text-left">Rank &amp; Category</th>
                  <th className="py-2.5 px-4 text-center">Category</th>
                  <th className="py-2.5 px-4 text-center">Male</th>
                  <th className="py-2.5 px-4 text-center">Female</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
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
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131f2e] p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Personnel Count by Sub-unit</h4>
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

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131f2e] p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Personnel Count by Station</h4>
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
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131f2e] overflow-x-auto shadow-2xs">
            <table className="record-table text-xs">
              <thead className="bg-slate-50 text-slate-700 dark:bg-[#0f1926] dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 text-left">Rank &amp; Name</th>
                  <th className="py-2.5 px-4 text-left">Badge No</th>
                  <th className="py-2.5 px-4 text-left">Category</th>
                  <th className="py-2.5 px-4 text-left">Unit Category</th>
                  <th className="py-2.5 px-4 text-left">Sub-unit</th>
                  <th className="py-2.5 px-4 text-left">Station</th>
                  <th className="py-2.5 px-4 text-left">Gender</th>
                  {onSelectPersonnel && <th className="py-2.5 px-4 text-right">Action</th>}
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
      </div>
    </section>
  );
};
