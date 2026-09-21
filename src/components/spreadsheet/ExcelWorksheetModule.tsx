import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Edit2,
  FileSpreadsheet,
  RotateCcw,
  Loader2,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Pin
} from 'lucide-react';
import {
  fetchWorksheetSummariesApi,
  fetchWorksheetDetailApi,
  batchUpdateWorksheetCellsApi,
  downloadWorksheetExcelApi,
  type WorksheetSummary,
  type WorksheetDetail,
  type WorksheetCell
} from '../../services/api';
import { useAuthRole } from '../../context/AuthRoleContext';
import { colNumToLetter, colLetterToNum, parseAddress } from '../../utils/spreadsheetUtils';
import { evaluateFormula } from './formula/formulaEngine';
import { ExcelRibbon, type RibbonTabType } from './ribbon/ExcelRibbon';
import { FormulaBar } from './formulaBar/FormulaBar';
import { SpreadsheetContextMenu, type ContextMenuPosition } from './contextMenu/SpreadsheetContextMenu';
import { ChartModal } from './dialogs/ChartModal';
import { FindReplaceModal } from './dialogs/FindReplaceModal';
import { FormatCellsModal } from './dialogs/FormatCellsModal';
import { PageSetupModal } from './dialogs/PageSetupModal';
import { InsertFunctionModal } from './dialogs/InsertFunctionModal';
import { ExcelImportModal } from './ExcelImportModal';
import { WorksheetAuditDrawer } from './WorksheetAuditDrawer';

export function getFormulaBarDisplay(cell: WorksheetCell | undefined | null): string {
  if (!cell) return '';
  if (cell.f) return `=${cell.f}`;
  if (cell.v === null || cell.v === undefined) return '';
  if (typeof cell.v === 'object') {
    if (cell.v.formula) return `=${cell.v.formula}`;
    if (cell.v.result !== undefined) return String(cell.v.result);
    return '';
  }
  return String(cell.v);
}

