import React, { useState, useMemo } from 'react';
import { Database, Search, Check, X, User, Briefcase, FileText, Award, Calendar, ChevronRight } from 'lucide-react';
import { PAIS_FIELDS, PAIS_FIELD_CATEGORIES, resolvePaisFieldValue, PaisFieldDefinition } from '../utils/paisFieldResolver';

interface InsertPaisFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertField: (field: PaisFieldDefinition, resolvedValue: string) => void;
  activeContext?: {
    personnel?: any;
    order?: any;
    assignment?: any;
    award?: any;
    leave?: any;
    promotion?: any;
    education?: any;
    training?: any;
  };
}

export const InsertPaisFieldModal: React.FC<InsertPaisFieldModalProps> = ({
  isOpen,
  onClose,
  onInsertField,
  activeContext = {}
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState<PaisFieldDefinition | null>(PAIS_FIELDS[0]);

  const filteredFields = useMemo(() => {
    return PAIS_FIELDS.filter(f => {
      const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() ||
        f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.key.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const currentResolvedValue = selectedField ? resolvePaisFieldValue(selectedField.key, activeContext) : '';

  const handleInsert = () => {
    if (selectedField) {
      onInsertField(selectedField, currentResolvedValue);
      onClose();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personnel': return <User size={14} className="text-teal-600" />;
      case 'assignment': return <Briefcase size={14} className="text-blue-600" />;
      case 'order': return <FileText size={14} className="text-amber-600" />;
      case 'award': return <Award size={14} className="text-purple-600" />;
      case 'leave': return <Calendar size={14} className="text-emerald-600" />;
      default: return <Database size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh] dark:border-slate-800 dark:bg-[#101b2b]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-teal-100 p-2 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Insert PAIS Dynamic Field</h3>
              <p className="text-xs text-slate-500">Insert database-bound placeholders that auto-populate from PAIS records</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search PAIS fields (e.g. Full Name, Rank, Order Number)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                selectedCategory === 'all'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              All
            </button>
            {PAIS_FIELD_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1 font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two-Column Selection: Field List & Details/Preview */}
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] flex-1 overflow-hidden min-h-[300px]">
          {/* Field List */}
          <div className="overflow-y-auto border-r border-slate-100 dark:border-slate-800 p-2 space-y-1">
            {filteredFields.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No fields matching your criteria.</p>
            ) : (
              filteredFields.map(f => {
                const isSelected = selectedField?.key === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setSelectedField(f)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                      isSelected
                        ? 'bg-teal-50 text-teal-900 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0">{getCategoryIcon(f.category)}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{f.label}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{`{{${f.key}}}`}</p>
                      </div>
                    </div>
                    {isSelected && <ChevronRight size={14} className="text-teal-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Details & Resolution Preview */}
          <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col justify-between overflow-y-auto">
            {selectedField ? (
              <div className="space-y-4">
                <div>
                  <span className="inline-block rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 mb-1">
                    {selectedField.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedField.label}</h4>
                  <p className="mt-1 font-mono text-xs text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 select-all">
                    {`{{${selectedField.key}}}`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/80">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-1">Live Resolved Value</p>
                  <p className="text-sm font-semibold text-teal-950 dark:text-teal-200">
                    {currentResolvedValue !== `[${selectedField.key}]` ? (
                      currentResolvedValue
                    ) : (
                      <span className="text-slate-400 italic">No record selected (using sample: {selectedField.example})</span>
                    )}
                  </p>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>• Clicking <strong>Insert Field</strong> embeds an interactive token into your document.</p>
                  <p>• In printed output, DOCX, and PDF exports, it renders as its resolved value.</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Select a field to preview details.
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!selectedField}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 disabled:opacity-50"
              >
                <Check size={14} />
                Insert Field
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
