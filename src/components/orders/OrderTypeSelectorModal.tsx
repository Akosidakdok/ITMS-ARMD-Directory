import React, { useMemo, useState } from 'react';
import { CalendarDays, FileText, Search } from 'lucide-react';
import { Modal } from '../common/Modal';

export type NewRecordType = 'administrative-order' | 'leave-calendar';

interface OrderTypeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: NewRecordType) => void;
}

const options = [
  {
    id: 'administrative-order' as const,
    label: 'Administrative Order',
    description: 'Create any order purpose, including Awards, with the same generated document and approval-copy workflow.',
    icon: FileText,
    color: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 'leave-calendar' as const,
    label: 'Leave Calendar',
    description: 'Encode scheduled leave and view it on the calendar.',
    icon: CalendarDays,
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  }
];

export const OrderTypeSelectorModal: React.FC<OrderTypeSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? options.filter(option =>
          option.label.toLowerCase().includes(normalized) ||
          option.description.toLowerCase().includes(normalized)
        )
      : options;
  }, [query]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a record"
      subtitle="Choose what you want to add"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search record types…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredOptions.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelect(option.id);
                  setQuery('');
                }}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm transition-all text-left group"
              >
                <span className={`w-10 h-10 rounded-xl border flex items-center justify-center ${option.color}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="block mt-3 text-sm font-extrabold text-slate-900 group-hover:text-blue-700">
                  {option.label}
                </span>
                <span className="block mt-1 text-xs leading-relaxed text-slate-500">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
