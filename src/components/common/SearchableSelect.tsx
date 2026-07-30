import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Search and select…',
  required,
  disabled,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.description?.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          {label}{required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(open => !open)}
          className={`w-full min-h-10 py-2 pl-3 pr-14 rounded-xl border bg-white text-left flex items-center text-xs transition-colors disabled:opacity-50 ${
            error ? 'border-rose-400' : 'border-slate-300 hover:border-blue-400'
          }`}
        >
          <span className={selected ? 'font-semibold text-slate-900 truncate' : 'text-slate-400'}>
            {selected?.label || placeholder}
          </span>
        </button>
        {selected && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => onChange('')}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Type to search…"
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div role="listbox" className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-5 text-center text-xs text-slate-500">No matching option found.</p>
            ) : filteredOptions.map(option => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setQuery('');
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 rounded-lg flex items-center justify-between gap-3 text-left hover:bg-blue-50"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-900 truncate">{option.label}</span>
                  {option.description && (
                    <span className="block text-[10px] text-slate-500 truncate">{option.description}</span>
                  )}
                </span>
                {option.value === value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
