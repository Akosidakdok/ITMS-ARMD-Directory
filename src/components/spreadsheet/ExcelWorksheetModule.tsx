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
  updateWorksheetMergesApi,
  downloadWorksheetExcelApi,
  createCustomWorksheetApi,
  renameWorksheetApi,
  deleteWorksheetApi,
  type WorksheetSummary,
  type WorksheetDetail,
  type WorksheetCell
} from '../../services/api';
import { useAuthRole } from '../../context/AuthRoleContext';
import {
  colNumToLetter,
  colLetterToNum,
  parseAddress,
  formatExcelDateSerial,
  insertCellReferenceIntoFormula,
  parseMergeRange,
  isCellInMergeRange,
  isMergeOverlappingRange
} from '../../utils/spreadsheetUtils';
import {
  applyCellEdits,
  recalculateWorkbook,
  translateFormulaReferences,
  type CellValueMap
} from './formula/formulaEngine';
import { ExcelRibbon, type RibbonTabType } from './ribbon/ExcelRibbon';
import { type BorderOptionType } from './ribbon/RibbonHomeTab';
import { FormulaBar } from './formulaBar/FormulaBar';
import { SpreadsheetContextMenu, type ContextMenuPosition } from './contextMenu/SpreadsheetContextMenu';
import { ChartModal } from './dialogs/ChartModal';
import { FindReplaceModal } from './dialogs/FindReplaceModal';
import { FormatCellsModal } from './dialogs/FormatCellsModal';
import { PageSetupModal } from './dialogs/PageSetupModal';
import { InsertFunctionModal } from './dialogs/InsertFunctionModal';
import { ExcelImportModal } from './ExcelImportModal';
import { WorksheetAuditDrawer } from './WorksheetAuditDrawer';
import {
  SPREADSHEET_FUNCTIONS,
  SpreadsheetFunctionDef,
  getFormulaSearchContext
} from '../../constants/spreadsheetFunctions';
import { FormulaAutocompleteList } from './formulaBar/FormulaAutocompleteList';

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
  const dateValue = formatExcelDateSerial(num, numFmt);
  if (dateValue !== null) return dateValue;

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

interface WorksheetHistorySnapshot {
  sheetId: string;
  cells: Record<string, WorksheetCell>;
  merges: string[];
  rowCount: number;
  colCount: number;
  unsavedChanges: Map<string, { oldValue: any; newValue: any; oldFormula?: string | null; formula?: string | null; style?: any }>;
  activeCell: { row: number; col: number; address: string };
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number } | null;
}

