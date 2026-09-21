import React, { useState } from 'react';
import { X, Printer, FileText, Check } from 'lucide-react';

interface PageSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  worksheetName: string;
  onPrint: (options: {
    orientation: 'portrait' | 'landscape';
    paperSize: 'letter' | 'legal' | 'a4';
    margins: 'normal' | 'wide' | 'narrow';
    scope: 'sheet' | 'selection' | 'workbook';
  }) => void;
}

export const PageSetupModal: React.FC<PageSetupModalProps> = ({
  isOpen,
  onClose,
  worksheetName,
  onPrint
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [paperSize, setPaperSize] = useState<'letter' | 'legal' | 'a4'>('letter');
  const [margins, setMargins] = useState<'normal' | 'wide' | 'narrow'>('normal');
  const [scope, setScope] = useState<'sheet' | 'selection' | 'workbook'>('sheet');

  if (!isOpen) return null;

  const handlePrintClick = () => {
    onClose();
    setTimeout(() => {
      onPrint({ orientation, paperSize, margins, scope });
    }, 150);
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#101b2b] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Page Setup & Print</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sheet: {worksheetName}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Orientation */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Orientation:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOrientation('portrait')}
                className={`p-3 rounded-xl border text-center text-xs font-semibold transition ${
                  orientation === 'portrait'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/30 text-blue-900 dark:text-sky-300 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'
                }`}
              >
                Portrait (Vertical)
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`p-3 rounded-xl border text-center text-xs font-semibold transition ${
                  orientation === 'landscape'
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/30 text-blue-900 dark:text-sky-300 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'
                }`}
              >
                Landscape (Horizontal)
              </button>
            </div>
          </div>

          {/* Paper Size & Margins */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Paper Size:</label>
              <select
                value={paperSize}
                onChange={e => setPaperSize(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200"
              >
                <option value="letter">Letter (8.5" x 11")</option>
                <option value="legal">Legal (8.5" x 14")</option>
                <option value="a4">A4 (210 x 297 mm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Margins:</label>
              <select
                value={margins}
                onChange={e => setMargins(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200"
              >
                <option value="normal">Normal (0.75 in)</option>
                <option value="wide">Wide (1.0 in)</option>
                <option value="narrow">Narrow (0.25 in)</option>
              </select>
            </div>
          </div>

          {/* Print Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Print Scope:</label>
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="printScope"
                  checked={scope === 'sheet'}
                  onChange={() => setScope('sheet')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Active Sheet ({worksheetName})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="printScope"
                  checked={scope === 'selection'}
                  onChange={() => setScope('selection')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Currently Selected Cells Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="printScope"
                  checked={scope === 'workbook'}
                  onChange={() => setScope('workbook')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Entire Workbook (All 13 Worksheets)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-[#0c1624]">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handlePrintClick}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            Print Now
          </button>
        </div>
      </div>
    </div>
  );
};
