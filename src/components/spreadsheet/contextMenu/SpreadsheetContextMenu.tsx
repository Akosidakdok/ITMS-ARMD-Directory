import React, { useEffect, useRef } from 'react';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Plus,
  Trash2,
  Paintbrush,
  Sparkles,
  ArrowUpDown,
  Filter,
  MessageSquare,
  EyeOff
} from 'lucide-react';

export interface ContextMenuPosition {
  x: number;
  y: number;
  row: number;
  col: number;
  address: string;
}

interface SpreadsheetContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onInsertRow: (row: number) => void;
  onDeleteRow: (row: number) => void;
  onInsertColumn: (col: number) => void;
  onDeleteColumn: (col: number) => void;
  onClearContents: () => void;
  onClearFormatting: () => void;
  onOpenFormatCells: () => void;
  onSortAZ: () => void;
  onSortZA: () => void;
  onFilterByValue: () => void;
  onAddComment: () => void;
}

export const SpreadsheetContextMenu: React.FC<SpreadsheetContextMenuProps> = ({
  position,
  onClose,
  onCut,
  onCopy,
  onPaste,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  onClearContents,
  onClearFormatting,
  onOpenFormatCells,
  onSortAZ,
  onSortZA,
  onFilterByValue,
  onAddComment
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (position) {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  // Keep menu within screen viewport
  const menuWidth = 220;
  const menuHeight = 360;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md text-xs dark:border-slate-800 dark:bg-[#101b2b]/95"
    >
      <div className="px-2 py-1 font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
        Cell {position.address}
      </div>

      {/* Clipboard */}
      <button
        onClick={() => { onCut(); onClose(); }}
        className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span className="flex items-center gap-2">
          <Scissors className="h-3.5 w-3.5 text-slate-500" />
          Cut
        </span>
        <span className="text-[10px] text-slate-400">Ctrl+X</span>
      </button>

      <button
        onClick={() => { onCopy(); onClose(); }}
        className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span className="flex items-center gap-2">
          <Copy className="h-3.5 w-3.5 text-slate-500" />
          Copy
        </span>
        <span className="text-[10px] text-slate-400">Ctrl+C</span>
      </button>

      <button
        onClick={() => { onPaste(); onClose(); }}
        className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span className="flex items-center gap-2">
          <ClipboardPaste className="h-3.5 w-3.5 text-slate-500" />
          Paste
        </span>
        <span className="text-[10px] text-slate-400">Ctrl+V</span>
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

      {/* Row / Column Operations */}
      <button
        onClick={() => { onInsertRow(position.row); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5 text-blue-500" />
        Insert Row Above
      </button>

      <button
        onClick={() => { onInsertColumn(position.col); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5 text-blue-500" />
        Insert Column Left
      </button>

      <button
        onClick={() => { onDeleteRow(position.row); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Row {position.row}
      </button>

      <button
        onClick={() => { onDeleteColumn(position.col); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Column
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

      {/* Clear & Format */}
      <button
        onClick={() => { onClearContents(); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Trash2 className="h-3.5 w-3.5 text-slate-500" />
        Clear Contents
      </button>

      <button
        onClick={() => { onClearFormatting(); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Paintbrush className="h-3.5 w-3.5 text-slate-500" />
        Clear Formatting
      </button>

      <button
        onClick={() => { onOpenFormatCells(); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 font-semibold"
      >
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        Format Cells...
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

      {/* Sort & Filter */}
      <button
        onClick={() => { onSortAZ(); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
        Sort Smallest to Largest (A-Z)
      </button>

      <button
        onClick={() => { onSortZA(); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
        Sort Largest to Smallest (Z-A)
      </button>

      <button
        onClick={() => { onFilterByValue(); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Filter className="h-3.5 w-3.5 text-blue-500" />
        Filter by Selected Cell Value
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

      {/* Comment */}
      <button
        onClick={() => { onAddComment(); onClose(); }}
        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
        Insert / Edit Note
      </button>
    </div>
  );
};
