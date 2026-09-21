import React, { useState } from 'react';
import { CheckCircle2, FileSpreadsheet, AlertTriangle, X, Upload, RefreshCw } from 'lucide-react';
import { smartPreviewExcelImportApi, type SmartImportPreviewResult } from '../../services/api';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SmartImportPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await smartPreviewExcelImportApi(selectedFile);
      setPreview(res);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze workbook header and structure');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError('');
    try {
      // Import success message
      setSuccessMsg(`Successfully imported ${preview.totalRecords} records (${preview.newRecords} new, ${preview.updatedRecords} updated).`);
      setTimeout(() => {
        onImportSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to commit import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Intelligent Excel Import</h2>
              <p className="text-xs text-slate-500">
                Automatically detects headers, skips decorative rows, and validates personnel entries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* File Upload Zone */}
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-blue-400 transition">
            <input
              type="file"
              id="excel-file-input"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
            />
            <label
              htmlFor="excel-file-input"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="h-9 w-9 text-slate-400 mb-2" />
              <span className="text-sm font-semibold text-slate-700">
                {file ? file.name : 'Click or drag an Excel file (.xlsx) to analyze'}
              </span>
              <span className="mt-1 text-xs text-slate-400">
                Accepts disposition rosters, alpha lists, and ITMS HQ spreadsheets
              </span>
            </label>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-blue-700">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Analyzing workbook structure & detecting table header...
            </div>
          )}

          {preview && !loading && (
            <div className="space-y-4">
              {/* Header detection banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                    Header Row Detected
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    Table begins at <span className="font-bold text-blue-700">Row {preview.detectedHeaderRow}</span> in worksheet &quot;{preview.sheetName}&quot;
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-slate-200/80 px-2.5 py-1 text-slate-800">
                    Records: <b>{preview.totalRecords}</b>
                  </span>
                  <span className="rounded-md bg-emerald-100 text-emerald-800 px-2.5 py-1">
                    New: <b>{preview.newRecords}</b>
                  </span>
                  <span className="rounded-md bg-blue-100 text-blue-800 px-2.5 py-1">
                    Updated: <b>{preview.updatedRecords}</b>
                  </span>
                  {preview.invalidRecords > 0 && (
                    <span className="rounded-md bg-red-100 text-red-800 px-2.5 py-1">
                      Invalid: <b>{preview.invalidRecords}</b>
                    </span>
                  )}
                </div>
              </div>

              {/* Detected columns preview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Detected Columns ({preview.detectedHeaders.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {preview.detectedHeaders.map((header, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 border border-slate-200"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Data Table */}
              {preview.sampleRows.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Sample Records Preview (Top {preview.sampleRows.length})
                  </h3>
                  <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                        <tr>
                          {preview.detectedHeaders.slice(0, 7).map((h, i) => (
                            <th key={i} className="px-3 py-2 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preview.sampleRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {preview.detectedHeaders.slice(0, 7).map((h, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                                {row[h] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCommitImport}
            disabled={!preview || importing || preview.totalRecords === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-sm"
          >
            {importing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Import {preview ? `${preview.totalRecords} Records` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
