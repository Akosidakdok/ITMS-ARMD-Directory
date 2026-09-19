import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  ShieldCheck,
  Upload,
  X,
  Layers,
  FileText
} from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import {
  commitExcelImportApi,
  downloadExcelTemplateApi,
  fetchExcelImportHistoryApi,
  fetchExcelTemplateApi,
  fetchExcelTemplatesApi,
  previewExcelImportApi,
  previewExcelTemplateApi,
  type ExcelImportAudit,
  type ExcelImportPreview,
  type ExcelTemplateDefinition,
  type ExcelTemplateSummary,
  type ExcelWorkbookPreview
} from '../services/api';
import { ExcelWorksheetModule } from '../components/spreadsheet/ExcelWorksheetModule';

const today = new Date().toISOString().slice(0, 10);
const importable = new Set(['training-import', 'education-import']);

export const ExcelIntegrationPage: React.FC = () => {
  const { backendConnected } = useAuthRole();
  const [activeTab, setActiveTab] = useState<'worksheets' | 'templates'>('worksheets');
  const [templates, setTemplates] = useState<ExcelTemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [definition, setDefinition] = useState<ExcelTemplateDefinition | null>(null);
  const [asOfDate, setAsOfDate] = useState(today);
  const [status, setStatus] = useState('Active');
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ExcelImportAudit[]>([]);
  const [workbookPreview, setWorkbookPreview] = useState<ExcelWorkbookPreview | null>(null);
  const [previewSheet, setPreviewSheet] = useState('');

  const refreshHistory = () => {
    fetchExcelImportHistoryApi().then(setHistory).catch(() => undefined);
  };

  useEffect(() => {
    fetchExcelTemplatesApi()
      .then(data => {
        setTemplates(data);
        setSelectedId(data[0]?.id || '');
      })
      .catch(e => setError(e.message));
    refreshHistory();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchExcelTemplateApi(selectedId).then(setDefinition).catch(e => setError(e.message));
    }
  }, [selectedId]);

  const selected = templates.find(template => template.id === selectedId);

  const exportWorkbook = async () => {
    setBusy(true);
    setError('');
    try {
      await downloadExcelTemplateApi(selectedId, asOfDate, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const previewWorkbookLayout = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await previewExcelTemplateApi(selectedId, asOfDate, status);
      setWorkbookPreview(result);
      setPreviewSheet(result.sheets[0]?.name || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed.');
    } finally {
      setBusy(false);
    }
  };

  const previewWorkbook = async (file: File) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setPreview(await previewExcelImportApi(selectedId as 'training-import' | 'education-import', file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed.');
    } finally {
      setBusy(false);
    }
  };

  const commitPreview = async () => {
    if (!preview?.canCommit) return;
    setBusy(true);
    try {
      const result = await commitExcelImportApi(preview.previewId);
      setMessage(`Committed ${result.addedCount} new and ${result.replacedCount} updated record(s).`);
      setPreview(null);
      refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commit failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1680px] space-y-4">
      {/* Top Banner & Module Mode Switcher */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
              PAIS 2.0 Spreadsheet Module
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">disposition September 7, 2026.xlsx</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Interactive Excel Worksheets
          </h1>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('worksheets')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition shadow-xs ${
              activeTab === 'worksheets'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>13 Excel Worksheets</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'templates'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Template Export & Import Desk</span>
          </button>
        </div>
      </section>

      {/* Error & Success Messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
          {message}
        </div>
      )}

      {/* VIEW 1: FULL EXCEL WORKSHEET MODULE (13 TABS) */}
      {activeTab === 'worksheets' && (
        <div className="w-full">
          <ExcelWorksheetModule />
        </div>
      )}

      {/* VIEW 2: TEMPLATE EXPORT & DESK */}
      {activeTab === 'templates' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Import history</h2>
                <p className="mt-1 text-xs text-slate-500">Recent preview and approval activity.</p>
              </div>
              <button
                onClick={refreshHistory}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
            {history.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Template</th>
                      <th className="px-2 py-2">File</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Rows</th>
                      <th className="px-2 py-2">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 20).map(item => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                        <td className="px-2 py-2 font-mono">{item.templateId}</td>
                        <td className="max-w-48 truncate px-2 py-2">{item.uploadedFilename || '—'}</td>
                        <td className="px-2 py-2 font-semibold">{item.status}</td>
                        <td className="px-2 py-2">{item.rowCount}</td>
                        <td className="px-2 py-2">{item.uploadedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No import activity recorded yet.</p>
            )}
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-5 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-700" />
                <h2 className="font-bold text-slate-900">Workbook control</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Workbook type
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Reporting date
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Personnel status
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>ALL</option>
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  <button
                    onClick={previewWorkbookLayout}
                    disabled={!backendConnected || !selectedId || busy}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" /> Preview
                  </button>
                  <button
                    onClick={exportWorkbook}
                    disabled={!backendConnected || !selectedId || busy}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" /> Export
                  </button>
                </div>
              </div>
              {selected && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{selected.purpose}</p>
                  <p className="mt-1">
                    Template <span className="font-mono">{selected.id}</span> · Version {selected.version}
                  </p>
                  <p className="mt-1">Reference: {selected.referenceFile}</p>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="font-bold text-slate-900">Template structure</h2>
              {definition ? (
                <>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    {definition.sheets.map(sheet => (
                      <div key={sheet.name} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                        <span className="font-semibold text-slate-800">{sheet.name}</span>
                        <span>{sheet.mode}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-semibold text-slate-500">
                    {definition.fieldMappings.length} mapped fields · {definition.validation.length} validation rules
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Select a template to inspect its structure.</p>
              )}
            </div>
          </section>

          {importable.has(selectedId) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Preview and approve import</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Only validated training and education workbooks are accepted in this phase.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-4 w-4" /> Select .xlsx
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) void previewWorkbook(file);
                    }}
                  />
                </label>
              </div>
              {preview && (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    <span>
                      Rows: <b>{preview.rowCount}</b>
                    </span>
                    <span className="text-emerald-700">
                      Valid: <b>{preview.validCount}</b>
                    </span>
                    <span className="text-red-700">
                      Invalid: <b>{preview.invalidCount}</b>
                    </span>
                    <button
                      onClick={commitPreview}
                      disabled={!preview.canCommit || busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve and commit
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}

      {/* Preview Modal for template desk */}
      {workbookPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-[min(96vw,1200px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Workbook preview</h2>
                <p className="text-xs text-slate-500">
                  {workbookPreview.template.name} · {workbookPreview.template.version}
                </p>
              </div>
              <button
                onClick={() => setWorkbookPreview(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50">
              {workbookPreview.sheets.map(sheet => (
                <button
                  key={sheet.name}
                  onClick={() => setPreviewSheet(sheet.name)}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold ${
                    previewSheet === sheet.name
                      ? 'border-b-2 border-blue-700 bg-white text-blue-700'
                      : 'text-slate-600'
                  }`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {workbookPreview.sheets
                .filter(sheet => sheet.name === previewSheet)
                .map(sheet => (
                  <table key={sheet.name} className="border-collapse text-[11px]">
                    <tbody>
                      {sheet.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={
                            rowIndex === 0 || rowIndex === 4 || rowIndex === 5 || rowIndex === 8
                              ? 'bg-blue-50 font-semibold'
                              : ''
                          }
                        >
                          {row.map((value, columnIndex) => (
                            <td
                              key={columnIndex}
                              className="min-w-28 max-w-72 border border-slate-200 px-2 py-1.5 align-top whitespace-pre-wrap"
                            >
                              {String(value ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

