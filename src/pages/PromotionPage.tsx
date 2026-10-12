import React, { useState, useMemo } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { 
  Clock, 
  Search, 
  Plus, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Info,
  History,
  ChevronDown
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { NotificationToast } from '../components/common/NotificationToast';
import { EmptyState, PageHeader } from '../components/common/SystemUI';
import { calculateTimeInGrade, parseCalendarDate, type TimeInGrade } from '../utils/timeInGrade';
import { hasManagementAccess } from '../utils/accessControl';
import { PNP_RANKS, getRankFullName, getNextRank, getMinimumTigYears, getRankCategory } from '../constants/ranks';
import { Personnel, PromotionRecord, RankAbbr } from '../types/pais';
import './ModulePages.css';
import './RecordsModules.css';
import './PromotionPage.css';

type TabView = 'uniformed' | 'nonuniformed' | 'history';
type SortOrder = 'tig-desc' | 'tig-asc' | 'name-asc' | 'date-desc';

const isNonUniformedPersonnel = (person: Personnel) =>
  person.rankCategory === 'NUP' || getRankCategory(person.rank) === 'NUP';

const formatDateLabel = (value: string) => {
  const parsed = parseCalendarDate(value);
  if (!parsed) return value || 'Not recorded';
  return new Intl.DateTimeFormat('en-PH', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  }).format(parsed);
};

const getTipLabel = (tip: TimeInGrade | null, effectiveDate: string) => {
  if (!effectiveDate) return 'Not recorded';
  if (tip?.isFuture) return 'Pending effective date';
  if (tip?.isInvalid) return 'Invalid effective date';
  return tip?.formatted || 'Not available';
};