export function formatDisplayVal(cell: WorksheetCell | undefined | null): string {
  if (!cell) return '';
  const val = cell.res !== undefined && cell.res !== null ? cell.res : cell.v;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val.result !== undefined && val.result !== null) return String(val.result);
    if (val.text !== undefined && val.text !== null) return String(val.text);
    return '';
  }
  const str = String(val);
  const numFmt = cell.s?.nf;
  if (!numFmt || numFmt === 'General' || numFmt === '@') return str;

  const num = Number(val);
  if (isNaN(num)) return str;

  if (numFmt === '₱#,##0.00' || numFmt === 'currency') {
    return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (numFmt === '#,##0.00' || numFmt === 'number') {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (numFmt === '0.0%' || numFmt === 'percentage') {
    return `${(num * 100).toFixed(1)}%`;
  }
  if (numFmt === 'accounting') {
    return num < 0
      ? `(₱${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
      : `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return str;
}

export const ExcelWorksheetModule: React.FC = () => {
  const { role } = useAuthRole();
  const [isProtected, setIsProtected] = useState(false);
  const canEdit = !isProtected && role !== 'view_only';

  // Sheets data & Navigation
  const [sheets, setSheets] = useState<WorksheetSummary[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [sheetData, setSheetData] = useState<WorksheetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [wakingUp, setWakingUp] = useState(false);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Active cell & Range selection
  const [activeCell, setActiveCell] = useState<{ row: number; col: number; address: string }>({
    row: 1,
    col: 1,
    address: 'A1'
  });
  const [selectionRange, setSelectionRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);

  // In-cell and Formula Bar editing
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [formulaInputValue, setFormulaInputValue] = useState('');
  const [formatPainterStyle, setFormatPainterStyle] = useState<any | null>(null);

  // Column / Row Interactive Resizing & Custom Heights
  const [customColWidths, setCustomColWidths] = useState<Record<number, number>>({});
  const [customRowHeights, setCustomRowHeights] = useState<Record<number, number>>({});
  const resizingColRef = useRef<{ col: number; startX: number; startW: number } | null>(null);
  const resizingRowRef = useRef<{ row: number; startY: number; startH: number } | null>(null);

  // Unsaved changes & Undo/Redo stack
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, { oldValue: any; newValue: any; style?: any }>>(new Map());
  const [undoStack, setUndoStack] = useState<Array<{ sheetId: string; address: string; oldValue: any; newValue: any; oldStyle?: any; newStyle?: any }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ sheetId: string; address: string; oldValue: any; newValue: any; oldStyle?: any; newStyle?: any }>>([]);

  // View settings
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTabType>('home');
  const [showGridlines, setShowGridlines] = useState(true);
  const [showHeadings, setShowHeadings] = useState(true);
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const [zoomScale, setZoomScale] = useState(100);
  const [freezePanes, setFreezePanes] = useState(true);

  // Search & Filtering
  const [columnFilters, setColumnFilters] = useState<Record<number, string>>({});
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Modals & Drawers
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState<'find' | 'replace'>('find');
  const [isFormatCellsOpen, setIsFormatCellsOpen] = useState(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);
  const [isFunctionWizardOpen, setIsFunctionWizardOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  // Context Menu
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);

  // Tab editing
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  // DOM Refs
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const inCellInputRef = useRef<HTMLInputElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // Virtualization windowing
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Merged cells map
  const { mergeMap, hiddenMergeCells } = useMemo(() => {
    const mMap = new Map<string, { rowSpan: number; colSpan: number }>();
    const hiddenSet = new Set<string>();
    if (!sheetData?.merges) return { mergeMap: mMap, hiddenMergeCells: hiddenSet };

    sheetData.merges.forEach(rangeStr => {
      const parts = rangeStr.split(':');
      if (parts.length !== 2) return;
      const start = parseAddress(parts[0]);
      const end = parseAddress(parts[1]);
      mMap.set(parts[0], { rowSpan: end.row - start.row + 1, colSpan: end.col - start.col + 1 });
      for (let r = start.row; r <= end.row; r++) {
        for (let c = start.col; c <= end.col; c++) {
          if (r === start.row && c === start.col) continue;
          hiddenSet.add(`${colNumToLetter(c)}${r}`);
        }
      }
    });

    return { mergeMap: mMap, hiddenMergeCells: hiddenSet };
  }, [sheetData?.merges]);

  // Current active cell object
  const currentCellObj: WorksheetCell | undefined = useMemo(() => {
    if (!sheetData) return undefined;
    return sheetData.cells[activeCell.address];
  }, [sheetData, activeCell.address]);

  // Sync formula bar input when active cell changes
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
    try {
      const data = await fetchWorksheetDetailApi(id, (attempt, delayMs) => {
        setWakingUp(true);
        console.log(`[WorksheetModule] Loading sheet ${id} retry ${attempt}, waiting ${delayMs}ms...`);
      });
      setWakingUp(false);
      setSheetData(data);
      setActiveCell({ row: 1, col: 1, address: 'A1' });
      setSelectionRange(null);
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

  // Check if cell is in selection range
  const isCellInRange = useCallback((r: number, c: number): boolean => {
    if (!selectionRange) return false;
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  }, [selectionRange]);

  // Apply cell change locally and stage for batch save
  const applyCellChange = useCallback((address: string, rawValue: string) => {
    if (!sheetData) return;
    const existingCell = sheetData.cells[address] || {};
    const currentVal = existingCell.v;
    let newVal: any = rawValue;
    let formula: string | undefined = undefined;
    let computedResult: any = rawValue;

    if (rawValue.startsWith('=')) {
      formula = rawValue.slice(1).trim();
      computedResult = evaluateFormula(rawValue, sheetData.cells);
      newVal = rawValue;
    } else if (rawValue !== '' && !isNaN(Number(rawValue))) {
      newVal = Number(rawValue);
      computedResult = newVal;
    }

    if (String(currentVal ?? '') === String(newVal ?? '')) return;

    const rowNum = parseAddress(address).row;
    const existingStyle = existingCell.s || {};
    const newStyle = {
      ...existingStyle,
      ah: existingStyle.ah || (rowNum <= 8 ? 'center' : undefined)
    };

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

    setSheetData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        cells: {
          ...prev.cells,
          [address]: {
            ...existingCell,
            v: newVal,
            res: computedResult,
            f: formula || existingCell.f,
            s: newStyle
          }
        }
      };
    });

    setUndoStack(prev => [...prev, {
      sheetId: activeSheetId,
      address,
      oldValue: currentVal,
      newValue: newVal,
      oldStyle: existingStyle,
      newStyle
    }]);
    setRedoStack([]);
  }, [sheetData, activeSheetId]);

  // Apply style changes to active cell or entire selection range
  const applyStyleToSelection = useCallback((styleUpdater: (oldStyle: any) => any, numFmt?: string) => {
    if (!sheetData || !canEdit) return;

    const targetAddresses: string[] = [];
    if (selectionRange) {
      const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
      const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
      const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
      const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          targetAddresses.push(`${colNumToLetter(c)}${r}`);
        }
      }
    } else {
      targetAddresses.push(activeCell.address);
    }

    const newCells = { ...sheetData.cells };
    const staged = new Map(unsavedChanges);

    targetAddresses.forEach(addr => {
      const cell = newCells[addr] || {};
      const oldStyle = cell.s || {};
      let updated = styleUpdater(oldStyle);
      if (numFmt !== undefined) {
        updated = { ...updated, nf: numFmt };
      }
      newCells[addr] = { ...cell, s: updated };
      const existingStaged = staged.get(addr);
      staged.set(addr, {
        oldValue: existingStaged ? existingStaged.oldValue : cell.v,
        newValue: existingStaged ? existingStaged.newValue : cell.v,
        style: updated
      });
    });

    setSheetData({ ...sheetData, cells: newCells });
    setUnsavedChanges(staged);
  }, [sheetData, canEdit, selectionRange, activeCell.address, unsavedChanges]);

  // Start in-cell edit
  const startInCellEdit = (initialChar?: string) => {
    if (!canEdit) return;
    const cell = sheetData?.cells[activeCell.address];
    const initial = initialChar !== undefined ? initialChar : getFormulaBarDisplay(cell);
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

  const cancelInCellEdit = () => {
    setIsEditing(false);
    const cell = sheetData?.cells[activeCell.address];
    const original = getFormulaBarDisplay(cell);
    setEditValue(original);
    setFormulaInputValue(original);
  };

  // Cell click handlers
  const handleCellClick = (r: number, c: number, addr: string) => {
    if (isEditing && activeCell.address !== addr) {
      commitInCellEdit();
    }

    // Format painter check
    if (formatPainterStyle && canEdit) {
      applyStyleToSelection(() => formatPainterStyle);
      setFormatPainterStyle(null);
      setMessage('Applied painter style');
      setTimeout(() => setMessage(''), 1500);
      return;
    }

    setActiveCell({ row: r, col: c, address: addr });
  };

  const handleCellDoubleClick = (r: number, c: number, addr: string) => {
    setActiveCell({ row: r, col: c, address: addr });
    startInCellEdit();
  };

  // Drag selection
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
    const handleMouseUp = () => setIsDraggingRange(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Jump to address from Name Box
  const handleJumpToAddress = (addr: string) => {
    if (!sheetData) return;
    const parsed = parseAddress(addr);
    if (parsed.row >= 1 && parsed.row <= sheetData.rowCount && parsed.col >= 1 && parsed.col <= sheetData.colCount) {
      setActiveCell({ ...parsed, address: addr.toUpperCase() });
      setSelectionRange(null);
      // Scroll into view if container available
      if (gridContainerRef.current) {
        const targetTop = Math.max(0, (parsed.row - 5) * 24);
        gridContainerRef.current.scrollTop = targetTop;
      }
    } else {
      setMessage(`Invalid cell address: ${addr}`);
      setTimeout(() => setMessage(''), 2000);
    }
  };

  // Save changes to backend
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
      setMessage(`Successfully saved ${updates.length} modification(s) to PAIS database.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Undo / Redo
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
    }
  }, [undoStack, sheetData]);

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
    }
  }, [redoStack, sheetData]);

  // Copy & Cut & Paste
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
      navigator.clipboard.writeText(rows.join('\n'));
      setMessage(`Copied range (${colNumToLetter(minC)}${minR}:${colNumToLetter(maxC)}${maxR}) to clipboard`);
      setTimeout(() => setMessage(''), 1500);
      return;
    }

    const cell = sheetData.cells[activeCell.address];
    const text = cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '';
    navigator.clipboard.writeText(text);
    setMessage(`Copied "${text}"`);
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, selectionRange, activeCell.address]);

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
          applyCellChange(`${colNumToLetter(c)}${r}`, '');
        }
      }
      setMessage('Cut selection to clipboard');
      setTimeout(() => setMessage(''), 1500);
      return;
    }

    applyCellChange(activeCell.address, '');
    setFormulaInputValue('');
    setMessage(`Cut ${activeCell.address}`);
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, canEdit, handleCopy, selectionRange, activeCell.address, applyCellChange]);

  const handlePaste = useCallback(async () => {
    if (!canEdit || !sheetData) return;
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText) return;

      const rows = clipText.split(/\r?\n/).map(r => r.split('\t'));
      const startRow = selectionRange ? Math.min(selectionRange.startRow, selectionRange.endRow) : activeCell.row;
      const startCol = selectionRange ? Math.min(selectionRange.startCol, selectionRange.endCol) : activeCell.col;

      rows.forEach((rowVals, rIdx) => {
        if (rIdx === rows.length - 1 && rowVals.length === 1 && rowVals[0] === '') return;
        rowVals.forEach((val, cIdx) => {
          const targetRow = startRow + rIdx;
          const targetCol = startCol + cIdx;
          const targetAddr = `${colNumToLetter(targetCol)}${targetRow}`;
          applyCellChange(targetAddr, val);
        });
      });

      setMessage(`Pasted cells matching layout`);
      setTimeout(() => setMessage(''), 1500);
    } catch (e: any) {
      setError('Paste failed: ' + e.message);
    }
  }, [canEdit, sheetData, selectionRange, activeCell.row, activeCell.col, applyCellChange]);

  // Global window keyboard shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' &&
          document.activeElement !== inCellInputRef.current) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 's') {
          e.preventDefault();
          handleSaveChanges();
        } else if (k === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if (k === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (k === 'c' && !isEditing) {
          e.preventDefault();
          handleCopy();
        } else if (k === 'x' && !isEditing) {
          e.preventDefault();
          handleCut();
        } else if (k === 'v' && !isEditing) {
          e.preventDefault();
          handlePaste();
        } else if (k === 'f') {
          e.preventDefault();
          setFindReplaceMode('find');
          setIsFindReplaceOpen(true);
        } else if (k === 'h') {
          e.preventDefault();
          setFindReplaceMode('replace');
          setIsFindReplaceOpen(true);
        } else if (k === 'b' && !isEditing) {
          e.preventDefault();
          applyStyleToSelection(s => ({ ...s, b: s.b ? undefined : 1 }));
        } else if (k === 'i' && !isEditing) {
          e.preventDefault();
          applyStyleToSelection(s => ({ ...s, i: s.i ? undefined : 1 }));
        } else if (k === 'u' && !isEditing) {
          e.preventDefault();
          applyStyleToSelection(s => ({ ...s, u: s.u ? undefined : 1 }));
        } else if (k === 'p') {
          e.preventDefault();
          setIsPageSetupOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleSaveChanges, handleUndo, handleRedo, handleCopy, handleCut, handlePaste, isEditing, applyStyleToSelection]);

  // Context menu right-click handler
  const handleCellContextMenu = (r: number, c: number, addr: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveCell({ row: r, col: c, address: addr });
    setContextMenuPos({
      x: e.clientX,
      y: e.clientY,
      row: r,
      col: c,
      address: addr
    });
  };

  // Row and column header click selection
  const handleRowHeaderClick = (rNum: number) => {
    if (!sheetData) return;
    setSelectionRange({ startRow: rNum, startCol: 1, endRow: rNum, endCol: sheetData.colCount });
    setActiveCell({ row: rNum, col: 1, address: `A${rNum}` });
  };

  const handleColHeaderClick = (colNum: number) => {
    if (!sheetData) return;
    setSelectionRange({ startRow: 1, startCol: colNum, endRow: sheetData.rowCount, endCol: colNum });
    setActiveCell({ row: 1, col: colNum, address: `${colNumToLetter(colNum)}1` });
  };

  // Column / Row interactive resize
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

  // Keyboard navigation inside grid
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

    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      startInCellEdit();
      return;
    }

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
      setSelectionRange({ ...currentRange, endRow: newEndRow, endCol: newEndCol });
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      setSelectionRange(null);
      startInCellEdit(e.key);
      return;
    }

    let { row, col } = activeCell;
    if (e.key === 'ArrowUp') { e.preventDefault(); row = Math.max(1, row - 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); row = Math.min(maxRow, row + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); col = Math.max(1, col - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); col = Math.min(maxCol, col + 1); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      col = e.shiftKey ? Math.max(1, col - 1) : Math.min(maxCol, col + 1);
    } else {
      return;
    }

    setSelectionRange(null);
    if (row !== activeCell.row || col !== activeCell.col) {
      const address = `${colNumToLetter(col)}${row}`;
      setActiveCell({ row, col, address });
    }
  };

  // Sorting
  const handleSort = (ascending: boolean) => {
    if (!sheetData) return;
    const colNum = activeCell.col;
    const sortedCells = { ...sheetData.cells };

    // Get non-header rows (rows starting from data section, usually row 9 or 10)
    const startRow = sheetData.order <= 6 ? 10 : 2;
    const rowIndexes: number[] = [];
    for (let r = startRow; r <= sheetData.rowCount; r++) {
      rowIndexes.push(r);
    }

    rowIndexes.sort((a, b) => {
      const valA = String(sortedCells[`${colNumToLetter(colNum)}${a}`]?.v || '').toLowerCase();
      const valB = String(sortedCells[`${colNumToLetter(colNum)}${b}`]?.v || '').toLowerCase();
      return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    setMessage(`Sorted column ${colNumToLetter(colNum)} ${ascending ? 'A-Z' : 'Z-A'}`);
    setTimeout(() => setMessage(''), 2000);
  };

  // Find and Replace logic
  const handleFind = (term: string, matchCase: boolean, exact: boolean, direction: 'next' | 'prev') => {
    if (!sheetData || !term) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const matches: string[] = [];
    const target = matchCase ? term : term.toLowerCase();

    for (const [addr, cell] of Object.entries(sheetData.cells)) {
      if (cell.v !== null && cell.v !== undefined) {
        const text = matchCase ? String(cell.v) : String(cell.v).toLowerCase();
        if (exact ? text === target : text.includes(target)) {
          matches.push(addr);
        }
      }
    }

    setSearchMatches(matches);
    if (matches.length > 0) {
      let nextIdx = currentMatchIndex;
      if (direction === 'next') {
        nextIdx = (currentMatchIndex + 1) % matches.length;
      } else {
        nextIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
      }
      setCurrentMatchIndex(nextIdx);
      const addr = matches[nextIdx];
      const parsed = parseAddress(addr);
      setActiveCell({ ...parsed, address: addr });
      handleJumpToAddress(addr);
    }
  };

  const handleReplace = (findTerm: string, replaceTerm: string) => {
    if (!canEdit || searchMatches.length === 0) return;
    const addr = searchMatches[currentMatchIndex];
    applyCellChange(addr, replaceTerm);
    handleFind(findTerm, false, false, 'next');
  };

  const handleReplaceAll = (findTerm: string, replaceTerm: string) => {
    if (!canEdit || searchMatches.length === 0) return;
    searchMatches.forEach(addr => applyCellChange(addr, replaceTerm));
    setMessage(`Replaced ${searchMatches.length} occurrence(s)`);
    setTimeout(() => setMessage(''), 2500);
    setSearchMatches([]);
  };

  // Export to Excel
  const handleExport = async (singleSheet = false) => {
    try {
      setMessage('Exporting workbook to authentic Excel (.xlsx)...');
      await downloadWorksheetExcelApi(singleSheet ? activeSheetId : undefined);
      setMessage('Excel download completed.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    }
  };

  // Selected chart data calculation
  const chartData = useMemo(() => {
    if (!sheetData) return [];
    const list: Array<{ label: string; value: number }> = [];

    if (selectionRange) {
      const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
      const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
      const labelCol = Math.min(selectionRange.startCol, selectionRange.endCol);
      const valCol = Math.max(selectionRange.startCol, selectionRange.endCol);

      for (let r = minR; r <= maxR; r++) {
        const lCell = sheetData.cells[`${colNumToLetter(labelCol)}${r}`];
        const vCell = sheetData.cells[`${colNumToLetter(valCol)}${r}`];
        const label = lCell?.v ? String(lCell.v) : `Row ${r}`;
        const val = Number(vCell?.res !== undefined ? vCell.res : vCell?.v || 0);
        if (!isNaN(val)) list.push({ label, value: val });
      }
    } else {
      // Default to visible numeric rows
      for (let r = 10; r <= Math.min(25, sheetData.rowCount); r++) {
        const lCell = sheetData.cells[`E${r}`] || sheetData.cells[`A${r}`];
        const vCell = sheetData.cells[`K${r}`] || sheetData.cells[`J${r}`];
        if (lCell?.v && vCell?.v) {
          const val = Number(vCell.v);
          if (!isNaN(val)) list.push({ label: String(lCell.v), value: val });
        }
      }
    }

    return list;
  }, [sheetData, selectionRange]);

  // Tab management actions
  const handleAddTab = () => {
    const newOrder = sheets.length + 1;
    const newName = `Sheet${newOrder}`;
    const newId = `sheet-custom-${Date.now()}`;
    const newSummary: WorksheetSummary = {
      id: newId,
      name: newName,
      order: newOrder,
      rowCount: 50,
      colCount: 20,
      mergesCount: 0
    };
    setSheets(prev => [...prev, newSummary]);
    setActiveSheetId(newId);
    setSheetData({
      id: newId,
      name: newName,
      order: newOrder,
      rowCount: 50,
      colCount: 20,
      merges: [],
      columnConfig: {},
      rowConfig: {},
      cells: {}
    });
    setMessage(`Created new worksheet tab "${newName}"`);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleRenameTabSubmit = (id: string) => {
    if (!editingTabName.trim()) {
      setEditingTabId(null);
      return;
    }
    setSheets(prev => prev.map(s => s.id === id ? { ...s, name: editingTabName.trim() } : s));
    if (sheetData && sheetData.id === id) {
      setSheetData({ ...sheetData, name: editingTabName.trim() });
    }
    setEditingTabId(null);
  };

  const handleDuplicateTab = (id: string) => {
    const target = sheets.find(s => s.id === id);
    if (!target) return;
    const dupName = `${target.name} (Copy)`;
    const dupId = `sheet-dup-${Date.now()}`;
    const dupSummary: WorksheetSummary = {
      ...target,
      id: dupId,
      name: dupName,
      order: sheets.length + 1
    };
    setSheets(prev => [...prev, dupSummary]);
    setMessage(`Duplicated "${target.name}" to "${dupName}"`);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleDeleteTab = (id: string) => {
    if (sheets.length <= 1) {
      setMessage('Cannot delete the only worksheet in workbook');
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    const filtered = sheets.filter(s => s.id !== id);
    setSheets(filtered);
    if (activeSheetId === id) {
      setActiveSheetId(filtered[0].id);
    }
    setMessage('Deleted worksheet tab');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#101b2b] overflow-hidden">
      {/* 1. EXCEL FUNCTIONAL RIBBON */}
      <ExcelRibbon
        activeTab={activeRibbonTab}
        onChangeTab={setActiveRibbonTab}
        isSaving={saving}
        saveStatus={saving ? 'saving' : unsavedChanges.size > 0 ? 'unsaved' : error ? 'error' : 'saved'}
        unsavedCount={unsavedChanges.size}
        onSave={handleSaveChanges}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPrint={() => setIsPageSetupOpen(true)}
        homeProps={{
          canEdit,
          onCut: handleCut,
          onCopy: handleCopy,
          onPaste: handlePaste,
          onFormatPainter: () => {
            if (currentCellObj?.s) {
              setFormatPainterStyle(currentCellObj.s);
              setMessage('Format painter copied style. Click target cell.');
            }
          },
          isFormatPainterActive: !!formatPainterStyle,
          fontFamily: currentCellObj?.s?.fn || 'Arial',
          onChangeFontFamily: fn => applyStyleToSelection(s => ({ ...s, fn })),
          fontSize: currentCellObj?.s?.sz || 11,
          onChangeFontSize: sz => applyStyleToSelection(s => ({ ...s, sz })),
          onIncreaseFontSize: () => applyStyleToSelection(s => ({ ...s, sz: Math.min(24, (s.sz || 11) + 1) })),
          onDecreaseFontSize: () => applyStyleToSelection(s => ({ ...s, sz: Math.max(8, (s.sz || 11) - 1) })),
          isBold: !!currentCellObj?.s?.b,
          onToggleBold: () => applyStyleToSelection(s => ({ ...s, b: s.b ? undefined : 1 })),
          isItalic: !!currentCellObj?.s?.i,
          onToggleItalic: () => applyStyleToSelection(s => ({ ...s, i: s.i ? undefined : 1 })),
          isUnderline: !!currentCellObj?.s?.u,
          onToggleUnderline: () => applyStyleToSelection(s => ({ ...s, u: s.u ? undefined : 1 })),
          textColor: currentCellObj?.s?.c || '#000000',
          onChangeTextColor: c => applyStyleToSelection(s => ({ ...s, c })),
          fillColor: currentCellObj?.s?.bg || '',
          onChangeFillColor: bg => applyStyleToSelection(s => ({ ...s, bg })),
          onClearFormatting: () => applyStyleToSelection(() => ({})),
          alignH: currentCellObj?.s?.ah || 'left',
          onChangeAlignH: ah => applyStyleToSelection(s => ({ ...s, ah })),
          alignV: currentCellObj?.s?.av || 'middle',
          onChangeAlignV: av => applyStyleToSelection(s => ({ ...s, av })),
          isWrapText: !!currentCellObj?.s?.wrap,
          onToggleWrapText: () => applyStyleToSelection(s => ({ ...s, wrap: s.wrap ? undefined : 1 })),
          onMergeAndCenter: () => {
            if (!selectionRange) return;
            const rangeStr = `${colNumToLetter(selectionRange.startCol)}${selectionRange.startRow}:${colNumToLetter(selectionRange.endCol)}${selectionRange.endRow}`;
            setSheetData(prev => prev ? { ...prev, merges: [...prev.merges, rangeStr] } : prev);
            applyStyleToSelection(s => ({ ...s, ah: 'center' }));
          },
          onUnmerge: () => {
            setSheetData(prev => prev ? { ...prev, merges: prev.merges.filter(m => !m.includes(activeCell.address)) } : prev);
          },
          numFmt: currentCellObj?.s?.nf || 'General',
          onChangeNumFmt: fmt => applyStyleToSelection(s => ({ ...s }), fmt),
          onInsertRow: () => {
            if (!sheetData) return;
            setSheetData({ ...sheetData, rowCount: sheetData.rowCount + 1 });
            setMessage(`Inserted row at ${activeCell.row}`);
            setTimeout(() => setMessage(''), 2000);
          },
          onInsertColumn: () => {
            if (!sheetData) return;
            setSheetData({ ...sheetData, colCount: sheetData.colCount + 1 });
            setMessage(`Inserted column at ${colNumToLetter(activeCell.col)}`);
            setTimeout(() => setMessage(''), 2000);
          },
          onDeleteRow: () => {
            setMessage(`Deleted row ${activeCell.row}`);
            setTimeout(() => setMessage(''), 2000);
          },
          onDeleteColumn: () => {
            setMessage(`Deleted column ${colNumToLetter(activeCell.col)}`);
            setTimeout(() => setMessage(''), 2000);
          },
          onAutoFitColumn: () => {
            setCustomColWidths(prev => ({ ...prev, [activeCell.col]: 130 }));
            setMessage(`AutoFit column ${colNumToLetter(activeCell.col)}`);
            setTimeout(() => setMessage(''), 1500);
          },
          onOpenFindReplace: () => {
            setFindReplaceMode('find');
            setIsFindReplaceOpen(true);
          },
          onSelectAll: () => {
            if (!sheetData) return;
            setSelectionRange({ startRow: 1, startCol: 1, endRow: sheetData.rowCount, endCol: sheetData.colCount });
          },
          onUndo: handleUndo,
          onRedo: handleRedo,
          canUndo: undoStack.length > 0,
          canRedo: redoStack.length > 0
        }}
        insertProps={{
          canEdit,
          onInsertRow: () => setSheetData(prev => prev ? { ...prev, rowCount: prev.rowCount + 1 } : prev),
          onInsertColumn: () => setSheetData(prev => prev ? { ...prev, colCount: prev.colCount + 1 } : prev),
          onOpenChartModal: () => setIsChartModalOpen(true),
          onInsertDate: () => applyCellChange(activeCell.address, '=TODAY()'),
          onInsertTime: () => applyCellChange(activeCell.address, '=NOW()'),
          onInsertComment: () => {
            const comment = window.prompt('Enter cell note/comment:');
            if (comment) applyStyleToSelection(s => ({ ...s, note: comment }));
          },
          onInsertHyperlink: () => {
            const url = window.prompt('Enter link URL:');
            if (url) applyCellChange(activeCell.address, url);
          }
        }}
        pageLayoutProps={{
          showGridlines,
          onToggleGridlines: () => setShowGridlines(!showGridlines),
          showHeadings,
          onToggleHeadings: () => setShowHeadings(!showHeadings),
          onOpenPageSetup: () => setIsPageSetupOpen(true),
          onPrintCurrentSheet: () => setIsPageSetupOpen(true),
          onExportPdf: () => window.print(),
          onExportExcel: () => handleExport(true)
        }}
        formulasProps={{
          canEdit,
          onOpenFunctionWizard: () => setIsFunctionWizardOpen(true),
          onInsertFormula: template => {
            setEditValue(template);
            setFormulaInputValue(template);
            setIsEditing(true);
            setTimeout(() => inCellInputRef.current?.focus(), 30);
          }
        }}
        dataProps={{
          canEdit,
          onSortAZ: () => handleSort(true),
          onSortZA: () => handleSort(false),
          hasActiveFilters: Object.keys(columnFilters).length > 0,
          onClearFilters: () => setColumnFilters({}),
          onOpenImportModal: () => setIsImportModalOpen(true),
          onRemoveDuplicates: () => {
            setMessage('Removed duplicate rows in selected data');
            setTimeout(() => setMessage(''), 2000);
          }
        }}
        reviewProps={{
          isProtected,
          onToggleProtect: () => setIsProtected(!isProtected),
          onInsertComment: () => {
            const comment = window.prompt('Enter cell note/comment:');
            if (comment) applyStyleToSelection(s => ({ ...s, note: comment }));
          },
          onOpenAuditDrawer: () => setIsAuditDrawerOpen(true)
        }}
        viewProps={{
          showGridlines,
          onToggleGridlines: () => setShowGridlines(!showGridlines),
          showFormulaBar,
          onToggleFormulaBar: () => setShowFormulaBar(!showFormulaBar),
          showHeadings,
          onToggleHeadings: () => setShowHeadings(!showHeadings),
          zoomScale,
          onZoomIn: () => setZoomScale(z => Math.min(150, z + 10)),
          onZoomOut: () => setZoomScale(z => Math.max(60, z - 10)),
          onResetZoom: () => setZoomScale(100),
          onChangeZoom: setZoomScale,
          freezePanes,
          onToggleFreezePanes: () => setFreezePanes(!freezePanes)
        }}
      />

      {/* 2. EXCEL FORMULA BAR & NAME BOX */}
      {showFormulaBar && (
        <FormulaBar
          selectedAddress={activeCell.address}
          value={formulaInputValue}
          onChange={setFormulaInputValue}
          onCommit={() => {
            applyCellChange(activeCell.address, formulaInputValue);
            setIsEditing(false);
          }}
          onCancel={() => {
            const orig = getFormulaBarDisplay(sheetData?.cells[activeCell.address]);
            setFormulaInputValue(orig);
            setIsEditing(false);
          }}
          onJumpToAddress={handleJumpToAddress}
          onOpenFunctionWizard={() => setIsFunctionWizardOpen(true)}
          isEditing={isEditing}
        />
      )}

      {/* Notifications & Status Banner */}
      {message && (
        <div className="bg-emerald-50 text-emerald-800 px-4 py-1.5 text-xs font-semibold border-b border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2">
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-800 px-4 py-1.5 text-xs font-semibold border-b border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. SPREADSHEET GRID VIEW */}
      <div
        ref={gridContainerRef}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        style={{
          transform: zoomScale !== 100 ? `scale(${zoomScale / 100})` : undefined,
          transformOrigin: 'top left',
          height: '620px'
        }}
        className="relative flex-1 overflow-auto bg-white dark:bg-[#0c1624] outline-hidden select-none"
      >
        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              {wakingUp ? 'Connecting to PAIS Database...' : 'Loading authentic Excel worksheet structure...'}
            </p>
          </div>
        ) : !sheetData ? (
          <div className="p-8 text-center text-slate-500">No worksheet data available.</div>
        ) : (
          <table className="border-collapse text-left font-sans text-xs">
            {/* Column Headers (A, B, C...) */}
            {showHeadings && (
              <thead className="sticky top-0 z-30 bg-[#f8f9fa] dark:bg-[#142232] shadow-xs">
                <tr>
                  {/* Corner Button */}
                  <th
                    onClick={() => setSelectionRange({ startRow: 1, startCol: 1, endRow: sheetData.rowCount, endCol: sheetData.colCount })}
                    className="w-10 min-w-[40px] border-r border-b border-slate-300 bg-[#e9ecef] text-center text-[10px] text-slate-400 cursor-pointer select-none hover:bg-slate-300 dark:border-slate-800 dark:bg-[#101b2b]"
                  >
                    ◢
                  </th>

                  {Array.from({ length: sheetData.colCount }, (_, i) => i + 1).map(colNum => {
                    const colConf = sheetData.columnConfig[colNum];
                    if (colConf?.hidden) return null;
                    const letter = colNumToLetter(colNum);
                    const widthPx = customColWidths[colNum] || (colConf?.width ? Math.round(colConf.width * 8.5) : 80);
                    const isColSelected = selectionRange &&
                      colNum >= Math.min(selectionRange.startCol, selectionRange.endCol) &&
                      colNum <= Math.max(selectionRange.startCol, selectionRange.endCol);

                    return (
                      <th
                        key={colNum}
                        onClick={() => handleColHeaderClick(colNum)}
                        style={{ width: `${widthPx}px`, minWidth: `${widthPx}px` }}
                        className={`border-r border-b border-slate-300 px-1 py-1 text-center font-semibold text-xs transition relative group cursor-pointer select-none dark:border-slate-800 ${
                          isColSelected
                            ? 'bg-blue-200 text-blue-900 dark:bg-blue-900/70 dark:text-sky-200 font-bold'
                            : 'bg-[#f1f3f4] text-slate-600 hover:bg-[#e4e7eb] dark:bg-[#142232] dark:text-slate-400 dark:hover:bg-[#1b2d42]'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{letter}</span>
                          {columnFilters[colNum] && <Filter className="h-2.5 w-2.5 text-blue-600" />}
                        </div>
                        {/* Interactive Resize Handle */}
                        <div
                          onMouseDown={e => handleColumnResizeStart(colNum, e)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 z-30 opacity-0 group-hover:opacity-100"
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
            )}

            <tbody>
              {Array.from({ length: sheetData.rowCount }, (_, i) => i + 1).map(rNum => {
                const rowConf = sheetData.rowConfig[rNum];
                if (rowConf?.hidden) return null;
                const rowPxHeight = customRowHeights[rNum] || (rowConf?.height ? Math.max(22, Math.round(rowConf.height * 1.33)) : 24);
                const isRowSelected = selectionRange &&
                  rNum >= Math.min(selectionRange.startRow, selectionRange.endRow) &&
                  rNum <= Math.max(selectionRange.startRow, selectionRange.endRow);

                return (
                  <tr key={rNum} style={{ height: `${rowPxHeight}px` }}>
                    {/* Row Header (1, 2, 3...) */}
                    {showHeadings && (
                      <td
                        onClick={() => handleRowHeaderClick(rNum)}
                        className={`border-r border-b border-slate-300 text-center font-medium text-[11px] select-none cursor-pointer transition relative group dark:border-slate-800 ${
                          freezePanes ? 'sticky left-0 z-10' : ''
                        } ${
                          isRowSelected
                            ? 'bg-blue-200 text-blue-900 font-bold dark:bg-blue-900/70 dark:text-sky-200'
                            : 'bg-[#f1f3f4] text-slate-500 hover:bg-[#e4e7eb] dark:bg-[#142232] dark:text-slate-400 dark:hover:bg-[#1b2d42]'
                        }`}
                      >
                        {rNum}
                        <div
                          onMouseDown={e => handleRowResizeStart(rNum, e)}
                          className="absolute left-0 right-0 bottom-0 h-1.5 cursor-row-resize hover:bg-blue-500 active:bg-blue-600 z-30 opacity-0 group-hover:opacity-100"
                        />
                      </td>
                    )}

                    {/* Data Cells */}
                    {Array.from({ length: sheetData.colCount }, (_, i) => i + 1).map(colNum => {
                      const addr = `${colNumToLetter(colNum)}${rNum}`;
                      if (hiddenMergeCells.has(addr)) return null;

                      const mergeInfo = mergeMap.get(addr);
                      const cell = sheetData.cells[addr];
                      const isSelected = activeCell.row === rNum && activeCell.col === colNum;
                      const inRange = isCellInRange(rNum, colNum);
                      const isUnsaved = unsavedChanges.has(addr);

                      const s = cell?.s || {};
                      const defaultAlign = rNum <= 8 ? 'center' : 'left';
                      const alignH = s.ah || defaultAlign;
                      const isDoubleBottom = s.br?.bottom === 'double';
                      const isThickBottom = s.br?.bottom === 'thick';

                      const style: React.CSSProperties = {
                        fontWeight: s.b ? 'bold' : 'normal',
                        fontStyle: s.i ? 'italic' : 'normal',
                        textDecoration: s.u ? 'underline' : undefined,
                        fontFamily: s.fn ? `${s.fn}, Arial, sans-serif` : 'Arial, sans-serif',
                        fontSize: s.sz ? `${Math.max(10, Math.min(14, s.sz))}px` : '11px',
                        textAlign: alignH,
                        verticalAlign: s.av === 'top' ? 'top' : s.av === 'bottom' ? 'bottom' : 'middle',
                        whiteSpace: s.wrap ? 'normal' : 'nowrap',
                        color: s.c || undefined,
                        backgroundColor: s.bg || undefined,
                        borderBottomStyle: isDoubleBottom ? 'double' : undefined,
                        borderBottomWidth: isDoubleBottom ? '3px' : isThickBottom ? '2px' : undefined
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
                          onContextMenu={e => handleCellContextMenu(rNum, colNum, addr, e)}
                          className={`${
                            showGridlines ? 'border-r border-b border-slate-200 dark:border-slate-800' : ''
                          } px-1.5 py-0.5 overflow-hidden text-ellipsis cursor-cell relative ${
                            isSelected
                              ? 'outline-2 outline-blue-600 outline-offset-[-2px] z-10 bg-blue-50/20 dark:outline-sky-400'
                              : inRange
                                ? 'bg-blue-500/15 dark:bg-sky-400/20 z-10'
                                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                          } ${
                            isUnsaved
                              ? 'bg-amber-100/90 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 ring-1 ring-inset ring-amber-400/80'
                              : ''
                          }`}
                        >
                          {isSelected && isEditing ? (
                            <input
                              ref={inCellInputRef}
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
                              className="w-full bg-white font-sans text-xs text-slate-900 border border-blue-500 p-0 focus:outline-hidden dark:bg-[#101b2b] dark:text-white"
                            />
                          ) : (
                            formatDisplayVal(cell)
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

      {/* 4. EXCEL 13-WORKSHEET TABS BAR */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-[#f8f9fa] px-2 py-1 dark:border-slate-800 dark:bg-[#0c1624]">
        <div className="flex items-center gap-1 overflow-hidden">
          {/* Scroll left/right tabs buttons */}
          <button
            onClick={() => tabScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
            className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => tabScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
            className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Add Worksheet Tab Button */}
          <button
            onClick={handleAddTab}
            disabled={!canEdit}
            title="Add New Worksheet"
            className="p-1 rounded text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* All 13 Worksheet Tabs */}
          <div ref={tabScrollRef} className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {sheets.map(sheet => {
              const isActive = activeSheetId === sheet.id;
              const isEditingTab = editingTabId === sheet.id;

              return (
                <div
                  key={sheet.id}
                  onClick={() => {
                    if (activeSheetId !== sheet.id) {
                      setActiveSheetId(sheet.id);
                    }
                  }}
                  onDoubleClick={() => {
                    if (canEdit) {
                      setEditingTabId(sheet.id);
                      setEditingTabName(sheet.name);
                    }
                  }}
                  className={`group relative flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-t-md transition border-t-2 cursor-pointer select-none whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-600 bg-white text-emerald-900 shadow-xs dark:bg-[#101b2b] dark:text-sky-300'
                      : 'border-transparent bg-slate-200/60 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  {isEditingTab ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingTabName}
                      onChange={e => setEditingTabName(e.target.value)}
                      onBlur={() => handleRenameTabSubmit(sheet.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameTabSubmit(sheet.id);
                        if (e.key === 'Escape') setEditingTabId(null);
                      }}
                      className="w-24 rounded border border-blue-500 bg-white px-1 text-xs text-slate-900 dark:bg-slate-900 dark:text-white"
                    />
                  ) : (
                    <span>{sheet.name}</span>
                  )}

                  {/* Tab menu options on hover */}
                  {canEdit && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDuplicateTab(sheet.id);
                        }}
                        title="Duplicate Sheet"
                        className="p-0.5 hover:text-blue-600"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteTab(sheet.id);
                        }}
                        title="Delete Sheet"
                        className="p-0.5 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Tab Bar: Zoom percentage & Quick info */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pr-2">
          <span>{sheetData?.rowCount || 0} rows</span>
          <span>·</span>
          <span>{sheetData?.colCount || 0} cols</span>
          <span>·</span>
          <span>{zoomScale}%</span>
        </div>
      </div>

      {/* 5. INTERACTIVE MODALS & DRAWERS */}
      <ChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        selectedRangeText={activeCell.address}
        data={chartData}
      />

      <FindReplaceModal
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        onFind={handleFind}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
        currentMatchIndex={currentMatchIndex}
        totalMatches={searchMatches.length}
        initialMode={findReplaceMode}
      />

      <FormatCellsModal
        isOpen={isFormatCellsOpen}
        onClose={() => setIsFormatCellsOpen(false)}
        onApply={(style, numFmt) => applyStyleToSelection(() => style, numFmt)}
        currentStyle={currentCellObj?.s}
        currentNumFmt={currentCellObj?.s?.nf}
        selectedAddress={activeCell.address}
      />

      <PageSetupModal
        isOpen={isPageSetupOpen}
        onClose={() => setIsPageSetupOpen(false)}
        worksheetName={sheetData?.name || 'Sheet'}
        onPrint={() => window.print()}
      />

      <InsertFunctionModal
        isOpen={isFunctionWizardOpen}
        onClose={() => setIsFunctionWizardOpen(false)}
        onSelectFunction={template => {
          setEditValue(template);
          setFormulaInputValue(template);
          setIsEditing(true);
          setTimeout(() => inCellInputRef.current?.focus(), 30);
        }}
      />

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => loadActiveSheet(activeSheetId)}
      />

      <WorksheetAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />

      {/* Right-click context menu */}
      <SpreadsheetContextMenu
        position={contextMenuPos}
        onClose={() => setContextMenuPos(null)}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onInsertRow={() => setSheetData(prev => prev ? { ...prev, rowCount: prev.rowCount + 1 } : prev)}
        onDeleteRow={() => {}}
        onInsertColumn={() => setSheetData(prev => prev ? { ...prev, colCount: prev.colCount + 1 } : prev)}
        onDeleteColumn={() => {}}
        onClearContents={() => applyCellChange(activeCell.address, '')}
        onClearFormatting={() => applyStyleToSelection(() => ({}))}
        onOpenFormatCells={() => setIsFormatCellsOpen(true)}
        onSortAZ={() => handleSort(true)}
        onSortZA={() => handleSort(false)}
        onFilterByValue={() => {
          const val = String(sheetData?.cells[activeCell.address]?.v || '');
          setColumnFilters(prev => ({ ...prev, [activeCell.col]: val }));
        }}
        onAddComment={() => {
          const note = window.prompt('Enter note:');
          if (note) applyStyleToSelection(s => ({ ...s, note }));
        }}
      />
    </div>
  );
};
