import React, { useState } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { 
  Printer, 
  Calendar, 
  GraduationCap, 
  Award, 
  Users, 
  Filter
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { calculateTimeInGrade } from '../utils/timeInGrade';
import { ExportPrintModal } from '../components/common/ExportPrintModal';

type ReportTab = 'alpha_list' | 'leave' | 'education' | 'promotion';

export const ReportsPage: React.FC = () => {
  const { personnelList, assignmentsList, leaveList, educationList, trainingList } = useAuthRole();
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
    ...educationList.flatMap(e => e.certifications),
    ...trainingList.map(t => t.courseName)
  ]));

  const educationReportData = personnelList
    .filter(p => {
      if (courseFilter === 'ALL') return true;
      const pEdus = educationList.filter(e => e.personnelId === p.id);
      const pTrns = trainingList.filter(t => t.personnelId === p.id);
      const hasCert = pEdus.some(e => e.certifications.includes(courseFilter));
      const hasTrn = pTrns.some(t => t.courseName === courseFilter);
      return hasCert || hasTrn;
    })
    .map(p => {
      const pEdus = educationList.filter(e => e.personnelId === p.id);
      const pTrns = trainingList.filter(t => t.personnelId === p.id);
      const highestDegree = pEdus[0]?.degree || 'BS Degree';
      const certsList = pEdus.flatMap(e => e.certifications).join(', ') || 'N/A';
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
    const tig = calculateTimeInGrade(p.lastPromotionDate);
    return {
      id: p.id,
      rank: p.rank,
      fullName: p.fullName,
      badgeNo: p.badgeNo,
      division: p.division,
      lastPromotionDate: p.lastPromotionDate,
      timeInGrade: tig.formatted,
      totalDays: tig.totalDays,
      eligible: tig.eligibleForPromotion ? 'ELIGIBLE' : 'Accruing'
    };
  }).sort((a, b) => b.totalDays - a.totalDays);

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
    }
  };

  const currentExportConfig = getExportConfig();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl glass-panel bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 theme-transition shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30">
              Official Reporting Module
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">ITMS Administrative Records</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System Administrative Reports</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Generate filtered Alpha lists, leave status, IT education matrices, and promotion TIG audits</p>
        </div>

        <button
          onClick={() => setIsExportOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105"
        >
          <Printer className="w-4 h-4" /> Export / Print Report
        </button>
      </div>

      {/* Report Selection Tabs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveReportTab('alpha_list')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportTab === 'alpha_list'
              ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500/40 shadow-xs'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-5 h-5 mb-2 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold block text-slate-900 dark:text-white">Alpha List</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Active Duty Postings</p>
        </button>

        <button
          onClick={() => setActiveReportTab('leave')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportTab === 'leave'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500/40 shadow-xs'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-5 h-5 mb-2 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold block text-slate-900 dark:text-white">Leave Status</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Date Filtered Roster</p>
        </button>

        <button
          onClick={() => setActiveReportTab('education')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportTab === 'education'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-500/40 shadow-xs'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <GraduationCap className="w-5 h-5 mb-2 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold block text-slate-900 dark:text-white">Education & Certs</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Course Qualifications</p>
        </button>

        <button
          onClick={() => setActiveReportTab('promotion')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeReportTab === 'promotion'
              ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-500/40 shadow-xs'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-5 h-5 mb-2 text-sky-600 dark:text-sky-400" />
          <h3 className="text-xs font-bold block text-slate-900 dark:text-white">Promotion TIG</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Time-In-Grade Audits</p>
        </button>
      </div>

      {/* Dynamic Filter Controls per Report */}
      <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-4 theme-transition shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
          <Filter className="w-4 h-4" /> Report Filters & Parameters:
        </div>

        {activeReportTab === 'alpha_list' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">Filter by Division:</span>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Divisions & Offices</option>
              <option value="ARMD">ARMD (Administrative)</option>
              <option value="CSD">CSD (Cyber Security)</option>
              <option value="SDD">SDD (Software Dev)</option>
              <option value="NDCMD">NDCMD (Data Center)</option>
              <option value="OMD">OMD (Operations)</option>
              <option value="PPD">PPD (Plans & Programs)</option>
              <option value="ISSD">ISSD (Systems Audit)</option>
              <option value="RITMO 4A">RITMO 4A (CALABARZON)</option>
            </select>
          </div>
        )}

        {activeReportTab === 'leave' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">Inspect Personnel on Leave on Date:</span>
            <input
              type="date"
              value={leaveDateFilter}
              onChange={(e) => setLeaveDateFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {activeReportTab === 'education' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">Filter by Course / Certification:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Qualifications & Courses</option>
              {courseOptions.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {activeReportTab === 'promotion' && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Auto-Calculated Benchmark: <strong className="text-blue-700 dark:text-blue-400 font-mono">≥ 3.0 Years (1,095 Days)</strong> for Promotion Board</span>
          </div>
        )}
      </div>

      {/* Report Data Table Display */}
      <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 overflow-hidden theme-transition shadow-xs">
        <div className="p-4 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            {currentExportConfig.title}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Total Entries: <strong className="text-blue-700 dark:text-blue-400 font-mono">{currentExportConfig.data.length}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">#</th>
                {currentExportConfig.columns.map((col) => (
                  <th key={col.key} className="py-3 px-4">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
              {currentExportConfig.data.length === 0 ? (
                <tr>
                  <td colSpan={currentExportConfig.columns.length + 1} className="py-8 text-center text-slate-500 font-semibold">
                    No matching records found for the selected filter parameters.
                  </td>
                </tr>
              ) : (
                currentExportConfig.data.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    {currentExportConfig.columns.map((col) => (
                      <td key={col.key} className="py-3 px-4">
                        {col.key === 'eligible' ? (
                          <Badge variant={row[col.key] === 'ELIGIBLE' ? 'success' : 'neutral'} size="sm">
                            {row[col.key]}
                          </Badge>
                        ) : col.key === 'rank' ? (
                          <span className="font-bold text-blue-700 dark:text-blue-400">{row[col.key]}</span>
                        ) : col.key === 'timeInGrade' ? (
                          <span className="font-mono font-bold text-sky-700 dark:text-sky-300">{row[col.key]}</span>
                        ) : (
                          String(row[col.key] ?? '—')
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

