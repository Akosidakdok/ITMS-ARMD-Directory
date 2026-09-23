import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  FilePlus,
  Save,
  Download,
  Printer,
  History,
  Info,
  Copy,
  FolderOpen,
  ChevronDown
} from 'lucide-react';

interface RibbonFileMenuProps {
  onNew: () => void;
  onSave: () => void;
  onDuplicate: () => void;
  onVersionHistory: () => void;
  onProperties: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onPrint: () => void;
  onCloseEditor?: () => void;
  saving?: boolean;
}

export const RibbonFileMenu: React.FC<RibbonFileMenuProps> = ({
  onNew,
  onSave,
  onDuplicate,
  onVersionHistory,
  onProperties,
  onExportPdf,
  onExportDocx,
  onPrint,
  onCloseEditor,
  saving = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-800 shadow-xs"
      >
        <span>File</span>
        <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-[#101b2b] text-xs">
          <button
            type="button"
            onClick={() => handleAction(onNew)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FilePlus size={15} className="text-teal-600" />
            <span>New Document...</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(onSave)}
            disabled={saving}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <Save size={15} className="text-teal-600" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">Ctrl+S</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(onDuplicate)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Copy size={15} className="text-slate-500" />
            <span>Duplicate Document</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            type="button"
            onClick={() => handleAction(onExportPdf)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download size={15} className="text-rose-600" />
            <span>Export to PDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(onExportDocx)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download size={15} className="text-blue-600" />
            <span>Export to Word (.docx)</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(onPrint)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <Printer size={15} className="text-slate-600 dark:text-slate-400" />
              <span>Print</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">Ctrl+P</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <button
            type="button"
            onClick={() => handleAction(onVersionHistory)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <History size={15} className="text-slate-500" />
            <span>Version History</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction(onProperties)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Info size={15} className="text-slate-500" />
            <span>Document Properties</span>
          </button>

          {onCloseEditor && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                type="button"
                onClick={() => handleAction(onCloseEditor)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <span>Close & Return</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
