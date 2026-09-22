import { createPortal } from 'react-dom';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FC, KeyboardEvent as ReactKeyboardEvent } from 'react';
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

export const SearchableSelect: FC<SearchableSelectProps> = ({
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
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const controlId = useId();
  const listboxId = useId();
  const errorId = useId();
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number; listMaxHeight: number; opensAbove: boolean } | null>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const updateMenuPosition = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spacing = 8;
    const searchAreaHeight = 58;
    const spaceBelow = window.innerHeight - rect.bottom - spacing;
    const spaceAbove = rect.top - spacing;
    const opensAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
    const listMaxHeight = Math.max(120, Math.min(280, (opensAbove ? spaceAbove : spaceBelow) - searchAreaHeight));
    setMenuPosition({
      left: Math.min(Math.max(spacing, rect.left), Math.max(spacing, window.innerWidth - rect.width - spacing)),
      width: rect.width,
      top: opensAbove ? rect.top - 4 : rect.bottom + 4,
      listMaxHeight,
      opensAbove
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.description?.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = filteredOptions.findIndex(option => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex >= filteredOptions.length) setActiveIndex(Math.max(0, filteredOptions.length - 1));
  }, [activeIndex, filteredOptions.length]);

  const selectOption = (option: SearchableSelectOption) => {
    onChange(option.value);
    setQuery('');
    setIsOpen(false);
  };

  const handleListKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      document.getElementById(controlId)?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, filteredOptions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && filteredOptions[activeIndex]) {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={controlId} className="record-field-label">
          {label}{required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={controlId}
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          aria-required={required}
          onClick={() => setIsOpen(open => !open)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          className={`flex min-h-10 w-full items-center rounded border bg-white py-2 pl-3 pr-14 text-left text-xs disabled:opacity-50 ${
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
            onClick={(event) => { event.stopPropagation(); onChange(''); }}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <p id={errorId} className="mt-1 text-[11px] text-rose-600">{error}</p>}

      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-[1000] overflow-hidden rounded-md border border-slate-300 bg-white shadow-xl ${menuPosition.opensAbove ? '-translate-y-full' : ''}`}
          style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
        >
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={handleListKeyDown}
                placeholder="Type to search…"
                aria-controls={listboxId}
                aria-activedescendant={filteredOptions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
                className="w-full rounded border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs focus:border-blue-500"
              />
            </div>
          </div>
          <div id={listboxId} role="listbox" className="overflow-y-auto p-1.5" style={{ maxHeight: menuPosition.listMaxHeight }}>
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-5 text-center text-xs text-slate-500">No matching option found.</p>
            ) : filteredOptions.map((option, index) => (
              <button
                type="button"
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                key={option.value}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left ${activeIndex === index ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
              >
                <span className="min-w-0">
                  <span className="block break-words text-xs font-semibold text-slate-900">{option.label}</span>
                  {option.description && (
                    <span className="block break-words text-[10px] text-slate-500">{option.description}</span>
                  )}
                </span>
                {option.value === value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
