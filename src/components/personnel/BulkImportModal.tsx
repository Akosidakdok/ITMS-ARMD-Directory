import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  ShieldAlert,
  Upload,
  X
} from 'lucide-react';
import type { BulkPersonnelImportResult } from '../../services/api';
import {
  parsePersonnelCsv,
  parsePersonnelExcelRows
} from '../../utils/personnelCsv';
import { readPersonnelXlsx } from '../../utils/personnelXlsx';
import type {
  PersonnelCsvResult,
  PersonnelImportRow
} from '../../utils/personnelCsv';

interface BulkImportModalProps {
  isOpen: boolean;
  backendConnected: boolean;
  onClose: () => void;
  onImport: (
    rows: PersonnelImportRow[],
    onProgress: (completed: number, total: number) => void
  ) => Promise<BulkPersonnelImportResult>;
}

const EMPTY_RESULT: PersonnelCsvResult = {
  acceptedHeaders: [],
  ignoredHeaders: [],
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
  const [parsed, setParsed] = useState<PersonnelCsvResult>(EMPTY_RESULT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [fatalError, setFatalError] = useState('');
  const [importResult, setImportResult] = useState<BulkPersonnelImportResult | null>(null);

  if (!isOpen) return null;

  const resetUpload = () => {
    setFile(null);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    event.target.value = '';
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setParsed(EMPTY_RESULT);
    setFatalError('');
    setImportResult(null);
    setIsProcessing(true);

    try {
      const fileName = uploadedFile.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
        throw new Error('Please select a CSV or Excel .xlsx file.');
      }
      if (fileName.endsWith('.xlsx')) {
        const rows = await readPersonnelXlsx(uploadedFile);
        setParsed(parsePersonnelExcelRows(rows));
      } else {
        const csv = await uploadedFile.text();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        setParsed(parsePersonnelCsv(csv));
      }
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : 'The CSV file could not be read.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsed.rows.length === 0 || isImporting) return;

    setFatalError('');
    setImportResult(null);
    setProgress({ completed: 0, total: parsed.rows.length });
    setIsImporting(true);

    try {
      const backendResult = await onImport(
        parsed.rows,
        (completed, total) => setProgress({ completed, total })
      );
      setImportResult({
        ...backendResult,
        rejectedCount: backendResult.rejectedCount + parsed.errors.length,
        errors: [...parsed.errors, ...backendResult.errors]
      });
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : 'Bulk import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const progressPercent = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;
  const displayedErrors = importResult?.errors || parsed.errors;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500 text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Bulk Personnel File Import</h3>
              <p className="text-xs text-slate-300">Only database-schema columns are processed</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting}
            aria-label="Close bulk import"
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!backendConnected && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>The backend is offline. Start it before importing so records are saved to the database.</span>
            </div>
          )}

          {!file && (
            <div className="border-2 border-dashed border-cyan-300 hover:border-cyan-500 bg-cyan-50/30 rounded-2xl p-8 text-center transition-all">
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileUpload}
                className="hidden"
                id="bulk-personnel-file-input"
              />
              <label
                htmlFor="bulk-personnel-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">Select a CSV or Excel file</span>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports .csv and .xlsx · Excel imports use the first worksheet
                  </p>
                </div>
                <span className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                  Browse file
                </span>
              </label>
            </div>
          )}

          {isProcessing && (
            <div className="p-6 flex items-center justify-center gap-3 text-sm text-slate-600">
              <LoaderCircle className="w-5 h-5 animate-spin text-cyan-600" />
              Reading schema columns from the selected file…
            </div>
          )}

          {file && !isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-cyan-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{file.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB · {parsed.rows.length} valid rows · {parsed.errors.length} rejected rows
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetUpload}
                  disabled={isImporting}
                  className="text-xs text-rose-600 hover:underline font-bold disabled:opacity-40"
                >
                  Change file
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Database columns ({parsed.acceptedHeaders.length})
                  </div>
                  <p className="text-[10px] text-emerald-700 mb-2">Only these columns were retained:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {parsed.acceptedHeaders.map(header => (
                      <span key={header} className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        {header}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Ignored columns ({parsed.ignoredHeaders.length})
                  </div>
                  <p className="text-[10px] text-amber-700 mb-2">
                    These columns were not read into personnel records or sent to the backend:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {parsed.ignoredHeaders.length > 0 ? parsed.ignoredHeaders.map(header => (
                      <span key={header} className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold line-through border border-amber-300">
                        {header}
                      </span>
                    )) : (
                      <span className="text-[10px] text-emerald-700 font-bold">No extra columns found.</span>
                    )}
                  </div>
                </div>
              </div>

              {parsed.rows.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Preview of first five valid rows</h4>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-2">File row</th>
                          <th className="p-2">Rank</th>
                          <th className="p-2">Full name</th>
                          <th className="p-2">Badge No.</th>
                          <th className="p-2">Division</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsed.rows.slice(0, 5).map(row => (
                          <tr key={row.rowNumber} className="hover:bg-slate-50">
                            <td className="p-2 font-mono">{row.rowNumber}</td>
                            <td className="p-2 font-bold text-blue-700">{row.data.rank}</td>
                            <td className="p-2 font-bold">{row.data.fullName}</td>
                            <td className="p-2 font-mono">{row.data.badgeNo}</td>
                            <td className="p-2">{row.data.division}</td>
                            <td className="p-2">{row.data.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {displayedErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Rejected rows ({displayedErrors.length})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {displayedErrors.slice(0, 20).map(issue => (
                      <p key={`${issue.rowNumber}-${issue.messages.join('-')}`} className="text-[10px] text-rose-700">
                        <strong>Row {issue.rowNumber}:</strong> {issue.messages.join('; ')}
                      </p>
                    ))}
                    {displayedErrors.length > 20 && (
                      <p className="text-[10px] font-bold text-rose-800">
                        Plus {displayedErrors.length - 20} more rejected rows.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isImporting && (
            <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-800 mb-2">
                <span>Importing in database batches…</span>
                <span>{progress.completed}/{progress.total} ({progressPercent}%)</span>
              </div>
              <div className="h-2 rounded-full bg-cyan-100 overflow-hidden">
                <div className="h-full bg-cyan-600 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          {fatalError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-semibold">{fatalError}</p>
            </div>
          )}

          {importResult && (
            <div className="p-4 bg-emerald-600 text-white rounded-xl flex items-center gap-3 shadow-lg">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Bulk import completed</h4>
                <p className="text-xs text-emerald-100">
                  {importResult.importedCount} imported · {importResult.rejectedCount} rejected
                </p>
              </div>
            </div>
          )}
        </div>

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
                parsed.rows.length === 0 ||
                !backendConnected ||
                isProcessing ||
                isImporting
              }
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              {isImporting ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>Import {parsed.rows.length} valid records</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
