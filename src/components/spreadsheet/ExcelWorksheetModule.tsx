import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  Copy,
  Scissors,
  ClipboardPaste,
  Search,
  Filter,
  Pin,
  Download,
  Upload,
  History,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import {
  fetchWorksheetSummariesApi,
  fetchWorksheetDetailApi,
  updateWorksheetCellApi,
  batchUpdateWorksheetCellsApi,
  downloadWorksheetExcelApi,
  type WorksheetSummary,
  type WorksheetDetail,
  type WorksheetCell
} from '../../services/api';
import { useAuthRole } from '../../context/AuthRoleContext';
import { ExcelImportModal } from './ExcelImportModal';
import { WorksheetAuditDrawer } from './WorksheetAuditDrawer';

const PCO_RANKS = ['PBGEN', 'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT'];
const PNCO_RANKS = ['PEMS', 'PCMS', 'PSMS', 'PMSg', 'PSSg', 'PCpl', 'Pat', 'NUP'];
const ALL_RANKS = [...PCO_RANKS, ...PNCO_RANKS];
const GENDERS = ['Male', 'Female'];
const STATUSES = ['PERM', 'TEMP', 'Active', 'On Leave', 'Detailed Out', 'Suspended'];

// Helper to convert column number (1-based) to letter
function colNumToLetter(num: number): string {
  let letter = '';
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - mod) / 26);
  }
  return letter;
}

// Helper to convert column letter to number
function colLetterToNum(letter: string): number {
  let num = 0;
  for (let i = 0; i < letter.length; i++) {
    num = num * 26 + (letter.charCodeAt(i) - 64);
  }
  return num;
}

function parseAddress(addr: string): { col: number; row: number; letter: string } {
  const match = addr.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { col: 1, row: 1, letter: 'A' };
  return {
    letter: match[1],
    col: colLetterToNum(match[1]),
    row: parseInt(match[2], 10)
  };
}

