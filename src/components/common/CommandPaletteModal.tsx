import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Briefcase,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { useAuthRole } from '../../context/AuthRoleContext';
import { PNP_RANKS, type RankInfo } from '../../constants/ranks';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAVIGATION_ITEMS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, category: 'Navigation', hint: 'Overview' },
  { label: 'Personnel Information', path: '/personnel', icon: Users, category: 'Navigation', hint: '201 Files' },
  { label: 'Management Center', path: '/management', icon: ShieldCheck, category: 'Navigation', hint: 'Roster & Records' },
  { label: 'Assignment Records', path: '/assignment', icon: Briefcase, category: 'Navigation', hint: 'Postings' },
  { label: 'Orders', path: '/orders', icon: FileText, category: 'Navigation', hint: 'Special Orders' },
  { label: 'Education & Training', path: '/education', icon: BookOpen, category: 'Navigation', hint: 'Eligibility & Courses' },
  { label: 'Promotion & Time-in-Grade', path: '/promotion', icon: Award, category: 'Navigation', hint: 'TIG & Board' },
  { label: 'Document Editor', path: '/documents', icon: FileText, category: 'Navigation', hint: 'Templates & Memorandums' },
  { label: 'Interactive Excel Worksheets', path: '/excel-integration', icon: FileSpreadsheet, category: 'Navigation', hint: 'Worksheets' },
  { label: 'Reports', path: '/reports', icon: FileText, category: 'Navigation', hint: 'Alpha List & Rosters' },
  { label: 'Administrator Accounts', path: '/admin-accounts', icon: UserCheck, category: 'Navigation', hint: 'Security & Access' }
];

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({ isOpen, onClose }) => {
  const { personnelList, setSelectedPersonnelId } = useAuthRole();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Determine rank category (PCO, PNCO, NUP)
  const getRankCategory = (rankAbbr?: string): 'PCO' | 'PNCO' | 'NUP' => {
    if (!rankAbbr) return 'PNCO';
    const found = PNP_RANKS.find((r: RankInfo) => r.code === rankAbbr);
    return found?.category || (rankAbbr === 'NUP' ? 'NUP' : 'PNCO');
  };

  // Filter navigation and personnel
  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAVIGATION_ITEMS;
    return NAVIGATION_ITEMS.filter(
      item => item.label.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredPersonnel = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return personnelList
      .filter(p => {
        const fullName = `${p.rank || ''} ${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
        const badge = (p.badgeNo || '').toLowerCase();
        const unit = (p.sub_unit || p.division || '').toLowerCase();
        const designation = (p.designation || '').toLowerCase();
        return fullName.includes(q) || badge.includes(q) || unit.includes(q) || designation.includes(q);
      })
      .slice(0, 10);
  }, [query, personnelList]);

  // Combined selectable items
  const totalItems = useMemo(() => {
    const items: Array<
      | { type: 'nav'; data: (typeof NAVIGATION_ITEMS)[0] }
      | { type: 'personnel'; data: (typeof personnelList)[0] }
    > = [];
    filteredNav.forEach(item => items.push({ type: 'nav', data: item }));
    filteredPersonnel.forEach(person => items.push({ type: 'personnel', data: person }));
    return items;
  }, [filteredNav, filteredPersonnel]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < totalItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : totalItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = totalItems[selectedIndex];
      if (selected) {
        if (selected.type === 'nav') {
          navigate(selected.data.path);
        } else {
          setSelectedPersonnelId(selected.data.id);
          navigate('/personnel');
        }
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const activeEl = listEl.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search and Quick Navigation"
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:pt-20"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-[#0c182b]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search personnel by name or badge #, or jump to module..."
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:inline-block dark:border-slate-800 dark:bg-slate-900">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[min(65vh,440px)] overflow-y-auto p-2"
          tabIndex={-1}
        >
          {/* Personnel Results */}
          {filteredPersonnel.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Personnel Records ({filteredPersonnel.length})
              </div>
              {filteredPersonnel.map((person, idx) => {
                const itemIndex = filteredNav.length + idx;
                const isSelected = itemIndex === selectedIndex;
                const category = getRankCategory(person.rank);
                return (
                  <button
                    key={person.id}
                    type="button"
                    data-index={itemIndex}
                    onClick={() => {
                      setSelectedPersonnelId(person.id);
                      navigate('/personnel');
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`rank-badge ${category === 'PCO' ? 'rank-badge--pco' : category === 'NUP' ? 'rank-badge--nup' : 'rank-badge--pnco'}`}>
                        {category}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {person.rank} {person.lastName}, {person.firstName}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {person.sub_unit || person.division || 'Unassigned'} · {person.designation || 'Staff'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {person.badgeNo || '—'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation Items */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Navigation Modules
              </div>
              {filteredNav.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    data-index={idx}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{item.hint}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty Search Result */}
          {totalItems.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching personnel or navigation module found for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer Shortcut Instructions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-[#081220] dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-sans dark:border-slate-700 dark:bg-slate-900">↑</kbd>
              <kbd className="ml-1 rounded border border-slate-200 bg-white px-1 py-0.5 font-sans dark:border-slate-700 dark:bg-slate-900">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-sans dark:border-slate-700 dark:bg-slate-900">↵</kbd> Select
            </span>
          </div>
          <span>PAIS 2.0 Command Palette</span>
        </div>
      </div>
    </div>
  );
};
