import React, { Component, type ReactNode, useState, useEffect, useMemo } from 'react';
import { AlertTriangle, RotateCcw, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/common/SystemUI';
import './ModulePages.css';
import './RecordsModules.css';
import './ExcelIntegrationPage.css';
import { ExcelWorksheetModule } from '../components/spreadsheet/ExcelWorksheetModule';
import { PromotionalWorksheetModal } from '../components/promotions/PromotionalWorksheetModal';
import { useAuthRole } from '../context/AuthRoleContext';
import { PNP_RANKS, normalizeRankCode } from '../constants/ranks';
import {
  buildPromotionalWorksheetDetail,
  downloadPromotionalWorksheetExcel,
  getDynamicPromotionalTitle
} from '../utils/promotionalWorksheetExport';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WorksheetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Spreadsheet Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="worksheet-error rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/30" role="alert">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
            Spreadsheet Encountered an Issue
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected error occurred while rendering the interactive spreadsheet.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <RotateCcw className="h-4 w-4" />
            Reload Spreadsheet
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ExcelIntegrationPage: React.FC = () => {
  const { personnelList, assignmentsList, educationList, trainingList, promotionsList } = useAuthRole();
  const [isPromotionalModalOpen, setIsPromotionalModalOpen] = useState(false);
  const [targetRank, setTargetRank] = useState('PMSg');
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
  const [worksheetData, setWorksheetData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Available promotional ranks
  const promotionalRanks = useMemo(() => {
    return PNP_RANKS.filter(r => r.category !== 'NUP').map(r => ({
      code: r.code,
      name: r.name,
      label: `${r.name} (${r.code})`
    }));
  }, []);

  // Matching personnel for target rank
  const candidatePersonnel = useMemo(() => {
    return personnelList.filter(p => {
      if (p.rankCategory === 'NUP' || normalizeRankCode(p.rank) === 'NUP') return false;
      if (targetRank !== 'ALL' && normalizeRankCode(p.rank) !== normalizeRankCode(targetRank)) return false;
      return true;
    });
  }, [personnelList, targetRank]);

  // Dynamic Exam Title
  const dynamicTitle = useMemo(() => {
    return getDynamicPromotionalTitle(targetRank === 'ALL' ? 'PROMOTIONAL EXAMINATION' : targetRank);
  }, [targetRank]);

  // Automatically generate and update interactive table data whenever personnelList or rank selection changes
  useEffect(() => {
    if (personnelList && personnelList.length > 0) {
      const ids = selectedPersonnelIds.length > 0
        ? selectedPersonnelIds
        : candidatePersonnel.map(p => p.id);

      const generatedSheet = buildPromotionalWorksheetDetail({
        targetRank,
        promotionalTitle: dynamicTitle,
        selectedPersonnelIds: ids,
        personnelList,
        assignmentsList,
        educationList,
        trainingList,
        promotionsList
      });

      setWorksheetData(generatedSheet);
    }
  }, [personnelList, assignmentsList, educationList, trainingList, promotionsList, targetRank, selectedPersonnelIds, candidatePersonnel, dynamicTitle]);

  // Handle direct Excel file export
  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const ids = selectedPersonnelIds.length > 0
        ? selectedPersonnelIds
        : candidatePersonnel.map(p => p.id);

      await downloadPromotionalWorksheetExcel({
        targetRank,
        promotionalTitle: dynamicTitle,
        selectedPersonnelIds: ids,
        personnelList,
        assignmentsList,
        educationList,
        trainingList,
        promotionsList,
        allowIncomplete: true
      });
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="module-page records-module worksheets-page mx-auto w-full max-w-[1680px] space-y-5">
      <div className="no-print">
        <PageHeader 
          title="Excel Worksheets" 
          description="Official PNP-ITMS promotional worksheet editor. Interactive table synchronized with PAIS 2.0 database." 
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Promotional Rank Switcher */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Rank:</span>
                <select
                  value={targetRank}
                  onChange={e => {
                    setTargetRank(e.target.value);
                    setSelectedPersonnelIds([]);
                  }}
                  className="text-xs font-bold bg-transparent text-slate-800 border-none outline-none cursor-pointer"
                >
                  <option value="ALL">All Promotional Candidates</option>
                  {promotionalRanks.map(r => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Personnel Selection Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsPromotionalModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                title="Select specific personnel to include in the promotional worksheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>
                  {selectedPersonnelIds.length > 0
                    ? `Selected (${selectedPersonnelIds.length})`
                    : `Select Personnel (${candidatePersonnel.length})`}
                </span>
              </button>

              {/* Direct Excel Download Button */}
              <button
                type="button"
                disabled={isExporting}
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-xs disabled:opacity-50"
                title="Download official single-worksheet .xlsx file"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download .xlsx</span>
              </button>
            </div>
          }
        />
      </div>

      {/* FULL EXCEL WORKSHEET MODULE (INTERACTIVE TABLE AUTOMATICALLY DISPLAYED) */}
      <div className="w-full">
        <WorksheetErrorBoundary>
          <ExcelWorksheetModule sheetDataOverride={worksheetData} />
        </WorksheetErrorBoundary>
      </div>

      {/* Promotional Examination Worksheet Modal */}
      <PromotionalWorksheetModal
        isOpen={isPromotionalModalOpen}
        onClose={() => setIsPromotionalModalOpen(false)}
        initialRank={targetRank}
        onApplyToWorksheet={(ids, rank) => {
          setTargetRank(rank);
          setSelectedPersonnelIds(ids);
        }}
      />
    </div>
  );
};


