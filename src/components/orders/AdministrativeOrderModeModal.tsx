import { FileText, PenLine, Upload } from 'lucide-react';
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
    title: 'Default administrative order',
    description: 'Complete the full order record, personnel, dates, and signatory details.',
    required: 'Series, purpose, subject, dates, personnel, and signatory',
    icon: PenLine,
    className: 'border-teal-200 bg-teal-50 text-teal-800'
  },
  {
    mode: 'upload' as const,
    title: 'Upload document',
    description: 'Upload an existing DOCX and capture only the classification needed to register it.',
    required: 'DOCX file, series, and purpose',
    icon: Upload,
    className: 'border-blue-200 bg-blue-50 text-blue-800'
  },
  {
    mode: 'upload-custom' as const,
    title: 'Upload document + custom details',
    description: 'Upload a DOCX and add searchable order, personnel, date, and signatory information.',
    required: 'DOCX, series, purpose, metadata, personnel, and signatory',
    icon: FileText,
    className: 'border-violet-200 bg-violet-50 text-violet-800'
  }
];

export const AdministrativeOrderModeModal = ({ isOpen, onClose, onSelect }: AdministrativeOrderModeModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title="New administrative order" subtitle="Choose how this order should be registered" maxWidth="4xl">
    <div className="grid gap-3 md:grid-cols-3">
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
