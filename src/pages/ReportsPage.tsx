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
  Medal,
  BarChart3
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { calculateTimeInGrade } from '../utils/timeInGrade';
import { ExportPrintModal } from '../components/common/ExportPrintModal';
import { Button, PageHeader } from '../components/common/SystemUI';
import { resolvePersonnelRankCategory } from '../utils/personnelCounting';
import { AutomatedPersonnelCounter } from '../components/dashboard/AutomatedPersonnelCounter';
import { getOrderNumberDisplay } from '../utils/orderNumber';
import './ModulePages.css';
import './RecordsModules.css';
import './ReportsPage.css';

type ReportTab = 'alpha_list' | 'strength_counting' | 'leave' | 'education' | 'training' | 'promotion' | 'orders' | 'awards';

const reportTabs: Array<{ key: ReportTab; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'alpha_list', label: 'Alpha List', description: 'Active postings', icon: Users },
  { key: 'strength_counting', label: 'Personnel Strength', description: 'Headcount & deployment audit', icon: BarChart3 },
  { key: 'training', label: 'Training', description: 'Completed courses', icon: GraduationCap },
  { key: 'orders', label: 'Orders', description: 'Administrative orders', icon: FileText },
  { key: 'awards', label: 'Award Orders', description: 'Administrative orders using the Award purpose', icon: Medal },
  { key: 'leave', label: 'Leave', description: 'Date-filtered roster', icon: Calendar },
  { key: 'education', label: 'Education', description: 'Qualifications', icon: GraduationCap },
  { key: 'promotion', label: 'Promotion TIG', description: 'Eligibility audit', icon: Award }
];