export const PromotionPage: React.FC = () => {
  const { role, personnelList, assignmentsList, promotionsList, addPromotion, updatePromotion, deletePromotion } = useAuthRole();
  const canManage = hasManagementAccess(role);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabView>('uniformed');

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEligibility, setSelectedEligibility] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('tig-desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRecord | null>(null);
  const [deletingPromotion, setDeletingPromotion] = useState<PromotionRecord | null>(null);

  // Form State
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>('');
  const [rankFrom, setRankFrom] = useState<RankAbbr>('PCpl');
  const [rankTo, setRankTo] = useState<RankAbbr>('PSSg');
  const [promotionDate, setPromotionDate] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Divisions list for filter
  const divisions = useMemo(() => {
    const set = new Set<string>();
    personnelList.forEach(p => {
      const div = p.sub_unit || p.subUnit || p.division || p.officeDivision || p.unit;
      if (div) set.add(div);
    });
    return Array.from(set).sort();
  }, [personnelList]);

  // The active main assignment is the most reliable source for a current
  // designation's effective date. Fall back to the personnel field for older records.
  const designationEffectiveDates = useMemo(() => {
    const dates = new Map<string, string>();
    const currentMainAssignments = assignmentsList
      .filter(assignment => assignment.status === 'Current' && assignment.positionCategory !== 'In Addition/Concurrent')
      .sort((a, b) => String(b.effectiveDate || b.startDate || '').localeCompare(String(a.effectiveDate || a.startDate || '')));

    currentMainAssignments.forEach(assignment => {
      const date = String(assignment.effectiveDate || assignment.startDate || '').slice(0, 10);
      if (date && !dates.has(assignment.personnelId)) dates.set(assignment.personnelId, date);
    });
    return dates;
  }, [assignmentsList]);

  // TIG remains a rank-based metric for uniformed personnel. TIP is calculated
  // independently from the effective date of the current main designation.
  const tigRoster = useMemo(() => {
    return personnelList.map(p => {
      const requiredYears = getMinimumTigYears(p.rank);
      const tig = calculateTimeInGrade(p.lastPromotionDate ?? '', undefined, requiredYears);
      const pPromotions = promotionsList.filter(prom => prom.personnelId === p.id);
      const rankInfo = PNP_RANKS.find(r => r.code === p.rank);
      const category = p.rankCategory === 'NUP' || getRankCategory(p.rank) === 'NUP'
        ? 'NUP'
        : rankInfo?.category || getRankCategory(p.rank);
      const designationEffectiveDate = designationEffectiveDates.get(p.id) || String(p.effectiveDate || '').slice(0, 10);
      const timeInPosition = designationEffectiveDate
        ? calculateTimeInGrade(designationEffectiveDate)
        : null;

      return {
        personnel: p,
        tig,
        timeInPosition,
        designationEffectiveDate,
        requiredYears,
        promotions: pPromotions,
        category
      };
    });
  }, [personnelList, assignmentsList, designationEffectiveDates, promotionsList]);

  const uniformedRoster = useMemo(() => tigRoster.filter(item => item.category !== 'NUP'), [tigRoster]);
  const nonUniformedRoster = useMemo(() => tigRoster.filter(item => item.category === 'NUP'), [tigRoster]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const eligibleCount = uniformedRoster.filter(item => item.tig.eligibleForPromotion).length;
    const accruingCount = uniformedRoster.filter(item => !item.tig.eligibleForPromotion && !item.tig.isFuture && item.tig.totalDays > 0).length;
    const totalPromotions = promotionsList.length;

    return {
      uniformedCount: uniformedRoster.length,
      nonUniformedCount: tigRoster.length - uniformedRoster.length,
      eligibleCount,
      accruingCount,
      totalPromotions
    };
  }, [tigRoster, uniformedRoster, promotionsList]);

  // Uniformed promotion roster filters
  const filteredRoster = useMemo(() => {
    return uniformedRoster.filter(item => {
      const p = item.personnel;
      const q = searchQuery.toLowerCase().trim();

      // Search match
      if (q) {
        const matchesName = (p.fullName || `${p.firstName} ${p.lastName}`).toLowerCase().includes(q);
        const matchesBadge = (p.badgeNo || '').toLowerCase().includes(q);
        const matchesRank = (p.rank || '').toLowerCase().includes(q) || (p.rankFullName || '').toLowerCase().includes(q);
        const matchesDiv = (p.sub_unit || p.subUnit || p.division || p.officeDivision || p.unit || '').toLowerCase().includes(q);
        const matchesDesig = (p.designation || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBadge && !matchesRank && !matchesDiv && !matchesDesig) return false;
      }

      // Division filter
      if (selectedDivision !== 'all') {
        const div = p.sub_unit || p.subUnit || p.division || p.officeDivision || p.unit;
        if (div !== selectedDivision) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Eligibility filter
      if (selectedEligibility === 'eligible' && !item.tig.eligibleForPromotion) return false;
      if (selectedEligibility === 'accruing' && (item.tig.eligibleForPromotion || item.tig.isFuture || item.tig.totalDays === 0)) return false;
      if (selectedEligibility === 'future' && !item.tig.isFuture) return false;

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'tig-desc') return b.tig.totalDays - a.tig.totalDays;
      if (sortOrder === 'tig-asc') return a.tig.totalDays - b.tig.totalDays;
      if (sortOrder === 'name-asc') return a.personnel.lastName.localeCompare(b.personnel.lastName);
      if (sortOrder === 'date-desc') {
        const dateA = a.personnel.lastPromotionDate ? new Date(a.personnel.lastPromotionDate).getTime() : 0;
        const dateB = b.personnel.lastPromotionDate ? new Date(b.personnel.lastPromotionDate).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });
  }, [uniformedRoster, searchQuery, selectedDivision, selectedCategory, selectedEligibility, sortOrder]);

  const filteredNonUniformedRoster = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return nonUniformedRoster.filter(item => {
      const p = item.personnel;
      if (selectedDivision !== 'all' && (p.sub_unit || p.subUnit || p.division || p.officeDivision || p.unit) !== selectedDivision) return false;
      if (!q) return true;
      return [p.fullName, `${p.firstName} ${p.lastName}`, p.badgeNo, p.plantilla, p.sub_unit, p.subUnit, p.division, p.officeDivision, p.unit, p.designation]
        .some(value => String(value || '').toLowerCase().includes(q));
    }).sort((a, b) => {
      if (sortOrder === 'tig-desc') return (b.timeInPosition?.totalDays || 0) - (a.timeInPosition?.totalDays || 0);
      if (sortOrder === 'tig-asc') return (a.timeInPosition?.totalDays || 0) - (b.timeInPosition?.totalDays || 0);
      if (sortOrder === 'name-asc') return a.personnel.lastName.localeCompare(b.personnel.lastName);
      if (sortOrder === 'date-desc') return b.designationEffectiveDate.localeCompare(a.designationEffectiveDate);
      return 0;
    });
  }, [nonUniformedRoster, searchQuery, selectedDivision, sortOrder]);

  // Filtered History Log
  const filteredHistory = useMemo(() => {
    return promotionsList.filter(prom => {
      const q = searchQuery.toLowerCase().trim();
      const p = personnelList.find(item => item.id === prom.personnelId);
      const name = p ? (p.fullName || `${p.firstName} ${p.lastName}`).toLowerCase() : '';
      const badge = p?.badgeNo?.toLowerCase() || '';

      if (q) {
        const matchesName = name.includes(q);
        const matchesBadge = badge.includes(q);
        const matchesOrder = (prom.orderNumber || '').toLowerCase().includes(q);
        const matchesRank = (prom.rankFrom || '').toLowerCase().includes(q) || (prom.rankTo || '').toLowerCase().includes(q);
        const matchesRemarks = (prom.remarks || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBadge && !matchesOrder && !matchesRank && !matchesRemarks) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());
  }, [promotionsList, personnelList, searchQuery]);

  // Quick Action: Open Modal from Roster for a specific personnel
  const handleOpenPromote = (person: Personnel) => {
    if (isNonUniformedPersonnel(person)) return;
    setSelectedPersonnelId(person.id);
    setRankFrom(person.rank);
    setRankTo(getNextRank(person.rank) || 'PCOL');
    setPromotionDate(new Date().toISOString().split('T')[0]);
    setOrderNumber('');
    setRemarks('');
    setFormError(null);
    setEditingPromotion(null);
    setIsModalOpen(true);
  };

  // Open Modal from Top Button
  const handleOpenNewPromotion = () => {
    const firstPerson = uniformedRoster[0]?.personnel;
    if (firstPerson) {
      setSelectedPersonnelId(firstPerson.id);
      setRankFrom(firstPerson.rank);
      setRankTo(getNextRank(firstPerson.rank) || 'PCOL');
    } else {
      setSelectedPersonnelId('');
      setRankFrom('PCpl');
      setRankTo('PSSg');
    }
    setPromotionDate(new Date().toISOString().split('T')[0]);
    setOrderNumber('');
    setRemarks('');
    setFormError(null);
    setEditingPromotion(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal from History Log
  const handleOpenEdit = (promotion: PromotionRecord) => {
    setEditingPromotion(promotion);
    setSelectedPersonnelId(promotion.personnelId);
    setRankFrom(promotion.rankFrom);
    setRankTo(promotion.rankTo);
    setPromotionDate(promotion.promotionDate);
    setOrderNumber(promotion.orderNumber);
    setRemarks(promotion.remarks || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // When personnel selection changes in form, update rankFrom and rankTo
  const handlePersonnelChange = (pId: string) => {
    setSelectedPersonnelId(pId);
    const p = personnelList.find(item => item.id === pId);
    if (p) {
      setRankFrom(p.rank);
      setRankTo(getNextRank(p.rank) || 'PCOL');
    }
  };

  // Submit Promotion
  const handleSubmitPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPersonnelId) {
      setFormError('Please select a personnel record.');
      return;
    }

    if (!rankFrom || !rankTo || !promotionDate || !orderNumber.trim()) {
      setFormError('Personnel, Previous Rank, New Rank, Promotion Date, and Order Number are all required.');
      return;
    }

    if (rankFrom === rankTo) {
      setFormError('Previous rank and new promoted rank cannot be identical.');
      return;
    }

    const p = personnelList.find(item => item.id === selectedPersonnelId);
    if (!p || isNonUniformedPersonnel(p)) {
      setFormError('Only uniformed personnel can be recorded in the rank promotion workflow.');
      return;
    }
    const tigAtPromotion = calculateTimeInGrade(p?.lastPromotionDate ?? p?.dateOfEntry ?? '', promotionDate);

    const record: PromotionRecord = {
      id: editingPromotion?.id || `prm-${Date.now()}`,
      personnelId: selectedPersonnelId,
      rankFrom,
      rankTo,
      promotionDate,
      orderNumber: orderNumber.trim(),
      timeInGradeAtPromotion: tigAtPromotion.formatted !== 'N/A' ? tigAtPromotion.formatted : undefined,
      remarks: remarks.trim() || undefined
    };

    try {
      if (editingPromotion) {
        await updatePromotion(record);
        setToast({ type: 'success', message: `Promotion record updated successfully. Active personnel rank synchronized.` });
      } else {
        await addPromotion(record);
        setToast({ type: 'success', message: `Successfully recorded promotion for ${p?.fullName || 'personnel'} to ${rankTo}. Active rank synchronized.` });
      }
      setIsModalOpen(false);
      setEditingPromotion(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save promotion. Please check values.');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingPromotion) return;
    try {
      await deletePromotion(deletingPromotion.id);
      setToast({
        type: 'success',
        message: `Promotion record deleted. Personnel active rank automatically rolled back.`
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete promotion record.'
      });
    } finally {
      setDeletingPromotion(null);
    }
  };

  return (
    <div className="module-page records-module promotion-page space-y-6">
      {toast && <NotificationToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <PageHeader
        title="Promotion & Tenure"
        description="Review uniformed rank-promotion eligibility separately from non-uniformed personnel, with Time in Position based on the effective date of the current designation."
        actions={
          <div className="flex items-center gap-3">
            {canManage && activeTab === 'uniformed' && (
              <button
                type="button"
                onClick={handleOpenNewPromotion}
                className="promotion-primary-action flex items-center gap-1.5 px-3.5 py-2 text-xs"
              >
                <Plus className="w-4 h-4" /> Record Promotion
              </button>
            )}
          </div>
        }
      />

      <dl className="records-summary promotion-summary" aria-label="Promotion and tenure summary">
        <div><dt>Uniformed personnel</dt><dd>{metrics.uniformedCount}</dd></div>
        <div><dt>Non-uniformed personnel</dt><dd>{metrics.nonUniformedCount}</dd></div>
        <div><dt>Board eligible · minimum TIG</dt><dd>{metrics.eligibleCount}</dd></div>
        <div><dt>Accruing TIG</dt><dd>{metrics.accruingCount}</dd></div>
        <div><dt>Promotions logged</dt><dd>{metrics.totalPromotions}</dd></div>
      </dl>

      <nav className="module-view-tabs" aria-label="Promotion views">
        <button type="button" aria-pressed={activeTab === 'uniformed'} onClick={() => setActiveTab('uniformed')}>
          Uniformed <span className="promotion-tab-count">{filteredRoster.length}</span>
        </button>
        <button type="button" aria-pressed={activeTab === 'nonuniformed'} onClick={() => setActiveTab('nonuniformed')}>
          Non-uniformed · TIP <span className="promotion-tab-count">{filteredNonUniformedRoster.length}</span>
        </button>
        <button type="button" aria-pressed={activeTab === 'history'} onClick={() => setActiveTab('history')}>
          Promotion history <span className="promotion-tab-count">{filteredHistory.length}</span>
        </button>
      </nav>

      {/* Filter and Search Bar */}
      <section className="record-section promotion-search" aria-label="Search and filter personnel">
        <div className="module-search-toolbar">
          <div className="module-search-input">
            <Search className="w-4 h-4" aria-hidden="true" />
            <input
              type="search"
              aria-label={activeTab === 'history' ? 'Search promotion history' : 'Search personnel'}
              placeholder={activeTab === 'history'
                ? 'Search promotion orders, personnel, or remarks...'
                : activeTab === 'uniformed'
                  ? 'Search uniformed personnel by name, badge, rank, or sub-unit...'
                  : 'Search non-uniformed personnel by name, plantilla, position, or sub-unit...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium  focus:border-blue-500"
            />
          </div>

          {(searchQuery || selectedDivision !== 'all' || selectedCategory !== 'all' || selectedEligibility !== 'all' || sortOrder !== 'tig-desc') && (
            <button type="button" className="module-reset" onClick={() => {
              setSearchQuery(''); setSelectedDivision('all'); setSelectedCategory('all'); setSelectedEligibility('all'); setSortOrder('tig-desc');
            }}>Reset filters</button>
          )}
        </div>
          {activeTab !== 'history' && (
            <details className="module-filter-disclosure">
              <summary>Advanced filters & sorting
                {(selectedDivision !== 'all' || (activeTab === 'uniformed' && (selectedCategory !== 'all' || selectedEligibility !== 'all'))) && <span className="module-filter-count">Filters active</span>}
                <ChevronDown className="module-filter-chevron w-4 h-4" aria-hidden="true" />
              </summary>
            <div className="module-filter-fields promotion-filter-fields">
              <label><span>Division / sub-unit</span>
                <select
                  value={selectedDivision}
                onChange={e => setSelectedDivision(e.target.value)}
                aria-label="Filter by Sub-Unit / Division"
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500"
              >
                <option value="all">All Divisions / Sub-Units</option>
                {divisions.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
              </label>

              {activeTab === 'uniformed' && (
                <>
                  <label><span>Rank group</span>
                    <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    aria-label="Filter by Uniformed Rank Group"
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500"
                  >
                    <option value="all">All Uniformed Rank Groups</option>
                    <option value="PCO">Commissioned Officers (PCO)</option>
                    <option value="PNCO">Non-Commissioned Officers (PNCO)</option>
                  </select>
              </label>

                  <label><span>Board eligibility</span>
                    <select
                    value={selectedEligibility}
                    onChange={e => setSelectedEligibility(e.target.value)}
                    aria-label="Filter by Board Eligibility"
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500"
                  >
                    <option value="all">All Eligibility Statuses</option>
                    <option value="eligible">Eligible for Board Review</option>
                    <option value="accruing">Accruing Service Time</option>
                    <option value="future">Pending Future Effective Date</option>
                  </select>
              </label>
                </>
              )}

              <label><span>Sort order</span>
                <select
                  value={sortOrder}
                onChange={e => setSortOrder(e.target.value as SortOrder)}
                aria-label={activeTab === 'uniformed' ? 'Sort uniformed personnel' : 'Sort non-uniformed personnel'}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500"
              >
                <option value="tig-desc">Longest {activeTab === 'uniformed' ? 'TIG' : 'TIP'} First</option>
                <option value="tig-asc">Shortest {activeTab === 'uniformed' ? 'TIG' : 'TIP'} First</option>
                <option value="name-asc">Personnel Name (A-Z)</option>
                <option value="date-desc">Latest {activeTab === 'uniformed' ? 'Promotion' : 'Designation Effective'} Date</option>
              </select>
              </label>
            </div>
            </details>
          )}
      </section>

      {/* Uniformed rank-promotion roster */}
      {activeTab === 'uniformed' && (
        <section className="record-section app-surface overflow-hidden" aria-labelledby="tig-roster-heading">
          <div className="record-section-header promotion-section-header">
            <div>
              <h2 id="tig-roster-heading" className="app-section-title">Uniformed Personnel Promotion Roster</h2>
              <p className="mt-0.5 text-xs text-slate-500">Rank-based TIG eligibility with TIP measured from the current designation's effective date</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              Showing {filteredRoster.length} of {uniformedRoster.length} uniformed personnel
            </span>
          </div>

          {filteredRoster.length ? (
            <div className="module-table-scroll" tabIndex={0} role="region" aria-label="Scrollable personnel records">
              <table className="record-table min-w-[1180px] text-xs">
                <thead className="bg-slate-100 uppercase text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Personnel</th>
                    <th className="px-4 py-3 text-left">Division / Designation</th>
                    <th className="px-4 py-3 text-left">Last Promotion Date</th>
                    <th className="px-4 py-3 text-left">Accrued Time-in-Grade</th>
                    <th className="px-4 py-3 text-center">Req. TIG</th>
                    <th className="px-4 py-3 text-left">Time in Position (TIP)</th>
                    <th className="px-4 py-3 text-center">History</th>
                    <th className="px-4 py-3 text-center">Promotion Board Status</th>
                    {canManage && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRoster.map(({ personnel: person, tig, timeInPosition, designationEffectiveDate, requiredYears, promotions }) => (
                    <tr key={person.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="font-mono text-blue-700">{person.rank}</span>
                          <span>{person.lastName}, {person.firstName}</span>
                          {person.middleName && <span className="text-slate-500">{person.middleName[0]}.</span>}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500 font-mono">Badge: {person.badgeNo || 'None'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-blue-800">{person.sub_unit || person.division || 'Unassigned'}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{person.designation || 'Staff'}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700 font-medium">
                        {person.lastPromotionDate ? (
                          <span>{person.lastPromotionDate}</span>
                        ) : (
                          <span className="text-slate-400 italic">Entry: {person.dateOfEntry || 'Not recorded'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold text-slate-900">
                          {tig.isFuture ? (
                            <span className="text-amber-600">Pending Effective Date</span>
                          ) : (
                            tig.formatted
                          )}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500 font-mono">
                          {tig.isFuture ? 'Future promotion date' : `${tig.totalDays.toLocaleString()} total calendar days`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                        {requiredYears} yrs
                      </td>
                      <td className="px-4 py-3">
                        <p className={`font-mono font-bold ${timeInPosition?.isFuture ? 'text-amber-700' : timeInPosition?.isInvalid ? 'text-rose-700' : 'text-indigo-800'}`}>
                          {getTipLabel(timeInPosition, designationEffectiveDate)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {designationEffectiveDate ? `Effective ${formatDateLabel(designationEffectiveDate)}` : 'No effective designation date recorded'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {promotions.length} orders
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tig.isFuture ? (
                          <Badge variant="warning" size="sm">Pending Date</Badge>
                        ) : tig.eligibleForPromotion ? (
                          <Badge variant="success" size="sm">Eligible for Review</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Accruing Service</Badge>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenPromote(person)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-colors border border-blue-200 hover:border-blue-600"
                            title={`Record promotion for ${person.fullName}`}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Promote
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No personnel found matching filters"
              description="Adjust your search, division, rank group, or eligibility filters to view uniformed personnel."
              icon={Clock}
            />
          )}
        </section>
      )}

      {/* Non-uniformed position-tenure roster */}
      {activeTab === 'nonuniformed' && (
        <section className="record-section app-surface overflow-hidden" aria-labelledby="nup-roster-heading">
          <div className="record-section-header promotion-section-header">
            <div>
              <h2 id="nup-roster-heading" className="app-section-title">Non-Uniformed Personnel Position Roster</h2>
              <p className="mt-0.5 text-xs text-slate-600">Time in Position (TIP) is counted from the effective date of the current main designation. This roster does not apply uniformed rank TIG rules.</p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-md">
              Showing {filteredNonUniformedRoster.length} of {nonUniformedRoster.length} personnel
            </span>
          </div>

          {filteredNonUniformedRoster.length ? (
            <div className="module-table-scroll" tabIndex={0} role="region" aria-label="Scrollable personnel records">
              <table className="record-table min-w-[900px] text-xs">
                <thead className="bg-indigo-50 uppercase text-indigo-900 font-bold border-b border-indigo-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Personnel</th>
                    <th className="px-4 py-3 text-left">Badge / Plantilla</th>
                    <th className="px-4 py-3 text-left">Division / Office</th>
                    <th className="px-4 py-3 text-left">Current Designation</th>
                    <th className="px-4 py-3 text-left">Designation Effective Date</th>
                    <th className="px-4 py-3 text-left">Time in Position (TIP)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredNonUniformedRoster.map(({ personnel: person, designationEffectiveDate, timeInPosition }) => (
                    <tr key={person.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{person.fullName || `${person.firstName} ${person.lastName}`}</p>
                        <p className="mt-0.5 text-[10px] text-indigo-700 font-bold">Non-Uniformed Personnel</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        <p>{person.badgeNo || 'No badge number'}</p>
                        {person.plantilla && <p className="mt-0.5 text-[10px] text-slate-500">Plantilla: {person.plantilla}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{person.sub_unit || person.division || person.officeDivision || 'Unassigned'}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-800">{person.designation || 'Not recorded'}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{designationEffectiveDate ? formatDateLabel(designationEffectiveDate) : 'Not recorded'}</td>
                      <td className="px-4 py-3">
                        <p className={`font-mono font-bold ${timeInPosition?.isFuture ? 'text-amber-700' : timeInPosition?.isInvalid ? 'text-rose-700' : 'text-indigo-800'}`}>
                          {getTipLabel(timeInPosition, designationEffectiveDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center"><Badge variant={person.status === 'Active' ? 'success' : 'neutral'} size="sm">{person.status || 'Not recorded'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No non-uniformed personnel found"
              description="Adjust your search or division filter. TIP is unavailable until the current designation has an effective date recorded."
              icon={Users}
            />
          )}
        </section>
      )}

      {/* TAB 2: HISTORY LOG VIEW */}
      {activeTab === 'history' && (
        <section className="record-section app-surface overflow-hidden" aria-labelledby="promotion-history-heading">
          <div className="record-section-header promotion-section-header">
            <div>
              <h2 id="promotion-history-heading" className="app-section-title">Organization Promotion Records Log</h2>
              <p className="mt-0.5 text-xs text-slate-500">Official Special Orders, rank advancement histories, and NAPOLCOM resolutions</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              Total Logged: {filteredHistory.length}
            </span>
          </div>

          {filteredHistory.length ? (
            <div className="module-table-scroll" tabIndex={0} role="region" aria-label="Scrollable personnel records">
              <table className="record-table min-w-[980px] text-xs">
                <thead className="bg-slate-100 uppercase text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Personnel</th>
                    <th className="px-4 py-3 text-left">Advancement</th>
                    <th className="px-4 py-3 text-left">Effective Date</th>
                    <th className="px-4 py-3 text-left">Special Order Reference</th>
                    <th className="px-4 py-3 text-left">TIG at Promotion</th>
                    <th className="px-4 py-3 text-left">Remarks / Authority</th>
                    {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredHistory.map(prom => {
                    const person = personnelList.find(p => p.id === prom.personnelId);
                    return (
                      <tr key={prom.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          {person ? (
                            <div>
                              <p className="font-bold text-slate-900">{person.fullName || `${person.firstName} ${person.lastName}`}</p>
                              <p className="text-[10px] text-slate-500 font-mono">Badge: {person.badgeNo || 'None'}</p>
                              <span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${isNonUniformedPersonnel(person) ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                                {isNonUniformedPersonnel(person) ? 'Non-Uniformed' : 'Uniformed'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Personnel ID: {prom.personnelId}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-white text-[11px]">
                              {prom.rankFrom}
                            </span>
                            <TrendingUp className="w-3.5 h-3.5 promotion-rank-arrow" aria-label="to" />
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-600 text-white text-[11px]">
                              {prom.rankTo}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{getRankFullName(prom.rankTo)}</p>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                          {prom.promotionDate}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {prom.orderNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {prom.timeInGradeAtPromotion || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 promotion-remarks">
                          {prom.remarks || '—'}
                        </td>
                        {canManage && (
                        <td className="px-4 py-3 text-right">
                            {person && isNonUniformedPersonnel(person) ? (
                              <span className="text-[10px] text-slate-400">Read only</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(prom)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit promotion record"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPromotion(prom)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete promotion (will roll back active rank)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No promotion history records found"
              description="Historical promotion records logged across the system will appear in this centralized register."
              icon={History}
            />
          )}
        </section>
      )}

      {/* Record / Edit Promotion Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPromotion ? "Edit Rank Promotion" : "Record Rank Promotion"}
        subtitle="PNP-ITMS Personnel Rank Advancement Order"
      >
        <form onSubmit={handleSubmitPromotion} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Uniformed Personnel *</label>
            <select
              value={selectedPersonnelId}
              onChange={e => handlePersonnelChange(e.target.value)}
              disabled={Boolean(editingPromotion)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500 disabled:opacity-60"
              required
            >
              <option value="">Select uniformed personnel...</option>
              {uniformedRoster.map(({ personnel: p }) => (
                <option key={p.id} value={p.id}>
                  {p.rank} {p.lastName}, {p.firstName} (Badge: {p.badgeNo || 'N/A'}) - {p.sub_unit || p.division}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-500">Non-uniformed personnel are tracked in the separate TIP roster and do not use this rank-promotion form.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Previous Rank *</label>
              <select
                value={rankFrom}
                onChange={e => setRankFrom(e.target.value as RankAbbr)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500"
                required
              >
                {PNP_RANKS.filter(r => r.category !== 'NUP').map(r => (
                  <option key={r.code} value={r.code}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Promoted Rank *</label>
              <select
                value={rankTo}
                onChange={e => setRankTo(e.target.value as RankAbbr)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500"
                required
              >
                {PNP_RANKS.filter(r => r.category !== 'NUP').map(r => (
                  <option key={r.code} value={r.code}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Effective Promotion Date *</label>
              <input
                type="date"
                value={promotionDate}
                onChange={e => setPromotionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">DPRM Special Order Number *</label>
              <input
                type="text"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="e.g. SO-DPRM-2026-088"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold  focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Napolcom Authority</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Promoted per Napolcom Resolution No. 2026-382 and Regular Promotion Cycle"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-normal h-20  focus:border-blue-500"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-700" /> Rank Synchronization Notice
            </div>
            <p className="text-[11px] text-blue-800 leading-normal">
              Saving this promotion will automatically synchronize the personnel's active rank to <strong>{rankTo}</strong> ({getRankFullName(rankTo)}) and update their last promotion date to <strong>{promotionDate || 'the selected date'}</strong>.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              {editingPromotion ? "Save Changes" : "Confirm & Promote"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingPromotion && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingPromotion(null)}
          title="Confirm Promotion Record Deletion"
          subtitle={`Order: ${deletingPromotion.orderNumber}`}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Warning: Rank Rollback Action
              </div>
              <p className="leading-relaxed">
                You are about to delete promotion record from <strong>{deletingPromotion.rankFrom}</strong> to <strong>{deletingPromotion.rankTo}</strong> dated <strong>{deletingPromotion.promotionDate}</strong>.
              </p>
              <p className="leading-relaxed text-rose-700 font-medium">
                The personnel's active rank will automatically roll back to their previous rank <strong>({deletingPromotion.rankFrom})</strong> or remaining latest promotion in history.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPromotion(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Confirm Delete & Roll Back Rank
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
