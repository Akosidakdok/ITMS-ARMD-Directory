import { useEffect, useRef, useState } from 'react';
import { Download, FilePenLine, FileText, X } from 'lucide-react';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock';

interface Props {
  title: string;
  version?: number;
  pdfUrl?: string;
  docxBlob?: Blob;
  onClose: () => void;
  onEdit?: () => void;
  onDownloadDocx: () => Promise<void>;
  onDownloadPdf?: () => Promise<void>;
}

export const GeneratedOrderPreview = ({ title, version, pdfUrl, docxBlob, onClose, onEdit, onDownloadDocx, onDownloadPdf }: Props) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [renderError, setRenderError] = useState('');
  const [busy, setBusy] = useState(false);
  useBodyScrollLock(true);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), iframe'));
      if (!focusable.length) return;
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); focusable[0].focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); previousFocus?.focus(); };
  }, []);

  useEffect(() => {
    if (!docxBlob || !bodyRef.current) return;
    let cancelled = false;
    const container = bodyRef.current;
    setRenderError('');
    void import('docx-preview').then(({ renderAsync }) => renderAsync(docxBlob, container, undefined, {
      breakPages: true, renderHeaders: true, renderFooters: true, inWrapper: true
    })).catch(error => { if (!cancelled) setRenderError(error instanceof Error ? error.message : 'Unable to render this DOCX.'); });
    return () => { cancelled = true; container.replaceChildren(); };
  }, [docxBlob]);

  const runDownload = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setRenderError('');
    try { await action(); }
    catch (error) { setRenderError(error instanceof Error ? error.message : 'Download failed.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 p-2 sm:p-4" role="presentation">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Generated order preview: ${title}`} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="min-w-0"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><FileText size={16} /><span className="truncate">{title}</span></div><p className="text-xs text-slate-500">{pdfUrl ? 'PDF rendered from generated DOCX' : 'Browser rendering of generated DOCX'}{version ? ` · version ${version}` : ''}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {onDownloadPdf && <button type="button" disabled={busy} onClick={() => void runDownload(onDownloadPdf)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"><Download size={14} /> PDF</button>}
          <button type="button" disabled={busy} onClick={() => void runDownload(onDownloadDocx)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"><Download size={14} /> DOCX</button>
          {onEdit && <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"><FilePenLine size={14} /> Edit draft</button>}
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close generated order preview" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
      </div>
      {renderError && <p role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{renderError}</p>}
      {pdfUrl ? <iframe title={`Generated order PDF: ${title}`} src={pdfUrl} className="min-h-0 w-full flex-1 bg-slate-200" />
        : <div className="min-h-0 flex-1 overflow-auto bg-slate-200 p-4 dark:bg-slate-900"><div ref={bodyRef} className="generated-order-docx-preview" /></div>}
    </div>
  </div>;
};
