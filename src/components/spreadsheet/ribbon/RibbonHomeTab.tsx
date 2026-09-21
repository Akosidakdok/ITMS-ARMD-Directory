import React from 'react';
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
  DollarSign
} from 'lucide-react';

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

  alignH: 'left' | 'center' | 'right';
  onChangeAlignH: (align: 'left' | 'center' | 'right') => void;
  alignV: 'top' | 'middle' | 'bottom';
  onChangeAlignV: (align: 'top' | 'middle' | 'bottom') => void;
  isWrapText: boolean;
  onToggleWrapText: () => void;
  onMergeAndCenter: () => void;
  onUnmerge: () => void;

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
  alignH,
  onChangeAlignH,
  alignV,
  onChangeAlignV,
  isWrapText,
  onToggleWrapText,
  onMergeAndCenter,
  onUnmerge,
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
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 px-3 text-xs select-none">
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

          <button
            onClick={onMergeAndCenter}
            disabled={!canEdit}
            title="Merge & Center"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Combine className="h-3 w-3 text-blue-600" />
            <span>Merge</span>
          </button>
          <button
            onClick={onUnmerge}
            disabled={!canEdit}
            title="Unmerge Cells"
            className="p-1 rounded hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800"
          >
            <Split className="h-3.5 w-3.5" />
          </button>
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