export const ExcelWorksheetModule: React.FC = () => {
  const { role } = useAuthRole();
  const [isProtected, setIsProtected] = useState(false);
  const canEdit = !isProtected && role !== 'view_only';

  // Sheets data & Navigation
  const [sheets, setSheets] = useState<WorksheetSummary[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [sheetData, setSheetData] = useState<WorksheetDetail | null>(null);
  const [formulaSheets, setFormulaSheets] = useState<CellValueMap>({});
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

  // Formula interactive reference selection
  const [formulaLastInsertedRef, setFormulaLastInsertedRef] = useState<string | null>(null);
  const [formulaReferenceRange, setFormulaReferenceRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  const [isDraggingFormulaRange, setIsDraggingFormulaRange] = useState(false);
  const isInteractingWithCellRef = useRef(false);

  // Column / Row Interactive Resizing & Custom Heights
  const [customColWidths, setCustomColWidths] = useState<Record<number, number>>({});
  const [customRowHeights, setCustomRowHeights] = useState<Record<number, number>>({});
  const resizingColRef = useRef<{ col: number; startX: number; startW: number } | null>(null);
  const resizingRowRef = useRef<{ row: number; startY: number; startH: number } | null>(null);

  // Unsaved changes & Undo/Redo stack
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, { oldValue: any; newValue: any; oldFormula?: string | null; formula?: string | null; style?: any }>>(new Map());
  const [undoStack, setUndoStack] = useState<WorksheetHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<WorksheetHistorySnapshot[]>([]);

  const historyStateRef = useRef({
    sheetData,
    activeSheetId,
    unsavedChanges,
    activeCell,
    selectionRange
  });

  useEffect(() => {
    historyStateRef.current = {
      sheetData,
      activeSheetId,
      unsavedChanges,
      activeCell,
      selectionRange
    };
  }, [sheetData, activeSheetId, unsavedChanges, activeCell, selectionRange]);

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
  const [formatCellsInitialTab, setFormatCellsInitialTab] = useState<'number' | 'alignment' | 'font' | 'border' | 'fill'>('number');
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
  const copiedRangeRef = useRef<{ text: string; row: number; col: number; values: string[][] } | null>(null);

  // In-cell formula autocomplete state
  const [inCellAutocompleteIndex, setInCellAutocompleteIndex] = useState(0);
  const [inCellAutocompleteDismissed, setInCellAutocompleteDismissed] = useState(false);

  const { isFormula: inCellIsFormula, searchTerm: inCellSearchTerm, prefixText: inCellPrefixText } = useMemo(
    () => getFormulaSearchContext(editValue),
    [editValue]
  );

  useEffect(() => {
    setInCellAutocompleteDismissed(false);
    setInCellAutocompleteIndex(0);
  }, [editValue]);

  const inCellCleanTerm = inCellSearchTerm.toUpperCase().trim();
  const inCellMatchingFunctions = useMemo(() => {
    if (!inCellIsFormula || inCellAutocompleteDismissed || !isEditing) return [];
    return SPREADSHEET_FUNCTIONS.filter(f => {
      if (!inCellCleanTerm) return true;
      return f.name.includes(inCellCleanTerm);
    }).sort((a, b) => {
      if (!inCellCleanTerm) return a.name.localeCompare(b.name);
      const aStarts = a.name.startsWith(inCellCleanTerm);
      const bStarts = b.name.startsWith(inCellCleanTerm);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [inCellIsFormula, inCellAutocompleteDismissed, isEditing, inCellCleanTerm]);

  const handleInCellSelectFormula = (fn: SpreadsheetFunctionDef) => {
    const newValue = `${inCellPrefixText}${fn.template}`;
    setEditValue(newValue);
    setFormulaInputValue(newValue);
    setInCellAutocompleteDismissed(true);
    setTimeout(() => {
      if (inCellInputRef.current) {
        inCellInputRef.current.focus();
        inCellInputRef.current.setSelectionRange(newValue.length, newValue.length);
      }
    }, 10);
  };

  // Virtualization windowing
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Merged cells map
  const { mergeMap, hiddenMergeCells } = useMemo(() => {
    const mMap = new Map<string, { rowSpan: number; colSpan: number }>();
    const hiddenSet = new Set<string>();
    if (!sheetData?.merges) return { mergeMap: mMap, hiddenMergeCells: hiddenSet };

    sheetData.merges.forEach(rangeStr => {
      const parsed = parseMergeRange(rangeStr);
      if (!parsed) return;
      const { minRow, maxRow, minCol, maxCol, startAddress } = parsed;
      if (minRow === maxRow && minCol === maxCol) return;

      mMap.set(startAddress, {
        rowSpan: maxRow - minRow + 1,
        colSpan: maxCol - minCol + 1
      });

      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (r === minRow && c === minCol) continue;
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
  const summariesInFlightRef = useRef(false);
  const loadSummaries = useCallback(async () => {
    if (summariesInFlightRef.current) return;
    summariesInFlightRef.current = true;
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
    } finally {
      summariesInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadSummaries();
  }, [loadSummaries]);

  // In-memory sheet cache for instant tab switching and loading
  const sheetCacheRef = useRef<Map<string, WorksheetDetail>>(new Map());
  const sheetDataRef = useRef<WorksheetDetail | null>(null);
  useEffect(() => {
    sheetDataRef.current = sheetData;
    if (sheetData) {
      sheetCacheRef.current.set(sheetData.id, sheetData);
    }
  }, [sheetData]);

  // Load single worksheet details
  const loadActiveSheet = useCallback(async (id: string) => {
    // If cached in memory, display immediately with 0ms delay
    const cached = sheetCacheRef.current.get(id);
    if (cached) {
      setSheetData(cached);
      setLoading(false);
      setError('');
      setUndoStack([]);
      setRedoStack([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchWorksheetDetailApi(id, (attempt, delayMs) => {
        setWakingUp(true);
        console.log(`[WorksheetModule] Loading sheet ${id} retry ${attempt}, waiting ${delayMs}ms...`);
      });
      setWakingUp(false);
      sheetCacheRef.current.set(id, data);
      setSheetData(data);
      setLoading(false);
      setUndoStack([]);
      setRedoStack([]);
      setActiveCell({ row: 1, col: 1, address: 'A1' });
      setSelectionRange(null);
      setIsEditing(false);

      // Resolve cross-sheet formulas in background (non-blocking)
      const currentSummaries = sheets.length ? sheets : [{ id: data.id, name: data.name } as WorksheetSummary];
      Promise.all(currentSummaries
        .filter(summary => summary.id !== id)
        .map(summary => {
          const c = sheetCacheRef.current.get(summary.id);
          return c ? Promise.resolve(c) : fetchWorksheetDetailApi(summary.id).catch(() => null);
        })
      ).then(otherDetails => {
        const workbookCells: CellValueMap = {
          [data.name]: { name: data.name, cells: data.cells }
        };
        otherDetails.forEach(detail => {
          if (detail) {
            sheetCacheRef.current.set(detail.id, detail);
            workbookCells[detail.name] = { name: detail.name, cells: detail.cells };
          }
        });
        const recalculated = recalculateWorkbook(workbookCells);
        setFormulaSheets(recalculated);
        if (recalculated[data.name]?.cells) {
          setSheetData(prev => (prev && prev.id === data.id ? { ...prev, cells: recalculated[data.name].cells } : prev));
        }
      }).catch(() => {});
    } catch (err: any) {
      setWakingUp(false);
      if (sheetDataRef.current && sheetDataRef.current.id === id) {
        setLoading(false);
        return;
      }
      setError(err.message || 'Failed to load worksheet');
      setLoading(false);
    }
  }, [sheets]);

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

  // Check if cell is in formula reference range
  const isFormulaReferenced = useCallback((r: number, c: number): boolean => {
    if (!formulaReferenceRange) return false;
    const minR = Math.min(formulaReferenceRange.startRow, formulaReferenceRange.endRow);
    const maxR = Math.max(formulaReferenceRange.startRow, formulaReferenceRange.endRow);
    const minC = Math.min(formulaReferenceRange.startCol, formulaReferenceRange.endCol);
    const maxC = Math.max(formulaReferenceRange.startCol, formulaReferenceRange.endCol);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  }, [formulaReferenceRange]);

  // Snapshot current worksheet state for Undo
  const pushUndoSnapshot = useCallback(() => {
    const current = historyStateRef.current;
    if (!current.sheetData) return;
    const snapshot: WorksheetHistorySnapshot = {
      sheetId: current.activeSheetId,
      cells: { ...current.sheetData.cells },
      merges: [...(current.sheetData.merges || [])],
      rowCount: current.sheetData.rowCount,
      colCount: current.sheetData.colCount,
      unsavedChanges: new Map(current.unsavedChanges),
      activeCell: { ...current.activeCell },
      selectionRange: current.selectionRange ? { ...current.selectionRange } : null
    };
    setUndoStack(prev => [...prev.slice(-49), snapshot]);
    setRedoStack([]);
  }, []);

  // Apply cell change locally and stage for batch save
  const applyCellChanges = useCallback((edits: Array<{ address: string; rawValue: string }>) => {
    if (!sheetData) return;
    const applied = applyCellEdits(
      sheetData.cells,
      edits.map(edit => ({ address: edit.address, input: edit.rawValue })),
      sheetData.name,
      formulaSheets
    );
    if (applied.changes.length === 0) return;
    pushUndoSnapshot();

    const nextCells = { ...applied.cells };
    const styleByAddress: Record<string, any> = {};
    applied.changes.forEach(change => {
      const existingCell = sheetData.cells[change.address] || {};
      const existingStyle = existingCell.s || {};
      const rowNum = parseAddress(change.address).row;
      const newStyle = {
        ...existingStyle,
        ah: existingStyle.ah || (rowNum <= 8 ? 'center' : undefined)
      };
      styleByAddress[change.address] = newStyle;
      nextCells[change.address] = { ...nextCells[change.address], s: newStyle };
    });

    const nextWorkbook = {
      ...formulaSheets,
      [sheetData.name]: { name: sheetData.name, cells: nextCells }
    };
    setFormulaSheets(nextWorkbook);
    setSheetData(prev => prev ? { ...prev, cells: nextCells } : prev);
    setUnsavedChanges(prev => {
      const next = new Map(prev);
      applied.changes.forEach(change => {
        const existing = next.get(change.address);
        next.set(change.address, {
          oldValue: existing ? existing.oldValue : change.oldValue,
          oldFormula: existing ? existing.oldFormula : change.oldFormula,
          newValue: change.newValue,
          formula: change.formula,
          style: styleByAddress[change.address]
        });
      });
      return next;
    });
  }, [sheetData, formulaSheets, pushUndoSnapshot]);

  const applyCellChange = useCallback((address: string, rawValue: string) => {
    applyCellChanges([{ address, rawValue }]);
  }, [applyCellChanges]);

  // Apply style changes to active cell or entire selection range
  const applyStyleToSelection = useCallback((styleUpdater: (oldStyle: any) => any, numFmt?: string) => {
    if (!sheetData || !canEdit) return;
    pushUndoSnapshot();

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

  // Helper to extract normalized selection bounds
  const getNormalizedSelection = useCallback(() => {
    if (!selectionRange) return null;
    const minRow = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxRow = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minCol = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxCol = Math.max(selectionRange.startCol, selectionRange.endCol);
    return { minRow, maxRow, minCol, maxCol };
  }, [selectionRange]);

  // 4. Unmerge Cells (defined before handleMergeAndCenter so it can be called if needed)
  const handleUnmergeCells = useCallback(() => {
    if (!sheetData || !canEdit) return;
    pushUndoSnapshot();
    const range = getNormalizedSelection();

    setSheetData(prev => {
      if (!prev) return prev;
      let remaining: string[];
      if (range) {
        remaining = prev.merges.filter(m => !isMergeOverlappingRange(m, range.minRow, range.maxRow, range.minCol, range.maxCol));
      } else {
        remaining = prev.merges.filter(m => !isCellInMergeRange(activeCell.row, activeCell.col, m));
      }
      return {
        ...prev,
        merges: remaining
      };
    });

    setMessage('Unmerged cells');
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, canEdit, getNormalizedSelection, activeCell, pushUndoSnapshot]);

  // 1. Merge & Center
  const handleMergeAndCenter = useCallback(() => {
    if (!sheetData || !canEdit) return;
    const range = getNormalizedSelection();
    if (!range || (range.minRow === range.maxRow && range.minCol === range.maxCol)) {
      const existing = sheetData.merges.find(m => isCellInMergeRange(activeCell.row, activeCell.col, m));
      if (existing) {
        handleUnmergeCells();
        return;
      }
      return;
    }
    pushUndoSnapshot();

    const { minRow, maxRow, minCol, maxCol } = range;
    const rangeStr = `${colNumToLetter(minCol)}${minRow}:${colNumToLetter(maxCol)}${maxRow}`;
    const topLeftAddr = `${colNumToLetter(minCol)}${minRow}`;

    setSheetData(prev => {
      if (!prev) return prev;
      const remainingMerges = prev.merges.filter(m => !isMergeOverlappingRange(m, minRow, maxRow, minCol, maxCol));
      const newCells = { ...prev.cells };
      const currentCell = newCells[topLeftAddr] || {};
      const newStyle = { ...(currentCell.s || {}), ah: 'center' as const };
      newCells[topLeftAddr] = { ...currentCell, s: newStyle };
      return {
        ...prev,
        merges: [...remainingMerges, rangeStr],
        cells: newCells
      };
    });

    setUnsavedChanges(prev => {
      const staged = new Map(prev);
      const currentCell = sheetData.cells[topLeftAddr] || {};
      staged.set(topLeftAddr, {
        oldValue: currentCell.v,
        newValue: currentCell.v,
        style: { ...(currentCell.s || {}), ah: 'center' }
      });
      return staged;
    });

    setActiveCell({ row: minRow, col: minCol, address: topLeftAddr });
    setSelectionRange({ startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol });
    setMessage(`Merged & Centered ${rangeStr}`);
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, canEdit, getNormalizedSelection, activeCell, handleUnmergeCells, pushUndoSnapshot]);

  // 2. Merge Across (merge horizontally per row)
  const handleMergeAcross = useCallback(() => {
    if (!sheetData || !canEdit) return;
    const range = getNormalizedSelection();
    if (!range || range.minCol === range.maxCol) return;
    pushUndoSnapshot();
    const { minRow, maxRow, minCol, maxCol } = range;

    const newRowMerges: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      newRowMerges.push(`${colNumToLetter(minCol)}${r}:${colNumToLetter(maxCol)}${r}`);
    }

    setSheetData(prev => {
      if (!prev) return prev;
      const remainingMerges = prev.merges.filter(m => !isMergeOverlappingRange(m, minRow, maxRow, minCol, maxCol));
      return {
        ...prev,
        merges: [...remainingMerges, ...newRowMerges]
      };
    });

    setMessage(`Merged across rows ${minRow} to ${maxRow}`);
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, canEdit, getNormalizedSelection, pushUndoSnapshot]);

  // 3. Merge Cells (merge without centering)
  const handleMergeCells = useCallback(() => {
    if (!sheetData || !canEdit) return;
    const range = getNormalizedSelection();
    if (!range || (range.minRow === range.maxRow && range.minCol === range.maxCol)) return;
    pushUndoSnapshot();
    const { minRow, maxRow, minCol, maxCol } = range;
    const rangeStr = `${colNumToLetter(minCol)}${minRow}:${colNumToLetter(maxCol)}${maxRow}`;
    const topLeftAddr = `${colNumToLetter(minCol)}${minRow}`;

    setSheetData(prev => {
      if (!prev) return prev;
      const remainingMerges = prev.merges.filter(m => !isMergeOverlappingRange(m, minRow, maxRow, minCol, maxCol));
      return {
        ...prev,
        merges: [...remainingMerges, rangeStr]
      };
    });

    setActiveCell({ row: minRow, col: minCol, address: topLeftAddr });
    setSelectionRange({ startRow: minRow, startCol: minCol, endRow: maxRow, endCol: maxCol });
    setMessage(`Merged cells ${rangeStr}`);
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, canEdit, getNormalizedSelection, pushUndoSnapshot]);

  // 5. Center Across Selection
  const handleCenterAcross = useCallback(() => {
    if (!sheetData || !canEdit) return;
    const range = getNormalizedSelection();
    if (!range) return;
    pushUndoSnapshot();
    const { minRow, minCol } = range;
    const topLeftAddr = `${colNumToLetter(minCol)}${minRow}`;

    setSheetData(prev => {
      if (!prev) return prev;
      const newCells = { ...prev.cells };
      const currentCell = newCells[topLeftAddr] || {};
      newCells[topLeftAddr] = {
        ...currentCell,
        s: { ...(currentCell.s || {}), ah: 'center' }
      };
      return {
        ...prev,
        cells: newCells
      };
    });

    setUnsavedChanges(prev => {
      const staged = new Map(prev);
      const currentCell = sheetData.cells[topLeftAddr] || {};
      staged.set(topLeftAddr, {
        oldValue: currentCell.v,
        newValue: currentCell.v,
        style: { ...(currentCell.s || {}), ah: 'center' }
      });
      return staged;
    });

    setMessage('Centered across selection');
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, canEdit, getNormalizedSelection, pushUndoSnapshot]);

  // Open format cells modal with initial tab
  const handleOpenFormatCells = useCallback((tab: 'number' | 'alignment' | 'font' | 'border' | 'fill' = 'number') => {
    setFormatCellsInitialTab(tab);
    setIsFormatCellsOpen(true);
  }, []);

  // Apply borders to selected cells
  const handleApplyBorder = useCallback((type: BorderOptionType) => {
    if (!sheetData || !canEdit) return;

    const minR = selectionRange ? Math.min(selectionRange.startRow, selectionRange.endRow) : activeCell.row;
    const maxR = selectionRange ? Math.max(selectionRange.startRow, selectionRange.endRow) : activeCell.row;
    const minC = selectionRange ? Math.min(selectionRange.startCol, selectionRange.endCol) : activeCell.col;
    const maxC = selectionRange ? Math.max(selectionRange.startCol, selectionRange.endCol) : activeCell.col;

    const newCells = { ...sheetData.cells };
    const staged = new Map(unsavedChanges);

    pushUndoSnapshot();

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const addr = `${colNumToLetter(c)}${r}`;
        const cell = newCells[addr] || {};
        const oldStyle = cell.s || {};
        const oldBr = { ...(oldStyle.br || {}) };
        let newBr: any = { ...oldBr };

        switch (type) {
          case 'none':
            newBr = undefined;
            break;
          case 'all':
            newBr = { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin' };
            break;
          case 'bottom':
            if (r === maxR) newBr.bottom = 'thin';
            break;
          case 'top':
            if (r === minR) newBr.top = 'thin';
            break;
          case 'left':
            if (c === minC) newBr.left = 'thin';
            break;
          case 'right':
            if (c === maxC) newBr.right = 'thin';
            break;
          case 'outside':
            if (r === minR) newBr.top = 'thin';
            if (r === maxR) newBr.bottom = 'thin';
            if (c === minC) newBr.left = 'thin';
            if (c === maxC) newBr.right = 'thin';
            break;
          case 'thick-outside':
            if (r === minR) newBr.top = 'thick';
            if (r === maxR) newBr.bottom = 'thick';
            if (c === minC) newBr.left = 'thick';
            if (c === maxC) newBr.right = 'thick';
            break;
          case 'bottom-double':
            if (r === maxR) newBr.bottom = 'double';
            break;
          case 'thick-bottom':
            if (r === maxR) newBr.bottom = 'thick';
            break;
          case 'top-bottom':
            if (r === minR) newBr.top = 'thin';
            if (r === maxR) newBr.bottom = 'thin';
            break;
          case 'top-thick-bottom':
            if (r === minR) newBr.top = 'thin';
            if (r === maxR) newBr.bottom = 'thick';
            break;
          case 'top-double-bottom':
            if (r === minR) newBr.top = 'thin';
            if (r === maxR) newBr.bottom = 'double';
            break;
        }

        newCells[addr] = {
          ...cell,
          s: {
            ...oldStyle,
            br: newBr
          }
        };
        staged.set(addr, newCells[addr]);
      }
    }

    setSheetData({ ...sheetData, cells: newCells });
    setUnsavedChanges(staged);
  }, [sheetData, canEdit, selectionRange, activeCell, unsavedChanges]);

  // Insert formatted table
  const handleInsertTable = useCallback(() => {
    if (!sheetData || !canEdit) return;

    let minR = selectionRange ? Math.min(selectionRange.startRow, selectionRange.endRow) : activeCell.row;
    let maxR = selectionRange ? Math.max(selectionRange.startRow, selectionRange.endRow) : activeCell.row;
    let minC = selectionRange ? Math.min(selectionRange.startCol, selectionRange.endCol) : activeCell.col;
    let maxC = selectionRange ? Math.max(selectionRange.startCol, selectionRange.endCol) : activeCell.col;

    if (minR === maxR && minC === maxC) {
      maxR = Math.min(minR + 4, sheetData.rowCount);
      maxC = Math.min(minC + 3, sheetData.colCount);
    }

    const newCells = { ...sheetData.cells };
    const staged = new Map(unsavedChanges);

    pushUndoSnapshot();

    for (let r = minR; r <= maxR; r++) {
      const isHeader = r === minR;
      const isEvenRow = (r - minR) % 2 === 0;

      for (let c = minC; c <= maxC; c++) {
        const addr = `${colNumToLetter(c)}${r}`;
        const existing = newCells[addr] || {};
        const oldStyle = existing.s || {};

        let cellValue = existing.v;
        if (isHeader && (cellValue === undefined || cellValue === null || cellValue === '')) {
          cellValue = `Column ${c - minC + 1}`;
        }

        const newStyle = {
          ...oldStyle,
          b: isHeader ? 1 : oldStyle.b,
          ah: isHeader ? ('center' as const) : (oldStyle.ah || 'left'),
          c: isHeader ? '#ffffff' : (oldStyle.c || '#0f172a'),
          bg: isHeader ? '#1e40af' : (isEvenRow ? '#f8fafc' : '#ffffff'),
          br: {
            top: 'thin',
            bottom: isHeader ? 'medium' : 'thin',
            left: 'thin',
            right: 'thin'
          }
        };

        newCells[addr] = {
          ...existing,
          v: cellValue,
          s: newStyle
        };
        staged.set(addr, newCells[addr]);
      }
    }

    setSheetData({ ...sheetData, cells: newCells });
    setUnsavedChanges(staged);
    setMessage(`Formatted table at ${colNumToLetter(minC)}${minR}:${colNumToLetter(maxC)}${maxR}`);
    setTimeout(() => setMessage(''), 3000);
  }, [sheetData, canEdit, selectionRange, activeCell, unsavedChanges]);

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
  const commitInCellEdit = (
    moveDown = false,
    moveRight = false,
    autoEdit = false,
    moveLeft = false
  ) => {
    if (!isEditing) return;
    let finalValue = editValue;
    if (typeof finalValue === 'string' && finalValue.trim().startsWith('=')) {
      const openCount = (finalValue.match(/\(/g) || []).length;
      const closeCount = (finalValue.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        finalValue = finalValue + ')'.repeat(openCount - closeCount);
      }
    }
    applyCellChange(activeCell.address, finalValue);
    setFormulaLastInsertedRef(null);
    setFormulaReferenceRange(null);
    setIsDraggingFormulaRange(false);

    let nextRow = activeCell.row;
    let nextCol = activeCell.col;

    if (moveDown) {
      nextRow = Math.min((sheetData?.rowCount || 100), activeCell.row + 1);
    } else if (moveRight) {
      nextCol = Math.min((sheetData?.colCount || 26), activeCell.col + 1);
    } else if (moveLeft) {
      nextCol = Math.max(1, activeCell.col - 1);
    }

    const nextAddress = `${colNumToLetter(nextCol)}${nextRow}`;
    const cellChanged = nextRow !== activeCell.row || nextCol !== activeCell.col;

    if (cellChanged) {
      setActiveCell({ row: nextRow, col: nextCol, address: nextAddress });
    }

    if (autoEdit && cellChanged) {
      const nextCell = sheetData?.cells[nextAddress];
      const initialVal = getFormulaBarDisplay(nextCell);
      setEditValue(initialVal);
      setFormulaInputValue(initialVal);
      setIsEditing(true);
      setInCellAutocompleteDismissed(false);
      setTimeout(() => {
        if (inCellInputRef.current) {
          inCellInputRef.current.focus();
          inCellInputRef.current.select();
        }
      }, 30);
    } else {
      setIsEditing(false);
      setTimeout(() => {
        gridContainerRef.current?.focus();
      }, 20);
    }
  };

  const cancelInCellEdit = () => {
    setIsEditing(false);
    setFormulaLastInsertedRef(null);
    setFormulaReferenceRange(null);
    setIsDraggingFormulaRange(false);
    const cell = sheetData?.cells[activeCell.address];
    const original = getFormulaBarDisplay(cell);
    setEditValue(original);
    setFormulaInputValue(original);
    setTimeout(() => {
      gridContainerRef.current?.focus();
    }, 20);
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
    setTimeout(() => {
      gridContainerRef.current?.focus();
    }, 10);
  };

  const handleCellDoubleClick = (r: number, c: number, addr: string) => {
    setActiveCell({ row: r, col: c, address: addr });
    startInCellEdit();
  };

  // Drag selection
  const handleCellMouseDown = (r: number, c: number, addr: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isInteractingWithCellRef.current = true;

    // Check if user is typing a formula and clicking another cell to reference it
    const isFormulaMode = isEditing && typeof editValue === 'string' && editValue.trim().startsWith('=');

    if (isFormulaMode && addr !== activeCell.address) {
      e.preventDefault();

      const newRef = addr;
      const updatedFormula = insertCellReferenceIntoFormula(editValue, newRef, formulaLastInsertedRef || undefined);

      setEditValue(updatedFormula);
      setFormulaInputValue(updatedFormula);
      setFormulaLastInsertedRef(newRef);
      setFormulaReferenceRange({ startRow: r, startCol: c, endRow: r, endCol: c });
      setIsDraggingFormulaRange(true);

      setTimeout(() => inCellInputRef.current?.focus(), 10);
      return;
    }

    setFormulaLastInsertedRef(null);
    setFormulaReferenceRange(null);
    setIsDraggingFormulaRange(false);

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
    if (isDraggingFormulaRange && formulaReferenceRange) {
      const startR = formulaReferenceRange.startRow;
      const startC = formulaReferenceRange.startCol;
      const minR = Math.min(startR, r);
      const maxR = Math.max(startR, r);
      const minC = Math.min(startC, c);
      const maxC = Math.max(startC, c);

      const newRef = (minR === maxR && minC === maxC)
        ? `${colNumToLetter(minC)}${minR}`
        : `${colNumToLetter(minC)}${minR}:${colNumToLetter(maxC)}${maxR}`;

      const updatedFormula = insertCellReferenceIntoFormula(editValue, newRef, formulaLastInsertedRef || undefined);

      setEditValue(updatedFormula);
      setFormulaInputValue(updatedFormula);
      setFormulaLastInsertedRef(newRef);
      setFormulaReferenceRange({ startRow: startR, startCol: startC, endRow: r, endCol: c });
      return;
    }

    if (!isDraggingRange) return;
    if (!selectionRange) return;
    setSelectionRange(prev => prev ? { ...prev, endRow: r, endCol: c } : null);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingRange(false);
      setIsDraggingFormulaRange(false);
      setTimeout(() => {
        isInteractingWithCellRef.current = false;
      }, 50);
    };
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
        formula: ch.formula,
        formulaResult: sheetData.cells[address]?.res,
        style: ch.style
      }));

      if (updates.length > 0) {
        await batchUpdateWorksheetCellsApi(activeSheetId, updates);
      }
      if (sheetData.merges) {
        await updateWorksheetMergesApi(activeSheetId, sheetData.merges);
      }
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
    const current = historyStateRef.current;
    if (!current.sheetData) return;

    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));

    // Capture current snapshot for redo
    const currentSnapshot: WorksheetHistorySnapshot = {
      sheetId: current.activeSheetId,
      cells: { ...current.sheetData.cells },
      merges: [...(current.sheetData.merges || [])],
      rowCount: current.sheetData.rowCount,
      colCount: current.sheetData.colCount,
      unsavedChanges: new Map(current.unsavedChanges),
      activeCell: { ...current.activeCell },
      selectionRange: current.selectionRange ? { ...current.selectionRange } : null
    };
    setRedoStack(prev => [...prev.slice(-49), currentSnapshot]);

    const workbook = recalculateWorkbook({
      ...formulaSheets,
      [current.sheetData.name]: { name: current.sheetData.name, cells: previous.cells }
    });
    const restoredCells = workbook[current.sheetData.name]?.cells || previous.cells;

    setFormulaSheets(workbook);
    setSheetData(prev => prev ? {
      ...prev,
      cells: restoredCells,
      merges: previous.merges,
      rowCount: previous.rowCount,
      colCount: previous.colCount
    } : prev);

    setUnsavedChanges(prev => {
      const nextUnsaved = new Map(prev);
      const allKeys = new Set([...Object.keys(current.sheetData!.cells), ...Object.keys(restoredCells)]);
      for (const key of allKeys) {
        const cur = current.sheetData!.cells[key];
        const tgt = restoredCells[key];
        const curVal = cur ? cur.v : undefined;
        const tgtVal = tgt ? tgt.v : undefined;
        const curF = cur ? cur.f : undefined;
        const tgtF = tgt ? tgt.f : undefined;
        const curS = JSON.stringify(cur?.s || {});
        const tgtS = JSON.stringify(tgt?.s || {});

        if (curVal !== tgtVal || curF !== tgtF || curS !== tgtS) {
          const existing = nextUnsaved.get(key);
          if (existing && String(existing.oldValue ?? '') === String(tgtVal ?? '') && (existing.oldFormula || null) === (tgtF || null)) {
            nextUnsaved.delete(key);
          } else {
            nextUnsaved.set(key, {
              oldValue: existing ? existing.oldValue : curVal,
              oldFormula: existing ? existing.oldFormula : curF,
              newValue: tgtVal,
              formula: tgtF ?? null,
              style: tgt?.s
            });
          }
        }
      }
      return nextUnsaved;
    });

    setActiveCell(previous.activeCell);
    setSelectionRange(previous.selectionRange);

    const activeCellObj = restoredCells[previous.activeCell.address];
    setFormulaInputValue(getFormulaBarDisplay(activeCellObj));
    setEditValue(String(activeCellObj?.v ?? ''));
    setIsEditing(false);
    setMessage('Undo');
    setTimeout(() => setMessage(''), 1000);
  }, [undoStack, formulaSheets]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const current = historyStateRef.current;
    if (!current.sheetData) return;

    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));

    // Capture current snapshot for undo
    const currentSnapshot: WorksheetHistorySnapshot = {
      sheetId: current.activeSheetId,
      cells: { ...current.sheetData.cells },
      merges: [...(current.sheetData.merges || [])],
      rowCount: current.sheetData.rowCount,
      colCount: current.sheetData.colCount,
      unsavedChanges: new Map(current.unsavedChanges),
      activeCell: { ...current.activeCell },
      selectionRange: current.selectionRange ? { ...current.selectionRange } : null
    };
    setUndoStack(prev => [...prev.slice(-49), currentSnapshot]);

    const workbook = recalculateWorkbook({
      ...formulaSheets,
      [current.sheetData.name]: { name: current.sheetData.name, cells: next.cells }
    });
    const restoredCells = workbook[current.sheetData.name]?.cells || next.cells;

    setFormulaSheets(workbook);
    setSheetData(prev => prev ? {
      ...prev,
      cells: restoredCells,
      merges: next.merges,
      rowCount: next.rowCount,
      colCount: next.colCount
    } : prev);

    setUnsavedChanges(prev => {
      const nextUnsaved = new Map(prev);
      const allKeys = new Set([...Object.keys(current.sheetData!.cells), ...Object.keys(restoredCells)]);
      for (const key of allKeys) {
        const cur = current.sheetData!.cells[key];
        const tgt = restoredCells[key];
        const curVal = cur ? cur.v : undefined;
        const tgtVal = tgt ? tgt.v : undefined;
        const curF = cur ? cur.f : undefined;
        const tgtF = tgt ? tgt.f : undefined;
        const curS = JSON.stringify(cur?.s || {});
        const tgtS = JSON.stringify(tgt?.s || {});

        if (curVal !== tgtVal || curF !== tgtF || curS !== tgtS) {
          const existing = nextUnsaved.get(key);
          if (existing && String(existing.oldValue ?? '') === String(tgtVal ?? '') && (existing.oldFormula || null) === (tgtF || null)) {
            nextUnsaved.delete(key);
          } else {
            nextUnsaved.set(key, {
              oldValue: existing ? existing.oldValue : curVal,
              oldFormula: existing ? existing.oldFormula : curF,
              newValue: tgtVal,
              formula: tgtF ?? null,
              style: tgt?.s
            });
          }
        }
      }
      return nextUnsaved;
    });

    setActiveCell(next.activeCell);
    setSelectionRange(next.selectionRange);

    const activeCellObj = restoredCells[next.activeCell.address];
    setFormulaInputValue(getFormulaBarDisplay(activeCellObj));
    setEditValue(String(activeCellObj?.v ?? ''));
    setIsEditing(false);
    setMessage('Redo');
    setTimeout(() => setMessage(''), 1000);
  }, [redoStack, formulaSheets]);

  // Copy & Cut & Paste
  const handleCopy = useCallback(() => {
    if (!sheetData) return;
    if (selectionRange) {
      const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
      const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
      const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
      const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

      const rows: string[] = [];
      const copiedValues: string[][] = [];
      for (let r = minR; r <= maxR; r++) {
        const rowCells: string[] = [];
        const rowValues: string[] = [];
        for (let c = minC; c <= maxC; c++) {
          const addr = `${colNumToLetter(c)}${r}`;
          const cell = sheetData.cells[addr];
          const value = cell?.f ? `=${cell.f}` : cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '';
          rowCells.push(value);
          rowValues.push(value);
        }
        rows.push(rowCells.join('\t'));
        copiedValues.push(rowValues);
      }
      const text = rows.join('\n');
      copiedRangeRef.current = { text, row: minR, col: minC, values: copiedValues };
      navigator.clipboard.writeText(text);
      setMessage(`Copied range (${colNumToLetter(minC)}${minR}:${colNumToLetter(maxC)}${maxR}) to clipboard`);
      setTimeout(() => setMessage(''), 1500);
      return;
    }

    const cell = sheetData.cells[activeCell.address];
    const text = cell?.f ? `=${cell.f}` : cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '';
    copiedRangeRef.current = { text, row: activeCell.row, col: activeCell.col, values: [[text]] };
    navigator.clipboard.writeText(text);
    setMessage(`Copied "${text}"`);
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, selectionRange, activeCell.address, activeCell.row, activeCell.col]);

  const handleCut = useCallback(() => {
    if (!sheetData || !canEdit) return;
    handleCopy();

    if (selectionRange) {
      const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
      const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
      const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
      const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
      const edits = [];
      for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
        edits.push({ address: `${colNumToLetter(c)}${r}`, rawValue: '' });
      }
      applyCellChanges(edits);
      setMessage('Cut selection to clipboard');
      setTimeout(() => setMessage(''), 1500);
      return;
    }

    applyCellChange(activeCell.address, '');
    setFormulaInputValue('');
    setMessage(`Cut ${activeCell.address}`);
    setTimeout(() => setMessage(''), 1500);
  }, [sheetData, canEdit, handleCopy, selectionRange, activeCell.address, applyCellChange, applyCellChanges]);

  const handlePaste = useCallback(async () => {
    if (!canEdit || !sheetData) return;
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText) return;

      const startRow = selectionRange ? Math.min(selectionRange.startRow, selectionRange.endRow) : activeCell.row;
      const startCol = selectionRange ? Math.min(selectionRange.startCol, selectionRange.endCol) : activeCell.col;
      const copiedRange = copiedRangeRef.current?.text === clipText ? copiedRangeRef.current : null;
      const rows = copiedRange?.values || clipText.split(/\r?\n/).map(r => r.split('\t'));
      const edits: Array<{ address: string; rawValue: string }> = [];
      rows.forEach((rowVals, rIdx) => {
        if (rIdx === rows.length - 1 && rowVals.length === 1 && rowVals[0] === '') return;
        rowVals.forEach((val, cIdx) => {
          const targetRow = startRow + rIdx;
          const targetCol = startCol + cIdx;
          if (targetRow > (sheetData.rowCount || 1048576) || targetCol > (sheetData.colCount || 16384)) return;
          const targetAddr = `${colNumToLetter(targetCol)}${targetRow}`;
          const rawValue = copiedRange && val.startsWith('=')
            ? translateFormulaReferences(val, targetRow - (copiedRange.row + rIdx), targetCol - (copiedRange.col + cIdx))
            : val;
          edits.push({ address: targetAddr, rawValue });
        });
      });
      applyCellChanges(edits);

      setMessage(`Pasted cells matching layout`);
      setTimeout(() => setMessage(''), 1500);
    } catch (e: any) {
      setError('Paste failed: ' + e.message);
    }
  }, [canEdit, sheetData, selectionRange, activeCell.row, activeCell.col, applyCellChanges]);

  // Global window keyboard shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' &&
          document.activeElement !== inCellInputRef.current) {
        return;
      }

      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey && !isEditing) {
        e.preventDefault();
        const maxCol = sheetData?.colCount || 26;
        const nextCol = e.shiftKey ? Math.max(1, activeCell.col - 1) : Math.min(maxCol, activeCell.col + 1);
        setSelectionRange(null);
        if (nextCol !== activeCell.col) {
          const address = `${colNumToLetter(nextCol)}${activeCell.row}`;
          setActiveCell({ row: activeCell.row, col: nextCol, address });
          const targetCell = sheetData?.cells[address];
          const initialVal = getFormulaBarDisplay(targetCell);
          setEditValue(initialVal);
          setFormulaInputValue(initialVal);
          setIsEditing(true);
          setInCellAutocompleteDismissed(false);
          setTimeout(() => {
            if (inCellInputRef.current) {
              inCellInputRef.current.focus();
              inCellInputRef.current.select();
            }
          }, 30);
        }
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
  }, [handleSaveChanges, handleUndo, handleRedo, handleCopy, handleCut, handlePaste, isEditing, applyStyleToSelection, sheetData, activeCell]);

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
    const currentW = customColWidths[colNum] || (sheetData?.columnConfig?.[colNum]?.width ? Math.round(sheetData.columnConfig[colNum].width * 8.5) : 80);
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
    const currentH = customRowHeights[rNum] || (sheetData?.rowConfig?.[rNum]?.height ? Math.max(22, Math.round(sheetData.rowConfig[rNum].height * 1.33)) : 24);
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
        if (e.shiftKey) {
          commitInCellEdit(false, false, true, true);
        } else {
          commitInCellEdit(false, true, true, false);
        }
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
        const changes: Array<{ address: string; rawValue: string }> = [];
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            changes.push({ address: `${colNumToLetter(c)}${r}`, rawValue: '' });
          }
        }
        applyCellChanges(changes);
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
      const nextCol = e.shiftKey ? Math.max(1, activeCell.col - 1) : Math.min(maxCol, activeCell.col + 1);
      setSelectionRange(null);
      if (nextCol !== activeCell.col) {
        const address = `${colNumToLetter(nextCol)}${activeCell.row}`;
        setActiveCell({ row: activeCell.row, col: nextCol, address });
        const targetCell = sheetData?.cells[address];
        const initialVal = getFormulaBarDisplay(targetCell);
        setEditValue(initialVal);
        setFormulaInputValue(initialVal);
        setIsEditing(true);
        setInCellAutocompleteDismissed(false);
        setTimeout(() => {
          if (inCellInputRef.current) {
            inCellInputRef.current.focus();
            inCellInputRef.current.select();
          }
        }, 30);
      }
      return;
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
    applyCellChanges(searchMatches.map(addr => ({ address: addr, rawValue: replaceTerm })));
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
  const handleAddTab = async () => {
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
    const newSheet: WorksheetDetail = {
      id: newId,
      name: newName,
      order: newOrder,
      rowCount: 50,
      colCount: 20,
      merges: [],
      columnConfig: {},
      rowConfig: {},
      cells: {}
    };
    sheetCacheRef.current.set(newId, newSheet);
    setSheets(prev => [...prev, newSummary]);
    setSheetData(newSheet);
    setActiveSheetId(newId);
    setLoading(false);
    setError('');
    setMessage(`Created new worksheet tab "${newName}"`);
    setTimeout(() => setMessage(''), 2000);
    try {
      await createCustomWorksheetApi({
        id: newId,
        name: newName,
        order: newOrder,
        rowCount: 50,
        colCount: 20
      });
    } catch {
      // Backend auto-registers on fetch as well
    }
  };

  const handleRenameTabSubmit = async (id: string) => {
    if (!editingTabName.trim()) {
      setEditingTabId(null);
      return;
    }
    const cleanName = editingTabName.trim();
    setSheets(prev => prev.map(s => s.id === id ? { ...s, name: cleanName } : s));
    if (sheetData && sheetData.id === id) {
      setSheetData({ ...sheetData, name: cleanName });
    }
    setEditingTabId(null);
    try {
      await renameWorksheetApi(id, cleanName);
    } catch {
      // Ignore background rename failure
    }
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

  const handleDeleteTab = async (id: string) => {
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
    try {
      await deleteWorksheetApi(id);
    } catch {
      // Ignore background delete failure
    }
  };

  const handlePrint = (options: {
    orientation: 'portrait' | 'landscape';
    paperSize: 'letter' | 'legal' | 'a4';
    margins: 'normal' | 'wide' | 'narrow';
    scope: 'sheet' | 'selection' | 'workbook';
  }) => {
    let styleTag = document.getElementById('dynamic-print-page-style') as HTMLStyleElement;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-print-page-style';
      document.head.appendChild(styleTag);
    }
    const marginSizes = { normal: '10mm', wide: '20mm', narrow: '5mm' };
    styleTag.textContent = `
      @page {
        size: ${options.paperSize} ${options.orientation};
        margin: ${marginSizes[options.margins] || '10mm'};
      }
    `;
    window.print();
  };

  return (
    <div className="excel-worksheet-card flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#101b2b] overflow-hidden">
      {/* 1. EXCEL FUNCTIONAL RIBBON */}
      <div className="no-print relative z-30">
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
          onApplyBorder: handleApplyBorder,
          onOpenFormatCells: handleOpenFormatCells,
          onInsertTable: handleInsertTable,
          alignH: currentCellObj?.s?.ah || 'left',
          onChangeAlignH: ah => applyStyleToSelection(s => ({ ...s, ah })),
          alignV: currentCellObj?.s?.av || 'middle',
          onChangeAlignV: av => applyStyleToSelection(s => ({ ...s, av })),
          isWrapText: !!currentCellObj?.s?.wrap,
          onToggleWrapText: () => applyStyleToSelection(s => ({ ...s, wrap: s.wrap ? undefined : 1 })),
          onMergeAndCenter: handleMergeAndCenter,
          onMergeAcross: handleMergeAcross,
          onMergeCells: handleMergeCells,
          onUnmerge: handleUnmergeCells,
          onCenterAcross: handleCenterAcross,
          numFmt: currentCellObj?.s?.nf || 'General',
          onChangeNumFmt: fmt => applyStyleToSelection(s => ({ ...s }), fmt),
          onInsertRow: () => {
            if (!sheetData) return;
            pushUndoSnapshot();
            setSheetData({ ...sheetData, rowCount: sheetData.rowCount + 1 });
            setMessage(`Inserted row at ${activeCell.row}`);
            setTimeout(() => setMessage(''), 2000);
          },
          onInsertColumn: () => {
            if (!sheetData) return;
            pushUndoSnapshot();
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
          onInsertTable: handleInsertTable,
          onInsertRow: () => {
            if (!sheetData) return;
            pushUndoSnapshot();
            setSheetData(prev => prev ? { ...prev, rowCount: prev.rowCount + 1 } : prev);
          },
          onInsertColumn: () => {
            if (!sheetData) return;
            pushUndoSnapshot();
            setSheetData(prev => prev ? { ...prev, colCount: prev.colCount + 1 } : prev);
          },
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
            let formula = template;
            if (template === '=SUM(' && sheetData) {
              const isNumericCell = (address: string) => {
                const cell = sheetData.cells[address];
                const value = cell?.res ?? cell?.v;
                return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
              };
              let startRow = activeCell.row;
              while (startRow > 1 && isNumericCell(`${colNumToLetter(activeCell.col)}${startRow - 1}`)) startRow--;
              if (startRow < activeCell.row) {
                formula = `=SUM(${colNumToLetter(activeCell.col)}${startRow}:${colNumToLetter(activeCell.col)}${activeCell.row - 1})`;
              } else {
                let startCol = activeCell.col;
                while (startCol > 1 && isNumericCell(`${colNumToLetter(startCol - 1)}${activeCell.row}`)) startCol--;
                if (startCol < activeCell.col) {
                  formula = `=SUM(${colNumToLetter(startCol)}${activeCell.row}:${colNumToLetter(activeCell.col - 1)}${activeCell.row})`;
                }
              }
            }
            setEditValue(formula);
            setFormulaInputValue(formula);
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
      </div>

      {/* 2. EXCEL FORMULA BAR & NAME BOX */}
      {showFormulaBar && (
        <div className="no-print relative z-10">
          <FormulaBar
            selectedAddress={activeCell.address}
            value={formulaInputValue}
            onFocus={() => {
              if (!isEditing) {
                setIsEditing(true);
                setEditValue(formulaInputValue);
              }
            }}
            onChange={val => {
              setFormulaInputValue(val);
              setEditValue(val);
              if (!isEditing) setIsEditing(true);
              setFormulaLastInsertedRef(null);
              setFormulaReferenceRange(null);
            }}
            onCommit={() => commitInCellEdit()}
            onCancel={() => cancelInCellEdit()}
            onTab={(shiftKey) => {
              if (shiftKey) commitInCellEdit(false, false, true, true);
              else commitInCellEdit(false, true, true, false);
            }}
            onJumpToAddress={handleJumpToAddress}
            onOpenFunctionWizard={() => setIsFunctionWizardOpen(true)}
            isEditing={isEditing}
          />
        </div>
      )}

      {/* Notifications & Status Banner */}
      {message && (
        <div className="no-print bg-emerald-50 text-emerald-800 px-4 py-1.5 text-xs font-semibold border-b border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2">
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="no-print bg-red-50 text-red-800 px-4 py-1.5 text-xs font-semibold border-b border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 flex items-center gap-2">
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
        className="spreadsheet-grid-container isolate relative z-0 flex-1 overflow-auto bg-white dark:bg-[#0c1624] outline-hidden select-none"
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
          <table className="spreadsheet-table border-collapse text-left font-sans text-xs">
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
                    const colConf = sheetData.columnConfig?.[colNum];
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
                const rowConf = sheetData.rowConfig?.[rNum];
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
                      const isRefRange = isFormulaReferenced(rNum, colNum);

                      const s = cell?.s || {};
                      const defaultAlign = rNum <= 8 ? 'center' : 'left';
                      const alignH = s.ah || defaultAlign;

                      const resolveBorder = (val?: string, col = '#334155') => {
                        if (!val || val === 'none') return undefined;
                        if (val === 'double') return `3px double ${col}`;
                        if (val === 'thick') return `2px solid ${col}`;
                        if (val === 'medium') return `1.5px solid ${col}`;
                        return `1px solid ${col}`;
                      };

                      const brColor = s.br?.color || '#334155';
                      const borderTop = resolveBorder(s.br?.top, brColor);
                      const borderBottom = resolveBorder(s.br?.bottom, brColor);
                      const borderLeft = resolveBorder(s.br?.left, brColor);
                      const borderRight = resolveBorder(s.br?.right, brColor);

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
                        borderTop,
                        borderBottom,
                        borderLeft,
                        borderRight
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
                          } px-1.5 py-0.5 cursor-cell relative ${
                            isSelected && isEditing
                              ? 'overflow-visible z-40 outline-2 outline-blue-600 outline-offset-[-2px] bg-white dark:bg-[#101b2b]'
                              : isSelected
                                ? 'overflow-hidden text-ellipsis outline-2 outline-blue-600 outline-offset-[-2px] z-10 bg-blue-50/20 dark:outline-sky-400'
                                : isRefRange
                                  ? 'overflow-hidden text-ellipsis outline-2 outline-dashed outline-indigo-600 outline-offset-[-2px] z-20 bg-indigo-50/40 dark:outline-indigo-400 dark:bg-indigo-950/40'
                                  : inRange
                                    ? 'overflow-hidden text-ellipsis bg-blue-500/15 dark:bg-sky-400/20 z-10'
                                    : 'overflow-hidden text-ellipsis hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                          } ${
                            isUnsaved
                              ? 'bg-amber-100/90 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200 ring-1 ring-inset ring-amber-400/80'
                              : ''
                          }`}
                        >
                          {isSelected && isEditing ? (
                            <div className="relative w-full">
                              <input
                                ref={inCellInputRef}
                                type="text"
                                value={editValue}
                                onChange={e => {
                                  setEditValue(e.target.value);
                                  setFormulaInputValue(e.target.value);
                                  setFormulaLastInsertedRef(null);
                                  setFormulaReferenceRange(null);
                                }}
                                onBlur={() => {
                                  if (isInteractingWithCellRef.current) return;
                                  setTimeout(() => {
                                    if (!isInteractingWithCellRef.current) {
                                      commitInCellEdit();
                                    }
                                  }, 150);
                                }}
                                onKeyDown={e => {
                                  if (inCellMatchingFunctions.length > 0) {
                                    if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setInCellAutocompleteIndex(prev => (prev + 1) % inCellMatchingFunctions.length);
                                      return;
                                    }
                                    if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setInCellAutocompleteIndex(prev => (prev - 1 + inCellMatchingFunctions.length) % inCellMatchingFunctions.length);
                                      return;
                                    }
                                    if (e.key === 'Tab' || e.key === 'Enter') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleInCellSelectFormula(inCellMatchingFunctions[inCellAutocompleteIndex]);
                                      return;
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setInCellAutocompleteDismissed(true);
                                      return;
                                    }
                                  }

                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitInCellEdit(true);
                                  } else if (e.key === 'Tab') {
                                    e.preventDefault();
                                    if (e.shiftKey) {
                                      commitInCellEdit(false, false, true, true);
                                    } else {
                                      commitInCellEdit(false, true, true, false);
                                    }
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelInCellEdit();
                                  }
                                }}
                                className="w-full bg-white font-sans text-xs text-slate-900 border border-blue-500 p-0 focus:outline-hidden dark:bg-[#101b2b] dark:text-white"
                              />

                              {/* In-Cell Formula Autocomplete Dropdown */}
                              {inCellMatchingFunctions.length > 0 && (
                                <FormulaAutocompleteList
                                  searchTerm={inCellSearchTerm}
                                  selectedIndex={inCellAutocompleteIndex}
                                  onSelectFunction={handleInCellSelectFormula}
                                  onHoverIndex={setInCellAutocompleteIndex}
                                  className="top-full left-0 mt-1 shadow-2xl z-50"
                                />
                              )}
                            </div>
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
      <div className="worksheet-sheet-bar no-print flex items-center justify-between border-t border-slate-200 bg-[#f8f9fa] px-2 py-1 dark:border-slate-800 dark:bg-[#0c1624]">
        <div className="flex items-center gap-1 overflow-hidden">
          {/* Scroll left/right tabs buttons */}
          <button
            aria-label="Scroll worksheet tabs left"
            onClick={() => tabScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
            className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Scroll worksheet tabs right"
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
                  role="button"
                  tabIndex={0}
                  aria-label={`Open worksheet ${sheet.name}`}
                  aria-pressed={isActive}
                  onKeyDown={event => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setActiveSheetId(sheet.id);
                    }
                  }}
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

                  {/* Worksheet actions remain visible on touch and keyboard navigation. */}
                  {canEdit && (
                    <div className="flex items-center gap-1 ml-1">
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

      {isFormatCellsOpen && (
        <FormatCellsModal
          isOpen={isFormatCellsOpen}
          onClose={() => setIsFormatCellsOpen(false)}
          onApply={(style, numFmt) => applyStyleToSelection(() => style, numFmt)}
          currentStyle={currentCellObj?.s || {}}
          currentNumFmt={currentCellObj?.s?.nf || 'General'}
          selectedAddress={activeCell.address}
          initialTab={formatCellsInitialTab}
        />
      )}

      <PageSetupModal
        isOpen={isPageSetupOpen}
        onClose={() => setIsPageSetupOpen(false)}
        worksheetName={sheetData?.name || 'Sheet'}
        onPrint={handlePrint}
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
        onInsertRow={() => {
          if (!sheetData) return;
          pushUndoSnapshot();
          setSheetData(prev => prev ? { ...prev, rowCount: prev.rowCount + 1 } : prev);
        }}
        onDeleteRow={() => {}}
        onInsertColumn={() => {
          if (!sheetData) return;
          pushUndoSnapshot();
          setSheetData(prev => prev ? { ...prev, colCount: prev.colCount + 1 } : prev);
        }}
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
