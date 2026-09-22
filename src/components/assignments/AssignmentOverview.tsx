import React, { useMemo, useState } from 'react';
import { Building2, Filter, MapPin, RotateCcw, Search, Users } from 'lucide-react';
import type { AssignmentRecord, Personnel } from '../../types/pais';
import { resolvePersonnelRankCategory } from '../../utils/personnelCounting';
import { Badge } from '../common/Badge';
import { ASSIGNMENT_DIVISION_OPTIONS, ASSIGNMENT_REGIONS, POSITION_CATEGORIES, SUB_UNIT_CATEGORIES, UNIT_CATEGORIES } from '../../constants/ranks';
import { getAssignmentStationOptions } from '../../utils/assignmentOptions';

interface AssignmentOverviewProps {
  assignments: AssignmentRecord[];
  personnel: Personnel[];
}

type OverviewFilters = {
  status: string;
  asOfDate: string;
  unitCategory: string;
  subUnitCategory: string;
  subUnit: string;
  station: string;
  region: string;
  positionCategory: string;
  rankCategory: string;
  personnelStatus: string;
  search: string;
};

type OverviewRow = {
  assignment: AssignmentRecord;
  person: Personnel;
  unitCategory: string;
  subUnitCategory: string;
  subUnit: string;
  station: string;
  region: string;
  rankCategory: string;
};

const initialFilters: OverviewFilters = {
  status: 'Current',
  asOfDate: new Date().toISOString().slice(0, 10),
  unitCategory: 'ALL',
  subUnitCategory: 'ALL',
  subUnit: 'ALL',
  station: 'ALL',
  region: 'ALL',
  positionCategory: 'ALL',
  rankCategory: 'ALL',
  personnelStatus: 'ALL',
  search: ''
};

const valueOr = (value: string | undefined, fallback: string) => value?.trim() || fallback;

