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
import { Button, PageHeader } from '../components/common/SystemUI';

type ReportTab = 'alpha_list' | 'leave' | 'education' | 'training' | 'promotion' | 'orders' | 'awards';

const reportTabs: Array<{ key: ReportTab; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'alpha_list', label: 'Alpha List', description: 'Active postings', icon: Users },
  { key: 'training', label: 'Training', description: 'Completed courses', icon: GraduationCap },
  { key: 'orders', label: 'Orders', description: 'Administrative orders', icon: FileText },
  { key: 'awards', label: 'Awards', description: 'Recognition records', icon: Medal },
  { key: 'leave', label: 'Leave', description: 'Date-filtered roster', icon: Calendar },
  { key: 'education', label: 'Education', description: 'Qualifications', icon: GraduationCap },
  { key: 'promotion', label: 'Promotion TIG', description: 'Eligibility audit', icon: Award }
];

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
      <PageHeader
        eyebrow="Official reporting module"
        title="Administrative Reports"
        description="Review filtered personnel, leave, education, training, orders, awards, and time-in-grade records in a print-ready format."
        meta={<span className="text-[11px] text-slate-500">PNP–ITMS administrative records</span>}
        reference="RPT-GENERATION-DESK"
        actions={<Button variant="primary" icon={Printer} onClick={() => setIsExportOpen(true)}>Export / print report</Button>}
      />

      {/* Report Selection Tabs Bar */}
      <div className="record-section flex gap-0 overflow-x-auto p-1" role="tablist" aria-label="Report type">
        {reportTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeReportTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveReportTab(tab.key)}
              className={`flex min-w-32 flex-1 items-center gap-2 rounded border-b-2 px-3 py-2.5 text-left ${active ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
              <span>
                <span className="block text-xs font-semibold">{tab.label}</span>
                <span className="block text-[10px] text-slate-500">{tab.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Filter Controls per Report */}
      <div className="record-toolbar flex flex-wrap items-center justify-between gap-4 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-blue-700" /> Report filters
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
      <div className="record-section">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-blue-700" />
            {currentExportConfig.title}
          </h3>
          <span className="text-xs text-slate-500">Record count: <strong className="font-mono font-semibold text-slate-800">{currentExportConfig.data.length}</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="record-table text-xs">
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