export const ExcelWorksheetModule: React.FC = () => {
  const { role } = useAuthRole();
  const canEdit = role === 'admin' || role === 'superadmin' || role === 'command';

  // Worksheets navigation
  const [sheets, setSheets] = useState<WorksheetSummary[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('sheet-1');
  const [sheetData, setSheetData] = useState<WorksheetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Active cell & editing
  const [activeCell, setActiveCell] = useState<{ row: number; col: number; address: string }>({
    row: 1,
    col: 1,
    address: 'A1'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Unsaved changes & Undo/Redo
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, { oldValue: any; newValue: any }>>(new Map());
  const [undoStack, setUndoStack] = useState<Array<{ sheetId: string; address: string; oldValue: any; newValue: any }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ sheetId: string; address: string; oldValue: any; newValue: any }>>([]);

  // Search & Filtering
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [columnFilters, setColumnFilters] = useState<Record<number, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<number | null>(null);

  // Freeze panes & Modals
  const [freezePanes, setFreezePanes] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  const tabScrollRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Load worksheet list
  useEffect(() => {
    fetchWorksheetSummariesApi()
      .then(res => {
        setSheets(res);
        if (res.length > 0) {
          setActiveSheetId(res[0].id);
        }
      })
      .catch(err => setError(err.message));
  }, []);

  // Load single worksheet details
  const loadActiveSheet = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWorksheetDetailApi(id);
      setSheetData(data);
      // Reset active cell to A1 or top visible
      setActiveCell({ row: 1, col: 1, address: 'A1' });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load worksheet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSheetId) {
      loadActiveSheet(activeSheetId);
    }
  }, [activeSheetId, loadActiveSheet]);

  // Merged cells index calculation
  const { mergeMap, hiddenMergeCells } = useMemo(() => {
    const mMap = new Map<string, { rowSpan: number; colSpan: number }>();
    const hiddenSet = new Set<string>();

    if (!sheetData?.merges) return { mergeMap: mMap, hiddenMergeCells: hiddenSet };

    sheetData.merges.forEach(rangeStr => {
      const parts = rangeStr.split(':');
      if (parts.length !== 2) return;
      const start = parseAddress(parts[0]);
      const end = parseAddress(parts[1]);

      const rowSpan = end.row - start.row + 1;
      const colSpan = end.col - start.col + 1;

      mMap.set(parts[0], { rowSpan, colSpan });

      for (let r = start.row; r <= end.row; r++) {
        for (let c = start.col; c <= end.col; c++) {
          if (r === start.row && c === start.col) continue;
          hiddenSet.add(`${colNumToLetter(c)}${r}`);
        }
      }
    });

    return { mergeMap: mMap, hiddenMergeCells: hiddenSet };
  }, [sheetData?.merges]);

  // Current selected cell object
  const currentCellObj: WorksheetCell | undefined = useMemo(() => {
    if (!sheetData) return undefined;
    return sheetData.cells[activeCell.address];
  }, [sheetData, activeCell.address]);

  // Cell Click Handler
  const handleCellClick = (row: number, col: number, address: string) => {
    if (isEditing && activeCell.address !== address) {
      commitCellEdit();
    }
    setActiveCell({ row, col, address });
  };

  // Cell Double-Click to edit
  const handleCellDoubleClick = (row: number, col: number, address: string) => {
    if (!canEdit) return;
    const cell = sheetData?.cells[address];
    if (cell?.isCalculated) return; // protected

    setActiveCell({ row, col, address });
    setIsEditing(true);
    setEditValue(cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '');
    setTimeout(() => cellInputRef.current?.focus(), 50);
  };

  // Commit Cell Edit
  const commitCellEdit = async () => {
    if (!sheetData || !canEdit) {
      setIsEditing(false);
      return;
    }

    const { address } = activeCell;
    const currentVal = sheetData.cells[address]?.v;
    const newVal = editValue;

    if (String(currentVal ?? '') === String(newVal ?? '')) {
      setIsEditing(false);
      return;
    }

    // Stage change
    setUnsavedChanges(prev => {
      const next = new Map(prev);
      next.set(address, { oldValue: currentVal, newValue: newVal });
      return next;
    });

    // Update locally in sheetData
    setSheetData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        cells: {
          ...prev.cells,
          [address]: {
            ...prev.cells[address],
            v: newVal
          }
        }
      };
    });

    // Record undo
    setUndoStack(prev => [...prev, { sheetId: activeSheetId, address, oldValue: currentVal, newValue: newVal }]);
    setRedoStack([]);
    setIsEditing(false);
  };

  // Cancel Cell Edit
  const cancelCellEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  // Save All Changes to Server
  const handleSaveChanges = async () => {
    if (!sheetData || unsavedChanges.size === 0) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updates = Array.from(unsavedChanges.entries()).map(([address, ch]) => ({
        address,
        value: ch.newValue,
        oldValue: ch.oldValue
      }));

      await batchUpdateWorksheetCellsApi(activeSheetId, updates);
      setUnsavedChanges(new Map());
      setMessage(`Successfully saved ${updates.length} modification(s) and synchronized with PAIS database.`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Discard Unsaved Changes
  const handleDiscardChanges = () => {
    if (unsavedChanges.size === 0) return;
    loadActiveSheet(activeSheetId);
    setUnsavedChanges(new Map());
  };

  // Undo Handler
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, last]);

    // Apply reverted value
    if (sheetData) {
      setSheetData({
        ...sheetData,
        cells: {
          ...sheetData.cells,
          [last.address]: {
            ...sheetData.cells[last.address],
            v: last.oldValue
          }
        }
      });
      setActiveCell({ ...parseAddress(last.address), address: last.address });
    }
  };

  // Redo Handler
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, next]);

    if (sheetData) {
      setSheetData({
        ...sheetData,
        cells: {
          ...sheetData.cells,
          [next.address]: {
            ...sheetData.cells[next.address],
            v: next.newValue
          }
        }
      });
      setActiveCell({ ...parseAddress(next.address), address: next.address });
    }
  };

  // Copy cell or range to TSV clipboard
  const handleCopy = () => {
    if (!sheetData) return;
    const cell = sheetData.cells[activeCell.address];
    const text = cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '';
    navigator.clipboard.writeText(text);
    setMessage(`Copied "${text}" to clipboard`);
    setTimeout(() => setMessage(''), 2000);
  };

  // Paste TSV clipboard to cells
  const handlePaste = async () => {
    if (!canEdit || !sheetData) return;
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText) return;

      const rows = clipText.split(/\r?\n/).map(r => r.split('\t'));
      const startRow = activeCell.row;
      const startCol = activeCell.col;

      const newCells = { ...sheetData.cells };
      const updates: Array<{ address: string; value: any; oldValue: any }> = [];

      rows.forEach((rowVals, rIdx) => {
        rowVals.forEach((val, cIdx) => {
          const targetRow = startRow + rIdx;
          const targetCol = startCol + cIdx;
          const targetAddr = `${colNumToLetter(targetCol)}${targetRow}`;
          const currentVal = newCells[targetAddr]?.v;

          newCells[targetAddr] = {
            ...newCells[targetAddr],
            v: val
          };

          updates.push({ address: targetAddr, value: val, oldValue: currentVal });
        });
      });

      setSheetData({ ...sheetData, cells: newCells });
      setUnsavedChanges(prev => {
        const next = new Map(prev);
        updates.forEach(u => next.set(u.address, { oldValue: u.oldValue, newValue: u.value }));
        return next;
      });

      setMessage(`Pasted ${updates.length} cell(s) from clipboard`);
      setTimeout(() => setMessage(''), 2500);
    } catch (e: any) {
      setError('Unable to paste: ' + e.message);
    }
  };

  // Keyboard navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitCellEdit();
        // Move down
        const nextRow = Math.min((sheetData?.rowCount || 100), activeCell.row + 1);
        setActiveCell({ row: nextRow, col: activeCell.col, address: `${colNumToLetter(activeCell.col)}${nextRow}` });
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitCellEdit();
        const nextCol = Math.min((sheetData?.colCount || 26), activeCell.col + 1);
        setActiveCell({ row: activeCell.row, col: nextCol, address: `${colNumToLetter(nextCol)}${activeCell.row}` });
      } else if (e.key === 'Escape') {
        cancelCellEdit();
      }
      return;
    }

    // Ctrl shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
    }

    // Arrows & Tab Navigation
    let { row, col } = activeCell;
    const maxRow = sheetData?.rowCount || 100;
    const maxCol = sheetData?.colCount || 26;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      row = Math.max(1, row - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      row = Math.min(maxRow, row + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      col = Math.max(1, col - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      col = Math.min(maxCol, col + 1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        col = Math.max(1, col - 1);
      } else {
        col = Math.min(maxCol, col + 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (canEdit && !currentCellObj?.isCalculated) {
        handleCellDoubleClick(row, col, activeCell.address);
        return;
      }
      row = Math.min(maxRow, row + 1);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && canEdit) {
      // Direct typing enters edit mode
      if (!currentCellObj?.isCalculated) {
        setIsEditing(true);
        setEditValue(e.key);
        setTimeout(() => cellInputRef.current?.focus(), 50);
        return;
      }
    }

    if (row !== activeCell.row || col !== activeCell.col) {
      const address = `${colNumToLetter(col)}${row}`;
      setActiveCell({ row, col, address });
    }
  };

  // Search logic
  const handleSearch = (term: string) => {
    setSearchQuery(term);
    if (!term || !sheetData) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const matches: string[] = [];
    const low = term.toLowerCase();
    for (const [addr, cell] of Object.entries(sheetData.cells)) {
      if (cell.v !== null && cell.v !== undefined && String(cell.v).toLowerCase().includes(low)) {
        matches.push(addr);
      }
    }

    setSearchMatches(matches);
    setCurrentMatchIndex(0);
    if (matches.length > 0) {
      const first = parseAddress(matches[0]);
      setActiveCell({ ...first, address: matches[0] });
    }
  };

  const nextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    const addr = searchMatches[nextIdx];
    setActiveCell({ ...parseAddress(addr), address: addr });
  };

  const prevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    const addr = searchMatches[prevIdx];
    setActiveCell({ ...parseAddress(addr), address: addr });
  };

  // Export to Excel handler
  const handleExport = async (singleSheet = false) => {
    try {
      setMessage('Exporting authentic workbook to Excel...');
      await downloadWorksheetExcelApi(singleSheet ? activeSheetId : undefined);
      setMessage('Download completed successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    }
  };

  // Row filtering check
  const visibleRows = useMemo(() => {
    if (!sheetData) return [];
    const rows: number[] = [];
    const filterCols = Object.entries(columnFilters);

    for (let r = 1; r <= sheetData.rowCount; r++) {
      // Skip hidden rows
      if (sheetData.rowConfig[r]?.hidden) continue;

      // Check column filters
      let passes = true;
      for (const [colStr, filterVal] of filterCols) {
        const colNum = parseInt(colStr, 10);
        const addr = `${colNumToLetter(colNum)}${r}`;
        const cellVal = String(sheetData.cells[addr]?.v || '').toLowerCase();
        if (!cellVal.includes(filterVal.toLowerCase())) {
          passes = false;
          break;
        }
      }

      if (passes) rows.push(r);
    }

    return rows;
  }, [sheetData, columnFilters]);

  // Determine field type for active cell
  const activeFieldType = useMemo(() => {
    if (!sheetData || !currentCellObj) return 'Regular Cell';
    if (currentCellObj.isCalculated) return 'Calculated (Formula)';
    if (currentCellObj.personnelId) return 'Personnel Linked';
    const letter = activeCell.address.replace(/[0-9]/g, '');
    if (sheetData.order <= 8) {
      if (letter === 'D' || (sheetData.order === 6 && letter === 'B')) return 'Rank Dropdown';
      if (letter === 'C') return 'Gender Dropdown';
      if (letter === 'J' || letter === 'L') return 'Date Field';
    }
    return 'Text / Number';
  }, [sheetData, currentCellObj, activeCell.address]);

  return (
    <div
      className="flex flex-col h-[calc(100vh-8.5rem)] min-h-[640px] bg-slate-100 border border-slate-300 rounded-xl overflow-hidden shadow-md select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* 1. TOP COMPACT TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-300 bg-white px-3 py-1.5 gap-2 text-xs">
        {/* Left Section: Edit & Clipboard actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Redo</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100"
            title="Copy (Ctrl+C)"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button
            onClick={handlePaste}
            disabled={!canEdit}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            title="Paste (Ctrl+V)"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Paste</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`flex items-center gap-1 rounded px-2 py-1 ${searchOpen ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
            title="Find in sheet"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setFreezePanes(!freezePanes)}
            className={`flex items-center gap-1 rounded px-2 py-1 ${freezePanes ? 'bg-slate-200 font-semibold text-slate-800' : 'text-slate-700 hover:bg-slate-100'}`}
            title="Toggle Freeze Panes"
          >
            <Pin className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Freeze</span>
          </button>
        </div>

        {/* Right Section: Import / Export, Audit, and Save Changes */}
        <div className="flex items-center gap-2">
          {unsavedChanges.size > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-amber-800 animate-pulse">
              <span>Unsaved Changes: <b>{unsavedChanges.size}</b></span>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded px-2 py-0.5 ml-1 transition"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </button>
              <button
                onClick={handleDiscardChanges}
                className="text-slate-500 hover:text-slate-800 px-1"
                title="Discard changes"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition"
            title="Import from Excel file"
          >
            <Upload className="h-3.5 w-3.5 text-blue-600" />
            <span>Import</span>
          </button>

          <button
            onClick={() => handleExport(false)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition"
            title="Export all 13 sheets to Excel (.xlsx)"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setIsAuditDrawerOpen(true)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition"
            title="Worksheet Audit Log"
          >
            <History className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden lg:inline">Audit Trail</span>
          </button>
        </div>
      </div>

      {/* 2. FORMULA BAR & SEARCH DRAWER */}
      <div className="flex items-center border-b border-slate-300 bg-slate-50 px-3 py-1.5 gap-2 text-xs">
        {/* Cell Address Box */}
        <div className="flex items-center justify-center font-mono font-bold bg-white border border-slate-300 rounded px-3 py-1 min-w-[4rem] text-slate-800 shadow-xs">
          {activeCell.address}
        </div>

        {/* Cell Type Indicator */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 px-2 py-0.5 rounded bg-slate-200/70 border border-slate-300/60 font-medium">
          {currentCellObj?.isCalculated ? (
            <span className="text-amber-800 font-bold flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-amber-600" /> Formula / Locked
            </span>
          ) : currentCellObj?.personnelId ? (
            <span className="text-blue-700 font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-600" /> PAIS Database Field
            </span>
          ) : (
            <span>{activeFieldType}</span>
          )}
        </div>

        {/* Formula Input / Display */}
        <div className="flex-1 flex items-center bg-white border border-slate-300 rounded px-2.5 py-1 shadow-xs">
          <span className="font-mono text-slate-400 font-bold mr-2 text-[11px] select-none">fx</span>
          {isEditing ? (
            <input
              ref={cellInputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitCellEdit}
              className="w-full bg-transparent font-mono text-xs focus:outline-none text-slate-900"
            />
          ) : (
            <div className="w-full font-mono text-xs text-slate-700 truncate">
              {currentCellObj?.f ? `=${currentCellObj.f}` : currentCellObj?.v !== undefined ? String(currentCellObj.v) : ''}
            </div>
          )}
        </div>

        {/* Optional Search Controls */}
        {searchOpen && (
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-0.5 shadow-xs">
            <input
              type="text"
              placeholder="Find..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-24 sm:w-36 text-xs focus:outline-none"
            />
            {searchMatches.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                {currentMatchIndex + 1}/{searchMatches.length}
              </span>
            )}
            <button onClick={prevMatch} className="p-0.5 hover:bg-slate-100 rounded text-slate-600">
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button onClick={nextMatch} className="p-0.5 hover:bg-slate-100 rounded text-slate-600">
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* 3. NOTIFICATION BANNERS */}
      {message && (
        <div className="flex items-center gap-2 bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-xs text-emerald-800 font-semibold animate-fade-in">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border-b border-red-200 px-4 py-1.5 text-xs text-red-800 font-semibold">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. MAIN EXCEL SPREADSHEET GRID */}
      <div
        ref={gridContainerRef}
        className="flex-1 overflow-auto bg-[#f8f9fa] relative border-collapse select-none"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center gap-3 text-sm font-semibold text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
            Loading worksheet &quot;{sheets.find(s => s.id === activeSheetId)?.name}&quot;...
          </div>
        ) : !sheetData ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Select a worksheet tab below
          </div>
        ) : (
          <table className="border-collapse table-fixed bg-white">
            {/* Table Column Width Definitions */}
            <colgroup>
              <col style={{ width: '48px' }} /> {/* Row Number header column */}
              {Array.from({ length: sheetData.colCount }).map((_, cIdx) => {
                const colNum = cIdx + 1;
                const colConf = sheetData.columnConfig[colNum];
                if (colConf?.hidden) return null;
                const pxWidth = colConf?.width ? Math.max(48, Math.round(colConf.width * 8.5 + 10)) : 80;
                return <col key={colNum} style={{ width: `${pxWidth}px` }} />;
              })}
            </colgroup>

            {/* Column Header Row (A, B, C...) */}
            <thead className={freezePanes ? 'sticky top-0 z-20 bg-[#f1f3f4]' : 'bg-[#f1f3f4]'}>
              <tr className="border-b border-slate-300">
                {/* Top-left corner cell */}
                <th className={`border-r border-slate-300 bg-[#e1e3e5] p-0 text-center font-bold text-[10px] text-slate-600 ${freezePanes ? 'sticky left-0 z-30' : ''}`}>
                  ◢
                </th>
                {Array.from({ length: sheetData.colCount }).map((_, cIdx) => {
                  const colNum = cIdx + 1;
                  const colConf = sheetData.columnConfig[colNum];
                  if (colConf?.hidden) return null;
                  const letter = colNumToLetter(colNum);
                  const isFiltered = !!columnFilters[colNum];

                  return (
                    <th
                      key={colNum}
                      className="border-r border-slate-300 bg-[#f1f3f4] px-1 py-1 text-center font-semibold text-xs text-slate-600 hover:bg-[#e4e7eb] transition relative group"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{letter}</span>
                        {isFiltered && <Filter className="h-2.5 w-2.5 text-blue-600" />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {visibleRows.map(rNum => {
                const rowConf = sheetData.rowConfig[rNum];
                const rowPxHeight = rowConf?.height ? Math.max(22, Math.round(rowConf.height * 1.33)) : 24;

                return (
                  <tr key={rNum} style={{ height: `${rowPxHeight}px` }} className="border-b border-slate-200">
                    {/* Row Header Number (1, 2, 3...) */}
                    <td
                      className={`border-r border-slate-300 bg-[#f1f3f4] text-center font-medium text-[11px] text-slate-500 select-none ${
                        freezePanes ? 'sticky left-0 z-10 bg-[#f1f3f4]' : ''
                      }`}
                    >
                      {rNum}
                    </td>

                    {/* Row Cells */}
                    {Array.from({ length: sheetData.colCount }).map((_, cIdx) => {
                      const colNum = cIdx + 1;
                      const colConf = sheetData.columnConfig[colNum];
                      if (colConf?.hidden) return null;

                      const letter = colNumToLetter(colNum);
                      const addr = `${letter}${rNum}`;

                      // Skip cells consumed by rowSpan/colSpan merges
                      if (hiddenMergeCells.has(addr)) return null;

                      const cell = sheetData.cells[addr];
                      const mergeInfo = mergeMap.get(addr);
                      const isSelected = activeCell.address === addr;
                      const isMatchedSearch = searchMatches.includes(addr);
                      const isCurrentMatch = searchMatches[currentMatchIndex] === addr;
                      const isUnsaved = unsavedChanges.has(addr);

                      // Style resolution
                      const s = cell?.s || {};
                      const style: React.CSSProperties = {
                        fontWeight: s.b ? 'bold' : 'normal',
                        fontStyle: s.i ? 'italic' : 'normal',
                        fontSize: s.sz ? `${Math.max(10, Math.min(14, s.sz))}px` : '11px',
                        textAlign: s.ah || 'left',
                        verticalAlign: s.av === 'top' ? 'top' : s.av === 'bottom' ? 'bottom' : 'middle',
                        whiteSpace: s.wrap ? 'normal' : 'nowrap',
                        backgroundColor: isCurrentMatch
                          ? '#fde047'
                          : isMatchedSearch
                            ? '#fef08a'
                            : isUnsaved
                              ? '#fef3c7'
                              : s.bg
                                ? `#${s.bg.slice(-6)}`
                                : undefined,
                        color: s.c ? `#${s.c.slice(-6)}` : undefined
                      };

                      return (
                        <td
                          key={addr}
                          rowSpan={mergeInfo?.rowSpan}
                          colSpan={mergeInfo?.colSpan}
                          style={style}
                          onClick={() => handleCellClick(rNum, colNum, addr)}
                          onDoubleClick={() => handleCellDoubleClick(rNum, colNum, addr)}
                          className={`border-r border-b border-slate-200 px-1.5 py-0.5 overflow-hidden text-ellipsis cursor-cell transition-colors relative ${
                            isSelected
                              ? 'outline-2 outline-blue-600 outline-offset-[-2px] z-10 bg-blue-50/20'
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          {isSelected && isEditing ? (
                            activeFieldType === 'Rank Dropdown' ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={commitCellEdit}
                                className="w-full bg-white border border-blue-600 rounded px-1 py-0.5 text-xs font-bold"
                              >
                                {ALL_RANKS.map(r => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            ) : activeFieldType === 'Gender Dropdown' ? (
                              <select
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={commitCellEdit}
                                className="w-full bg-white border border-blue-600 rounded px-1 py-0.5 text-xs"
                              >
                                {GENDERS.map(g => (
                                  <option key={g} value={g}>
                                    {g}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={commitCellEdit}
                                className="w-full bg-white border border-blue-600 rounded px-1 py-0.5 text-xs font-mono"
                              />
                            )
                          ) : (
                            <span className="block truncate">
                              {cell?.v !== null && cell?.v !== undefined ? String(cell.v) : ''}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. BOTTOM EXCEL-STYLE WORKSHEET TAB BAR */}
      <div className="flex items-center border-t border-slate-300 bg-[#e1e3e5] px-2 py-1 gap-1 text-xs">
        {/* Left/Right Tab Scroll Buttons */}
        <button
          onClick={() => tabScrollRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
          className="rounded p-1 hover:bg-slate-300 text-slate-700 transition"
          title="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => tabScrollRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
          className="rounded p-1 hover:bg-slate-300 text-slate-700 transition"
          title="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Scrollable 13-Tab Strip */}
        <div
          ref={tabScrollRef}
          className="flex-1 flex items-center overflow-x-auto no-scrollbar gap-1 py-0.5"
        >
          {sheets.map(s => {
            const isActive = s.id === activeSheetId;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (activeSheetId !== s.id) {
                    if (unsavedChanges.size > 0) {
                      if (window.confirm('You have unsaved changes on this worksheet. Discard them and switch tabs?')) {
                        setUnsavedChanges(new Map());
                        setActiveSheetId(s.id);
                      }
                    } else {
                      setActiveSheetId(s.id);
                    }
                  }
                }}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-t-lg font-semibold text-xs transition border-t-2 ${
                  isActive
                    ? 'bg-white border-blue-700 text-blue-900 shadow-sm'
                    : 'bg-[#d2d5d8] border-transparent text-slate-700 hover:bg-[#dfe2e5]'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Total Tabs Count */}
        <div className="text-[11px] font-semibold text-slate-500 px-2 font-mono">
          {sheets.findIndex(s => s.id === activeSheetId) + 1} / {sheets.length}
        </div>
      </div>

      {/* Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => loadActiveSheet(activeSheetId)}
      />

      {/* Audit Trail Drawer */}
      <WorksheetAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />
    </div>
  );
};
