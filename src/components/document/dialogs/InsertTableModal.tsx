import React, { useState } from 'react';
import { Table, X } from 'lucide-react';

interface InsertTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number, withHeaderRow: boolean) => void;
}

export const InsertTableModal: React.FC<InsertTableModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [withHeader, setWithHeader] = useState(true);
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInsert(Math.max(1, rows), Math.max(1, cols), withHeader);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#101b2b]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Table size={18} className="text-teal-600" />
            <span>Insert Table</span>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Quick Grid Selector */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Grid Selection ({hoverRow || rows} × {hoverCol || cols})</p>
          <div
            className="grid grid-cols-8 gap-1 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 w-fit"
            onMouseLeave={() => { setHoverRow(0); setHoverCol(0); }}
          >
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} className="flex gap-1">
                {Array.from({ length: 8 }).map((_, c) => {
                  const isHighlighted = (r + 1 <= (hoverRow || rows)) && (c + 1 <= (hoverCol || cols));
                  return (
                    <div
                      key={c}
                      onMouseEnter={() => { setHoverRow(r + 1); setHoverCol(c + 1); }}
                      onClick={() => {
                        onInsert(r + 1, c + 1, withHeader);
                        onClose();
                      }}
                      className={`h-4 w-4 cursor-pointer rounded-xs border transition-colors ${
                        isHighlighted
                          ? 'border-teal-500 bg-teal-400/80 dark:bg-teal-600'
                          : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Rows</label>
              <input
                type="number"
                min={1}
                max={50}
                value={rows}
                onChange={e => setRows(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Columns</label>
              <input
                type="number"
                min={1}
                max={20}
                value={cols}
                onChange={e => setCols(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={withHeader}
              onChange={e => setWithHeader(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Include header row</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700"
            >
              Insert Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
