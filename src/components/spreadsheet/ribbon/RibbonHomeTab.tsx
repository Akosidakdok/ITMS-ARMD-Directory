import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Paintbrush,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Baseline,
  PaintBucket,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  WrapText,
  Combine,
  Split,
  Plus,
  Trash2,
  Search,
  RotateCcw,
  RotateCw,
  Sparkles,
  Percent,
  Coins,
  DollarSign,
  ChevronDown,
  Table
} from 'lucide-react';

export type BorderOptionType =
  | 'bottom'
  | 'top'
  | 'left'
  | 'right'
  | 'none'
  | 'all'
  | 'outside'
  | 'thick-outside'
  | 'bottom-double'
  | 'thick-bottom'
  | 'top-bottom'
  | 'top-thick-bottom'
  | 'top-double-bottom';

interface RibbonHomeTabProps {
  canEdit: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onFormatPainter: () => void;
  isFormatPainterActive: boolean;

  fontFamily: string;
  onChangeFontFamily: (font: string) => void;
  fontSize: number;
  onChangeFontSize: (sz: number) => void;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  isBold: boolean;
  onToggleBold: () => void;
  isItalic: boolean;
  onToggleItalic: () => void;
  isUnderline: boolean;
  onToggleUnderline: () => void;
  textColor: string;
  onChangeTextColor: (color: string) => void;
  fillColor: string;
  onChangeFillColor: (color: string) => void;
  onClearFormatting: () => void;
  onApplyBorder: (type: BorderOptionType) => void;
  onOpenFormatCells: (tab?: 'number' | 'alignment' | 'font' | 'border' | 'fill') => void;
  onInsertTable?: () => void;

  alignH: 'left' | 'center' | 'right';
  onChangeAlignH: (align: 'left' | 'center' | 'right') => void;
  alignV: 'top' | 'middle' | 'bottom';
  onChangeAlignV: (align: 'top' | 'middle' | 'bottom') => void;
  isWrapText: boolean;
  onToggleWrapText: () => void;
  onMergeAndCenter: () => void;
  onMergeAcross?: () => void;
  onMergeCells?: () => void;
  onUnmerge: () => void;
  onCenterAcross?: () => void;
  isMerged?: boolean;

  numFmt: string;
  onChangeNumFmt: (fmt: string) => void;

  onInsertRow: () => void;
  onInsertColumn: () => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onAutoFitColumn: () => void;

