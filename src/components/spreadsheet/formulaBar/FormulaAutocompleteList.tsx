import React, { useEffect, useRef } from 'react';
import {
  SPREADSHEET_FUNCTIONS,
  SpreadsheetFunctionDef
} from '../../../constants/spreadsheetFunctions';

interface FormulaAutocompleteListProps {
  searchTerm: string;
  selectedIndex: number;
  onSelectFunction: (fn: SpreadsheetFunctionDef) => void;
  onHoverIndex: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const FormulaAutocompleteList: React.FC<FormulaAutocompleteListProps> = ({
  searchTerm,
  selectedIndex,
  onSelectFunction,
  onHoverIndex,
  className = '',
  style
}) => {
  const listRef = useRef<HTMLUListElement>(null);

  // Filter formulas: exact prefix matches first, then contains
  const cleanTerm = searchTerm.toUpperCase().trim();
  const matchingFunctions = SPREADSHEET_FUNCTIONS.filter(f => {
    if (!cleanTerm) return true; // '=' shows ALL formulas!
    return f.name.includes(cleanTerm);
  }).sort((a, b) => {
    if (!cleanTerm) return a.name.localeCompare(b.name);
    const aStarts = a.name.startsWith(cleanTerm);
    const bStarts = b.name.startsWith(cleanTerm);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  });

  // Keep selected item scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (matchingFunctions.length === 0) return null;

  const currentSelection = matchingFunctions[Math.min(selectedIndex, matchingFunctions.length - 1)];

  return (
    <div
      style={style}
      className={`absolute z-50 flex flex-col rounded-lg border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#142232] text-xs font-sans overflow-hidden select-none min-w-[320px] max-w-[460px] animate-in fade-in zoom-in-95 duration-100 ${className}`}
      onMouseDown={e => {
        // Prevent input blur when clicking inside autocomplete popup
        e.preventDefault();
      }}
    >
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-750 dark:bg-[#0f1926]">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
          <span className="font-serif italic font-bold text-blue-600 dark:text-sky-400">fx</span>
          <span>Available Formulas</span>
          <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-mono font-bold text-blue-700 dark:bg-blue-950 dark:text-sky-300">
            {matchingFunctions.length}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          Press Tab / Enter
        </span>
      </div>

      {/* Function List */}
      <ul
        ref={listRef}
        role="listbox"
        className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60"
      >
        {matchingFunctions.map((fn, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <li
              key={fn.name}
              role="option"
              aria-selected={isSelected}
              onMouseEnter={() => onHoverIndex(idx)}
              onClick={() => onSelectFunction(fn)}
              className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                  : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-mono font-bold text-xs ${isSelected ? 'text-white' : 'text-blue-700 dark:text-sky-400'}`}>
                  {fn.name}
                </span>
                <span className={`text-[10px] truncate max-w-[200px] ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400 font-mono'}`}>
                  {fn.syntax}
                </span>
              </div>
              <span
                className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${
                  isSelected
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {fn.category}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Selected Function Details & Tooltip Footer */}
      {currentSelection && (
        <div className="border-t border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-[#0c1624]">
          <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">
            {currentSelection.syntax}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
            {currentSelection.description}
          </div>
        </div>
      )}
    </div>
  );
};
