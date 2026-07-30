import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface NotificationToastProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  type,
  message,
  onClose
}) => {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className={`fixed z-[70] right-4 top-4 w-[calc(100%-2rem)] max-w-sm rounded-xl border p-4 shadow-xl flex items-start gap-3 ${
      type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
        : 'bg-rose-50 border-rose-200 text-rose-900'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
      <p className="flex-1 text-xs font-semibold leading-relaxed">{message}</p>
      <button type="button" onClick={onClose} aria-label="Close notification">
        <X className="w-4 h-4 opacity-60" />
      </button>
    </div>
  );
};