  onOpenFindReplace: () => void;
  onSelectAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const FONT_OPTIONS = ['Arial', 'Arial Narrow', 'Calibri', 'Times New Roman', 'Segoe UI', 'Courier New'];
const SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

const renderBorderIcon = (type: BorderOptionType | 'more') => {
  const boxDashed = (
    <>
      <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.35" />
      <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.35" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.35" />
    </>
  );

  switch (type) {
    case 'bottom':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'top':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="2" y1="2" x2="14" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'left':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="2" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'right':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="14" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'none':
      return (
        <svg className="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
        </svg>
      );
    case 'all':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1.3" />
          <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.3" />
          <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case 'outside':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'thick-outside':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      );
    case 'bottom-double':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.2" />
          <line x1="2" y1="14.5" x2="14" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'thick-bottom':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'top-bottom':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="2" y1="2" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'top-thick-bottom':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="2" y1="2" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case 'top-double-bottom':
      return (
        <svg className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" viewBox="0 0 16 16" fill="none">
          {boxDashed}
          <line x1="2" y1="2" x2="14" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.2" />
          <line x1="2" y1="14.5" x2="14" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'more':
      return (
        <svg className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" />
          <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" />
        </svg>
      );
  }
};

export const RibbonHomeTab: React.FC<RibbonHomeTabProps> = ({
  canEdit,
  onCut,
  onCopy,
  onPaste,
  onFormatPainter,
  isFormatPainterActive,
  fontFamily,
  onChangeFontFamily,
  fontSize,
  onChangeFontSize,
  onIncreaseFontSize,
  onDecreaseFontSize,
  isBold,
  onToggleBold,
  isItalic,
  onToggleItalic,
  isUnderline,
  onToggleUnderline,
  textColor,
  onChangeTextColor,
  fillColor,
  onChangeFillColor,
  onClearFormatting,
  onApplyBorder,
  onOpenFormatCells,
  onInsertTable,
  alignH,
  onChangeAlignH,
  alignV,
  onChangeAlignV,
  isWrapText,
  onToggleWrapText,
  onMergeAndCenter,
  onMergeAcross,
  onMergeCells,
  onUnmerge,
  onCenterAcross,
  isMerged = false,
  numFmt,
  onChangeNumFmt,
  onInsertRow,
  onInsertColumn,
  onDeleteRow,
  onDeleteColumn,
  onAutoFitColumn,
  onOpenFindReplace,
  onSelectAll,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const [isMergeMenuOpen, setIsMergeMenuOpen] = useState(false);
  const [isBorderMenuOpen, setIsBorderMenuOpen] = useState(false);
  const mergeMenuRef = useRef<HTMLDivElement>(null);
  const borderMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMergeMenuOpen && !isBorderMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (isMergeMenuOpen && mergeMenuRef.current && !mergeMenuRef.current.contains(e.target as Node)) {
        setIsMergeMenuOpen(false);
      }
      if (isBorderMenuOpen && borderMenuRef.current && !borderMenuRef.current.contains(e.target as Node)) {
        setIsBorderMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMergeMenuOpen(false);
        setIsBorderMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMergeMenuOpen, isBorderMenuOpen]);
  return (
    <div className="flex items-center gap-2 py-1 px-3 text-xs select-none">
      {/* 1. Clipboard */}
      <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onPaste}
          disabled={!canEdit}
          title="Paste (Ctrl+V)"
          className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ClipboardPaste className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] mt-0.5">Paste</span>
        </button>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onCut}
            disabled={!canEdit}
            title="Cut (Ctrl+X)"
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Scissors className="h-3 w-3 text-slate-500" />
            <span className="text-[10px]">Cut</span>
          </button>
          <button
            onClick={onCopy}
            title="Copy (Ctrl+C)"
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Copy className="h-3 w-3 text-slate-500" />
            <span className="text-[10px]">Copy</span>
          </button>
          <button
            onClick={onFormatPainter}
            title="Format Painter"
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] ${
              isFormatPainterActive
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Paintbrush className="h-3 w-3 text-amber-600" />
            <span>Painter</span>
          </button>
        </div>
      </div>

      {/* 2. Font Controls */}
      <div className="flex flex-col gap-1 pr-2 border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <select
            value={fontFamily}
            onChange={e => onChangeFontFamily(e.target.value)}
            disabled={!canEdit}
            className="h-6 rounded border border-slate-200 bg-white px-1.5 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200 w-28"
          >
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            value={fontSize}
            onChange={e => onChangeFontSize(Number(e.target.value))}
            disabled={!canEdit}
            className="h-6 rounded border border-slate-200 bg-white px-1 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200 w-12 text-center"
          >
            {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={onIncreaseFontSize}
            disabled={!canEdit}
            title="Increase Font Size"
            className="h-6 px-1 rounded border border-slate-200 hover:bg-slate-100 text-[10px] font-bold dark:border-slate-700 dark:hover:bg-slate-800"
          >
            A^
          </button>
          <button
            onClick={onDecreaseFontSize}
            disabled={!canEdit}
            title="Decrease Font Size"
            className="h-6 px-1 rounded border border-slate-200 hover:bg-slate-100 text-[9px] font-bold dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Av
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleBold}
            disabled={!canEdit}
            title="Bold (Ctrl+B)"
            className={`p-1 rounded ${isBold ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleItalic}
            disabled={!canEdit}
            title="Italic (Ctrl+I)"
            className={`p-1 rounded ${isItalic ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleUnderline}
            disabled={!canEdit}
            title="Underline (Ctrl+U)"
            className={`p-1 rounded ${isUnderline ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <Underline className="h-3.5 w-3.5" />
          </button>

          {/* Borders Dropdown */}
          <div
            ref={borderMenuRef}
            className={`relative inline-flex items-center rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 ${
              isBorderMenuOpen ? 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 z-50' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onApplyBorder('bottom')}
              disabled={!canEdit}
              title="Bottom Border"
              className="p-1 rounded-l text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white disabled:opacity-40"
            >
              {renderBorderIcon('bottom')}
            </button>
            <button
              type="button"
              onClick={() => setIsBorderMenuOpen(prev => !prev)}
              disabled={!canEdit}
              title="Border options"
              className="px-0.5 py-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-r disabled:opacity-40"
            >
              <ChevronDown className="h-2.5 w-2.5" />
            </button>

            {/* Dropdown Menu */}
            {isBorderMenuOpen && (
              <div
                className="absolute top-full left-0 mt-1 min-w-[215px] max-h-[380px] overflow-y-auto bg-white dark:bg-[#1a2636] border border-slate-300 dark:border-slate-700 shadow-2xl rounded py-1 z-50 text-[11px]"
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Borders
                </div>

                {[
                  { id: 'bottom', label: 'Bottom Border' },
                  { id: 'top', label: 'Top Border' },
                  { id: 'left', label: 'Left Border' },
                  { id: 'right', label: 'Right Border' }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { onApplyBorder(b.id as BorderOptionType); setIsBorderMenuOpen(false); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {renderBorderIcon(b.id as BorderOptionType)}
                    </div>
                    <span>{b.label}</span>
                  </button>
                ))}

                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

                {[
                  { id: 'none', label: 'No Border' },
                  { id: 'all', label: 'All Borders' },
                  { id: 'outside', label: 'Outside Borders' },
                  { id: 'thick-outside', label: 'Thick Outside Borders' }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { onApplyBorder(b.id as BorderOptionType); setIsBorderMenuOpen(false); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {renderBorderIcon(b.id as BorderOptionType)}
                    </div>
                    <span>{b.label}</span>
                  </button>
                ))}

                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

                {[
                  { id: 'bottom-double', label: 'Bottom Double Border' },
                  { id: 'thick-bottom', label: 'Thick Bottom Border' },
                  { id: 'top-bottom', label: 'Top and Bottom Border' },
                  { id: 'top-thick-bottom', label: 'Top and Thick Bottom Border' },
                  { id: 'top-double-bottom', label: 'Top and Double Bottom Border' }
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { onApplyBorder(b.id as BorderOptionType); setIsBorderMenuOpen(false); }}
                    className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {renderBorderIcon(b.id as BorderOptionType)}
                    </div>
                    <span>{b.label}</span>
                  </button>
                ))}

                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

                <button
                  type="button"
                  onClick={() => { onOpenFormatCells('border'); setIsBorderMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors font-medium"
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {renderBorderIcon('more')}
                  </div>
                  <span>More Borders...</span>
                </button>
              </div>
            )}
          </div>

          {/* Fill Color */}
          <div className="relative flex items-center">
            <label title="Fill Color" className="p-1 rounded hover:bg-slate-100 cursor-pointer text-amber-600 dark:hover:bg-slate-800">
              <PaintBucket className="h-3.5 w-3.5" />
              <input
                type="color"
                value={fillColor || '#ffffff'}
                onChange={e => onChangeFillColor(e.target.value)}
                disabled={!canEdit}
                className="sr-only"
              />
            </label>
          </div>

          {/* Text Color */}
          <div className="relative flex items-center">
            <label title="Font Color" className="p-1 rounded hover:bg-slate-100 cursor-pointer text-red-600 dark:hover:bg-slate-800">
              <Baseline className="h-3.5 w-3.5" />
              <input
                type="color"
                value={textColor || '#000000'}
                onChange={e => onChangeTextColor(e.target.value)}
                disabled={!canEdit}
                className="sr-only"
              />
            </label>
          </div>

          <button
            onClick={onClearFormatting}
            disabled={!canEdit}
            title="Clear All Formatting"
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-red-500 dark:hover:bg-slate-800"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Alignment */}
      <div className="flex flex-col gap-1 pr-2 border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangeAlignV('top')}
            title="Top Align"
            className={`p-1 rounded ${alignV === 'top' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeAlignV('middle')}
            title="Middle Align"
            className={`p-1 rounded ${alignV === 'middle' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeAlignV('bottom')}
            title="Bottom Align"
            className={`p-1 rounded ${alignV === 'bottom' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onToggleWrapText}
            title="Wrap Text"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${isWrapText ? 'bg-blue-100 text-blue-800 font-bold dark:bg-blue-900/60 dark:text-blue-200' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <WrapText className="h-3 w-3" />
            <span>Wrap</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangeAlignH('left')}
            title="Align Left"
            className={`p-1 rounded ${alignH === 'left' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeAlignH('center')}
            title="Center"
            className={`p-1 rounded ${alignH === 'center' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChangeAlignH('right')}
            title="Align Right"
            className={`p-1 rounded ${alignH === 'right' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60' : 'hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          {/* Merge & Center Split Dropdown Button */}
          <div ref={mergeMenuRef} className={`relative inline-flex items-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shadow-xs ${isMergeMenuOpen ? 'z-50' : ''}`}>
            <button
              type="button"
              onClick={onMergeAndCenter}
              disabled={!canEdit}
              title={isMerged ? 'Unmerge Cells' : 'Merge & Center'}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-l text-[10px] font-medium transition-colors disabled:opacity-40 ${
                isMerged
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-sky-300 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/80'
              }`}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                <svg className={`w-3.5 h-3.5 ${isMerged ? 'text-blue-700 dark:text-sky-300' : 'text-blue-600 dark:text-sky-400'}`} viewBox="0 0 16 16" fill="none">
                  <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="8" y1="1.5" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="8" y1="11.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4 8h8M6 5.5l-2.5 2.5 2.5 2.5M10 5.5l2.5 2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="whitespace-nowrap">{isMerged ? 'Merged' : 'Merge & Center'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMergeMenuOpen(prev => !prev)}
              disabled={!canEdit}
              title="Merge options"
              className={`px-1 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-r border-l border-slate-200 dark:border-slate-700 disabled:opacity-40 ${
                isMergeMenuOpen ? 'bg-slate-200 dark:bg-slate-700' : ''
              }`}
            >
              <ChevronDown className="h-3 w-3" />
            </button>

            {/* Dropdown Menu */}
            {isMergeMenuOpen && (
              <div
                className="absolute top-full left-0 mt-1 min-w-[215px] bg-white dark:bg-[#1a2636] border border-slate-300 dark:border-slate-700 shadow-2xl rounded py-1 z-50 text-[11px]"
              >
                <button
                  type="button"
                  onClick={() => { onMergeAndCenter(); setIsMergeMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="w-5 h-5 flex items-center justify-center border border-slate-300 dark:border-slate-600 rounded-sm bg-slate-50 dark:bg-slate-800/80 shrink-0">
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="8" y1="1.5" x2="8" y2="4.5" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="8" y1="11.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4 8h8M6 5.5l-2.5 2.5 2.5 2.5M10 5.5l2.5 2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span>Merge & <span className="underline font-semibold">C</span>enter</span>
                </button>

                <button
                  type="button"
                  onClick={() => { (onMergeAcross || onMergeAndCenter)(); setIsMergeMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="w-5 h-5 flex items-center justify-center border border-slate-300 dark:border-slate-600 rounded-sm bg-slate-50 dark:bg-slate-800/80 shrink-0">
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4 4.5h6.5M8.5 3l2 1.5-2 1.5M4 11.5h6.5M8.5 10l2 1.5-2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span>Merge <span className="underline font-semibold">A</span>cross</span>
                </button>

                <button
                  type="button"
                  onClick={() => { (onMergeCells || onMergeAndCenter)(); setIsMergeMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="w-5 h-5 flex items-center justify-center border border-slate-300 dark:border-slate-600 rounded-sm bg-slate-50 dark:bg-slate-800/80 shrink-0">
                    <svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="8" y1="1.5" x2="8" y2="4" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" opacity="0.4" />
                      <line x1="8" y1="12" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" opacity="0.4" />
                      <line x1="1.5" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" opacity="0.4" />
                      <line x1="12" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" opacity="0.4" />
                    </svg>
                  </div>
                  <span><span className="underline font-semibold">M</span>erge Cells</span>
                </button>

                <button
                  type="button"
                  onClick={() => { onUnmerge(); setIsMergeMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="w-5 h-5 flex items-center justify-center border border-slate-300 dark:border-slate-600 rounded-sm bg-slate-50 dark:bg-slate-800/80 shrink-0">
                    <svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="5.5" y1="1.5" x2="5.5" y2="14.5" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.6" />
                      <line x1="10.5" y1="1.5" x2="10.5" y2="14.5" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.6" />
                    </svg>
                  </div>
                  <span><span className="underline font-semibold">U</span>nmerge Cells</span>
                </button>

                <button
                  type="button"
                  onClick={() => { (onCenterAcross || onMergeAndCenter)(); setIsMergeMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <div className="w-5 h-5 flex items-center justify-center border border-slate-300 dark:border-slate-600 rounded-sm bg-slate-50 dark:bg-slate-800/80 shrink-0">
                    <svg className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="5.5" y1="1.5" x2="5.5" y2="14.5" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.5" />
                      <line x1="10.5" y1="1.5" x2="10.5" y2="14.5" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 1" opacity="0.5" />
                      <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span>Center Across <span className="underline font-semibold">S</span>election</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Number Formatting */}
      <div className="flex flex-col gap-1 pr-2 border-r border-slate-200 dark:border-slate-800">
        <select
          value={numFmt}
          onChange={e => onChangeNumFmt(e.target.value)}
          disabled={!canEdit}
          className="h-6 rounded border border-slate-200 bg-white px-1.5 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200 w-28"
        >
          <option value="General">General</option>
          <option value="#,##0.00">Number</option>
          <option value="₱#,##0.00">Currency (₱)</option>
          <option value="accounting">Accounting</option>
          <option value="0.0%">Percentage (%)</option>
          <option value="date">Short Date</option>
          <option value="@">Text</option>
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangeNumFmt('₱#,##0.00')}
            disabled={!canEdit}
            title="Currency ₱"
            className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] font-bold dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ₱
          </button>
          <button
            onClick={() => onChangeNumFmt('0.0%')}
            disabled={!canEdit}
            title="Percent"
            className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] font-bold dark:border-slate-700 dark:hover:bg-slate-800"
          >
            %
          </button>
          <button
            onClick={() => onChangeNumFmt('#,##0.00')}
            disabled={!canEdit}
            title="Comma Style"
            className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] font-bold dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ,
          </button>
        </div>
      </div>

      {/* 5. Cells (Insert/Delete/Format) */}
      <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onInsertRow}
            disabled={!canEdit}
            title="Insert Row Above"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-3 w-3 text-emerald-600" />
            <span>Row</span>
          </button>
          <button
            onClick={onInsertColumn}
            disabled={!canEdit}
            title="Insert Column Left"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-3 w-3 text-emerald-600" />
            <span>Col</span>
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          <button
            onClick={onDeleteRow}
            disabled={!canEdit}
            title="Delete Selected Row"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3 w-3" />
            <span>Row</span>
          </button>
          <button
            onClick={onDeleteColumn}
            disabled={!canEdit}
            title="Delete Selected Column"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3 w-3" />
            <span>Col</span>
          </button>
        </div>

        <button
          onClick={onAutoFitColumn}
          title="AutoFit Column Width"
          className="flex flex-col items-center px-1.5 py-1 rounded text-[10px] hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="font-bold">Auto</span>
          <span>Fit</span>
        </button>

        {onInsertTable && (
          <button
            onClick={onInsertTable}
            disabled={!canEdit}
            title="Create formatted table from selection (Ctrl+T)"
            className="flex flex-col items-center px-2 py-1 rounded text-[10px] hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Table className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium mt-0.5">Table</span>
          </button>
        )}
      </div>

      {/* 6. Editing & Search */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenFindReplace}
          title="Find & Replace (Ctrl+F)"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] mt-0.5">Find</span>
        </button>

        <div className="flex flex-col gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