const optionValues = (values: readonly string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

export const AssignmentOverview: React.FC<AssignmentOverviewProps> = ({ assignments, personnel }) => {
  const [filters, setFilters] = useState<OverviewFilters>(initialFilters);
  const [selectedGroup, setSelectedGroup] = useState('ALL');

  const personnelById = useMemo(() => new Map(personnel.map(person => [person.id, person])), [personnel]);

  const allRows = useMemo<OverviewRow[]>(() => assignments.flatMap(assignment => {
    const person = personnelById.get(assignment.personnelId);
    if (!person) return [];

    return [{
      assignment,
      person,
      unitCategory: valueOr(assignment.unitCategory || person.unitCategory, 'ITMS HQ'),
      subUnitCategory: valueOr(assignment.subUnitCategory || person.subUnitCategory, 'Division'),
      subUnit: valueOr(assignment.sub_unit || person.sub_unit || person.division, 'Unassigned'),
      station: valueOr(assignment.station || person.station, 'No Station Recorded'),
      region: valueOr(assignment.region, 'No Region Recorded'),
      rankCategory: resolvePersonnelRankCategory(person)
    }];
  }), [assignments, personnelById]);

  const choices = useMemo(() => ({
    unitCategories: optionValues([...UNIT_CATEGORIES, ...allRows.map(row => row.unitCategory)]),
    subUnitCategories: optionValues([...SUB_UNIT_CATEGORIES, ...allRows.map(row => row.subUnitCategory)]),
    subUnits: optionValues([...ASSIGNMENT_DIVISION_OPTIONS.map(option => option.value), ...allRows.map(row => row.subUnit)]),
    stations: getAssignmentStationOptions(assignments, personnel),
    regions: optionValues([...ASSIGNMENT_REGIONS, ...allRows.map(row => row.region)]),
    personnelStatuses: optionValues(allRows.map(row => row.person.status))
  }), [allRows, assignments, personnel]);

  const filteredRows = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return allRows.filter(row => {
      const { assignment, person } = row;
      const isActiveOnDate = (!assignment.startDate || assignment.startDate <= filters.asOfDate)
        && (!assignment.endDate || assignment.endDate >= filters.asOfDate)
        && assignment.status !== 'Terminated';
      if (filters.status === 'Current' && assignment.status !== 'Current') return false;
      if (filters.status === 'As of date' && !isActiveOnDate) return false;
      if (filters.status === 'Completed' && assignment.status !== 'Completed') return false;
      if (filters.status === 'Terminated' && assignment.status !== 'Terminated') return false;
      if (filters.unitCategory !== 'ALL' && row.unitCategory !== filters.unitCategory) return false;
      if (filters.subUnitCategory !== 'ALL' && row.subUnitCategory !== filters.subUnitCategory) return false;
      if (filters.subUnit !== 'ALL' && row.subUnit !== filters.subUnit) return false;
      if (filters.station !== 'ALL' && row.station !== filters.station) return false;
      if (filters.region !== 'ALL' && row.region !== filters.region) return false;
      if (filters.positionCategory !== 'ALL' && valueOr(assignment.positionCategory, 'Main') !== filters.positionCategory) return false;
      if (filters.rankCategory !== 'ALL' && row.rankCategory !== filters.rankCategory) return false;
      if (filters.personnelStatus !== 'ALL' && person.status !== filters.personnelStatus) return false;

      const groupKey = [row.unitCategory, row.subUnitCategory, row.subUnit, row.station, row.region].join('|');
      if (selectedGroup !== 'ALL' && selectedGroup !== groupKey) return false;

      if (!query) return true;
      return [
        person.fullName,
        person.firstName,
        person.lastName,
        person.badgeNo,
        person.rank,
        assignment.position,
        assignment.unit,
        row.unitCategory,
        row.subUnit,
        row.station
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    });
  }, [allRows, filters, selectedGroup]);

  const summaryRows = useMemo(() => {
    const groups = new Map<string, { key: string; unitCategory: string; subUnitCategory: string; subUnit: string; station: string; region: string; personnelIds: Set<string>; pco: number; pnco: number; nup: number }>();
    filteredRows.forEach(row => {
      const key = [row.unitCategory, row.subUnitCategory, row.subUnit, row.station, row.region].join('|');
      const group = groups.get(key) || {
        key,
        unitCategory: row.unitCategory,
        subUnitCategory: row.subUnitCategory,
        subUnit: row.subUnit,
        station: row.station,
        region: row.region,
        personnelIds: new Set<string>(),
        pco: 0,
        pnco: 0,
        nup: 0
      };
      if (!group.personnelIds.has(row.person.id)) {
        group.personnelIds.add(row.person.id);
        group[row.rankCategory.toLowerCase() as 'pco' | 'pnco' | 'nup'] += 1;
      }
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) => a.subUnit.localeCompare(b.subUnit));
  }, [filteredRows]);

  const uniquePersonnel = new Set(filteredRows.map(row => row.person.id)).size;
  const assignmentRowsByPersonnel = new Map<string, number>();
  filteredRows.forEach(row => assignmentRowsByPersonnel.set(row.person.id, (assignmentRowsByPersonnel.get(row.person.id) || 0) + 1));
  const personnelWithMultipleAssignments = Array.from(assignmentRowsByPersonnel.values()).filter(count => count > 1).length;
  const currentAssignments = filteredRows.filter(row => row.assignment.status === 'Current').length;
  const mainAssignments = filteredRows.filter(row => valueOr(row.assignment.positionCategory, 'Main') === 'Main').length;
  const concurrentAssignments = filteredRows.filter(row => row.assignment.positionCategory === 'In Addition/Concurrent').length;

  const updateFilter = <K extends keyof OverviewFilters>(key: K, value: OverviewFilters[K]) => {
    setFilters(previous => ({ ...previous, [key]: value }));
    setSelectedGroup('ALL');
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setSelectedGroup('ALL');
  };

  const selectClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none';
  const filterSelect = (label: string, key: keyof OverviewFilters, values: readonly string[], labels: Record<string, string> = {}) => (
    <label className="min-w-[150px] flex-1">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</span>
      <select value={filters[key]} onChange={event => updateFilter(key, event.target.value)} className={selectClass}>
        <option value="ALL">All {label.toLowerCase()}</option>
        {values.map(value => <option key={value} value={value}>{labels[value] || value}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="record-toolbar space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
            <Filter className="h-4 w-4 text-blue-700" /> Unit personnel filters
          </div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700">
            <RotateCcw className="h-3.5 w-3.5" /> Reset filters
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Search personnel, badge, position, or unit..." className={`${selectClass} pl-9`} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filterSelect('Assignment view', 'status', ['As of date', 'Current', 'Completed', 'Terminated'])}
          <label className="min-w-[150px] flex-1">
            <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">As-of date</span>
            <input type="date" value={filters.asOfDate} onChange={event => updateFilter('asOfDate', event.target.value)} className={selectClass} />
          </label>
          {filterSelect('Unit category', 'unitCategory', choices.unitCategories)}
          {filterSelect('Sub-unit category', 'subUnitCategory', choices.subUnitCategories)}
          {filterSelect('Unit / sub-unit', 'subUnit', choices.subUnits, Object.fromEntries(ASSIGNMENT_DIVISION_OPTIONS.map(option => [option.value, option.label])))}
          {filterSelect('Station', 'station', choices.stations)}
          {filterSelect('Region', 'region', choices.regions)}
          {filterSelect('Position type', 'positionCategory', POSITION_CATEGORIES)}
          {filterSelect('Rank category', 'rankCategory', ['PCO', 'PNCO', 'NUP'])}
          {filterSelect('Personnel status', 'personnelStatus', choices.personnelStatuses)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          ['Unique personnel', uniquePersonnel, Users],
          ['Units represented', summaryRows.length, Building2],
          ['Current assignments', currentAssignments, MapPin],
          ['Main assignments', mainAssignments, Users],
          ['Concurrent assignments', concurrentAssignments, Users],
          ['Multi-assignment personnel', personnelWithMultipleAssignments, Users]
        ].map(([label, value, Icon]) => {
          const MetricIcon = Icon as React.ComponentType<{ className?: string }>;
          return <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"><MetricIcon className="mb-2 h-4 w-4 text-blue-700" /><div className="font-mono text-xl font-extrabold text-slate-900">{value}</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div></div>;
        })}
      </div>

      <section className="record-section overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-3">
          <div><h3 className="text-sm font-extrabold text-slate-900">Personnel by unit</h3><p className="text-[11px] text-slate-500">Select a row to inspect the personnel assigned to that unit.</p></div>
          <span className="text-xs font-semibold text-slate-500">{summaryRows.length} unit groups</span>
        </div>
        <div className="overflow-x-auto">
          <table className="record-table text-xs">
            <thead><tr className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-600"><th>Unit category</th><th>Sub-unit</th><th>Station / region</th><th>PCO</th><th>PNCO</th><th>NUP</th><th>Total</th></tr></thead>
            <tbody className="font-semibold text-slate-800">
              {summaryRows.map(group => <tr key={group.key} onClick={() => setSelectedGroup(selectedGroup === group.key ? 'ALL' : group.key)} aria-selected={selectedGroup === group.key} className="cursor-pointer hover:bg-slate-50"><td>{group.unitCategory}<div className="text-[10px] text-slate-500">{group.subUnitCategory}</div></td><td className="font-extrabold text-blue-700">{group.subUnit}</td><td>{group.station}<div className="text-[10px] text-slate-500">{group.region}</div></td><td>{group.pco}</td><td>{group.pnco}</td><td>{group.nup}</td><td className="font-extrabold">{group.personnelIds.size}</td></tr>)}
              {!summaryRows.length && <tr><td colSpan={7} className="py-8 text-center text-slate-500">No unit groups match the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="record-section overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-3"><div><h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Users className="h-4 w-4 text-blue-700" /> Personnel roster</h3><p className="text-[10px] text-slate-500">Unique personnel: {uniquePersonnel} · Assignment rows: {filteredRows.length} · Personnel with multiple matching assignments: {personnelWithMultipleAssignments}</p></div><span className="text-xs font-semibold text-slate-500">As of {filters.asOfDate}</span></div>
        <div className="overflow-x-auto">
          <table className="record-table text-xs">
            <thead><tr className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-600"><th>Personnel</th><th>Rank category</th><th>Unit / sub-unit</th><th>Position</th><th>Type</th><th>Station</th><th>Status</th><th>Start date</th><th>Order ref</th></tr></thead>
            <tbody className="font-semibold text-slate-800">
              {filteredRows.map(row => <tr key={row.assignment.id} className="hover:bg-slate-50"><td><div className="font-extrabold text-slate-900">{row.person.rank} {row.person.lastName}, {row.person.firstName}</div><div className="font-mono text-[10px] text-slate-500">Badge #{row.person.badgeNo} · {row.person.status}</div></td><td>{row.rankCategory}</td><td><div>{row.subUnit}</div><div className="text-[10px] text-slate-500">{row.unitCategory}</div></td><td className="font-extrabold text-blue-700">{row.assignment.position}</td><td>{valueOr(row.assignment.positionCategory, 'Main')}</td><td>{row.station}<div className="text-[10px] text-slate-500">{row.region}</div></td><td><Badge variant={row.assignment.status === 'Current' ? 'primary' : 'neutral'} size="sm">{row.assignment.status}</Badge></td><td className="font-mono">{row.assignment.startDate || '—'}</td><td className="font-mono text-sky-700">{row.assignment.orderRef || '—'}</td></tr>)}
              {!filteredRows.length && <tr><td colSpan={9} className="py-10 text-center text-slate-500">No personnel assignments match the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
