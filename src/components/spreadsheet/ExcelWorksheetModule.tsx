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
  Sparkles,
  Check,
  Calculator,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter
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

export function formatCellValue(cell: WorksheetCell | undefined | null): string {
  if (!cell) return '';
  const val = cell.v;
  if (val === null || val === undefined) {
    if (cell.res !== null && cell.res !== undefined) return String(cell.res);
    return '';
  }
  if (typeof val === 'object') {
    if (val.result !== undefined && val.result !== null) {
      if (typeof val.result === 'object' && val.result?.error) return String(val.result.error);
      return String(val.result);
    }
    if (val.text !== undefined && val.text !== null) return String(val.text);
    if (Array.isArray(val.richText)) return val.richText.map((t: any) => t.text || '').join('');
    if (val.error) return String(val.error);
    if (cell.res !== null && cell.res !== undefined) return String(cell.res);
    return '';
  }
  return String(val);
}

export function getFormulaBarDisplay(cell: WorksheetCell | undefined | null): string {
  if (!cell) return '';
  if (cell.f) return `=${cell.f}`;
  const val = cell.v;
  if (typeof val === 'object' && val !== null) {
    if (val.formula) return `=${val.formula}`;
    if (val.sharedFormula) return `=${val.sharedFormula}`;
    if (val.result !== undefined && val.result !== null) return String(val.result);
  }
  return val !== undefined && val !== null ? String(val) : '';
}

