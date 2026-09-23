import React, { useState } from 'react';
import { FilePlus, X, Check, FileText, Award, Briefcase, Calendar, Shield } from 'lucide-react';
import { DEFAULT_TEMPLATES, TemplatePreset } from '../utils/defaultTemplates';
import type { Personnel } from '../../../types/pais';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    template: TemplatePreset;
    personnelId?: string;
    orderId?: string;
  }) => void;
  personnelList: Personnel[];
}

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  personnelList
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset>(DEFAULT_TEMPLATES[0]);
  const [title, setTitle] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [searchTemplate, setSearchTemplate] = useState('');

  if (!isOpen) return null;

  const filteredTemplates = DEFAULT_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchTemplate.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTemplate.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  const handleSelectTemplate = (template: TemplatePreset) => {
    setSelectedTemplate(template);
    if (!title || DEFAULT_TEMPLATES.some(t => t.name === title)) {
      setTitle(template.name === 'Blank Document' ? 'Untitled Document' : `${template.name} - ${new Date().toISOString().slice(0, 10)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title: title.trim() || selectedTemplate.name,
      template: selectedTemplate,
      personnelId: selectedPersonnelId || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] dark:border-slate-800 dark:bg-[#101b2b]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-teal-100 p-2 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
              <FilePlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Create New Document</h3>
              <p className="text-xs text-slate-500">Choose a template and configure dynamic bindings</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Document Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Document Title</label>
            <input
              type="text"
              placeholder="e.g. Special Order - Designation of Information Security Officers"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Optional Personnel Binding */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bind Target Personnel <span className="font-normal text-slate-400">(Optional - auto-fills personnel fields)</span>
            </label>
            <select
              value={selectedPersonnelId}
              onChange={e => setSelectedPersonnelId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">-- No specific personnel selected (Generic Document) --</option>
              {personnelList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.rank} {p.fullName} ({p.badgeNo || 'No Badge'} · {p.sub_unit || p.division || 'Unit not specified'})
                </option>
              ))}
            </select>
          </div>

          {/* Template Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Choose Document Template</label>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTemplate}
                onChange={e => setSearchTemplate(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTemplates.map(tmpl => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`cursor-pointer rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20 dark:border-teal-500 dark:bg-teal-950/40'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                          {tmpl.category}
                        </span>
                        {isSelected && (
                          <div className="rounded-full bg-teal-600 p-0.5 text-white">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{tmpl.name}</h4>
                      <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{tmpl.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{tmpl.pageSize} · {tmpl.orientation}</span>
                      <span className="font-semibold text-teal-700 dark:text-teal-400">Select</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700"
            >
              Create Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
