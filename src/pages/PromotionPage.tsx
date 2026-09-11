import React, { useState, useMemo } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { 
  Award, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  ShieldCheck, 
  TrendingUp, 
  Calendar, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Info,
  ChevronRight,
  ArrowUpDown,
  History
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { NotificationToast } from '../components/common/NotificationToast';
import { EmptyState, PageHeader } from '../components/common/SystemUI';
import { calculateTimeInGrade } from '../utils/timeInGrade';
import { hasManagementAccess } from '../utils/accessControl';
import { PNP_RANKS, getRankFullName, getNextRank, getMinimumTigYears } from '../constants/ranks';
import { Personnel, PromotionRecord, RankAbbr } from '../types/pais';

type TabView = 'roster' | 'history';
type SortOrder = 'tig-desc' | 'tig-asc' | 'name-asc' | 'date-desc';

export const PromotionPage: React.FC = () => {
  const { role, personnelList, promotionsList, addPromotion, updatePromotion, deletePromotion } = useAuthRole();
  const canManage = hasManagementAccess(role);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabView>('roster');

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
      const div = p.sub_unit || p.division;
      if (div) set.add(div);
    });
    return Array.from(set).sort();
  }, [personnelList]);

  // Personnel TIG Roster computation
  const tigRoster = useMemo(() => {
    return personnelList.map(p => {
      const requiredYears = getMinimumTigYears(p.rank);
      const tig = calculateTimeInGrade(p.lastPromotionDate ?? '', undefined, requiredYears);
      const pPromotions = promotionsList.filter(prom => prom.personnelId === p.id);
      const rankInfo = PNP_RANKS.find(r => r.code === p.rank);
      const category = rankInfo?.category || 'PCO';

      return {
        personnel: p,
        tig,
        requiredYears,
        promotions: pPromotions,
        category
      };
    });
  }, [personnelList, promotionsList]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalPersonnel = tigRoster.length;
    const eligibleCount = tigRoster.filter(item => item.tig.eligibleForPromotion).length;
    const accruingCount = tigRoster.filter(item => !item.tig.eligibleForPromotion && !item.tig.isFuture && item.tig.totalDays > 0).length;
    const pendingFutureCount = tigRoster.filter(item => item.tig.isFuture).length;
    const totalPromotions = promotionsList.length;

    return {
      totalPersonnel,
      eligibleCount,
      accruingCount,
      pendingFutureCount,
      totalPromotions
    };
  }, [tigRoster, promotionsList]);

  // Filtered TIG Roster
  const filteredRoster = useMemo(() => {
    return tigRoster.filter(item => {
      const p = item.personnel;
      const q = searchQuery.toLowerCase().trim();

      // Search match
      if (q) {
        const matchesName = (p.fullName || `${p.firstName} ${p.lastName}`).toLowerCase().includes(q);
        const matchesBadge = (p.badgeNo || '').toLowerCase().includes(q);
        const matchesRank = (p.rank || '').toLowerCase().includes(q) || (p.rankFullName || '').toLowerCase().includes(q);
        const matchesDiv = (p.sub_unit || p.division || '').toLowerCase().includes(q);
        const matchesDesig = (p.designation || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBadge && !matchesRank && !matchesDiv && !matchesDesig) return false;
      }

      // Division filter
      if (selectedDivision !== 'all') {
        const div = p.sub_unit || p.division;
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
  }, [tigRoster, searchQuery, selectedDivision, selectedCategory, selectedEligibility, sortOrder]);

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
    const firstPerson = personnelList[0];
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
    <div className="space-y-6 animate-fade-in">
      {toast && <NotificationToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <PageHeader
        eyebrow="Personnel records & career progression"
        title="Time-in-Grade & Promotion Module"
        description="Monitor automated Time-in-Grade service counters, evaluate promotion board eligibility benchmarks, and track comprehensive rank advancement histories."
        meta={<span className="text-[11px] text-slate-500 font-medium">DPRM & NAPOLCOM Standard Criteria</span>}
        reference="PNP-ITMS-PROMOTIONS-WEEK7"
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <Clock className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-800">Automatic TIG Engine Active</span>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={handleOpenNewPromotion}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" /> Record Promotion
              </button>
            )}
          </div>
        }
      />

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Personnel</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">{metrics.totalPersonnel}</div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">Active roster members tracked</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Board Eligible</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900 font-mono">{metrics.eligibleCount}</div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium">Satisfied minimum TIG for review</div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Accruing TIG</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-900 font-mono">{metrics.accruingCount}</div>
          <div className="mt-1 text-[11px] text-blue-700 font-medium">Building required service period</div>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Promotions Logged</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-900 font-mono">{metrics.totalPromotions}</div>
          <div className="mt-1 text-[11px] text-purple-700 font-medium">Historical Special Orders recorded</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'roster'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          Time-in-Grade & Board Eligibility Roster
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'roster' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {filteredRoster.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          Organization Promotion History Log
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {filteredHistory.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'roster' ? "Search personnel by name, badge, rank, or sub-unit..." : "Search promotion orders, personnel, or remarks..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          {activeTab === 'roster' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDivision}
                onChange={e => setSelectedDivision(e.target.value)}
                aria-label="Filter by Sub-Unit / Division"
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Divisions / Sub-Units</option>
                {divisions.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                aria-label="Filter by Rank Group"
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Rank Groups</option>
                <option value="PCO">Commissioned Officers (PCO)</option>
                <option value="PNCO">Non-Commissioned Officers (PNCO)</option>
                <option value="NUP">Non-Uniformed Personnel (NUP)</option>
              </select>

              <select
                value={selectedEligibility}
                onChange={e => setSelectedEligibility(e.target.value)}
                aria-label="Filter by Board Eligibility"
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Eligibility Statuses</option>
                <option value="eligible">Eligible for Board Review</option>
                <option value="accruing">Accruing Service Time</option>
                <option value="future">Pending Future Effective Date</option>
              </select>

              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as SortOrder)}
                aria-label="Sort Order"
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="tig-desc">Longest TIG First</option>
                <option value="tig-asc">Shortest TIG First</option>
                <option value="name-asc">Personnel Name (A-Z)</option>
                <option value="date-desc">Latest Promotion Date</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: ROSTER VIEW */}
      {activeTab === 'roster' && (
        <section className="app-surface overflow-hidden shadow-2xs" aria-labelledby="tig-roster-heading">
          <div className="border-b border-slate-200 px-4 py-3.5 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 id="tig-roster-heading" className="app-section-title">Time-in-Grade & Eligibility Roster</h2>
              <p className="mt-0.5 text-xs text-slate-500">Live service accumulation against statutory PNP promotion board benchmarks</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              Showing {filteredRoster.length} of {tigRoster.length} personnel
            </span>
          </div>

          {filteredRoster.length ? (
            <div className="overflow-x-auto">
              <table className="record-table min-w-[980px] text-xs">
                <thead className="bg-slate-100 uppercase text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Personnel</th>
                    <th className="px-4 py-3 text-left">Division / Designation</th>
                    <th className="px-4 py-3 text-left">Last Promotion Date</th>
                    <th className="px-4 py-3 text-left">Accrued Time-in-Grade</th>
                    <th className="px-4 py-3 text-center">Req. TIG</th>
                    <th className="px-4 py-3 text-center">History</th>
                    <th className="px-4 py-3 text-center">Promotion Board Status</th>
                    {canManage && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRoster.map(({ personnel: person, tig, requiredYears, promotions }) => (
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
              description="Adjust your search criteria, division, or eligibility status to view personnel records."
              icon={Clock}
            />
          )}
        </section>
      )}

      {/* TAB 2: HISTORY LOG VIEW */}
      {activeTab === 'history' && (
        <section className="app-surface overflow-hidden shadow-2xs" aria-labelledby="promotion-history-heading">
          <div className="border-b border-slate-200 px-4 py-3.5 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 id="promotion-history-heading" className="app-section-title">Organization Promotion Records Log</h2>
              <p className="mt-0.5 text-xs text-slate-500">Official Special Orders, rank advancement histories, and NAPOLCOM resolutions</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              Total Logged: {filteredHistory.length}
            </span>
          </div>

          {filteredHistory.length ? (
            <div className="overflow-x-auto">
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
                            <span className="text-blue-600 font-bold">➔</span>
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
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                          {prom.remarks || '—'}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Personnel *</label>
            <select
              value={selectedPersonnelId}
              onChange={e => handlePersonnelChange(e.target.value)}
              disabled={Boolean(editingPromotion)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-60"
              required
            >
              <option value="">Select Personnel...</option>
              {personnelList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.rank} {p.lastName}, {p.firstName} (Badge: {p.badgeNo || 'N/A'}) - {p.sub_unit || p.division}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Previous Rank *</label>
              <select
                value={rankFrom}
                onChange={e => setRankFrom(e.target.value as RankAbbr)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              >
                {PNP_RANKS.map(r => (
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              >
                {PNP_RANKS.map(r => (
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
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
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-normal h-20 focus:outline-none focus:border-blue-500"
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
