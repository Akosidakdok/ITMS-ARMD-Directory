import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  Download, 
  Eye, 
  X, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  Table
} from 'lucide-react';
import { useAuthRole } from '../../context/AuthRoleContext';
import { PNP_RANKS, getRankFullName, normalizeRankCode } from '../../constants/ranks';
import { 
  buildPromotionalApplicantRows, 
  validatePromotionalPersonnel, 
  downloadPromotionalWorksheetExcel,
  getDynamicPromotionalTitle,
  formatDdMmYyyy,
  type PromotionalApplicantData,
  type PersonnelValidationIssue
} from '../../utils/promotionalWorksheetExport';
import { Badge } from '../common/Badge';

interface PromotionalWorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRank?: string;
  onNavigateToPersonnel?: (personnelId: string) => void;
  onApplyToWorksheet?: (selectedIds: string[], targetRank: string) => void;
}

export const PromotionalWorksheetModal: React.FC<PromotionalWorksheetModalProps> = ({
  isOpen,
  onClose,
  initialRank = 'PMSg',
  onNavigateToPersonnel,
  onApplyToWorksheet
}) => {
  const { personnelList, assignmentsList, educationList, trainingList, promotionsList } = useAuthRole();

  // Promotional Rank selection
  const [targetRank, setTargetRank] = useState<string>(initialRank);
  // Personnel selection state (Set of IDs)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  // Division filter
  const [divisionFilter, setDivisionFilter] = useState('ALL');

  // View state: 'select' | 'preview' | 'validation-error'
  const [viewMode, setViewMode] = useState<'select' | 'preview' | 'validation-error'>('select');
  const [validationIssues, setValidationIssues] = useState<PersonnelValidationIssue[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Available uniformed ranks for promotional exam
  const promotionalRanks = useMemo(() => {
    return PNP_RANKS.filter(r => r.category !== 'NUP').map(r => ({
      code: r.code,
      name: r.name,
      label: `${r.name} (${r.code})`
    }));
  }, []);

  // Filtered personnel matching target rank or available uniformed personnel
  const candidatePersonnel = useMemo(() => {
    return personnelList.filter(p => {
      // Must be uniformed
      if (p.rankCategory === 'NUP' || normalizeRankCode(p.rank) === 'NUP') return false;
      // Match rank if selected, or if 'ALL' allow selection across ranks
      if (targetRank !== 'ALL' && normalizeRankCode(p.rank) !== normalizeRankCode(targetRank)) {
        return false;
      }
      return true;
    });
  }, [personnelList, targetRank]);

  // Divisions list for filter
  const divisions = useMemo(() => {
    const set = new Set<string>();
    personnelList.forEach(p => {
      const div = p.sub_unit || p.division || p.officeDivision || p.unit;
      if (div) set.add(div);
    });
    return Array.from(set).sort();
  }, [personnelList]);

  // Filtered candidate personnel based on search and division filters
  const displayedPersonnel = useMemo(() => {
    return candidatePersonnel.filter(p => {
      if (divisionFilter !== 'ALL') {
        const div = p.sub_unit || p.division || p.officeDivision || p.unit;
        if (div !== divisionFilter) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (p.fullName || `${p.firstName} ${p.lastName}`).toLowerCase();
      const badge = (p.badgeNo || '').toLowerCase();
      const rank = (p.rank || '').toLowerCase();
      const div = (p.sub_unit || p.division || p.officeDivision || p.unit || '').toLowerCase();
      return name.includes(q) || badge.includes(q) || rank.includes(q) || div.includes(q);
    });
  }, [candidatePersonnel, searchQuery, divisionFilter]);

  // Derived applicant rows for preview & export
  const selectedApplicantsData = useMemo(() => {
    if (!selectedIds.size) return [];
    return buildPromotionalApplicantRows({
      targetRank,
      selectedPersonnelIds: Array.from(selectedIds),
      personnelList,
      assignmentsList,
      educationList,
      trainingList,
      promotionsList
    });
  }, [selectedIds, targetRank, personnelList, assignmentsList, educationList, trainingList, promotionsList]);

  // Dynamic Exam Title
  const dynamicTitle = useMemo(() => {
    return getDynamicPromotionalTitle(targetRank === 'ALL' ? 'PROMOTIONAL EXAMINATION' : targetRank);
  }, [targetRank]);

  // Toggle selection for a single personnel
  const toggleSelectPersonnel = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle Select All (operates on currently displayed filtered personnel)
  const isAllDisplayedSelected = displayedPersonnel.length > 0 && displayedPersonnel.every(p => selectedIds.has(p.id));
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllDisplayedSelected) {
        displayedPersonnel.forEach(p => next.delete(p.id));
      } else {
        displayedPersonnel.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  // Run validation
  const runValidation = (): PersonnelValidationIssue[] => {
    const issues = validatePromotionalPersonnel(selectedApplicantsData);
    setValidationIssues(issues);
    return issues;
  };

  // Handle Preview Click (direct to preview table, non-blocking)
  const handlePreview = () => {
    if (!selectedIds.size) return;
    runValidation();
    setViewMode('preview');
  };

  // Handle Apply to Table Click (loads into interactive spreadsheet table)
  const handleApplyToTable = () => {
    if (!selectedIds.size) return;
    if (onApplyToWorksheet) {
      onApplyToWorksheet(Array.from(selectedIds), targetRank);
    }
    onClose();
  };

  // Handle Generate Excel Click (direct export, unfilled fields stay blank)
  const handleGenerateExcel = async () => {
    if (!selectedIds.size) return;

    if (onApplyToWorksheet) {
      onApplyToWorksheet(Array.from(selectedIds), targetRank);
    }

    setIsExporting(true);
    setExportSuccess(null);
    try {
      const res = await downloadPromotionalWorksheetExcel({
        targetRank,
        promotionalTitle: dynamicTitle,
        selectedPersonnelIds: Array.from(selectedIds),
        personnelList,
        assignmentsList,
        educationList,
        trainingList,
        promotionsList,
        allowIncomplete: true
      });

      if (res.success) {
        setExportSuccess(`Worksheet "${res.filename}" generated successfully.`);
        setTimeout(() => setExportSuccess(null), 4000);
      } else if (res.issues && res.issues.length) {
        setValidationIssues(res.issues);
        setViewMode('validation-error');
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-wide text-white uppercase">
                Promotional Excel Worksheet Generator
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official PNP-ITMS single-sheet promotional examination document
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Export Success Notification Banner */}
          {exportSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold">{exportSuccess}</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">The Excel document contains exactly one worksheet formatted for landscape printing.</p>
              </div>
            </div>
          )}

          {/* VIEW 1: SELECTION CONTROLS */}
          {viewMode === 'select' && (
            <>
              {/* Dynamic Header Display Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      Promotional Examination / Rank Category
                    </label>
                    <select
                      value={targetRank}
                      onChange={e => {
                        setTargetRank(e.target.value);
                        setSelectedIds(new Set()); // Reset selection when rank changes to avoid cross-rank contamination
                      }}
                      className="px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Promotional Applicants</option>
                      {promotionalRanks.map(r => (
                        <option key={r.code} value={r.code}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:text-right bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dynamic Header Preview</p>
                    <p className="text-xs font-extrabold text-slate-900 mt-0.5">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
                    <p className="text-[11px] font-bold text-slate-700">WORKSHEET</p>
                    <p className="text-xs font-black text-blue-700">{dynamicTitle}</p>
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="search"
                    placeholder="Search personnel by name, rank, badge number, or office/unit..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={divisionFilter}
                    onChange={e => setDivisionFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="ALL">All Divisions / Sub-Units</option>
                    {divisions.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Personnel Selection Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900"
                  >
                    {isAllDisplayedSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Select All Displayed ({displayedPersonnel.length})</span>
                  </button>

                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    {selectedIds.size} of {candidatePersonnel.length} personnel selected
                  </span>
                </div>

                {displayedPersonnel.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {displayedPersonnel.map(person => {
                      const isSelected = selectedIds.has(person.id);
                      return (
                        <div
                          key={person.id}
                          onClick={() => toggleSelectPersonnel(person.id)}
                          className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <div>
                              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="font-mono text-blue-700">{person.rank}</span>
                                <span>{person.lastName}, {person.firstName} {person.middleName ? `${person.middleName[0]}.` : ''}</span>
                                {person.qualifier && <span className="text-slate-500 font-normal">({person.qualifier})</span>}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Badge No. {person.badgeNo || person.badge_number || 'None'} • {person.sub_unit || person.division || 'ITMS HQ'} • {person.designation || 'Staff'}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            person.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {person.status || 'Active'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium">
                    No promotional candidates found matching the selected filters.
                  </div>
                )}
              </div>
            </>
          )}

          {/* VIEW 2: UNFILLED RECORDS ADVISORY VIEW */}
          {viewMode === 'validation-error' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Unfilled Information Notice</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md self-start">
                      Allowed to export (blank cells)
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1">
                    Some selected personnel have empty fields in the PAIS 2.0 database. You can review their personnel records or proceed to generate the worksheet directly. Missing fields will appear as clean blank cells in the official Excel worksheet.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {validationIssues.map(issue => (
                  <div key={issue.personnelId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {issue.personnelName} <span className="font-mono text-slate-500">(Badge: {issue.badgeNo || 'None'})</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {issue.missingFields.map((field, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Unfilled: {field}
                          </span>
                        ))}
                      </div>
                    </div>

                    {onNavigateToPersonnel && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToPersonnel(issue.personnelId);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-colors border border-blue-200 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Review Personnel Record
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: WORKSHEET PREVIEW TABLE */}
          {viewMode === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-blue-900 uppercase">Worksheet Table Preview (17 Columns)</h3>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    {dynamicTitle} • {selectedApplicantsData.length} Applicant{selectedApplicantsData.length === 1 ? '' : 's'} Selected
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {validationIssues.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setViewMode('validation-error')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors border border-amber-300"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {validationIssues.length} Unfilled Records (Allowed)
                    </button>
                  ) : (
                    <Badge variant="success" size="sm">All Fields Complete</Badge>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="min-w-[1450px] text-xs text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold uppercase text-[10px]">
                    {/* Top Header Row */}
                    <tr>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">NR</th>
                      <th colSpan={5} className="px-3 py-2 border-r border-slate-200 text-center bg-slate-200">NAME OF APPLICANTS</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Badge Number</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Office/Unit</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Date of Unit Asg</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Designation</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Date Designated</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Date Entered PNP</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Highest Education</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Appropriate Eligibility</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Highest Mandatory Course</th>
                      <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">Date Last Promotion</th>
                      <th rowSpan={2} className="px-3 py-2 text-center">Time in Grade</th>
                    </tr>
                    {/* Sub Header Row */}
                    <tr className="border-t border-slate-200 bg-slate-100">
                      <th className="px-2 py-1.5 border-r border-slate-200 text-center">Rank</th>
                      <th className="px-2 py-1.5 border-r border-slate-200">Last Name</th>
                      <th className="px-2 py-1.5 border-r border-slate-200">First Name</th>
                      <th className="px-2 py-1.5 border-r border-slate-200">Middle</th>
                      <th className="px-2 py-1.5 border-r border-slate-200 text-center">Qual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedApplicantsData.map((row) => (
                      <tr key={row.personnelId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-500 border-r border-slate-100">{row.nr}</td>
                        <td className="px-2 py-2 text-center font-mono font-bold text-blue-800 border-r border-slate-100">{row.rank}</td>
                        <td className="px-2 py-2 font-bold text-slate-900 border-r border-slate-100">{row.lastName}</td>
                        <td className="px-2 py-2 font-bold text-slate-900 border-r border-slate-100">{row.firstName}</td>
                        <td className="px-2 py-2 text-slate-700 border-r border-slate-100">{row.middleName || '—'}</td>
                        <td className="px-2 py-2 text-center text-slate-700 border-r border-slate-100">{row.qualifier || '—'}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-800 border-r border-slate-100">{row.badgeNo}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-800 border-r border-slate-100">{row.officeUnit}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-700 border-r border-slate-100">{formatDdMmYyyy(row.dateOfUnitAssignment)}</td>
                        <td className="px-3 py-2 text-slate-800 border-r border-slate-100">{row.designation}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-700 border-r border-slate-100">{formatDdMmYyyy(row.dateDesignated)}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-700 border-r border-slate-100">{formatDdMmYyyy(row.dateEnteredPNP)}</td>
                        <td className="px-3 py-2 text-slate-800 border-r border-slate-100">{row.highestEducationalAttainment}</td>
                        <td className="px-3 py-2 text-slate-800 border-r border-slate-100">{row.appropriateEligibility}</td>
                        <td className="px-3 py-2 text-slate-800 border-r border-slate-100">{row.highestMandatoryCourse}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-700 border-r border-slate-100">{formatDdMmYyyy(row.dateOfLastPromotion)}</td>
                        <td className="px-3 py-2 text-slate-800 font-mono text-[11px]">{row.timeInGrade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-semibold">
            {selectedIds.size === 0 ? (
              <span className="text-amber-600">Select at least one personnel record to preview or generate.</span>
            ) : (
              <span><strong>{selectedIds.size}</strong> personnel selected for <strong>{dynamicTitle}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewMode !== 'select' && (
              <button
                type="button"
                onClick={() => setViewMode('select')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Selection
              </button>
            )}

            {viewMode === 'select' && (
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handlePreview}
                className="px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                Preview Worksheet
              </button>
            )}

            {viewMode === 'validation-error' && (
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className="px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                Preview Table
              </button>
            )}

            {onApplyToWorksheet && (
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleApplyToTable}
                className="px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                title="Populate the interactive spreadsheet table with selected personnel"
              >
                <Table className="w-4 h-4 text-emerald-600" />
                Show in Table
              </button>
            )}

            <button
              type="button"
              disabled={selectedIds.size === 0 || isExporting}
              onClick={handleGenerateExcel}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate Excel
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