export const ExcelWorksheetModule: React.FC = () => {
  const { role } = useAuthRole();
  const canEdit = true; // Interactive worksheets are always editable for logged-in users

  // Worksheets navigation
  const [sheets, setSheets] = useState<WorksheetSummary[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [sheetData, setSheetData] = useState<WorksheetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [wakingUp, setWakingUp] = useState(false); // true while auto-retrying on Render cold start

  // Active cell & editing
  const [activeCell, setActiveCell] = useState<{ row: number; col: number; address: string }>({
    row: 1,
    col: 1,
    address: 'A1'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [formulaInputValue, setFormulaInputValue] = useState('');

  // Range Selection
  const [selectionRange, setSelectionRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);

  // Column & Row Interactive Resizing
  const [customColWidths, setCustomColWidths] = useState<Record<number, number>>({});
  const [customRowHeights, setCustomRowHeights] = useState<Record<number, number>>({});
  const resizingColRef = useRef<{ col: number; startX: number; startW: number } | null>(null);
  const resizingRowRef = useRef<{ row: number; startY: number; startH: number } | null>(null);

  // Unsaved changes & Undo/Redo
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, { oldValue: any; newValue: any; style?: any }>>(new Map());
  const [undoStack, setUndoStack] = useState<Array<{ sheetId: string; address: string; oldValue: any; newValue: any; oldStyle?: any; newStyle?: any }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ sheetId: string; address: string; oldValue: any; newValue: any; oldStyle?: any; newStyle?: any }>>([]);

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
  const inCellInputRef = useRef<HTMLInputElement>(null);
  const formulaBarInputRef = useRef<HTMLInputElement>(null);

  // Sync formula bar input whenever active cell changes and not actively editing
  useEffect(() => {
    if (!isEditing && sheetData) {
      const cell = sheetData.cells[activeCell.address];
      setFormulaInputValue(getFormulaBarDisplay(cell));
    }
  }, [activeCell.address, sheetData, isEditing]);

  // Load worksheet list
  const loadSummaries = useCallback(async () => {
    try {
      setError('');
      setWakingUp(false);
      const res = await fetchWorksheetSummariesApi((attempt, delayMs) => {
        // Show "waking up" UI instead of an error while auto-retrying
        setWakingUp(true);
        console.log(`[WorksheetModule] Backend cold-start retry ${attempt}, waiting ${delayMs}ms...`);
      });
      setWakingUp(false);
      setSheets(res);
      if (res.length > 0) {
        setActiveSheetId(prev => prev || res[0].id);
      }
    } catch (err: any) {
      setWakingUp(false);
      setError(err.message || 'Failed to load worksheets');
    }
  }, []);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  // Load single worksheet details
  const loadActiveSheet = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    setWakingUp(false);
    try {
      const data = await fetchWorksheetDetailApi(id, (attempt, delayMs) => {
        setWakingUp(true);
        console.log(`[WorksheetModule] Backend cold-start retry ${attempt} for sheet ${id}, waiting ${delayMs}ms...`);
      });
      setWakingUp(false);
      setSheetData(data);
      // Reset active cell to A1 or top visible
      setActiveCell({ row: 1, col: 1, address: 'A1' });
      setIsEditing(false);
    } catch (err: any) {
      setWakingUp(false);
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

  // Check if a cell is within active multi-cell selection range
  const isCellInRange = useCallback((r: number, c: number): boolean => {
    if (!selectionRange) return false;
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  }, [selectionRange]);

  // Apply a cell change locally and stage for server saving
  const applyCellChange = (address: string, rawValue: string) => {
    if (!sheetData) return;
    const existingCell = sheetData.cells[address] || {};
    const currentVal = existingCell.v;
    let newVal: any = rawValue;
    let formula: string | undefined = undefined;

    if (rawValue.startsWith('=')) {
      formula = rawValue.slice(1).trim();
      newVal = rawValue;
    } else if (rawValue !== '' && !isNaN(Number(rawValue))) {
      newVal = Number(rawValue);
    }

    if (String(currentVal ?? '') === String(newVal ?? '')) {
      return;
    }

    const rowNum = parseAddress(address).row;
    const existingStyle = existingCell.s || {};
    const newStyle = {
      ...existingStyle,
      ah: existingStyle.ah || (rowNum <= 8 ? 'center' : undefined)
    };

    // Stage change
    setUnsavedChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(address);
      next.set(address, {
        oldValue: existing ? existing.oldValue : currentVal,
        newValue: newVal,
        style: existing?.style || newStyle
      });
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
            ...existingCell,
            v: newVal,
            res: newVal,
            f: formula || existingCell.f,
            s: newStyle
          }
        }
      };
    });

    // Record undo
    setUndoStack(prev => [...prev, {
      sheetId: activeSheetId,
      address,
      oldValue: currentVal,
      newValue: newVal,
      oldStyle: existingStyle,
      newStyle
    }]);
    setRedoStack([]);
  };

  // Apply horizontal or vertical alignment to current active cell
  const applyCellAlignment = (alignH?: 'left' | 'center' | 'right', alignV?: 'top' | 'middle' | 'bottom') => {
    if (!sheetData) return;
    const address = activeCell.address;
    const existingCell = sheetData.cells[address] || {};
    const existingStyle = existingCell.s || {};

    const newStyle: any = {
      ...existingStyle,
      ...(alignH ? { ah: alignH } : {}),
      ...(alignV ? { av: alignV } : {})
    };

    setSheetData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        cells: {
          ...prev.cells,
          [address]: {
            ...existingCell,
            s: newStyle
          }
        }
      };
    });

    setUnsavedChanges(prev => {
      const next = new Map(prev);
      const existingChange = next.get(address);
      next.set(address, {
        oldValue: existingChange?.oldValue ?? existingCell.v,
        newValue: existingChange?.newValue ?? existingCell.v,
        style: newStyle
      });
      return next;
    });

    setUndoStack(prev => [...prev, {
      sheetId: activeSheetId,
      address,
      oldValue: existingCell.v,
      newValue: existingCell.v,
      oldStyle: existingStyle,
      newStyle
    }]);
    setRedoStack([]);

    setMessage(`Applied ${alignH || alignV} justification to ${address}`);
    setTimeout(() => setMessage(''), 2000);
  };

  // Start in-cell edit
  const startInCellEdit = (initialText?: string) => {
    const cell = sheetData?.cells[activeCell.address];
    const initial = initialText !== undefined ? initialText : getFormulaBarDisplay(cell);
    setEditValue(initial);
    setFormulaInputValue(initial);
    setIsEditing(true);
    setTimeout(() => inCellInputRef.current?.focus(), 20);
  };

  // Commit in-cell edit
  const commitInCellEdit = (moveDown = false, moveRight = false) => {
    if (!isEditing) return;
    applyCellChange(activeCell.address, editValue);
    setIsEditing(false);

    if (moveDown) {
      const nextRow = Math.min((sheetData?.rowCount || 100), activeCell.row + 1);
      setActiveCell({ row: nextRow, col: activeCell.col, address: `${colNumToLetter(activeCell.col)}${nextRow}` });
    } else if (moveRight) {
      const nextCol = Math.min((sheetData?.colCount || 26), activeCell.col + 1);
      setActiveCell({ row: activeCell.row, col: nextCol, address: `${colNumToLetter(nextCol)}${activeCell.row}` });
    }
  };

  // Cancel in-cell edit
  const cancelInCellEdit = () => {
    setIsEditing(false);
    const cell = sheetData?.cells[activeCell.address];
    const original = getFormulaBarDisplay(cell);
    setEditValue(original);
    setFormulaInputValue(original);
  };

  // Commit edit initiated from formula bar
  const commitFormulaBarEdit = (moveDown = false) => {
    applyCellChange(activeCell.address, formulaInputValue);
    if (moveDown) {
      const nextRow = Math.min((sheetData?.rowCount || 100), activeCell.row + 1);
      setActiveCell({ row: nextRow, col: activeCell.col, address: `${colNumToLetter(activeCell.col)}${nextRow}` });
    }
  };

  // Cell Click Handler
  const handleCellClick = (row: number, col: number, address: string) => {
    if (isEditing && activeCell.address !== address) {
      commitInCellEdit();
    }
    setActiveCell({ row, col, address });
  };

  // Cell Double-Click to edit
  const handleCellDoubleClick = (row: number, col: number, address: string) => {
    setActiveCell({ row, col, address });
    startInCellEdit();
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
        oldValue: ch.oldValue,
        style: ch.style
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
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, last]);

    if (sheetData) {
      const existingCell = sheetData.cells[last.address] || {};
      const revertedCell = {
        ...existingCell,
        v: last.oldValue,
        res: last.oldValue,
        s: last.oldStyle || existingCell.s
      };

      setSheetData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cells: {
            ...prev.cells,
            [last.address]: revertedCell
          }
        };
      });

      setUnsavedChanges(prev => {
        const next = new Map(prev);
        next.delete(last.address);
        return next;
      });

      const parsed = parseAddress(last.address);
      setActiveCell({ ...parsed, address: last.address });
      setFormulaInputValue(getFormulaBarDisplay(revertedCell));
      setEditValue(String(last.oldValue ?? ''));
      setMessage(`Undid change on ${last.address}`);
      setTimeout(() => setMessage(''), 2000);
    }
  }, [undoStack, sheetData]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, next]);

    if (sheetData) {
      const existingCell = sheetData.cells[next.address] || {};
      const redoneCell = {
        ...existingCell,
        v: next.newValue,
        res: next.newValue,
        s: next.newStyle || existingCell.s
      };

      setSheetData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cells: {
            ...prev.cells,
            [next.address]: redoneCell
          }
        };
      });

      setUnsavedChanges(prev => {
        const nextMap = new Map(prev);
        nextMap.set(next.address, {
          oldValue: next.oldValue,
          newValue: next.newValue,
          style: next.newStyle
        });
        return nextMap;
      });

      const parsed = parseAddress(next.address);
      setActiveCell({ ...parsed, address: next.address });
      setFormulaInputValue(getFormulaBarDisplay(redoneCell));
      setEditValue(String(next.newValue ?? ''));
      setMessage(`Redid change on ${next.address}`);
      setTimeout(() => setMessage(''), 2000);
    }
  }, [redoStack, sheetData]);

  // Copy cell or range to TSV clipboard
  const handleCopy = useCallback(() => {
    if (!sheetData) return;

    if (selectionRange) {
      const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
      const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
      const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
      const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

      const rows: string[] = [];
      for (let r = minR; r <= maxR; r++) {
        const rowCells: string[] = [];
        for (let c = minC; c <= maxC; c++) {
          const addr = `${colNumToLetter(c)}${r}`;
          const cell = sheetData.cells[addr];
          const text = cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '';
          rowCells.push(text);
        }
        rows.push(rowCells.join('\t'));
      }
      const tsv = rows.join('\n');
      navigator.clipboard.writeText(tsv);
      setMessage(`Copied range (${colNumToLetter(minC)}${minR}:${colNumToLetter(maxC)}${maxR}) to clipboard`);
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const cell = sheetData.cells[activeCell.address];
    const text = cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '';
    navigator.clipboard.writeText(text);
    setMessage(`Copied "${text}" to clipboard`);
    setTimeout(() => setMessage(''), 2000);
  }, [sheetData, selectionRange, activeCell.address]);

  // Cut cell or range to TSV clipboard
  const handleCut = useCallback(() => {
    if (!sheetData || !canEdit) return;
    handleCopy();

    if (selectionRange) {
      const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
      const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
      const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
      const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const addr = `${colNumToLetter(c)}${r}`;
          applyCellChange(addr, '');
        }
      }
      setMessage(`Cut selected range to clipboard`);
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    applyCellChange(activeCell.address, '');
    setFormulaInputValue('');
    setMessage(`Cut ${activeCell.address} to clipboard`);
    setTimeout(() => setMessage(''), 2000);
  }, [sheetData, canEdit, handleCopy, selectionRange, activeCell.address]);

  // Paste TSV clipboard to cells (compatible with Excel & Google Sheets)
  const handlePaste = useCallback(async () => {
    if (!canEdit || !sheetData) return;
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText) return;

      const rows = clipText.split(/\r?\n/).map(r => r.split('\t'));
      const startRow = selectionRange ? Math.min(selectionRange.startRow, selectionRange.endRow) : activeCell.row;
      const startCol = selectionRange ? Math.min(selectionRange.startCol, selectionRange.endCol) : activeCell.col;

      const newCells = { ...sheetData.cells };
      const updates: Array<{ address: string; value: any; oldValue: any }> = [];

      rows.forEach((rowVals, rIdx) => {
        if (rIdx === rows.length - 1 && rowVals.length === 1 && rowVals[0] === '') return;
        rowVals.forEach((val, cIdx) => {
          const targetRow = startRow + rIdx;
          const targetCol = startCol + cIdx;
          const targetAddr = `${colNumToLetter(targetCol)}${targetRow}`;
          const currentVal = newCells[targetAddr]?.v;

          newCells[targetAddr] = {
            ...newCells[targetAddr],
            v: val,
            res: val
          };

          updates.push({ address: targetAddr, value: val, oldValue: currentVal });
          setUndoStack(prev => [...prev, { sheetId: activeSheetId, address: targetAddr, oldValue: currentVal, newValue: val }]);
        });
      });

      setSheetData({ ...sheetData, cells: newCells });
      setUnsavedChanges(prev => {
        const next = new Map(prev);
        updates.forEach(u => next.set(u.address, { oldValue: u.oldValue, newValue: u.value }));
        return next;
      });

      setMessage(`Pasted ${updates.length} cell(s) preserving row/column layout`);
      setTimeout(() => setMessage(''), 2500);
    } catch (e: any) {
      setError('Unable to paste: ' + e.message);
    }
  }, [canEdit, sheetData, selectionRange, activeCell.row, activeCell.col, activeSheetId]);

  // Global window keyboard shortcuts for Ctrl+Z, Ctrl+Y, Ctrl+X, Ctrl+C, Ctrl+V
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' &&
          document.activeElement !== inCellInputRef.current &&
          document.activeElement !== formulaBarInputRef.current) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (k === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (k === 'x' && !isEditing) {
          e.preventDefault();
          handleCut();
        } else if (k === 'c' && !isEditing) {
          e.preventDefault();
          handleCopy();
        } else if (k === 'v' && !isEditing) {
          e.preventDefault();
          handlePaste();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleUndo, handleRedo, handleCut, handleCopy, handlePaste, isEditing]);

  // Column interactive resize mousedown
  const handleColumnResizeStart = (colNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentW = customColWidths[colNum] || (sheetData?.columnConfig[colNum]?.width ? Math.round(sheetData.columnConfig[colNum].width * 8.5) : 80);
    resizingColRef.current = { col: colNum, startX: e.clientX, startW: currentW };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const diff = moveEvent.clientX - resizingColRef.current.startX;
      const newW = Math.max(32, resizingColRef.current.startW + diff);
      setCustomColWidths(prev => ({ ...prev, [resizingColRef.current!.col]: newW }));
    };

    const onMouseUp = () => {
      resizingColRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Row interactive resize mousedown
  const handleRowResizeStart = (rNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentH = customRowHeights[rNum] || (sheetData?.rowConfig[rNum]?.height ? Math.max(22, Math.round(sheetData.rowConfig[rNum].height * 1.33)) : 24);
    resizingRowRef.current = { row: rNum, startY: e.clientY, startH: currentH };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRowRef.current) return;
      const diff = moveEvent.clientY - resizingRowRef.current.startY;
      const newH = Math.max(18, resizingRowRef.current.startH + diff);
      setCustomRowHeights(prev => ({ ...prev, [resizingRowRef.current!.row]: newH }));
    };

    const onMouseUp = () => {
      resizingRowRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Select entire row by clicking row number
  const handleRowHeaderClick = (rNum: number) => {
    if (!sheetData) return;
    setSelectionRange({
      startRow: rNum,
      startCol: 1,
      endRow: rNum,
      endCol: sheetData.colCount
    });
    setActiveCell({ row: rNum, col: 1, address: `A${rNum}` });
  };

  // Select entire column by clicking column letter
  const handleColHeaderClick = (colNum: number) => {
    if (!sheetData) return;
    setSelectionRange({
      startRow: 1,
      startCol: colNum,
      endRow: sheetData.rowCount,
      endCol: colNum
    });
    setActiveCell({ row: 1, col: colNum, address: `${colNumToLetter(colNum)}1` });
  };

  // Cell mouse interactions for Drag-to-Select
  const handleCellMouseDown = (r: number, c: number, addr: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey && activeCell) {
      setSelectionRange({
        startRow: activeCell.row,
        startCol: activeCell.col,
        endRow: r,
        endCol: c
      });
      return;
    }
    handleCellClick(r, c, addr);
    setIsDraggingRange(true);
    setSelectionRange({ startRow: r, startCol: c, endRow: r, endCol: c });
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (!isDraggingRange) return;
    setSelectionRange(prev => prev ? { ...prev, endRow: r, endCol: c } : null);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingRange(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Keyboard navigation & Shortcuts inside container
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitInCellEdit(true);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitInCellEdit(false, true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelInCellEdit();
      }
      return;
    }

    // Ctrl shortcuts
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'x') {
        e.preventDefault();
        handleCut();
        return;
      }
      if (k === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }
      if (k === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (k === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if (k === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
    }

    // Enter or F2 starts editing
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      startInCellEdit();
      return;
    }

    // Delete or Backspace clears cell or range
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectionRange) {
        const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
        const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
        const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
        const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            applyCellChange(`${colNumToLetter(c)}${r}`, '');
          }
        }
      } else {
        applyCellChange(activeCell.address, '');
      }
      setFormulaInputValue('');
      return;
    }

    const maxRow = sheetData?.rowCount || 100;
    const maxCol = sheetData?.colCount || 26;

    // Shift + Arrow Range Selection
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const currentRange = selectionRange || {
        startRow: activeCell.row,
        startCol: activeCell.col,
        endRow: activeCell.row,
        endCol: activeCell.col
      };
      let newEndRow = currentRange.endRow;
      let newEndCol = currentRange.endCol;
      if (e.key === 'ArrowUp') newEndRow = Math.max(1, newEndRow - 1);
      if (e.key === 'ArrowDown') newEndRow = Math.min(maxRow, newEndRow + 1);
      if (e.key === 'ArrowLeft') newEndCol = Math.max(1, newEndCol - 1);
      if (e.key === 'ArrowRight') newEndCol = Math.min(maxCol, newEndCol + 1);
      setSelectionRange({
        ...currentRange,
        endRow: newEndRow,
        endCol: newEndCol
      });
      return;
    }

    // Single printable character starts editing immediately with that character
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      setSelectionRange(null);
      startInCellEdit(e.key);
      return;
    }

    // Arrows & Tab Navigation
    let { row, col } = activeCell;

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
    } else {
      return;
    }

    setSelectionRange(null);
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
      <div className="flex flex-wrap items-center justify-between border-b border-slate-300 bg-white px-3 py-1.5 gap-2 text-xs dark:bg-[#131f2e] dark:border-slate-800">
        {/* Left Section: Edit & Clipboard actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Redo</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1 dark:bg-slate-700" />

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Copy (Ctrl+C)"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button
            onClick={handleCut}
            disabled={!canEdit}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Cut (Ctrl+X)"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cut</span>
          </button>
          <button
            onClick={handlePaste}
            disabled={!canEdit}
            className="flex items-center gap-1 rounded px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Paste (Ctrl+V)"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Paste</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1 dark:bg-slate-700" />

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`flex items-center gap-1 rounded px-2 py-1 ${searchOpen ? 'bg-blue-100 text-blue-800 font-semibold dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
            title="Find in sheet"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setFreezePanes(!freezePanes)}
            className={`flex items-center gap-1 rounded px-2 py-1 ${freezePanes ? 'bg-slate-200 font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'}`}
            title="Toggle Freeze Panes"
          >
            <Pin className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Freeze</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1 dark:bg-slate-700" />

          {/* Justification / Text Alignment Button Group */}
          <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-800/90 p-0.5 rounded-md border border-slate-300 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => applyCellAlignment('left')}
              className={`p-1 rounded transition ${
                currentCellObj?.s?.ah === 'left' || (!currentCellObj?.s?.ah && activeCell.row > 8)
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/60'
              }`}
              title="Align Left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyCellAlignment('center')}
              className={`p-1 rounded transition ${
                currentCellObj?.s?.ah === 'center' || (!currentCellObj?.s?.ah && activeCell.row <= 8)
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/60'
              }`}
              title="Align Center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyCellAlignment('right')}
              className={`p-1 rounded transition ${
                currentCellObj?.s?.ah === 'right'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/60'
              }`}
              title="Align Right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <div className="h-3.5 w-[1px] bg-slate-300 dark:bg-slate-600 mx-0.5" />
            <button
              type="button"
              onClick={() => applyCellAlignment(undefined, 'middle')}
              className={`p-1 rounded transition ${
                currentCellObj?.s?.av === 'middle' || !currentCellObj?.s?.av
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-sky-300 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/60'
              }`}
              title="Align Middle (Vertical)"
            >
              <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right Section: Import / Export, Audit, and Save Changes */}
        <div className="flex items-center gap-2">
          {unsavedChanges.size > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-amber-800 animate-pulse dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300">
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
                className="text-slate-500 hover:text-slate-800 px-1 dark:text-slate-400 dark:hover:text-slate-200"
                title="Discard changes"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition dark:bg-[#162537] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Import from Excel file"
          >
            <Upload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Import</span>
          </button>

          <button
            onClick={() => handleExport(false)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition dark:bg-[#162537] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Export all 5 sheets to Excel (.xlsx)"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setIsAuditDrawerOpen(true)}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 transition dark:bg-[#162537] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Worksheet Audit Log"
          >
            <History className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden lg:inline">Audit Trail</span>
          </button>
        </div>
      </div>

      {/* 2. FORMULA BAR & SEARCH DRAWER */}
      <div className="flex items-center border-b border-slate-300 bg-slate-50 px-3 py-1.5 gap-2 text-xs dark:bg-[#0f1926] dark:border-slate-800">
        {/* Cell Address Box */}
        <div className="flex items-center justify-center font-mono font-bold bg-white border border-slate-300 rounded px-3 py-1 min-w-[4rem] text-slate-800 shadow-xs dark:bg-[#162537] dark:border-slate-700 dark:text-sky-300">
          {activeCell.address}
        </div>

        {/* Cell Type Indicator */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 px-2 py-0.5 rounded bg-slate-200/70 border border-slate-300/60 font-medium dark:bg-slate-800/80 dark:border-slate-700/60 dark:text-slate-300">
          {currentCellObj?.isCalculated ? (
            <span className="text-amber-800 font-bold flex items-center gap-1 dark:text-amber-400">
              <ShieldAlert className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Formula / Locked
            </span>
          ) : currentCellObj?.personnelId ? (
            <span className="text-blue-700 font-semibold flex items-center gap-1 dark:text-blue-400">
              <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" /> PAIS Database Field
            </span>
          ) : (
            <span>{activeFieldType}</span>
          )}
        </div>

        {/* Formula Input / Display */}
        <div className="flex-1 flex items-center bg-white border border-slate-300 rounded px-2.5 py-1 shadow-xs dark:bg-[#162537] dark:border-slate-700">
          <span className="font-mono text-slate-400 font-bold mr-2 text-[11px] select-none dark:text-slate-500">fx</span>
          <input
            ref={formulaBarInputRef}
            type="text"
            value={isEditing ? editValue : formulaInputValue}
            onChange={e => {
              if (isEditing) {
                setEditValue(e.target.value);
              }
              setFormulaInputValue(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (isEditing) {
                  commitInCellEdit(true);
                } else {
                  commitFormulaBarEdit(true);
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                if (isEditing) {
                  cancelInCellEdit();
                } else {
                  setFormulaInputValue(getFormulaBarDisplay(currentCellObj));
                }
              }
            }}
            onBlur={() => {
              if (isEditing) {
                commitInCellEdit(false);
              } else if (formulaInputValue !== getFormulaBarDisplay(currentCellObj)) {
                commitFormulaBarEdit(false);
              }
            }}
            placeholder="Enter value or formula (e.g. =SUM(A1:A10))"
            className="w-full bg-transparent font-mono text-xs focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                commitInCellEdit(false);
              } else {
                commitFormulaBarEdit(false);
              }
            }}
            title="Commit changes (Enter)"
            className="p-0.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 ml-1 transition"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Optional Search Controls */}
        {searchOpen && (
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-0.5 shadow-xs dark:bg-[#162537] dark:border-slate-700">
            <input
              type="text"
              placeholder="Find..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              className="w-24 sm:w-36 text-xs focus:outline-none bg-transparent dark:text-slate-100"
            />
            {searchMatches.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono dark:text-slate-400">
                {currentMatchIndex + 1}/{searchMatches.length}
              </span>
            )}
            <button onClick={prevMatch} className="p-0.5 hover:bg-slate-100 rounded text-slate-600 dark:hover:bg-slate-800 dark:text-slate-300">
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button onClick={nextMatch} className="p-0.5 hover:bg-slate-100 rounded text-slate-600 dark:hover:bg-slate-800 dark:text-slate-300">
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
      {wakingUp && !error && (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-800 font-semibold">
          <Loader2 className="h-3.5 w-3.5 text-amber-600 animate-spin shrink-0" />
          <span>Connecting to server — backend is waking up, please wait a moment…</span>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border-b border-red-200 px-4 py-1.5 text-xs text-red-800 font-semibold dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => {
              setError('');
              if (sheets.length === 0) {
                loadSummaries();
              } else if (activeSheetId) {
                loadActiveSheet(activeSheetId);
              }
            }}
            className="flex items-center gap-1 rounded bg-red-100 hover:bg-red-200 dark:bg-red-900/60 dark:hover:bg-red-800/80 px-2 py-0.5 text-[11px] font-bold text-red-900 dark:text-red-200 transition cursor-pointer shrink-0 ml-2"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Retry Connection</span>
          </button>
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
            {wakingUp
              ? 'Backend server is waking up — this may take up to 60 seconds on first load…'
              : `Loading worksheet "${sheets.find(s => s.id === activeSheetId)?.name}"...`}
          </div>
        ) : !sheetData && wakingUp ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <div className="text-center">
              <p className="font-semibold text-slate-700">Connecting to backend server…</p>
              <p className="text-xs text-slate-500 mt-1">The server was sleeping. It's waking up now — please wait.</p>
            </div>
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
                const pxWidth = customColWidths[colNum] || (colConf?.width ? Math.max(48, Math.round(colConf.width * 8.5 + 10)) : 80);
                return <col key={colNum} style={{ width: `${pxWidth}px` }} />;
              })}
            </colgroup>

            {/* Column Header Row (A, B, C...) */}
            <thead className={freezePanes ? 'sticky top-0 z-20 bg-[#f1f3f4] dark:bg-[#142232]' : 'bg-[#f1f3f4] dark:bg-[#142232]'}>
              <tr className="border-b border-slate-300 dark:border-slate-800">
                {/* Top-left corner cell */}
                <th
                  onClick={() => {
                    if (!sheetData) return;
                    setSelectionRange({
                      startRow: 1,
                      startCol: 1,
                      endRow: sheetData.rowCount,
                      endCol: sheetData.colCount
                    });
                  }}
                  className={`border-r border-slate-300 bg-[#e1e3e5] p-0 text-center font-bold text-[10px] text-slate-600 hover:bg-blue-100 hover:text-blue-700 cursor-pointer transition dark:bg-[#192a3e] dark:border-slate-800 dark:text-slate-400 dark:hover:bg-blue-900/60 ${freezePanes ? 'sticky left-0 z-30' : ''}`}
                  title="Select Entire Worksheet"
                >
                  ◢
                </th>
                {Array.from({ length: sheetData.colCount }).map((_, cIdx) => {
                  const colNum = cIdx + 1;
                  const colConf = sheetData.columnConfig[colNum];
                  if (colConf?.hidden) return null;
                  const letter = colNumToLetter(colNum);
                  const isFiltered = !!columnFilters[colNum];
                  const isColSelected = selectionRange &&
                    colNum >= Math.min(selectionRange.startCol, selectionRange.endCol) &&
                    colNum <= Math.max(selectionRange.startCol, selectionRange.endCol) &&
                    selectionRange.startRow === 1 &&
                    selectionRange.endRow === sheetData.rowCount;

                  return (
                    <th
                      key={colNum}
                      onClick={() => handleColHeaderClick(colNum)}
                      className={`border-r border-slate-300 px-1 py-1 text-center font-semibold text-xs transition relative group cursor-pointer select-none dark:border-slate-800 ${
                        isColSelected
                          ? 'bg-blue-200 text-blue-900 dark:bg-blue-900/70 dark:text-sky-200 font-bold'
                          : 'bg-[#f1f3f4] text-slate-600 hover:bg-[#e4e7eb] dark:bg-[#142232] dark:text-slate-400 dark:hover:bg-[#1b2d42]'
                      }`}
                      title={`Select Column ${letter} (Drag right border to resize)`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{letter}</span>
                        {isFiltered && <Filter className="h-2.5 w-2.5 text-blue-600" />}
                      </div>
                      {/* Column Resize Handle */}
                      <div
                        onMouseDown={e => handleColumnResizeStart(colNum, e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Drag to resize column"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {visibleRows.map(rNum => {
                const rowConf = sheetData.rowConfig[rNum];
                const rowPxHeight = customRowHeights[rNum] || (rowConf?.height ? Math.max(22, Math.round(rowConf.height * 1.33)) : 24);
                const isRowSelected = selectionRange &&
                  rNum >= Math.min(selectionRange.startRow, selectionRange.endRow) &&
                  rNum <= Math.max(selectionRange.startRow, selectionRange.endRow) &&
                  selectionRange.startCol === 1 &&
                  selectionRange.endCol === sheetData.colCount;

                return (
                  <tr key={rNum} style={{ height: `${rowPxHeight}px` }} className="border-b border-slate-200 dark:border-slate-800">
                    {/* Row Header Number (1, 2, 3...) */}
                    <td
                      onClick={() => handleRowHeaderClick(rNum)}
                      className={`border-r border-slate-300 text-center font-medium text-[11px] select-none cursor-pointer transition relative group dark:border-slate-800 ${
                        freezePanes ? 'sticky left-0 z-10' : ''
                      } ${
                        isRowSelected
                          ? 'bg-blue-200 text-blue-900 font-bold dark:bg-blue-900/70 dark:text-sky-200'
                          : 'bg-[#f1f3f4] text-slate-500 hover:bg-[#e4e7eb] dark:bg-[#142232] dark:text-slate-400 dark:hover:bg-[#1b2d42]'
                      }`}
                      title={`Select Row ${rNum} (Drag bottom border to resize)`}
                    >
                      {rNum}
                      {/* Row Resize Handle */}
                      <div
                        onMouseDown={e => handleRowResizeStart(rNum, e)}
                        className="absolute left-0 right-0 bottom-0 h-1.5 cursor-row-resize hover:bg-blue-500 active:bg-blue-600 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Drag to resize row"
                      />
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
                      const defaultAlign = rNum <= 8 ? 'center' : 'left';
                      const alignH = s.ah || defaultAlign;
                      const isDoubleBottom = s.br?.bottom === 'double' || s.br?.b === 'double';
                      const isThickBottom = s.br?.bottom === 'thick' || s.br?.bottom === 'medium';
                      const isThinTop = s.br?.top === 'thin' || s.br?.t === 'thin';
                      const inRange = isCellInRange(rNum, colNum);

                      const style: React.CSSProperties = {
                        fontWeight: s.b ? 'bold' : 'normal',
                        fontStyle: s.i ? 'italic' : 'normal',
                        textDecoration: s.u ? 'underline' : undefined,
                        fontFamily: s.fn ? `${s.fn}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` : undefined,
                        fontSize: s.sz ? `${Math.max(10, Math.min(14, s.sz))}px` : '11px',
                        textAlign: alignH,
                        verticalAlign: s.av === 'top' ? 'top' : s.av === 'bottom' ? 'bottom' : 'middle',
                        whiteSpace: s.wrap ? 'normal' : 'nowrap',
                        borderBottomStyle: isDoubleBottom ? 'double' : undefined,
                        borderBottomWidth: isDoubleBottom ? '3px' : isThickBottom ? '2px' : undefined,
                        borderTopWidth: isThinTop ? '1px' : undefined,
                        backgroundColor: isCurrentMatch
                          ? '#fde047'
                          : isMatchedSearch
                            ? '#fef08a'
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
                          onMouseDown={e => handleCellMouseDown(rNum, colNum, addr, e)}
                          onMouseEnter={() => handleCellMouseEnter(rNum, colNum)}
                          onDoubleClick={() => handleCellDoubleClick(rNum, colNum, addr)}
                          className={`border-r border-b border-slate-200 px-1.5 py-0.5 overflow-hidden text-ellipsis cursor-cell relative dark:border-slate-800 ${
                            isSelected
                              ? 'outline-2 outline-blue-600 outline-offset-[-2px] z-10 bg-blue-50/20 dark:outline-sky-400'
                              : inRange
                                ? 'bg-blue-500/15 dark:bg-sky-400/20 z-10'
                                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                          } ${
                            isUnsaved
                              ? 'bg-amber-100/90 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 ring-1 ring-inset ring-amber-400/80 dark:ring-amber-500/50'
                              : ''
                          }`}
                        >
                          {isSelected && isEditing ? (
                            activeFieldType === 'Rank Dropdown' ? (
                              <select
                                ref={inCellInputRef as any}
                                autoFocus
                                value={editValue}
                                onChange={e => {
                                  setEditValue(e.target.value);
                                  setFormulaInputValue(e.target.value);
                                }}
                                onBlur={() => commitInCellEdit()}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitInCellEdit(true);
                                  } else if (e.key === 'Tab') {
                                    e.preventDefault();
                                    commitInCellEdit(false, true);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelInCellEdit();
                                  }
                                }}
                                className="w-full bg-white dark:bg-[#162537] border-2 border-blue-600 dark:border-sky-400 text-slate-900 dark:text-slate-100 rounded px-1 py-0.5 text-xs font-bold focus:outline-none shadow-sm z-20"
                              >
                                {ALL_RANKS.map(r => (
                                  <option key={r} value={r} className="dark:bg-[#162537] dark:text-white">
                                    {r}
                                  </option>
                                ))}
                              </select>
                            ) : activeFieldType === 'Gender Dropdown' ? (
                              <select
                                ref={inCellInputRef as any}
                                autoFocus
                                value={editValue}
                                onChange={e => {
                                  setEditValue(e.target.value);
                                  setFormulaInputValue(e.target.value);
                                }}
                                onBlur={() => commitInCellEdit()}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitInCellEdit(true);
                                  } else if (e.key === 'Tab') {
                                    e.preventDefault();
                                    commitInCellEdit(false, true);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelInCellEdit();
                                  }
                                }}
                                className="w-full bg-white dark:bg-[#162537] border-2 border-blue-600 dark:border-sky-400 text-slate-900 dark:text-slate-100 rounded px-1 py-0.5 text-xs focus:outline-none shadow-sm z-20"
                              >
                                {GENDERS.map(g => (
                                  <option key={g} value={g} className="dark:bg-[#162537] dark:text-white">
                                    {g}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                ref={inCellInputRef}
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={e => {
                                  setEditValue(e.target.value);
                                  setFormulaInputValue(e.target.value);
                                }}
                                onBlur={() => commitInCellEdit()}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitInCellEdit(true);
                                  } else if (e.key === 'Tab') {
                                    e.preventDefault();
                                    commitInCellEdit(false, true);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelInCellEdit();
                                  }
                                }}
                                style={{
                                  textAlign: alignH,
                                  fontWeight: s.b ? 'bold' : 'normal',
                                  fontSize: s.sz ? `${Math.max(10, Math.min(14, s.sz))}px` : '11px'
                                }}
                                className="w-full bg-white dark:bg-[#162537] border-2 border-blue-600 dark:border-sky-400 text-slate-900 dark:text-slate-100 rounded px-1 py-0.5 text-xs font-mono focus:outline-none shadow-sm z-20"
                              />
                            )
                          ) : (
                            <span className="block truncate">
                              {formatCellValue(cell)}
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
      <div className="flex items-center border-t border-slate-300 bg-[#e1e3e5] px-2 py-1 gap-1 text-xs dark:bg-[#0b131e] dark:border-slate-800">
        {/* Left/Right Tab Scroll Buttons */}
        <button
          onClick={() => tabScrollRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
          className="rounded p-1 hover:bg-slate-300 text-slate-700 transition dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          title="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => tabScrollRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
          className="rounded p-1 hover:bg-slate-300 text-slate-700 transition dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          title="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Scrollable 5-Tab Strip */}
        <div
          ref={tabScrollRef}
          className="flex-1 flex items-center overflow-x-auto no-scrollbar gap-1 py-0.5"
        >
          {sheets.map((s, idx) => {
            const isActive = s.id === activeSheetId;
            return (
              <React.Fragment key={s.id}>
                {idx > 0 && <span className="text-slate-400 select-none text-[11px] px-0.5 dark:text-slate-600">|</span>}
                <button
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
                      ? 'bg-white border-emerald-600 text-slate-900 shadow-sm dark:bg-[#1b2b3d] dark:border-emerald-500 dark:text-emerald-200 dark:shadow-md'
                      : 'bg-[#d2d5d8] border-transparent text-slate-700 hover:bg-[#dfe2e5] dark:bg-[#101b27] dark:text-slate-300 dark:border-slate-800/60 dark:hover:bg-[#162536] dark:hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'border-b-2 border-emerald-600 pb-0.5 dark:border-emerald-400' : ''}>
                    {s.name}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Total Tabs Count */}
        <div className="text-[11px] font-semibold text-slate-500 px-2 font-mono dark:text-slate-400">
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
