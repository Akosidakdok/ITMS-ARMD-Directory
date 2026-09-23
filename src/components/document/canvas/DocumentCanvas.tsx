import React from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { PageLayoutConfig } from '../ribbon/RibbonLayoutTab';
import { PageRuler } from './PageRuler';
import { CANONICAL_DOCUMENT_CONFIG } from '../utils/sharedOrderDocument';

interface DocumentCanvasProps {
  editor: Editor | null;
  layout: PageLayoutConfig;
  zoom: number;
  showRuler: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  headerText?: string;
  footerText?: string;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  editor,
  layout,
  zoom,
  showRuler,
  canvasRef,
  headerText,
  footerText
}) => {
  // Page dimensions in mm
  const getPageDimensions = () => {
    let width = 210;
    let height = 297;
    if (layout.pageSize === 'Letter') {
      width = 215.9;
      height = 279.4;
    } else if (layout.pageSize === 'Legal') {
      width = 215.9;
      height = 355.6;
    }

    if (layout.orientation === 'landscape') {
      return { width: height, height: width };
    }
    return { width, height };
  };

  const { width: pageWidthMm, height: pageHeightMm } = getPageDimensions();

  return (
    <div className="flex-1 overflow-auto bg-slate-200/90 dark:bg-[#070d18] p-4 sm:p-8 flex flex-col items-center">
      {showRuler && (
        <PageRuler
          pageWidthMm={pageWidthMm}
          marginLeftMm={layout.marginLeft}
          marginRightMm={layout.marginRight}
        />
      )}

      {/* Scaled Document Canvas Viewport */}
      <div
        className="transition-transform duration-100 ease-out origin-top flex flex-col items-center"
        style={{ transform: `scale(${zoom})` }}
      >
        {/* Printable Physical Page Sheet */}
        <div
          ref={canvasRef}
          id="pais-printable-document"
          className="relative bg-white text-slate-900 shadow-2xl ring-1 ring-slate-300 dark:ring-slate-700 transition-all print:shadow-none print:ring-0 print:m-0"
          style={{
            width: `${pageWidthMm}mm`,
            minHeight: `${pageHeightMm}mm`,
            paddingTop: `${layout.marginTop}mm`,
            paddingRight: `${layout.marginRight}mm`,
            paddingBottom: `${layout.marginBottom}mm`,
            paddingLeft: `${layout.marginLeft}mm`,
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

          {/* Editable Document Body */}
          <div
            style={{
              columnCount: layout.columns,
              columnGap: '10mm',
              minHeight: `${pageHeightMm - layout.marginTop - layout.marginBottom}mm`
            }}
            className="document-prose-content outline-none"
          >
            <EditorContent editor={editor} />
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
  );
};
