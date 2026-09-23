import React, { useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Printer, Download, FilePenLine, FileText, X } from 'lucide-react';
import { CANONICAL_DOCUMENT_CONFIG } from '../utils/sharedOrderDocument';
import { exportToDocx } from '../utils/docxExporter';
import { exportToPdf } from '../utils/pdfExporter';

interface DocumentPageSheetProps {
  htmlContent?: string;
  children?: React.ReactNode;
  title?: string;
  headerText?: string;
  footerText?: string;
  showToolbar?: boolean;
  onEdit?: () => void;
  onClose?: () => void;
  readOnly?: boolean;
  className?: string;
}

export const DocumentPageSheet: React.FC<DocumentPageSheetProps> = ({
  htmlContent,
  children,
  title = 'Administrative Order',
  headerText = CANONICAL_DOCUMENT_CONFIG.headerText,
  footerText = CANONICAL_DOCUMENT_CONFIG.footerText,
  showToolbar = true,
  onEdit,
  onClose,
  readOnly = true,
  className = ''
}) => {
  const [zoom, setZoom] = useState(1);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDocx = async () => {
    try {
      setExportingDocx(true);
      const contentToExport = htmlContent || sheetRef.current?.innerHTML || '';
      await exportToDocx(contentToExport, {
        title: title || 'Order_Document',
        pageSize: 'A4',
        orientation: 'portrait',
        marginTop: CANONICAL_DOCUMENT_CONFIG.marginTop,
        marginBottom: CANONICAL_DOCUMENT_CONFIG.marginBottom,
        marginLeft: CANONICAL_DOCUMENT_CONFIG.marginLeft,
        marginRight: CANONICAL_DOCUMENT_CONFIG.marginRight
      });
    } catch (err) {
      console.error('Failed to export DOCX:', err);
    } finally {
      setExportingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    try {
      setExportingPdf(true);
      await exportToPdf(sheetRef.current, {
        title: title || 'Order_Document',
        pageSize: 'A4',
        orientation: 'portrait'
      });
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-200/90 dark:bg-slate-900 ${className}`}>
      {/* Interactive Sheet Toolbar */}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-950 no-print">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <FileText size={15} className="text-teal-600" />
              {title}
            </span>
            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
              A4 Format (210 × 297 mm)
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Zoom Out"
                className="p-1 rounded hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-40"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                title="Reset Zoom"
                className="px-2 text-xs font-mono font-medium hover:bg-white dark:hover:bg-slate-800 rounded transition"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 1.8}
                title="Zoom In"
                className="p-1 rounded hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-40"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Print Action */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Download DOCX */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={exportingDocx}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-2xs hover:bg-teal-100 disabled:opacity-60 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
            >
              <Download size={14} />
              <span>{exportingDocx ? 'Exporting...' : 'DOCX'}</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={exportingPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Edit in Document Editor */}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 transition"
              >
                <FilePenLine size={14} />
                <span>Edit Document</span>
              </button>
            )}

            {/* Close Preview */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                title="Close Preview"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Sheet Viewport */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center select-text">
        <div
          className="transition-transform duration-100 ease-out origin-top flex flex-col items-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Printable Physical A4 Page Sheet */}
          <div
            ref={sheetRef}
            id="pais-printable-document"
            className="relative bg-white text-black shadow-2xl transition-all print:shadow-none print:m-0"
            style={{
              width: `${CANONICAL_DOCUMENT_CONFIG.widthMm}mm`,
              minHeight: `${CANONICAL_DOCUMENT_CONFIG.heightMm}mm`,
              paddingTop: `${CANONICAL_DOCUMENT_CONFIG.marginTop}mm`,
              paddingRight: `${CANONICAL_DOCUMENT_CONFIG.marginRight}mm`,
              paddingBottom: `${CANONICAL_DOCUMENT_CONFIG.marginBottom}mm`,
              paddingLeft: `${CANONICAL_DOCUMENT_CONFIG.marginLeft}mm`,
              boxSizing: 'border-box',
              fontFamily: CANONICAL_DOCUMENT_CONFIG.fontFamily,
              fontSize: CANONICAL_DOCUMENT_CONFIG.bodyFontSize,
              lineHeight: CANONICAL_DOCUMENT_CONFIG.lineHeight
            }}
          >
            {/* Running Header: RESTRICTED */}
            {headerText && (
              <div
                className="absolute left-0 right-0 text-center select-none"
                style={{
                  top: `${CANONICAL_DOCUMENT_CONFIG.headerMargin}mm`,
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '10pt',
                  fontWeight: 'normal',
                  color: '#000000',
                  textDecoration: 'underline'
                }}
              >
                {headerText}
              </div>
            )}

            {/* Document Body Content */}
            <div className="pais-canonical-document-content">
              {htmlContent ? (
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              ) : (
                children
              )}
            </div>

            {/* Running Footer: RESTRICTED */}
            {footerText && (
              <div
                className="absolute left-0 right-0 text-center select-none"
                style={{
                  bottom: `${CANONICAL_DOCUMENT_CONFIG.footerMargin}mm`,
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: '10pt',
                  fontWeight: 'normal',
                  color: '#000000',
                  textDecoration: 'underline'
                }}
              >
                {footerText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
