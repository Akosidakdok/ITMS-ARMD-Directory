import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import {
  SPREADSHEET_FUNCTIONS,
  SpreadsheetFunctionDef,
  getFormulaSearchContext
} from '../../../constants/spreadsheetFunctions';
import { FormulaAutocompleteList } from './FormulaAutocompleteList';

interface FormulaBarProps {
  selectedAddress: string;
  value: string;
  onChange: (val: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onJumpToAddress: (address: string) => void;
  onOpenFunctionWizard: () => void;
  onFocus?: () => void;
  onTab?: (shiftKey: boolean) => void;
  isEditing: boolean;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  selectedAddress,
  value,
  onChange,
  onCommit,
  onCancel,
  onJumpToAddress,
  onOpenFunctionWizard,
  onFocus,
  onTab,
  isEditing
}) => {
  const [nameBoxValue, setNameBoxValue] = useState(selectedAddress);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [isAutocompleteDismissed, setIsAutocompleteDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameBoxValue(selectedAddress);
  }, [selectedAddress]);

  // Formula autocomplete search context
  const { isFormula, searchTerm, prefixText } = useMemo(
    () => getFormulaSearchContext(value),
    [value]
  );

  // Reset dismissed state and selected index when value changes
  useEffect(() => {
    setIsAutocompleteDismissed(false);
    setAutocompleteIndex(0);
  }, [value]);

  const cleanTerm = searchTerm.toUpperCase().trim();
  const matchingFunctions = useMemo(() => {
    if (!isFormula || isAutocompleteDismissed || !isInputFocused) return [];
    return SPREADSHEET_FUNCTIONS.filter(f => {
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
  }, [isFormula, isAutocompleteDismissed, isInputFocused, cleanTerm]);

  const handleSelectFormula = (fn: SpreadsheetFunctionDef) => {
    const newValue = `${prefixText}${fn.template}`;
    onChange(newValue);
    setIsAutocompleteDismissed(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newValue.length, newValue.length);
      }
    }, 10);
  };

  const handleNameBoxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onJumpToAddress(nameBoxValue.trim());
    } else if (e.key === 'Escape') {
      setNameBoxValue(selectedAddress);
    }
  };

  return (
    <div className="worksheet-formula-bar flex items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-[#101b2b] text-xs">
      {/* Excel Name Box */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={nameBoxValue}
          onChange={e => setNameBoxValue(e.target.value.toUpperCase())}
          onKeyDown={handleNameBoxKeyDown}
          onBlur={() => setNameBoxValue(selectedAddress)}
          aria-label="Cell reference"
          title="Name Box: Enter a cell reference (e.g. B15) to jump to it"
          className="w-20 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-center font-mono font-bold text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200"
        />
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Cancel / Enter / fx Buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onCancel}
          disabled={!isEditing}
          title="Cancel (Esc)"
          className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onCommit}
          disabled={!isEditing}
          title="Enter"
          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onOpenFunctionWizard}
          title="Insert Function (fx)"
          className="rounded px-1.5 py-0.5 font-serif italic font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-300"
        >
          fx
        </button>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Formula Input Field */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => {
            setIsInputFocused(true);
            if (onFocus) onFocus();
          }}
          onBlur={() => {
            // Slight delay so click on suggestion can register
            setTimeout(() => setIsInputFocused(false), 200);
          }}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (matchingFunctions.length > 0 && isInputFocused) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setAutocompleteIndex(prev => (prev + 1) % matchingFunctions.length);
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setAutocompleteIndex(prev => (prev - 1 + matchingFunctions.length) % matchingFunctions.length);
                return;
              }
              if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                handleSelectFormula(matchingFunctions[autocompleteIndex]);
                return;
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setIsAutocompleteDismissed(true);
                return;
              }
            }

            if (e.key === 'Enter') {
              e.preventDefault();
              onCommit();
            } else if (e.key === 'Tab') {
              e.preventDefault();
              if (onTab) {
                onTab(e.shiftKey);
              } else {
                onCommit();
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          aria-label="Cell value or formula"
          placeholder="Enter text, numbers, or formula starting with ="
          className="w-full rounded border border-transparent bg-transparent px-2.5 py-1 font-mono text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:text-slate-100 dark:focus:bg-[#142232]"
        />

        {/* Formula Autocomplete Dropdown */}
        {matchingFunctions.length > 0 && isInputFocused && (
          <FormulaAutocompleteList
            searchTerm={searchTerm}
            selectedIndex={autocompleteIndex}
            onSelectFunction={handleSelectFormula}
            onHoverIndex={setAutocompleteIndex}
            className="top-full left-0 mt-1 shadow-2xl"
          />
        )}
      </div>
    </div>
  );
};
