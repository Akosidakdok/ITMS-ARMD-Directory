import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileDown,
  LoaderCircle,
  ShieldAlert,
  Upload,
  X,
  Layers,
  Ban,
  Download,
  Info,
  ChevronDown
} from 'lucide-react';
import type { BulkPersonnelImportResult } from '../../services/api';
import {
  parsePersonnelCsv,
  parsePersonnelExcelRows,
  type PersonnelCsvResult,
  type PersonnelImportRow,
  type PersonnelImportIssue
} from '../../utils/personnelCsv';
import { readPersonnelXlsx } from '../../utils/personnelXlsx';
import {
  OFFICIAL_IMPORT_HEADERS,
  downloadOfficialExcelTemplate,
  downloadOfficialCsvTemplate
} from '../../utils/personnelTemplate';

interface BulkImportModalProps {
  isOpen: boolean;
  backendConnected: boolean;
  onClose: () => void;
  onImport: (
    rows: PersonnelImportRow[],
    duplicateMode: 'skip' | 'update' | 'flag',
    onProgress: (completed: number, total: number) => void
  ) => Promise<BulkPersonnelImportResult>;
}

const EMPTY_RESULT: PersonnelCsvResult = {
  acceptedHeaders: [],
  ignoredHeaders: [],
  detectedHeaderRowIndex: 0,
  rows: [],
  errors: []
};

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  backendConnected,
  onClose,
  onImport
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawExcelRows, setRawExcelRows] = useState<ReadonlyArray<ReadonlyArray<unknown>> | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string | null>(null);
  const [headerRowOverride, setHeaderRowOverride] = useState<number | 'auto'>('auto');
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update' | 'flag'>('skip');
  const [excludedRowNumbers, setExcludedRowNumbers] = useState<Set<number>>(new Set());
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'errors'>('all');

  const [parsed, setParsed] = useState<PersonnelCsvResult>(EMPTY_RESULT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [fatalError, setFatalError] = useState('');
  const [importResult, setImportResult] = useState<BulkPersonnelImportResult | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  if (!isOpen) return null;

  const resetUpload = () => {
    setFile(null);
    setRawExcelRows(null);
    setRawCsvText(null);
    setHeaderRowOverride('auto');
    setExcludedRowNumbers(new Set());
    setPreviewFilter('all');
    setParsed(EMPTY_RESULT);
    setProgress({ completed: 0, total: 0 });
    setFatalError('');
    setImportResult(null);
  };

  const handleClose = () => {
    if (isImporting) return;
    resetUpload();
    onClose();
  };

  const processLoadedData = (
    excelRows: ReadonlyArray<ReadonlyArray<unknown>> | null,
    csvText: string | null,
    override: number | 'auto'
  ) => {
    const explicitIndex = override === 'auto' ? undefined : override;
    if (excelRows) {
      const parsedResult = parsePersonnelExcelRows(excelRows, explicitIndex);
      setParsed(parsedResult);
      if (parsedResult.detectedHeaderRowIndex < 0) {
        setFatalError('Unable to detect the personnel table header. You can pick a specific header row below.');
      } else {
        setFatalError('');
      }
    } else if (csvText !== null) {
      const parsedResult = parsePersonnelCsv(csvText, explicitIndex);
      setParsed(parsedResult);
      if (parsedResult.detectedHeaderRowIndex < 0) {
        setFatalError('Unable to detect the personnel table header. You can pick a specific header row below.');
      } else {
        setFatalError('');
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    event.target.value = '';
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setParsed(EMPTY_RESULT);
    setFatalError('');
    setImportResult(null);
    setExcludedRowNumbers(new Set());
    setIsProcessing(true);

    try {
      const fileName = uploadedFile.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        throw new Error('Please select an Excel (.xlsx/.xls) or CSV (.csv) file.');
      }

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const rows = await readPersonnelXlsx(uploadedFile);
        setRawExcelRows(rows);
        setRawCsvText(null);
        processLoadedData(rows, null, headerRowOverride);
      } else {
        const csv = await uploadedFile.text();
        setRawCsvText(csv);
        setRawExcelRows(null);
        processLoadedData(null, csv, headerRowOverride);
      }
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : 'The file could not be read.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHeaderRowChange = (value: string) => {
    const nextOverride = value === 'auto' ? 'auto' : parseInt(value, 10);
    setHeaderRowOverride(nextOverride);
    processLoadedData(rawExcelRows, rawCsvText, nextOverride);
  };

  const toggleExcludeRow = (rowNumber: number) => {
    setExcludedRowNumbers(prev => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  const handleExcludeAllInvalid = () => {
    const errorRows = new Set(parsed.errors.map(e => e.rowNumber));
    setExcludedRowNumbers(prev => {
      const next = new Set(prev);
      errorRows.forEach(r => next.add(r));
      return next;
    });
  };

  const handleConfirmImport = async () => {
    const rowsToCommit = parsed.rows.filter(r => !excludedRowNumbers.has(r.rowNumber));
    if (rowsToCommit.length === 0 || isImporting) return;

    setFatalError('');
    setImportResult(null);
    setProgress({ completed: 0, total: rowsToCommit.length });
    setIsImporting(true);

    try {
      const backendResult = await onImport(
        rowsToCommit,
        duplicateMode,
        (completed, total) => setProgress({ completed, total })
      );
      setImportResult({
        ...backendResult,
        rejectedCount: (backendResult.rejectedCount || 0) + parsed.errors.length,
        errors: [...parsed.errors, ...(backendResult.errors || [])]
      });
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : 'Bulk import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const exportErrorReportCsv = (errors: PersonnelImportIssue[]) => {
    const headers = ['Row Number', 'Affected Field', 'Original Value', 'Validation Reason'];
    const rows = errors.map(err => [
      err.rowNumber,
      `"${(err.field || '').replace(/"/g, '""')}"`,
      `"${(err.originalValue || '').replace(/"/g, '""')}"`,
      `"${err.messages.join('; ').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PAIS_Import_Error_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const activeRowsToCommit = parsed.rows.filter(r => !excludedRowNumbers.has(r.rowNumber));
  const displayedErrors = importResult?.errors || parsed.errors;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="my-2 sm:my-4 bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Bulk Personnel Import (PAIS 2.0)</h3>
              <p className="text-xs text-slate-300">Official 34-Column and October Roster Imports · Automated Field Mapping</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting}
            aria-label="Close bulk import"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Offline Warning */}
          {!backendConnected && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>The backend is offline. Start the server before importing records so they are safely saved to the database.</span>
            </div>
          )}

          {/* Official 34-Header Reference Banner & Download Templates */}
          <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-blue-200/60">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700" />
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Official 34-Column Import Structure
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsDownloadingTemplate(true);
                    try {
                      await downloadOfficialExcelTemplate();
                    } finally {
                      setIsDownloadingTemplate(false);
                    }
                  }}
                  disabled={isDownloadingTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  title="Download the official Excel template (.xlsx)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Excel Template (.xlsx)
                </button>
                <button
                  onClick={() => downloadOfficialCsvTemplate()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors"
                  title="Download the official CSV template (.csv)"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500" />
                  CSV Template
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 mb-2.5">
              The October alphalist workbook (42 columns, including Gender) is supported; its row 8 headers are detected automatically. The 34-column template below remains supported too. Report headings and empty rows are skipped.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-100/50 rounded-xl">
              {OFFICIAL_IMPORT_HEADERS.map((col, idx) => (
                <div
                  key={col}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-700 flex items-center justify-between shadow-2xs"
                >
                  <span className="font-bold text-blue-700">{idx + 1}.</span>
                  <span className="truncate ml-1 font-semibold" title={col}>{col}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2.5 border-t border-blue-200/50 flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-blue-600" />
                <strong>Section A:</strong> Personal Info (Rank, Names, Qual, BirthDate, Gender, Civil Status, Religion, Address)
              </span>
              <span>
                <strong>Section B:</strong> Identifiers (Badge, Email, Phone, TIN, GSIS, PhilHealth, Pag-IBIG)
              </span>
              <span>
                <strong>Section C:</strong> Service & Career (Service Dates, Designation, PStatus, Commissionship)
              </span>
              <span>
                <strong>Section D:</strong> Organization (Unit, Sub Unit, Station, Sub Station Codes & Names)
              </span>
            </div>
          </div>

          {/* Upload Area */}
          {!file && (
            <div className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 rounded-2xl p-8 text-center transition-all">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
                id="bulk-personnel-file-input"
              />
              <label
                htmlFor="bulk-personnel-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">Select an Excel or CSV file to import</span>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong> files (Alpha List / Disposition format supported)
                  </p>
                </div>
                <span className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                  Browse File
                </span>
              </label>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-8 flex items-center justify-center gap-3 text-sm text-slate-600 bg-slate-50 rounded-2xl border border-slate-200">
              <LoaderCircle className="w-5 h-5 animate-spin text-blue-600" />
              Scanning rows, detecting header row, and mapping schema columns…
            </div>
          )}

          {/* Uploaded File & Configuration Controls */}
          {file && !isProcessing && (
            <div className="space-y-4">
              {/* File details bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-7 h-7 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB · {parsed.rows.length} valid rows · {parsed.errors.length} rejected rows
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetUpload}
                    disabled={isImporting}
                    className="text-xs text-rose-600 hover:underline font-bold disabled:opacity-40"
                  >
                    Change file
                  </button>
                </div>
              </div>

              {/* Header detection override & Duplicate mode controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Header Row Selector */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Header Row Detection
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      Detected: Row {parsed.detectedHeaderRowIndex + 1}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    If the file contains title banners, select the row containing the column headers:
                  </p>
                  <div className="relative">
                    <select
                      value={headerRowOverride}
                      onChange={e => handleHeaderRowChange(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none"
                    >
                      <option value="auto">Auto-Detect Header (Row {parsed.detectedHeaderRowIndex + 1})</option>
                      {Array.from({ length: 20 }, (_, i) => (
                        <option key={i} value={i}>
                          Row {i + 1} {i === parsed.detectedHeaderRowIndex ? '(Auto-Detected)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Duplicate Handling Selector */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Duplicate Handling Strategy
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Choose how to handle existing personnel records (matched by Link, Account Number, Badge No, or Name and birth date):
                  </p>
                  <select
                    value={duplicateMode}
                    onChange={e => setDuplicateMode(e.target.value as 'skip' | 'update' | 'flag')}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="skip">Skip existing records (Recommended - keeps current database data)</option>
                    <option value="update">Update matching records (uses nonblank spreadsheet values and preserves fields not in the file)</option>
                    <option value="flag">Flag duplicates for manual review (Do not overwrite or insert)</option>
                  </select>
                </div>
              </div>

              {/* Schema mapping summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Accepted Columns ({parsed.acceptedHeaders.length})
                  </div>
                  <p className="text-[10px] text-emerald-700 mb-2">Mapped to official PAIS database schema:</p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {parsed.acceptedHeaders.map(header => (
                      <span key={header} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        {header}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Ignored Columns ({parsed.ignoredHeaders.length})
                  </div>
                  <p className="text-[10px] text-amber-700 mb-2">
                    Non-schema columns bypassed safely without data loss:
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {parsed.ignoredHeaders.length > 0 ? parsed.ignoredHeaders.map(header => (
                      <span key={header} className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold line-through border border-amber-300">
                        {header}
                      </span>
                    )) : (
                      <span className="text-[10px] text-emerald-700 font-bold">All columns matched official schema.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview & Row Filter Tabs */}
              {parsed.rows.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800">Record Preview &amp; Verification</h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({activeRowsToCommit.length} of {parsed.rows.length} selected for import)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {parsed.errors.length > 0 && (
                        <button
                          type="button"
                          onClick={handleExcludeAllInvalid}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                        >
                          Exclude Invalid Rows ({parsed.errors.length})
                        </button>
                      )}
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('all')}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                            previewFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All ({parsed.rows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('valid')}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                            previewFilter === 'valid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Valid ({parsed.rows.length})
                        </button>
                        {parsed.errors.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPreviewFilter('errors')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                              previewFilter === 'errors' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Issues ({parsed.errors.length})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-2 w-10 text-center">Include</th>
                          <th className="p-2">Row</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Rank</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Badge No</th>
                          <th className="p-2">PStatus</th>
                          <th className="p-2">Unit / Sub Unit</th>
                          <th className="p-2">Designation</th>
                          <th className="p-2">TIN</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Date Entered Service</th>
                          <th className="p-2">BirthDate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsed.rows.slice(0, 15).map(row => {
                          const isExcluded = excludedRowNumbers.has(row.rowNumber);
                          const isNup = row.data.rankCategory === 'NUP';
                          return (
                            <tr
                              key={row.rowNumber}
                              className={`transition-colors ${isExcluded ? 'bg-slate-100/70 text-slate-400' : 'hover:bg-slate-50'}`}
                            >
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={() => toggleExcludeRow(row.rowNumber)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-2 font-mono text-slate-500">{row.rowNumber}</td>
                              <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  row.data.rankCategory === 'PCO'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : row.data.rankCategory === 'PNCO'
                                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}>
                                  {row.data.rankCategory || 'PCO'}
                                </span>
                              </td>
                              <td className="p-2 font-bold text-blue-800">{row.data.rank}</td>
                              <td className="p-2 font-semibold text-slate-900">{row.data.fullName}</td>
                              <td className="p-2 font-mono">
                                {isNup ? (
                                  <span className="text-emerald-700 font-bold">SG-{row.data.salaryGrade || '—'}</span>
                                ) : (
                                  <span className="text-slate-800 font-bold">{row.data.badgeNo || row.data.badge_number || '—'}</span>
                                )}
                              </td>
                              <td className="p-2">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                  {row.data.pstatus || row.data.status}
                                </span>
                              </td>
                              <td className="p-2 text-slate-600">
                                {row.data.sub_unit || row.data.officeDivision || row.data.unit || '—'}
                              </td>
                              <td className="p-2 font-medium text-slate-800">{row.data.designation || '—'}</td>
                              <td className="p-2 font-mono text-slate-500">{row.data.tin || '—'}</td>
                              <td className="p-2 text-slate-500 max-w-[120px] truncate" title={row.data.email}>{row.data.email || '—'}</td>
                              <td className="p-2 font-mono text-slate-500">{row.data.dateEnteredService || row.data.dateOfEntry || row.data.desUp || '—'}</td>
                              <td className="p-2 font-mono text-slate-500">{row.data.birthdate || row.data.birthday || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsed.rows.length > 15 && (
                    <p className="text-[10px] text-slate-400 text-right">
                      Showing first 15 of {parsed.rows.length} valid rows in preview.
                    </p>
                  )}
                </div>
              )}

              {/* Validation Issues / Rejected Rows */}
              {displayedErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Validation Issues ({displayedErrors.length} rows)
                    </div>
                    <button
                      type="button"
                      onClick={() => exportErrorReportCsv(displayedErrors)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-white text-rose-700 border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Export Error Report (.csv)
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-rose-100">
                    {displayedErrors.slice(0, 25).map((issue, idx) => (
                      <div key={idx} className="pt-1.5 text-[11px] text-rose-800 flex items-start gap-2">
                        <span className="font-mono font-bold bg-rose-100 text-rose-900 px-1.5 py-0.2 rounded text-[10px]">
                          Row {issue.rowNumber}
                        </span>
                        {issue.field && (
                          <span className="font-semibold text-rose-950">[{issue.field}]:</span>
                        )}
                        <span>{issue.messages.join('; ')}</span>
                        {issue.originalValue && (
                          <span className="font-mono text-[10px] text-rose-600">
                            (Value: "{issue.originalValue}")
                          </span>
                        )}
                      </div>
                    ))}
                    {displayedErrors.length > 25 && (
                      <p className="text-[10px] font-bold text-rose-900 pt-1">
                        Plus {displayedErrors.length - 25} more issues. Click "Export Error Report" to view all.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import Progress Bar */}
          {isImporting && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-2">
                <span className="flex items-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin text-blue-600" />
                  Importing batches to Supabase database…
                </span>
                <span>{progress.completed} / {progress.total} ({progressPercent}%)</span>
              </div>
              <div className="h-2.5 rounded-full bg-blue-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Fatal Error */}
          {fatalError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <p className="text-xs font-semibold">{fatalError}</p>
            </div>
          )}

          {/* Post-Import Results Dialog */}
          {importResult && (
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-lg space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Bulk Import Execution Complete</h4>
                  <p className="text-xs text-slate-500">
                    Import processed with duplicate strategy: <strong>{duplicateMode.toUpperCase()}</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-2xs font-bold text-slate-500 uppercase">Total Rows</p>
                  <p className="text-lg font-black text-slate-800">{importResult.totalRows || parsed.rows.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-2xs font-bold text-emerald-700 uppercase">Created</p>
                  <p className="text-lg font-black text-emerald-800">{importResult.importedCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-2xs font-bold text-blue-700 uppercase">Updated</p>
                  <p className="text-lg font-black text-blue-800">{importResult.updatedCount || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-2xs font-bold text-amber-700 uppercase">Skipped / Dup</p>
                  <p className="text-lg font-black text-amber-800">
                    {(importResult.skippedCount || 0) + (importResult.duplicateCount || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <p className="text-2xs font-bold text-rose-700 uppercase">Rejected</p>
                  <p className="text-lg font-black text-rose-800">{importResult.rejectedCount || 0}</p>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    {importResult.errors.length} rows encountered issues or were rejected.
                  </span>
                  <button
                    type="button"
                    onClick={() => exportErrorReportCsv(importResult.errors)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Error Report (.csv)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors"
          >
            {importResult ? 'Done' : 'Cancel'}
          </button>

          {file && !importResult && (
            <button
              onClick={handleConfirmImport}
              disabled={
                activeRowsToCommit.length === 0 ||
                !backendConnected ||
                isProcessing ||
                isImporting
              }
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isImporting ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>Import {activeRowsToCommit.length} records</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
