import React from 'react';
import { History, RotateCcw, X, Clock, User } from 'lucide-react';
import type { DocumentVersion } from '../../../services/documentsApi';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: DocumentVersion[];
  currentVersion: number;
  onRestore: (versionNumber: number) => void;
  loading?: boolean;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  currentVersion,
  onRestore,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#101b2b] flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <History size={18} className="text-teal-600" />
            <span>Document Version History</span>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading version history...</p>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <p>No previous versions recorded yet.</p>
              <p className="mt-1">Versions are automatically created as you save changes.</p>
            </div>
          ) : (
            versions.map(ver => {
              const isCurrent = ver.version_number === currentVersion;
              const dateStr = new Date(ver.created_at).toLocaleString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={ver.id}
                  className={`flex items-center justify-between rounded-xl border p-3.5 transition ${
                    isCurrent
                      ? 'border-teal-300 bg-teal-50/70 dark:border-teal-800 dark:bg-teal-950/40'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Version {ver.version_number}
                      </span>
                      {isCurrent && (
                        <span className="rounded-md bg-teal-100 px-1.5 py-0.2 text-[10px] font-bold text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {dateStr}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} /> {ver.created_by || 'System'}
                      </span>
                    </div>
                    {ver.change_summary && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                        "{ver.change_summary}"
                      </p>
                    )}
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Restore to Version ${ver.version_number}? This will save as a new version.`)) {
                          onRestore(ver.version_number);
                          onClose();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                    >
                      <RotateCcw size={13} />
                      Restore
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
