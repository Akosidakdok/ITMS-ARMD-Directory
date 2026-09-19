import React, { useEffect, useState } from 'react';
import { History, X, Search, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { fetchWorksheetAuditLogsApi, type WorksheetAuditLog } from '../../services/api';

interface WorksheetAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorksheetAuditDrawer: React.FC<WorksheetAuditDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const [logs, setLogs] = useState<WorksheetAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchWorksheetAuditLogsApi();
      setLogs(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.worksheetName.toLowerCase().includes(term) ||
      log.cellAddress.toLowerCase().includes(term) ||
      log.fieldName.toLowerCase().includes(term) ||
      log.oldValue.toLowerCase().includes(term) ||
      log.newValue.toLowerCase().includes(term) ||
      log.modifiedBy.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl border-l border-slate-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Worksheet Audit Trail</h2>
              <p className="text-xs text-slate-500">Every direct cell modification and database synchronization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 transition"
              title="Refresh logs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="border-b border-slate-200 bg-slate-50/50 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail by worksheet, cell, user, or value..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Audit Log Entries */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading audit records...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No audit log entries recorded yet.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {log.worksheetName} · {log.cellAddress}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-800 mb-2">
                  Field: <span className="font-mono text-slate-600">{log.fieldName}</span>
                </div>

                <div className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg p-2 border border-slate-100 font-mono">
                  <span className="line-through text-red-600 truncate max-w-[40%]">
                    {log.oldValue || '—'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-emerald-700 truncate max-w-[50%]">
                    {log.newValue || '—'}
                  </span>
                </div>

                <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                  <span>Modified by: <b className="text-slate-600">{log.modifiedBy}</b></span>
                  {log.personnelId && <span className="font-mono">ID: {log.personnelId}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
