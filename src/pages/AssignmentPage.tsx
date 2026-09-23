import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { ChevronDown, Edit3, Eye, Plus, Search, Trash2, X } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Button, PageHeader } from '../components/common/SystemUI';
import type { AssignmentRecord, PositionCategory, UnitCategory, SubUnitCategory } from '../types/pais';
import { hasManagementAccess } from '../utils/accessControl';
import { ASSIGNMENT_DIVISION_OPTIONS, POSITION_CATEGORIES, UNIT_CATEGORIES, SUB_UNIT_CATEGORIES } from '../constants/ranks';
import { getAssignmentStationOptions } from '../utils/assignmentOptions';
import { AssignmentOverview } from '../components/assignments/AssignmentOverview';

export const AssignmentPage: React.FC = () => {
  const { role, personnelList, assignmentsList, ordersList, addAssignment, updateAssignment, deleteAssignment } = useAuthRole();
  const canManage = hasManagementAccess(role);
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [unitCategoryFilter, setUnitCategoryFilter] = useState('ALL');
  const [subUnitCategoryFilter, setSubUnitCategoryFilter] = useState('ALL');
  const [positionCategoryFilter, setPositionCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'effectiveDate' | 'designationDate' | 'personnelName' | 'status' | 'startDate'>('effectiveDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRecord | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'overview'>('records');

  // Form state for new assignment (PAIS 2.0 structure)
  const [personnelId, setPersonnelId] = useState(personnelList[0]?.id || '');
  const [positionCategory, setPositionCategory] = useState<PositionCategory>('Main');
  const [unitCategory, setUnitCategory] = useState<UnitCategory>('ITMS HQ');
  const [subUnitCategory, setSubUnitCategory] = useState<SubUnitCategory>('Division');
  const [sub_unit, setSubUnit] = useState('');
  const [isCustomSubUnitEntry, setIsCustomSubUnitEntry] = useState(false);
  const [details, setDetails] = useState('');
  const [station, setStation] = useState('');
  const [isCustomStationEntry, setIsCustomStationEntry] = useState(false);
  const [region, setRegion] = useState('');
  const [position, setPosition] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [designationDate, setDesignationDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Current');
  const [remarks, setRemarks] = useState('');

  // Searchable personnel picker state
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [isPersonnelDropdownOpen, setIsPersonnelDropdownOpen] = useState(false);
  const personnelDropdownRef = useRef<HTMLDivElement>(null);

  const stationOptions = useMemo(() => getAssignmentStationOptions(assignmentsList, personnelList), [assignmentsList, personnelList]);
  const subUnitOptions = useMemo(() => Array.from(new Set([
    ...ASSIGNMENT_DIVISION_OPTIONS.map(option => option.value),
    ...assignmentsList.map(assignment => assignment.sub_unit || ''),
    ...personnelList.map(person => person.sub_unit || person.division || '')
  ].map(value => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [assignmentsList, personnelList]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personnelDropdownRef.current && !personnelDropdownRef.current.contains(e.target as Node)) {
        setIsPersonnelDropdownOpen(false);
        setPersonnelSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPersonnelOptions = personnelList.filter(p => {
    const q = personnelSearch.toLowerCase();
    return (
      p.fullName?.toLowerCase().includes(q) ||
      p.lastName?.toLowerCase().includes(q) ||
      p.firstName?.toLowerCase().includes(q) ||
      p.rank?.toLowerCase().includes(q) ||
      p.badgeNo?.toLowerCase().includes(q) ||
      p.division?.toLowerCase().includes(q)
    );
  });

  const selectedPersonnel = personnelList.find(p => p.id === personnelId);

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignmentsList.filter(asg => {
      const person = personnelList.find(p => p.id === asg.personnelId);
      const matchesDiv = selectedDivision === 'ALL' || (asg.sub_unit === selectedDivision) || (person && (person.sub_unit === selectedDivision || person.division === selectedDivision));
      const matchesStatus = statusFilter === 'ALL' || asg.status === statusFilter;
      const matchesUnitCat = unitCategoryFilter === 'ALL' || asg.unitCategory === unitCategoryFilter;
      const matchesSubUnitCat = subUnitCategoryFilter === 'ALL' || asg.subUnitCategory === subUnitCategoryFilter;
      const matchesPosCat = positionCategoryFilter === 'ALL' || (asg.positionCategory || 'Main') === positionCategoryFilter;

      if (!matchesDiv || !matchesStatus || !matchesUnitCat || !matchesSubUnitCat || !matchesPosCat) {
        return false;
      }

      if (!q) return true;

      const searchableValues = [
        asg.position,
        asg.unit,
        asg.sub_unit,
        asg.station,
        asg.details,
        asg.orderRef,
        person?.fullName,
        person?.rank,
        person?.badgeNo,
        person?.designation
      ];

      return searchableValues.some(val => val && String(val).toLowerCase().includes(q));
    });
  }, [assignmentsList, personnelList, selectedDivision, statusFilter, unitCategoryFilter, subUnitCategoryFilter, positionCategoryFilter, searchQuery]);

  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'personnelName') {
        const pA = personnelList.find(p => p.id === a.personnelId)?.fullName || '';
        const pB = personnelList.find(p => p.id === b.personnelId)?.fullName || '';
        comparison = pA.localeCompare(pB);
      } else if (sortField === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      } else if (sortField === 'designationDate') {
        comparison = (a.designationDate || '').localeCompare(b.designationDate || '');
      } else if (sortField === 'startDate') {
        comparison = (a.startDate || '').localeCompare(b.startDate || '');
      } else {
        const dateA = a.effectiveDate || a.startDate || '';
        const dateB = b.effectiveDate || b.startDate || '';
        comparison = dateA.localeCompare(dateB);
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [filteredAssignments, personnelList, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedAssignments.length / pageSize));
  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAssignments.slice(start, start + pageSize);
  }, [sortedAssignments, currentPage, pageSize]);

  const toggleSort = (field: 'effectiveDate' | 'designationDate' | 'personnelName' | 'status' | 'startDate') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const formatDateSafe = (value?: string) => {
    if (!value) return '—';
    const clean = String(value).trim();
    if (!clean) return '—';
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const parsed = new Date(clean);
    return Number.isNaN(parsed.getTime())
      ? clean
      : parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const resetForm = () => {
    setPersonnelId(personnelList[0]?.id || '');
    setPersonnelSearch('');
    setIsPersonnelDropdownOpen(false);
    setPositionCategory('Main');
    setUnitCategory('ITMS HQ');
    setSubUnitCategory('Division');
    setSubUnit('');
    setIsCustomSubUnitEntry(false);
    setDetails('');
    setStation('');
    setIsCustomStationEntry(false);
    setRegion('');
    setPosition('');
    setOrderRef('');
    setDesignationDate('');
    setEffectiveDate('');
    setStartDate('');
    setEndDate('');
    setStatus('Current');
    setRemarks('');
    setEditingAssignment(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (assignment: AssignmentRecord) => {
    setEditingAssignment(assignment);
    setPersonnelId(assignment.personnelId);
    setPositionCategory(assignment.positionCategory || 'Main');
    setUnitCategory(assignment.unitCategory || 'ITMS HQ');
    setSubUnitCategory(assignment.subUnitCategory || 'Division');
    setSubUnit(assignment.sub_unit || '');
    setDetails(assignment.details || '');
    setStation(assignment.station || '');
    setIsCustomStationEntry(false);
    setRegion(assignment.region || '');
    setIsCustomSubUnitEntry(false);
    setPosition(assignment.position);
    setOrderRef(assignment.orderRef);
    setDesignationDate(assignment.designationDate || '');
    setEffectiveDate(assignment.effectiveDate || '');
    setStartDate(assignment.startDate);
    setEndDate(assignment.endDate || '');
    setStatus(assignment.status || 'Current');
    setRemarks(assignment.remarks || '');
    setIsModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const normalizedSubUnit = sub_unit.trim();
      const generatedUnitName = normalizedSubUnit ? `${unitCategory} - ${normalizedSubUnit}` : unitCategory;
      const payload: AssignmentRecord = {
        id: editingAssignment?.id || `asg-${Date.now()}`,
        personnelId,
        positionCategory,
        unitCategory,
        subUnitCategory,
        sub_unit: normalizedSubUnit || undefined,
        details: details.trim() || undefined,
        station: station.trim() || undefined,
        region: region || undefined,
        unit: generatedUnitName,
        position: position.trim(),
        orderRef: orderRef.trim(),
        designationDate: designationDate || undefined,
        effectiveDate: effectiveDate || undefined,
        startDate,
        endDate: endDate || undefined,
        status,
        remarks: remarks.trim() || undefined
      };
      if (editingAssignment) {
        await updateAssignment(payload);
      } else {
        await addAssignment(payload);
      }
      setIsModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedDivision('ALL');
    setStatusFilter('ALL');
    setUnitCategoryFilter('ALL');
    setSubUnitCategoryFilter('ALL');
    setPositionCategoryFilter('ALL');
    setCurrentPage(1);
  };

  const activeFilterCount = [
    selectedDivision !== 'ALL',
    statusFilter !== 'ALL',
    unitCategoryFilter !== 'ALL',
    subUnitCategoryFilter !== 'ALL',
    positionCategoryFilter !== 'ALL',
    Boolean(searchQuery)
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Personnel records"
        title="Duty Postings & Assignments"
        description="Manage unit assignments, position designations, duty periods, and regional details."
        meta={<span className="text-[11px] text-slate-500">PNP–ITMS personnel postings</span>}
        reference="ASN-CURRENT-ROSTER"
        actions={canManage ? <Button variant="primary" icon={Plus} onClick={openCreateModal}>Add assignment</Button> : undefined}
      />

      <div className="record-section flex gap-1 overflow-x-auto p-1" role="tablist" aria-label="Assignment views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'records'}
          onClick={() => setActiveTab('records')}
          className={`rounded-lg px-4 py-2.5 text-left text-xs font-extrabold transition-colors ${activeTab === 'records' ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
        >
          Assignment records
          <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Manage duty postings and history</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`rounded-lg px-4 py-2.5 text-left text-xs font-extrabold transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
        >
          Unit personnel overview
          <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">Headcount and filtered roster</span>
        </button>
      </div>

      {activeTab === 'overview' ? (
        <AssignmentOverview assignments={assignmentsList} personnel={personnelList} />
      ) : <>
        {/* Comprehensive Search & Multi-Filter Bar */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by personnel name, badge #, designation, sub-unit, station, order ref..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 self-start"
              >
                Reset filters ({activeFilterCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Current">Current</option>
                <option value="Completed">Completed</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Position Category</label>
              <select
                value={positionCategoryFilter}
                onChange={(e) => { setPositionCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Positions</option>
                {POSITION_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Category</label>
              <select
                value={unitCategoryFilter}
                onChange={(e) => { setUnitCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Unit Categories</option>
                {UNIT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sub-Unit Category</label>
              <select
                value={subUnitCategoryFilter}
                onChange={(e) => { setSubUnitCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Sub-Unit Categories</option>
                {SUB_UNIT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Division</label>
              <select
                value={selectedDivision}
                onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Divisions</option>
                {ASSIGNMENT_DIVISION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Assignments Table with Sorting */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="record-table text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleSort('personnelName')}>
                  Personnel {sortField === 'personnelName' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4">Assigned Position</th>
                <th className="py-3 px-4">Unit / Division</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleSort('effectiveDate')}>
                  Dates {sortField === 'effectiveDate' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleSort('status')}>
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 font-bold">
              {paginatedAssignments.map((asg) => {
                const person = personnelList.find(p => p.id === asg.personnelId);
                return (
                  <tr key={asg.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-extrabold text-slate-900">{person?.rank || ''} {person?.lastName || 'Unknown'}, {person?.firstName || ''}</div>
                        <div className="text-[10px] text-slate-500 font-mono font-semibold">Badge #{person?.badgeNo || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blue-700">{asg.position}</span>
                      {asg.positionCategory === 'In Addition/Concurrent' && (
                        <span className="ml-1.5 inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Concurrent</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{asg.unit}</div>
                      {asg.station && <div className="text-[10px] text-slate-500">Station: {asg.station}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-700 font-extrabold">{asg.orderRef || '—'}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold">
                      <div>{formatDateSafe(asg.effectiveDate || asg.startDate)}</div>
                      <div className="text-[10px] text-slate-400">to {asg.endDate ? formatDateSafe(asg.endDate) : 'Present'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={asg.status === 'Current' ? 'primary' : asg.status === 'Completed' ? 'neutral' : 'warning'} size="sm">
                        {asg.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedAssignment(asg)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openEditModal(asg)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!paginatedAssignments.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs font-semibold text-slate-500">
                    No assignment records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-semibold">
          <div>
            Showing <span className="font-bold text-slate-900">{sortedAssignments.length ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, sortedAssignments.length)}</span> of <span className="font-bold text-slate-900">{sortedAssignments.length}</span> assignments
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 text-xs bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                Prev
              </button>
              <span className="px-2 font-bold text-slate-800">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        </div>
      </>}

      {/* New Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssignment ? 'Edit Personnel Assignment' : 'Reassign Personnel to Duty Posting'}
        subtitle={editingAssignment ? 'Update unit assignment, order reference, and assignment status' : 'Issue new unit assignment with Special Order tracking'}
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          {/* Searchable Personnel Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Select Personnel</label>
            <div className="relative" ref={personnelDropdownRef}>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => {
                  setIsPersonnelDropdownOpen(prev => !prev);
                  setPersonnelSearch('');
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500 hover:border-blue-400 transition-colors"
              >
                <span className="truncate">
                  {selectedPersonnel
                    ? `${selectedPersonnel.rank} ${selectedPersonnel.lastName}, ${selectedPersonnel.firstName} (${selectedPersonnel.division} - #${selectedPersonnel.badgeNo})`
                    : 'Select a personnel...'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 ml-2 flex-shrink-0 text-slate-400 transition-transform duration-200 ${isPersonnelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown panel */}
              {isPersonnelDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        autoFocus
                        type="text"
                        value={personnelSearch}
                        onChange={e => setPersonnelSearch(e.target.value)}
                        placeholder="Search by name, rank, badge, or division..."
                        className="w-full pl-7 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                      />
                      {personnelSearch && (
                        <button
                          type="button"
                          onClick={() => setPersonnelSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Options list */}
                  <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {filteredPersonnelOptions.length > 0 ? (
                      filteredPersonnelOptions.map(p => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPersonnelId(p.id);
                              setIsPersonnelDropdownOpen(false);
                              setPersonnelSearch('');
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              p.id === personnelId
                                ? 'bg-blue-50 text-blue-700 font-extrabold'
                                : 'text-slate-800 font-semibold hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-extrabold">{p.rank} {p.lastName}, {p.firstName}</span>
                            <span className="ml-1.5 text-[10px] text-slate-500 font-mono">{p.division} · #{p.badgeNo}</span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-4 text-center text-xs text-slate-400 font-semibold">
                        No personnel match your search.
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Position Category & Position Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Position Category *</label>
              <select
                value={positionCategory}
                onChange={e => setPositionCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {POSITION_CATEGORIES.map(pc => (
                  <option key={pc} value={pc}>{pc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Position / Designation *</label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="e.g. Lead Software Engineer"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Unit Category & Sub-unit Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Unit Category *</label>
              <select
                value={unitCategory}
                onChange={e => setUnitCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {UNIT_CATEGORIES.map(uc => (
                  <option key={uc} value={uc}>{uc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Sub-Unit Category *</label>
              <select
                value={subUnitCategory}
                onChange={e => setSubUnitCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {SUB_UNIT_CATEGORIES.map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-Unit Name & Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-600">Sub-Unit Name</label>
                <span className="text-[10px] text-slate-400 font-semibold">(Optional)</span>
              </div>
              <div className="flex gap-2">
                <select
                  value={isCustomSubUnitEntry ? '__CUSTOM__' : sub_unit}
                  onChange={e => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomSubUnitEntry(true);
                      setSubUnit('');
                    } else {
                      setIsCustomSubUnitEntry(false);
                      setSubUnit(e.target.value);
                    }
                  }}
                  className="min-w-0 flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="">Not recorded / review required</option>
                  {subUnitOptions.map(option => <option key={option} value={option}>{option}</option>)}
                  <option value="__CUSTOM__">Add custom sub-unit…</option>
                </select>
                <button type="button" onClick={() => setIsCustomSubUnitEntry(true)} className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100">+ Add custom</button>
              </div>
              {isCustomSubUnitEntry && (
                <div className="mt-2 flex gap-2">
                  <input autoFocus type="text" value={sub_unit} onChange={e => setSubUnit(e.target.value)} placeholder="Enter custom sub-unit name" className="min-w-0 flex-1 px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500" />
                  <button type="button" onClick={() => { setSubUnit(''); setIsCustomSubUnitEntry(false); }} className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:border-slate-300">Use list</button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Details</label>
              <input
                type="text"
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="e.g. Network Monitoring Desk"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Station (Optional) & Generated Unit Posting Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-600">Station</label>
                <span className="text-[10px] text-slate-400 font-semibold">(Optional)</span>
              </div>
              <div className="flex gap-2">
                <select
                  value={isCustomStationEntry ? '__CUSTOM__' : station}
                  onChange={e => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomStationEntry(true);
                      setStation('');
                    } else {
                      setIsCustomStationEntry(false);
                      setStation(e.target.value);
                    }
                  }}
                  className="min-w-0 flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="">Not recorded / review required</option>
                  {stationOptions.map(option => <option key={option} value={option}>{option}</option>)}
                  <option value="__CUSTOM__">Add custom station…</option>
                </select>
                <button
                  type="button"
                  onClick={() => setIsCustomStationEntry(true)}
                  className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                >
                  + Add custom
                </button>
              </div>
              {isCustomStationEntry && (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={station}
                    onChange={e => setStation(e.target.value)}
                    placeholder="Enter custom station name"
                    className="min-w-0 flex-1 px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => { setStation(''); setIsCustomStationEntry(false); }}
                    className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:border-slate-300"
                  >
                    Use list
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Unit / Division Name</label>
              <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-800">
                {sub_unit.trim() ? `${unitCategory} - ${sub_unit.trim()}` : unitCategory}
              </div>
              <p className="mt-1 text-[10px] font-semibold text-slate-500">Generated from Unit Category and Sub-Unit Name.</p>
            </div>
          </div>

          {/* Orders Section: Order Ref, Designation Date, Effective Date */}
          <div className="p-3 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-800">Administrative Order Context</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order Reference *</label>
                <input
                  type="text"
                  value={orderRef}
                  onChange={e => setOrderRef(e.target.value)}
                  placeholder="e.g. SO-ITMS-2026-099"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation Date</label>
                <input
                  type="date"
                  value={designationDate}
                  onChange={e => setDesignationDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  title="Date Order Issued (Upper-right header)"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Effective Date of Designation</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  title="Effective Date (Order body)"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Geographic Region</label>
            <select value={region} onChange={e => setRegion(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500">
              <option value="">Not recorded / review required</option>
              <option value="Luzon">Luzon</option>
              <option value="Visayas">Visayas</option>
              <option value="Mindanao">Mindanao</option>
            </select>
          </div>

          {/* Timeline: Start Date, End Date, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Current">Current</option>
                <option value="Completed">Completed</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Specific duty context or directives..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold h-20 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Saving...' : editingAssignment ? 'Save Changes' : 'Confirm Posting'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        title="Assignment Record"
        subtitle="Connected personnel posting details"
      >
        {selectedAssignment && (() => {
          const person = personnelList.find(p => p.id === selectedAssignment.personnelId);
          const connectedOrder = ordersList.find(o => 
            (o.orderNumber && selectedAssignment.orderRef && o.orderNumber.trim().toLowerCase() === selectedAssignment.orderRef.trim().toLowerCase()) ||
            (o.id && selectedAssignment.orderRef && o.id.trim().toLowerCase() === selectedAssignment.orderRef.trim().toLowerCase())
          );
          return (
            <div className="space-y-3 text-xs">
              {[
                ['Personnel', person?.fullName ? `${person.rank || ''} ${person.fullName} (${person.badgeNo ? `#${person.badgeNo}` : 'No badge'})` : 'Unknown personnel'],
                ['Position Category', selectedAssignment.positionCategory || 'Main'],
                ['Position / Designation', selectedAssignment.position],
                ['Unit Category', selectedAssignment.unitCategory || 'ITMS HQ'],
                ['Sub-Unit Category', selectedAssignment.subUnitCategory || 'Division'],
                ['Sub-Unit Name', selectedAssignment.sub_unit || 'Not recorded'],
                ['Details', selectedAssignment.details || 'Not recorded'],
                ['Station', selectedAssignment.station || 'Not recorded (Optional)'],
                ['Unit / Division', selectedAssignment.unit],
                ['Order Reference', selectedAssignment.orderRef ? `${selectedAssignment.orderRef} ${connectedOrder ? `(${connectedOrder.documentStatus || connectedOrder.status})` : '(Unlinked)'}` : 'Not recorded'],
                ['Designation Date (Date Order Issued)', formatDateSafe(selectedAssignment.designationDate)],
                ['Effective Date of Designation', formatDateSafe(selectedAssignment.effectiveDate || selectedAssignment.startDate)],
                ['Start Date', formatDateSafe(selectedAssignment.startDate)],
                ['End Date', selectedAssignment.endDate ? formatDateSafe(selectedAssignment.endDate) : 'Present'],
                ['Status', selectedAssignment.status],
                ['Remarks', selectedAssignment.remarks || 'No remarks']
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 font-bold text-slate-900">{value}</p>
                </div>
              ))}
              {canManage && (
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Delete this assignment record?')) return;
                      await deleteAssignment(selectedAssignment.id);
                      setSelectedAssignment(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openEditModal(selectedAssignment);
                      setSelectedAssignment(null);
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Edit Assignment
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};


