import React, { useState } from 'react';
import { X, Search, Replace, ArrowDown, ArrowUp } from 'lucide-react';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFind: (term: string, matchCase: boolean, exact: boolean, direction: 'next' | 'prev') => void;
  onReplace: (findTerm: string, replaceTerm: string, matchCase: boolean, exact: boolean) => void;
  onReplaceAll: (findTerm: string, replaceTerm: string, matchCase: boolean, exact: boolean) => void;
  currentMatchIndex: number;
  totalMatches: number;
  initialMode?: 'find' | 'replace';
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  onFind,
  onReplace,
  onReplaceAll,
  currentMatchIndex,
  totalMatches,
  initialMode = 'find'
}) => {
  const [mode, setMode] = useState<'find' | 'replace'>(initialMode);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchEntireCell, setMatchEntireCell] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#101b2b] overflow-hidden">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 pt-4 dark:border-slate-800">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('find')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                mode === 'find'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Find
            </button>
            <button
              onClick={() => setMode('replace')}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                mode === 'replace'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Replace
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Find what:
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={findText}
                onChange={e => {
                  setFindText(e.target.value);
                  onFind(e.target.value, matchCase, matchEntireCell, 'next');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onFind(findText, matchCase, matchEntireCell, e.shiftKey ? 'prev' : 'next');
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-[#142232] dark:text-white"
                placeholder="Enter text, numbers, or formulas..."
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {mode === 'replace' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Replace with:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={replaceText}
                  onChange={e => setReplaceText(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-[#142232] dark:text-white"
                  placeholder="Enter replacement..."
                />
                <Replace className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex flex-col gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={e => setMatchCase(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Match case</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={matchEntireCell}
                onChange={e => setMatchEntireCell(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Match entire cell contents</span>
            </label>
          </div>

          {/* Match status */}
          {findText && (
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {totalMatches > 0
                ? `Match ${currentMatchIndex + 1} of ${totalMatches}`
                : 'No matches found in worksheet'}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-[#0c1624]">
          <div className="flex gap-2">
            <button
              onClick={() => onFind(findText, matchCase, matchEntireCell, 'prev')}
              disabled={!findText || totalMatches === 0}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              onClick={() => onFind(findText, matchCase, matchEntireCell, 'next')}
              disabled={!findText || totalMatches === 0}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Next
            </button>
          </div>

          <div className="flex gap-2">
            {mode === 'replace' && (
              <>
                <button
                  onClick={() => onReplace(findText, replaceText, matchCase, matchEntireCell)}
                  disabled={!findText || totalMatches === 0}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Replace
                </button>
                <button
                  onClick={() => onReplaceAll(findText, replaceText, matchCase, matchEntireCell)}
                  disabled={!findText || totalMatches === 0}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  Replace All
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