export const ReportsPage: React.FC = () => {
  const { personnelList, assignmentsList, leaveList, educationList, trainingList, ordersList } = useAuthRole();
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('alpha_list');

  // Filters
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [leaveDateFilter, setLeaveDateFilter] = useState('2026-07-23');
  const [courseFilter, setCourseFilter] = useState('ALL');

  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // 1. Alpha List Data (Current Active Assignments)
  const alphaListData = personnelList
    .filter(p => divisionFilter === 'ALL' || (p.sub_unit || p.division) === divisionFilter)
    .map(p => {
      const activeAsg = assignmentsList.find(a => a.personnelId === p.id && a.status === 'Current');
      return {
        id: p.id,
        rank: p.rank,
        fullName: p.fullName,
        badgeNo: p.badgeNo,
        plantilla: p.plantilla,
        sub_unit: p.sub_unit || p.division || '—',
        details: p.details || p.detail || '—',
        station: p.station || '—',
        position: activeAsg ? activeAsg.position : p.designation,
        unit: activeAsg ? activeAsg.unit : (p.details || p.detail),
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
        sub_unit: person?.sub_unit || person?.division || 'HQ',
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
        sub_unit: p.sub_unit || p.division || '—',
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
      sub_unit: p.sub_unit || p.division || '—',
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
    orderNumber: getOrderNumberDisplay(order, '—'),
    orderType: order.orderType || order.type || 'Administrative Order',
    personnel: order.personnelIds?.map(id => personnelNames.get(id) || 'Unknown personnel').join(', ') || `${order.affectedPersonnelCount || 0} personnel`,
    date: order.issuedDate || order.effectiveDate || '—'
  }));
  const awardsReportData = ordersList
    .filter(order => order.purposeCode === 'AW')
    .map(order => {
      const purposeData = order.purposeData || {};
      const snapshotNames = order.personnelSnapshot?.map(person => `${person.rank || ''} ${person.fullName || ''}`.trim()).filter(Boolean) || [];
      const personnel = snapshotNames.length
        ? snapshotNames.join(', ')
        : order.personnelIds?.map(id => personnelNames.get(id) || 'Unknown personnel').join(', ') || 'Unknown personnel';
      return {
        orderNumber: getOrderNumberDisplay(order, '—'),
        personnelName: personnel,
        awardName: order.subject,
        title: typeof purposeData.awardTitle === 'string' ? purposeData.awardTitle : '',
        orderType: order.orderType || order.type || 'Administrative Order',
        authorityDate: order.issuedDate || order.effectiveDate || '—',
        status: order.documentStatus || order.status || 'Draft'
      };
    });

  // 5. Personnel Strength & Counting Report Data (Aggregated by Sub-Unit & Station)
  const strengthReportData = React.useMemo(() => {
    const groups: Record<string, {
      unitCategory: string;
      subUnitCategory: string;
      sub_unit: string;
      station: string;
      pcoCount: number;
      pncoCount: number;
      nupCount: number;
      maleCount: number;
      femaleCount: number;
      total: number;
    }> = {};

    for (const p of personnelList) {
      const uc = p.unitCategory || 'ITMS HQ';
      const suc = p.subUnitCategory || 'Division';
      const su = p.sub_unit || p.division || 'Unassigned';
      const st = p.station || 'HQ Base';
      const key = `${uc}__${suc}__${su}__${st}`;

      if (!groups[key]) {
        groups[key] = {
          unitCategory: uc,
          subUnitCategory: suc,
          sub_unit: su,
          station: st,
          pcoCount: 0,
          pncoCount: 0,
          nupCount: 0,
          maleCount: 0,
          femaleCount: 0,
          total: 0
        };
      }

      const rc = resolvePersonnelRankCategory(p);
      if (rc === 'PCO') groups[key].pcoCount++;
      else if (rc === 'PNCO') groups[key].pncoCount++;
      else if (rc === 'NUP') groups[key].nupCount++;

      const g = (p.gender || '').toLowerCase();
      if (g === 'male') groups[key].maleCount++;
      else if (g === 'female') groups[key].femaleCount++;

      groups[key].total++;
    }

    return Object.values(groups).sort((a, b) => a.sub_unit.localeCompare(b.sub_unit));
  }, [personnelList]);

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
            { key: 'sub_unit', label: 'Sub-Unit' },
            { key: 'details', label: 'Details' },
            { key: 'station', label: 'Station' },
            { key: 'position', label: 'Assigned Position' },
            { key: 'plantilla', label: 'Plantilla Item' }
          ]
        };
      case 'strength_counting':
        return {
          title: 'PNP ITMS Automated Personnel Strength & Deployment Audit',
          data: strengthReportData,
          columns: [
            { key: 'unitCategory', label: 'Unit Category' },
            { key: 'subUnitCategory', label: 'Sub-unit Category' },
            { key: 'sub_unit', label: 'Sub-Unit' },
            { key: 'station', label: 'Station' },
            { key: 'pcoCount', label: 'PCO' },
            { key: 'pncoCount', label: 'PNCO' },
            { key: 'nupCount', label: 'NUP' },
            { key: 'maleCount', label: 'Male' },
            { key: 'femaleCount', label: 'Female' },
            { key: 'total', label: 'Total Strength' }
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
            { key: 'sub_unit', label: 'Sub-Unit' },
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
            { key: 'sub_unit', label: 'Sub-Unit' },
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
            { key: 'sub_unit', label: 'Sub-Unit' },
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
        return { title: 'PNP ITMS Award Orders Report', data: awardsReportData, columns: [
          { key: 'orderNumber', label: 'Order No.' }, { key: 'personnelName', label: 'Personnel' }, { key: 'awardName', label: 'Award' },
          { key: 'title', label: 'Award Title' }, { key: 'orderType', label: 'Order Type' },
          { key: 'authorityDate', label: 'Authority Date' }, { key: 'status', label: 'Status' }
        ] };
    }
  };

  const currentExportConfig = getExportConfig();
  const activeReport = reportTabs.find(tab => tab.key === activeReportTab)!;

  const handleReportKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % reportTabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + reportTabs.length) % reportTabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = reportTabs.length - 1;
    else return;
    event.preventDefault();
    setActiveReportTab(reportTabs[nextIndex].key);
    document.getElementById(`report-tab-${reportTabs[nextIndex].key}`)?.focus();
  };

  return (
    <div className="module-page records-module reports-page space-y-6">
      <PageHeader
        title="Reports"
        description="Choose a report, review its records, and export or print the current results."
        actions={<Button variant="primary" icon={Printer} onClick={() => setIsExportOpen(true)}>Export / print report</Button>}
      />

      {/* Report Selection Tabs Bar */}
      <div className="reports-navigation" role="tablist" aria-label="Report type">
        {reportTabs.map((tab, index) => {
          const Icon = tab.icon;
          const active = activeReportTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`report-tab-${tab.key}`}
              aria-selected={active}
              aria-controls="report-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveReportTab(tab.key)}
              onKeyDown={(event) => handleReportKeyDown(event, index)}
              className="reports-tab"
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <section id="report-panel" role="tabpanel" aria-labelledby={`report-tab-${activeReportTab}`} tabIndex={0} className="reports-panel space-y-5">
      {/* Dynamic Filter Controls per Report */}
      <div className="record-toolbar reports-filters">
        <div className="reports-context">
          <h2>{activeReport.label}</h2>
          <p>{activeReport.description}</p>
        </div>

        {activeReportTab === 'alpha_list' && (
          <div className="reports-filter-field">
            <label htmlFor="report-sub-unit"><Filter aria-hidden="true" className="h-3.5 w-3.5" /> Sub-unit</label>
            <select
              id="report-sub-unit"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="reports-filter-control"
            >
              <option value="ALL">All Sub-Units & Offices</option>
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
          <div className="reports-filter-field">
            <label htmlFor="report-leave-date">Personnel on leave as of</label>
            <input
              id="report-leave-date"
              type="date"
              value={leaveDateFilter}
              onChange={(e) => setLeaveDateFilter(e.target.value)}
              className="reports-filter-control"
            />
          </div>
        )}

        {activeReportTab === 'education' && (
          <div className="reports-filter-field">
            <label htmlFor="report-course">Course / certification</label>
            <select
              id="report-course"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="reports-filter-control"
            >
              <option value="ALL">All Qualifications & Courses</option>
              {courseOptions.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {activeReportTab === 'strength_counting' && (
          <div className="reports-filter-note">
            <span>Aggregated by Unit Category, Sub-Unit Category, Sub-Unit, and Station across PCO, PNCO, NUP, and Gender.</span>
          </div>
        )}

        {activeReportTab === 'promotion' && (
          <div className="reports-filter-note">
            <span>Promotion board benchmark: <strong>≥ 3 years (1,095 days)</strong></span>
          </div>
        )}
      </div>

      {activeReportTab === 'strength_counting' && (
        <AutomatedPersonnelCounter personnelList={personnelList} />
      )}

      {/* Report Data Table Display */}
      <div className="record-section reports-results">
        <div className="reports-results-heading">
          <h3>
            {currentExportConfig.title}
          </h3>
          <span className="reports-record-count" aria-live="polite"><strong>{currentExportConfig.data.length}</strong> records</span>
        </div>

        <div className="module-table-scroll" role="region" aria-label={`${activeReport.label} records`} tabIndex={0}>
          <table className="record-table text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase text-[11px]">
                <th scope="col" className="py-3.5 px-4">#</th>
                {currentExportConfig.columns.map((col) => (
                  <th scope="col" key={col.key} className="py-3.5 px-4">{col.label}</th>
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
                            <span className="reports-tabular">{row[col.key]}</span>
                        ) : col.key === 'timeInGrade' ? (
                          <span className="reports-tabular">{row[col.key]}</span>
                        ) : col.key === 'total' ? (
                          <span className="reports-tabular font-semibold">{row[col.key]}</span>
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
      </section>

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


