import React, { useState } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { 
  Printer, 
  Calendar, 
  GraduationCap, 
  Award, 
  Users, 
  Filter,
  FileText,
  Medal
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { calculateTimeInGrade } from '../utils/timeInGrade';
import { ExportPrintModal } from '../components/common/ExportPrintModal';

type ReportTab = 'alpha_list' | 'leave' | 'education' | 'training' | 'promotion' | 'orders' | 'awards';

export const ReportsPage: React.FC = () => {
  const { personnelList, assignmentsList, leaveList, educationList, trainingList, ordersList, awardsList } = useAuthRole();
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('alpha_list');

  // Filters
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [leaveDateFilter, setLeaveDateFilter] = useState('2026-07-23');
  const [courseFilter, setCourseFilter] = useState('ALL');

  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // 1. Alpha List Data (Current Active Assignments)
  const alphaListData = personnelList
    .filter(p => divisionFilter === 'ALL' || p.division === divisionFilter)
    .map(p => {
      const activeAsg = assignmentsList.find(a => a.personnelId === p.id && a.status === 'Current');
      return {
        id: p.id,
        rank: p.rank,
        fullName: p.fullName,
        badgeNo: p.badgeNo,
        plantilla: p.plantilla,
        division: p.division,
        position: activeAsg ? activeAsg.position : p.designation,
        unit: activeAsg ? activeAsg.unit : p.detail,
        status: p.status
      };
    });

  // 2. Leave Report Data (Personnel on leave for chosen date)
  const leaveReportData = leaveList
    .filter(l => {
      const matchesDate = !leaveDateFilter || (leaveDateFilter >= l.startDate && leaveDateFilter <= l.endDate);
      return matchesDate;
    })
    .map(l => {
      const person = personnelList.find(p => p.id === l.personnelId);
      return {
        id: l.id,
        rank: person?.rank || 'PNP',
        fullName: person?.fullName || 'Personnel',
        badgeNo: person?.badgeNo || 'N/A',
        division: person?.division || 'HQ',
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        approvedBy: l.approvedBy,
        status: l.status
      };
    });

  // 3. Education / Certification Report Data
  const courseOptions = Array.from(new Set([
    ...educationList.flatMap(e => e.certifications ?? []),
    ...trainingList.map(t => t.courseName)
  ]));

  const educationReportData = personnelList
    .filter(p => {
      if (courseFilter === 'ALL') return true;
      const pEdus = educationList.filter(e => e.personnelId === p.id);
      const pTrns = trainingList.filter(t => t.personnelId === p.id);
      const hasCert = pEdus.some(e => e.certifications?.includes(courseFilter));
      const hasTrn = pTrns.some(t => t.courseName === courseFilter);
      return hasCert || hasTrn;
    })
    .map(p => {
      const pEdus = educationList.filter(e => e.personnelId === p.id);
      const pTrns = trainingList.filter(t => t.personnelId === p.id);
      const highestDegree = pEdus[0]?.degree || 'BS Degree';
      const certsList = pEdus.flatMap(e => e.certifications ?? []).join(', ') || 'N/A';
      const recentTrn = pTrns[0]?.courseName || 'Standard Police IT';

      return {
        id: p.id,
        rank: p.rank,
        fullName: p.fullName,
        badgeNo: p.badgeNo,
        division: p.division,
        degree: highestDegree,
        certifications: certsList,
        recentTraining: recentTrn
      };
    });

  // 4. Promotion / Time-In-Grade (TIG) Report Data
  const promotionReportData = personnelList.map(p => {
    const tig = calculateTimeInGrade(p.lastPromotionDate ?? '');
    return {
      id: p.id,
      rank: p.rank,
      fullName: p.fullName,
      badgeNo: p.badgeNo,
      division: p.division,
      lastPromotionDate: p.lastPromotionDate,
      timeInGrade: tig.formatted,
      totalDays: tig.totalDays,
      eligible: !p.lastPromotionDate ? 'N/A' : tig.eligibleForPromotion ? 'ELIGIBLE' : 'Accruing'
    };
  }).sort((a, b) => b.totalDays - a.totalDays);

  const personnelNames = new Map(personnelList.map(person => [person.id, `${person.rank} ${person.fullName}`]));
  const trainingReportData = trainingList.map(training => ({
    ...training,
    personnelName: personnelNames.get(training.personnelId) || 'Unknown personnel',
    date: training.completionDate || training.endDate || training.startDate || '—'
  }));
  const ordersReportData = ordersList.map(order => ({
    ...order,
    orderNumber: order.orderNumber || order.orderNo || '—',
    orderType: order.orderType || order.type || 'Administrative Order',
    personnel: order.personnelIds?.map(id => personnelNames.get(id) || 'Unknown personnel').join(', ') || `${order.affectedPersonnelCount || 0} personnel`,
    date: order.issuedDate || order.effectiveDate || '—'
  }));
  const awardsReportData = awardsList.map(award => ({ ...award, personnelName: personnelNames.get(award.personnelId) || award.personnelName }));

  const getExportConfig = () => {
    switch (activeReportTab) {
      case 'alpha_list':
        return {
          title: 'PNP ITMS Alpha List of Current Personnel & Duty Assignments',
          data: alphaListData,
          columns: [
            { key: 'rank', label: 'Rank' },
            { key: 'fullName', label: 'Full Name' },
            { key: 'badgeNo', label: 'Badge No.' },
            { key: 'division', label: 'Division' },
            { key: 'position', label: 'Assigned Position' },
            { key: 'plantilla', label: 'Plantilla Item' }
          ]
        };
      case 'leave':
        return {
          title: `PNP ITMS Leave Roster (As of Date: ${leaveDateFilter})`,
          data: leaveReportData,
          columns: [
            { key: 'rank', label: 'Rank' },
            { key: 'fullName', label: 'Full Name' },
            { key: 'badgeNo', label: 'Badge No.' },
            { key: 'division', label: 'Division' },
            { key: 'leaveType', label: 'Leave Type' },
            { key: 'startDate', label: 'Start Date' },
            { key: 'endDate', label: 'End Date' },
            { key: 'days', label: 'Days' }
          ]
        };
      case 'education':
        return {
          title: `PNP ITMS Educational & IT Certifications Matrix (${courseFilter})`,
          data: educationReportData,
          columns: [
            { key: 'rank', label: 'Rank' },
            { key: 'fullName', label: 'Full Name' },
            { key: 'badgeNo', label: 'Badge No.' },
            { key: 'division', label: 'Division' },
            { key: 'degree', label: 'Degree' },
            { key: 'certifications', label: 'Certifications' }
          ]
        };
      case 'promotion':
        return {
          title: 'PNP ITMS Time-In-Grade (TIG) & Promotion Eligibility Roster',
          data: promotionReportData,
          columns: [
            { key: 'rank', label: 'Rank' },
            { key: 'fullName', label: 'Full Name' },
            { key: 'badgeNo', label: 'Badge No.' },
            { key: 'division', label: 'Division' },
            { key: 'lastPromotionDate', label: 'Last Promoted' },
            { key: 'timeInGrade', label: 'Computed TIG' },
            { key: 'eligible', label: 'Board Status' }
          ]
        };
      case 'training':
        return { title: 'PNP ITMS Completed Training Report', data: trainingReportData, columns: [
          { key: 'personnelName', label: 'Personnel' }, { key: 'courseName', label: 'Training' },
          { key: 'provider', label: 'Provider' }, { key: 'date', label: 'Completion / End Date' },
          { key: 'hours', label: 'Hours' }, { key: 'certificateNo', label: 'Certificate No.' }
        ] };
      case 'orders':
        return { title: 'PNP ITMS Administrative Orders Report', data: ordersReportData, columns: [
          { key: 'orderNumber', label: 'Order No.' }, { key: 'orderType', label: 'Order Type' },
          { key: 'subject', label: 'Subject' }, { key: 'personnel', label: 'Personnel' },
          { key: 'date', label: 'Issued Date' }, { key: 'status', label: 'Status' }
        ] };
      case 'awards':
        return { title: 'PNP ITMS Awards and Recognition Report', data: awardsReportData, columns: [
          { key: 'personnelName', label: 'Personnel' }, { key: 'awardName', label: 'Award' },
          { key: 'title', label: 'Title' }, { key: 'orderType', label: 'Authority Type' },
          { key: 'authorityDate', label: 'Authority Date' }, { key: 'status', label: 'Status' }
        ] };
    }
  };

  const currentExportConfig = getExportConfig();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
              Official Reporting Module
            </span>
            <span className="text-xs text-slate-500 font-mono">ITMS Administrative Records</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Administrative Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Generate filtered Alpha lists, leave status, IT education matrices, and promotion TIG audits</p>
        </div>

        <button
          onClick={() => setIsExportOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105"
        >
          <Printer className="w-4 h-4" /> Export / Print Report
        </button>
      </div>

      {/* Report Selection Tabs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <button
          onClick={() => setActiveReportTab('alpha_list')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportTab === 'alpha_list'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 shadow-2xs'
          }`}
        >
          <Users className={`w-5 h-5 mb-2 ${activeReportTab === 'alpha_list' ? 'text-white' : 'text-blue-600'}`} />
          <h3 className="text-xs font-bold block">Alpha List</h3>
          <p className={`text-[10px] ${activeReportTab === 'alpha_list' ? 'text-blue-100' : 'text-slate-500'}`}>Active Duty Postings</p>
        </button>

        <button onClick={() => setActiveReportTab('training')} className={`p-4 rounded-xl border text-left transition-all ${activeReportTab === 'training' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-800 border-slate-200 hover:bg-blue-50/50'}`}>
          <GraduationCap className="mb-2 h-5 w-5" /><h3 className="text-xs font-bold">Training</h3><p className="text-[10px] opacity-75">Completed Courses</p>
        </button>

        <button onClick={() => setActiveReportTab('orders')} className={`p-4 rounded-xl border text-left transition-all ${activeReportTab === 'orders' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-800 border-slate-200 hover:bg-blue-50/50'}`}>
          <FileText className="mb-2 h-5 w-5" /><h3 className="text-xs font-bold">Orders</h3><p className="text-[10px] opacity-75">Administrative Orders</p>
        </button>

        <button onClick={() => setActiveReportTab('awards')} className={`p-4 rounded-xl border text-left transition-all ${activeReportTab === 'awards' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-800 border-slate-200 hover:bg-blue-50/50'}`}>
          <Medal className="mb-2 h-5 w-5" /><h3 className="text-xs font-bold">Awards</h3><p className="text-[10px] opacity-75">Recognition Records</p>
        </button>

        <button
          onClick={() => setActiveReportTab('leave')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportTab === 'leave'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 shadow-2xs'
          }`}
        >
          <Calendar className={`w-5 h-5 mb-2 ${activeReportTab === 'leave' ? 'text-white' : 'text-emerald-600'}`} />
          <h3 className="text-xs font-bold block">Leave Status</h3>
          <p className={`text-[10px] ${activeReportTab === 'leave' ? 'text-blue-100' : 'text-slate-500'}`}>Date Filtered Roster</p>
        </button>

        <button
          onClick={() => setActiveReportTab('education')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportTab === 'education'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 shadow-2xs'
          }`}
        >
          <GraduationCap className={`w-5 h-5 mb-2 ${activeReportTab === 'education' ? 'text-white' : 'text-indigo-600'}`} />
          <h3 className="text-xs font-bold block">Education & Certs</h3>
          <p className={`text-[10px] ${activeReportTab === 'education' ? 'text-blue-100' : 'text-slate-500'}`}>Course Qualifications</p>
        </button>

        <button
          onClick={() => setActiveReportTab('promotion')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportTab === 'promotion'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 shadow-2xs'
          }`}
        >
          <Award className={`w-5 h-5 mb-2 ${activeReportTab === 'promotion' ? 'text-white' : 'text-sky-600'}`} />
          <h3 className="text-xs font-bold block">Promotion TIG</h3>
          <p className={`text-[10px] ${activeReportTab === 'promotion' ? 'text-blue-100' : 'text-slate-500'}`}>Time-In-Grade Audits</p>
        </button>
      </div>

      {/* Dynamic Filter Controls per Report */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-extrabold text-blue-700 uppercase tracking-wider">
          <Filter className="w-4 h-4" /> Report Filters & Parameters:
        </div>

        {activeReportTab === 'alpha_list' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-bold">Filter by Division:</span>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-extrabold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Divisions & Offices</option>
              <option value="ITSD">ITSD – Information Technology Support Division</option>
              <option value="PTD">PTD – Plans and Training Division</option>
              <option value="SMD">SMD – Systems Management Division</option>
              <option value="DMD">DMD – Data Management Division</option>
              <option value="ARMD">ARMD – Administrative and Resource Management Division</option>
              <option value="ISSD">ISSD – Information Systems Security Division</option>
            </select>
          </div>
        )}

        {activeReportTab === 'leave' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-bold">Inspect Personnel on Leave on Date:</span>
            <input
              type="date"
              value={leaveDateFilter}
              onChange={(e) => setLeaveDateFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {activeReportTab === 'education' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-bold">Filter by Course / Certification:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-extrabold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Qualifications & Courses</option>
              {courseOptions.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {activeReportTab === 'promotion' && (
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Auto-Calculated Benchmark: <strong className="text-blue-700 font-mono font-bold">≥ 3.0 Years (1,095 Days)</strong> for Promotion Board</span>
          </div>
        )}
      </div>

      {/* Report Data Table Display */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 bg-blue-700 text-white flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wide flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            {currentExportConfig.title}
          </h3>
          <span className="text-xs text-blue-100 font-semibold">Total Entries: <strong className="text-white font-mono">{currentExportConfig.data.length}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3.5 px-4">#</th>
                {currentExportConfig.columns.map((col) => (
                  <th key={col.key} className="py-3.5 px-4">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 font-bold">
              {currentExportConfig.data.length === 0 ? (
                <tr>
                  <td colSpan={currentExportConfig.columns.length + 1} className="py-8 text-center text-slate-500 font-semibold">
                    No matching records found for the selected filter parameters.
                  </td>
                </tr>
              ) : (
                currentExportConfig.data.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono text-slate-400 font-normal">{idx + 1}</td>
                    {currentExportConfig.columns.map((col) => (
                      <td key={col.key} className="py-3.5 px-4">
                        {col.key === 'eligible' ? (
                          <Badge variant={row[col.key] === 'ELIGIBLE' ? 'success' : 'neutral'} size="sm">
                            {row[col.key]}
                          </Badge>
                        ) : col.key === 'rank' ? (
                          <span className="font-extrabold text-blue-700">{row[col.key]}</span>
                        ) : col.key === 'fullName' ? (
                          <span className="font-extrabold text-slate-900">{row[col.key]}</span>
                        ) : col.key === 'badgeNo' ? (
                          <span className="font-mono text-slate-600 font-semibold">{row[col.key]}</span>
                        ) : col.key === 'timeInGrade' ? (
                          <span className="font-mono font-extrabold text-sky-700">{row[col.key]}</span>
                        ) : (
                          <span className="text-slate-800">{String(row[col.key] ?? '—')}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export / Print Preview Modal */}
      <ExportPrintModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportTitle={currentExportConfig.title}
        data={currentExportConfig.data}
        columns={currentExportConfig.columns}
      />
    </div>
  );
};


