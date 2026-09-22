import { PenLine } from 'lucide-react';
import { Modal } from '../common/Modal';

export type AdministrativeOrderMode = 'default' | 'upload' | 'upload-custom';

interface AdministrativeOrderModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: AdministrativeOrderMode) => void;
}

const options = [
  {
    mode: 'default' as const,
    title: 'Generate administrative order',
    description: 'Choose the series and purpose, complete the guided details, select personnel, and generate the unsigned Word order.',
    required: 'Series, purpose, purpose details, personnel, and signatory',
    icon: PenLine,
    className: 'border-teal-200 bg-teal-50 text-teal-800'
  }
];

export const AdministrativeOrderModeModal = ({ isOpen, onClose, onSelect }: AdministrativeOrderModeModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title="New administrative order" subtitle="Choose how this order should be registered" maxWidth="4xl">
    <div className="grid gap-3 md:grid-cols-1">
      {options.map(option => {
        const Icon = option.icon;
        return (
          <button key={option.mode} type="button" onClick={() => onSelect(option.mode)} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md">
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${option.className}`}><Icon size={20} /></span>
            <span className="mt-4 block text-sm font-bold text-slate-900 group-hover:text-blue-800">{option.title}</span>
            <span className="mt-2 block min-h-[60px] text-xs leading-relaxed text-slate-500">{option.description}</span>
            <span className="mt-4 block border-t border-slate-100 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Required</span>
            <span className="mt-1 block text-xs font-medium text-slate-700">{option.required}</span>
          </button>
        );
      })}
    </div>
  </Modal>
);
