import React from 'react';
import { Info, X, FileText, Calendar, User, Layout, AlignLeft } from 'lucide-react';
import type { DocumentRecord } from '../../../services/documentsApi';

interface DocumentPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Partial<DocumentRecord>;
  wordCount: number;
  characterCount: number;
}

export const DocumentPropertiesModal: React.FC<DocumentPropertiesModalProps> = ({
  isOpen,
  onClose,
  document,
  wordCount,
  characterCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#101b2b]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Info size={18} className="text-teal-600" />
            <span>Document Properties</span>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{document.title || 'Untitled Document'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Document Type</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{document.document_type || 'Administrative Order'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
              <p className="font-semibold text-teal-700 dark:text-teal-300 mt-0.5">{document.status || 'Draft'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Version</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">Version {document.version || 1}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Page Size</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{document.page_size || 'A4'} ({document.orientation || 'portrait'})</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Content Statistics</p>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <span className="text-slate-400">Words:</span>{' '}
                <strong className="text-slate-800 dark:text-slate-200">{wordCount.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400">Characters:</span>{' '}
                <strong className="text-slate-800 dark:text-slate-200">{characterCount.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 space-y-1">
            <p>Created by: {document.created_by || 'System'}</p>
            {document.created_at && <p>Created: {new Date(document.created_at).toLocaleString()}</p>}
            {document.updated_at && <p>Last modified: {new Date(document.updated_at).toLocaleString()}</p>}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
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
