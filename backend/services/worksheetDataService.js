import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { supabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_PATH = path.join(__dirname, '..', 'store', 'cached_worksheet_data.json');
export const getReferencePath = () => {
  const storePath = path.join(__dirname, '..', 'store', 'disposition September 7, 2026.xlsx');
  if (fs.existsSync(storePath)) return storePath;
  const srcPath = path.join(__dirname, '..', '..', 'src', 'reference', 'disposition September 7, 2026.xlsx');
  if (fs.existsSync(srcPath)) return srcPath;
  return storePath;
};
const REFERENCE_PATH = getReferencePath();

let cachedWorksheets = null;
let cellOverrides = new Map(); // key: "sheetId:address" -> { value, formula, formulaResult, style, updatedBy, updatedAt }
let auditLogs = [];
let worksheetStateLoaded = false;
let worksheetStateLoadPromise = null;
let worksheetLegacySchema = false;
const LEGACY_WORKSHEET_VALUE_PREFIX = '__PAIS_CELL_V1__';

export function encodeLegacyWorksheetValue(override) {
  return `${LEGACY_WORKSHEET_VALUE_PREFIX}${JSON.stringify({
    value: override.value ?? null,
    formulaResult: override.formulaResult ?? null,
    style: override.style ?? null
  })}`;
}

export function decodeLegacyWorksheetValue(rawValue) {
  if (typeof rawValue !== 'string' || !rawValue.startsWith(LEGACY_WORKSHEET_VALUE_PREFIX)) {
    return { value: rawValue };
  }
  try {
    return JSON.parse(rawValue.slice(LEGACY_WORKSHEET_VALUE_PREFIX.length));
  } catch {
    return { value: rawValue };
  }
}

function isMissingWorksheetColumnsError(error) {
  return error?.code === '42703'
    || error?.code === 'PGRST204'
    || /column .* does not exist|could not find .* column/i.test(error?.message || '');
}

const worksheetStorageError = error => new Error(
  `Worksheet storage unavailable. Apply backend/scripts/migrate_worksheet_module.sql in Supabase, then retry. Details: ${error?.message || 'Unknown database error'}`
);

export async function loadWorksheetPersistence({ required = true } = {}) {
  if (!required) return;
  if (!supabase || worksheetStateLoaded) return;
  if (worksheetStateLoadPromise) return worksheetStateLoadPromise;
  worksheetStateLoadPromise = (async () => {
    let { data: overrides, error: overridesError } = await supabase
      .from('worksheet_cell_overrides')
      .select('worksheet_id,cell_address,value,value_json,formula,formula_result_json,style_json,updated_by,updated_at');
    if (overridesError && isMissingWorksheetColumnsError(overridesError)) {
      // Older deployments still have the original TEXT value and formula
      // columns. Keep them usable while the optional JSON columns are absent.
      const legacyResult = await supabase
        .from('worksheet_cell_overrides')
        .select('worksheet_id,cell_address,value,formula,updated_by,updated_at');
      overrides = legacyResult.data;
      overridesError = legacyResult.error;
      worksheetLegacySchema = !overridesError;
    }
    if (overridesError) throw worksheetStorageError(overridesError);

    const { data: logs, error: logsError } = await supabase
      .from('worksheet_audit_logs')
      .select('id,worksheet_id,worksheet_name,cell_address,personnel_id,field_name,old_value,new_value,action,modified_by,timestamp')
      .order('timestamp', { ascending: false })
      .limit(500);
    if (logsError) throw worksheetStorageError(logsError);

    cellOverrides = new Map((overrides || []).map(row => {
      const legacy = decodeLegacyWorksheetValue(row.value);
      const hasLegacyPayload = worksheetLegacySchema
        || (typeof row.value === 'string' && row.value.startsWith(LEGACY_WORKSHEET_VALUE_PREFIX));
      return [`${row.worksheet_id}:${row.cell_address}`, {
        // Older override rows predate value_json, and newer rows can still have
        // NULL there when they were written by the legacy client.
        value: worksheetLegacySchema
          ? legacy.value
          : row.value_json !== null && row.value_json !== undefined ? row.value_json : legacy.value,
        formula: row.formula,
        formulaResult: worksheetLegacySchema || (row.formula_result_json == null && hasLegacyPayload)
          ? legacy.formulaResult : row.formula_result_json,
        style: worksheetLegacySchema || (row.style_json == null && hasLegacyPayload)
          ? legacy.style : row.style_json,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at
      }];
    }));
    auditLogs = (logs || []).map(row => ({
      id: row.id,
      worksheetId: row.worksheet_id,
      worksheetName: row.worksheet_name,
      cellAddress: row.cell_address,
      personnelId: row.personnel_id,
      fieldName: row.field_name,
      oldValue: row.old_value,
      newValue: row.new_value,
      action: row.action,
      modifiedBy: row.modified_by,
      timestamp: row.timestamp
    }));
    worksheetStateLoaded = true;
  })();
  try {
    await worksheetStateLoadPromise;
  } finally {
    worksheetStateLoadPromise = null;
  }
}

async function persistWorksheetOverride(sheet, address, override, enabled = true) {
  if (!supabase || !enabled) return;
  const record = worksheetLegacySchema ? {
    id: `${sheet.id}:${address}`,
    worksheet_id: sheet.id,
    cell_address: address,
    value: encodeLegacyWorksheetValue(override),
    formula: override.formula ?? null,
    updated_by: override.updatedBy,
    updated_at: override.updatedAt
  } : {
    id: `${sheet.id}:${address}`,
    worksheet_id: sheet.id,
    cell_address: address,
    value: override.value === null || override.value === undefined ? null : String(override.value),
    value_json: override.value ?? null,
    formula: override.formula ?? null,
    formula_result_json: override.formulaResult ?? null,
    style_json: override.style ?? null,
    updated_by: override.updatedBy,
    updated_at: override.updatedAt
  };
  const { error } = await supabase.from('worksheet_cell_overrides').upsert(record, { onConflict: 'id' });
  if (error) throw worksheetStorageError(error);
}

async function persistWorksheetAudit(logEntry, enabled = true) {
  if (!supabase || !enabled) return;
  const { error } = await supabase.from('worksheet_audit_logs').insert({
    id: logEntry.id,
    worksheet_id: logEntry.worksheetId,
    worksheet_name: logEntry.worksheetName,
    cell_address: logEntry.cellAddress,
    personnel_id: logEntry.personnelId,
    field_name: logEntry.fieldName,
    old_value: logEntry.oldValue,
    new_value: logEntry.newValue,
    action: logEntry.action,
    modified_by: logEntry.modifiedBy,
    timestamp: logEntry.timestamp
  });
  if (error) throw worksheetStorageError(error);
}

function applyWorksheetOverrideStyle(cell, style = {}) {
  if (style.nf) cell.numFmt = style.nf;
  const color = value => {
    if (typeof value !== 'string') return undefined;
    const hex = value.replace(/^#/, '');
    return /^[0-9a-f]{6}$/i.test(hex) ? { argb: `FF${hex.toUpperCase()}` } : undefined;
  };
  const font = {
    ...(cell.font || {}),
    ...(style.b !== undefined ? { bold: Boolean(style.b) } : {}),
    ...(style.i !== undefined ? { italic: Boolean(style.i) } : {}),
    ...(style.u !== undefined ? { underline: Boolean(style.u) } : {}),
    ...(style.fn ? { name: style.fn } : {}),
    ...(style.sz ? { size: Number(style.sz) } : {}),
    ...(style.c ? { color: color(style.c) } : {})
  };
  if (Object.keys(font).length) cell.font = font;
  const fillColor = color(style.bg);
  if (fillColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: fillColor };
  if (style.ah || style.av || style.wrap !== undefined) {
    cell.alignment = {
      ...(cell.alignment || {}),
      ...(style.ah ? { horizontal: style.ah } : {}),
      ...(style.av ? { vertical: style.av } : {}),
      ...(style.wrap !== undefined ? { wrapText: Boolean(style.wrap) } : {})
    };
  }
}

export const ALLOWED_WORKSHEET_NAMES = [
  'Sheet1'
];

/**
 * Load worksheets from disk cache or build from Excel file (all 13 worksheets from reference)
 */
export function getLoadedWorksheets() {
  if (cachedWorksheets) return cachedWorksheets;

  if (fs.existsSync(CACHE_PATH)) {
    try {
      const data = fs.readFileSync(CACHE_PATH, 'utf8');
      const allSheets = JSON.parse(data);
      cachedWorksheets = ALLOWED_WORKSHEET_NAMES.map((name, index) => {
        const found = allSheets.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (!found) {
          return {
            id: `sheet-${index + 1}`,
            name: name.trim(),
            order: index + 1,
            rowCount: 50,
            colCount: 26,
            cells: {},
            merges: [],
            views: [],
            columnConfig: {},
            rowConfig: {}
          };
        }
        return {
          columnConfig: {},
          rowConfig: {},
          ...found,
          name: name.trim(),
          order: index + 1,
          legacyOrder: found.order
        };
      });
      console.log(`[WorksheetDataService] Loaded ${cachedWorksheets.length} allowed worksheets from cache`);
      return cachedWorksheets;
    } catch (e) {
      console.error('[WorksheetDataService] Failed to read cache, falling back to Excel parsing:', e.message);
    }
  }

  cachedWorksheets = [
    {
      id: 'sheet-1',
      name: 'Sheet1',
      order: 1,
      rowCount: 50,
      colCount: 26,
      cells: {},
      merges: [],
      views: [],
      columnConfig: {},
      rowConfig: {}
    }
  ];
  return cachedWorksheets;
}

/**
 * Get summary list of the 5 allowed worksheets for tab bar
 */
export function getWorksheetSummaries() {
  const sheets = getLoadedWorksheets();
  return sheets.map(s => ({
    id: s.id,
    name: s.name,
    order: s.order,
    rowCount: s.rowCount,
    colCount: s.colCount,
    mergesCount: s.merges?.length || 0
  }));
}

/**
 * Timezone-safe date parser
 */
export function parseDateSafe(d) {
  if (!d) return null;
  if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    }
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

/**
 * Helper to calculate DATEDIF string: "X years, Y month(s), Z day(s)"
 */
export function calculateDatedif(startDateStr, endDate = new Date()) {
  const start = parseDateSafe(startDateStr);
  const end = parseDateSafe(endDate);
  if (!start || !end || start > end) return '';

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return `${years} years, ${months} month(s), ${days} day(s)`;
}

/**
 * Column letter to 1-indexed number and vice versa
 */
export function colLetterToNum(letter) {
  let num = 0;
  for (let i = 0; i < letter.length; i++) {
    num = num * 26 + (letter.charCodeAt(i) - 64);
  }
  return num;
}

export function colNumToLetter(num) {
  let letter = '';
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - mod) / 26);
  }
  return letter;
}

export function parseAddress(address) {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { col: 1, row: 1, letter: 'A' };
  return {
    letter: match[1],
    col: colLetterToNum(match[1]),
    row: parseInt(match[2], 10)
  };
}

/**
 * Map sheet rows to personnel fields
 */
function getSheetFieldMapping(sheet, rowNum, colLetter) {
  const name = typeof sheet === 'object' ? sheet.name : '';
  const order = typeof sheet === 'object' ? (sheet.legacyOrder ?? sheet.order) : sheet;

  // Worksheets 1, 2, 3: legacy DISPO Att (2), DISPO Att, detail Crame based
  if (typeof order === 'number' && order >= 1 && order <= 3 && name !== 'Disposition' && name !== 'Alpha List') {
    if (rowNum >= 10) {
      const map = {
        B: 'sub_unit',
        C: 'gender',
        D: 'rank',
        E: 'lastName',
        F: 'firstName',
        G: 'middleName',
        H: 'qualifier',
        J: 'address',
        K: 'contactNumber'
      };
      return map[colLetter] || null;
    }
  }

  // Worksheet 4: legacy itmsHQ
  if (name === 'itmsHQ' || order === 4) {
    if (rowNum >= 10) {
      const map = {
        B: 'sub_unit',
        C: 'gender',
        D: 'rank',
        E: 'lastName',
        F: 'firstName',
        G: 'middleName',
        H: 'qualifier'
      };
      return map[colLetter] || null;
    }
  }

  // Disposition
  if (name === 'Disposition' || order === 5 || (name === '' && order === 1)) {
    if (rowNum >= 10) {
      const map = {
        B: 'sub_unit',
        C: 'gender',
        D: 'rank',
        E: 'lastName',
        F: 'firstName',
        G: 'middleName',
        H: 'qualifier',
        I: 'designation',
        J: 'address',
        K: 'contactNumber'
      };
      return map[colLetter] || null;
    }
  }

  // Alpha List
  if (name === 'Alpha List' || order === 6 || (name === '' && order === 2)) {
    if (rowNum >= 9) {
      const map = {
        B: 'rank',
        C: 'status',
        D: 'badgeNo',
        E: 'lastName',
        F: 'firstName',
        G: 'middleName',
        H: 'qualifier',
        I: 'ageToDate', // formula
        J: 'birthday',
        K: 'ageOfService', // formula
        L: 'designationDate'
      };
      return map[colLetter] || null;
    }
  }

  return null;
}

/**
 * Build dynamic sheet data with live database synchronization
 */
export function getWorksheetDetail(sheetId, personnelList = []) {
  const sheets = getLoadedWorksheets();
  let sheet = sheets.find(s => s.id === sheetId || s.name.toLowerCase() === String(sheetId).toLowerCase());
  if (!sheet && typeof sheetId === 'string' && /^sheet-\d+$/i.test(sheetId)) {
    const idx = parseInt(sheetId.replace(/sheet-/i, ''), 10) - 1;
    if (idx >= 0 && idx < sheets.length) {
      sheet = sheets[idx];
    }
  }
  if (!sheet) throw new Error(`Worksheet not found: ${sheetId}`);

  // Create deep clone of cells for live presentation
  const outputCells = {};
  for (const [addr, cell] of Object.entries(sheet.cells)) {
    outputCells[addr] = { ...cell };
  }

  // Apply cell overrides (if any)
  for (const [key, override] of cellOverrides.entries()) {
    if (key.startsWith(`${sheet.id}:`)) {
      const addr = key.split(':')[1];
      if (outputCells[addr]) {
        if (override.value !== undefined) outputCells[addr].v = override.value;
        if (override.formula !== undefined) outputCells[addr].f = override.formula;
        if (override.formulaResult !== undefined) outputCells[addr].res = override.formulaResult;
        if (override.style) outputCells[addr].s = { ...(outputCells[addr].s || {}), ...override.style };
      } else {
        outputCells[addr] = { v: override.value, f: override.formula, res: override.formulaResult, s: override.style };
      }
    }
  }

  // Sanitize any remaining object values in outputCells
  for (const [addr, cell] of Object.entries(outputCells)) {
    if (cell.v !== null && typeof cell.v === 'object') {
      if (cell.v.result !== undefined && !(typeof cell.v.result === 'object' && cell.v.result?.error)) {
        cell.v = cell.v.result;
      } else if (cell.v.text) {
        cell.v = String(cell.v.text);
      } else if (Array.isArray(cell.v.richText)) {
        cell.v = cell.v.richText.map(t => t.text || '').join('');
      } else if (cell.v.error) {
        cell.v = String(cell.v.error);
      } else {
        cell.v = cell.res !== null && cell.res !== undefined ? cell.res : '';
      }
    }
  }

  // Build name-based and badge-based lookup maps for personnel
  const personnelByName = new Map();
  const personnelByBadge = new Map();
  personnelList.forEach(p => {
    if (p.lastName && p.firstName) {
      const key = `${p.lastName.toUpperCase().trim()}|${p.firstName.toUpperCase().trim()}`;
      personnelByName.set(key, p);
    }
    if (p.badgeNo) {
      personnelByBadge.set(String(p.badgeNo).trim().toUpperCase(), p);
    }
  });

  // Dynamic header date replacement: update "(As of [Date])" across all header rows to the current date
  const todayDate = new Date();
  const todayFormatted = todayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  for (const [addr, cell] of Object.entries(outputCells)) {
    const rowMatch = addr.match(/\d+$/);
    const rowNum = rowMatch ? parseInt(rowMatch[0], 10) : 0;
    if (rowNum >= 1 && rowNum <= 8) {
      if (typeof cell.v === 'string' && /\(as of\s+[^)]+\)/i.test(cell.v)) {
        cell.v = cell.v.replace(/\(as of\s+[^)]+\)/gi, `(As of ${todayFormatted})`);
      }
      if (typeof cell.res === 'string' && /\(as of\s+[^)]+\)/i.test(cell.res)) {
        cell.res = cell.res.replace(/\(as of\s+[^)]+\)/gi, `(As of ${todayFormatted})`);
      }
    }
  }

  // 1. Sync Personnel in Worksheets (Disposition and Alpha List)
  if (sheet.name === 'Disposition' || sheet.name === 'Alpha List' || (sheet.order >= 1 && sheet.order <= 8)) {
    const startRow = (sheet.name === 'Alpha List' || sheet.legacyOrder === 6) ? 9 : 10;
    for (let r = startRow; r <= sheet.rowCount; r++) {
      const lastCell = outputCells[`E${r}`];
      const firstCell = outputCells[`F${r}`];
      if (!lastCell || !firstCell || !lastCell.v || !firstCell.v) continue;

      const pKey = `${String(lastCell.v).toUpperCase().trim()}|${String(firstCell.v).toUpperCase().trim()}`;
      const person = personnelByName.get(pKey);
      if (person) {
        lastCell.personnelId = person.id;
        firstCell.personnelId = person.id;
      }
    }
  }

  // 2. Alpha List: dynamic Age to Date and Length of Service calculations
  if (sheet.name === 'Alpha List' || sheet.legacyOrder === 6) {
    for (let r = 9; r <= sheet.rowCount; r++) {
      const bdayCell = outputCells[`J${r}`];
      let ageCell = outputCells[`I${r}`];
      if (bdayCell && bdayCell.v) {
        const age = calculateDatedif(bdayCell.v, todayDate);
        if (age) {
          if (!ageCell) {
            ageCell = { s: { sz: 10, fn: 'Arial Narrow', ah: 'center', wrap: 1, br: { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin' } } };
            outputCells[`I${r}`] = ageCell;
          }
          ageCell.v = age;
          ageCell.res = age;
          ageCell.f = `DATEDIF(J${r},TODAY(),"y")&" years, "&DATEDIF(J${r},TODAY(),"ym")&" month(s), "&DATEDIF(J${r},TODAY(),"md")&" day(s)"`;
          ageCell.isCalculated = true;
        }
      }

      const desCell = outputCells[`L${r}`];
      let servCell = outputCells[`K${r}`];
      if (desCell && desCell.v) {
        const serv = calculateDatedif(desCell.v, todayDate);
        if (serv) {
          if (!servCell) {
            servCell = { s: { sz: 10, fn: 'Arial Narrow', ah: 'center', wrap: 1, br: { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin' } } };
            outputCells[`K${r}`] = servCell;
          }
          servCell.v = serv;
          servCell.res = serv;
          servCell.f = `DATEDIF(L${r},TODAY(),"y")&" years, "&DATEDIF(L${r},TODAY(),"ym")&" month(s), "&DATEDIF(L${r},TODAY(),"md")&" day(s)"`;
          servCell.isCalculated = true;
        }
      }
    }
  }

  // 3. Disposition: Full Name Concatenation
  if (sheet.name === 'Disposition') {
    for (let r = 10; r <= sheet.rowCount; r++) {
      const lastCell = outputCells[`E${r}`];
      const firstCell = outputCells[`F${r}`];
      const midCell = outputCells[`G${r}`];
      const pCell = outputCells[`P${r}`];

      if (lastCell?.v && firstCell?.v && pCell) {
        const l = String(lastCell.v).trim();
        const f = String(firstCell.v).trim();
        const m = midCell?.v ? String(midCell.v).trim() : '';
        pCell.v = [l, f, m].filter(Boolean).join(' ');
        pCell.res = pCell.v;
        pCell.f = `CONCATENATE(E${r}," ",F${r}," ",G${r})`;
        pCell.isCalculated = true;
      }
    }
  }

  // 4. ITMS HQ: Variance Column (E) and Subtotals
  if (sheet.name === 'ITMS HQ') {
    for (let r = 10; r <= 45; r++) {
      const cCell = outputCells[`C${r}`];
      const dCell = outputCells[`D${r}`];
      const eCell = outputCells[`E${r}`];

      if (eCell) {
        eCell.f = `D${r}-C${r}`;
        const auth = Number(cCell?.v || 0);
        const act = Number(dCell?.v || 0);
        eCell.v = act - auth;
        eCell.res = eCell.v;
        eCell.isCalculated = true;
      }
    }

    // Subtotal rows
    const subtotalRows = [13, 17, 21, 25, 29, 33, 37, 41];
    subtotalRows.forEach(subRow => {
      const startR = subRow - 3;
      const endR = subRow - 1;
      let authSum = 0;
      let actSum = 0;
      for (let r = startR; r <= endR; r++) {
        authSum += Number(outputCells[`C${r}`]?.v || 0);
        actSum += Number(outputCells[`D${r}`]?.v || 0);
      }
      if (outputCells[`C${subRow}`]) {
        outputCells[`C${subRow}`].v = authSum;
        outputCells[`C${subRow}`].f = `SUM(C${startR}:C${endR})`;
        outputCells[`C${subRow}`].res = authSum;
        outputCells[`C${subRow}`].isCalculated = true;
      }
      if (outputCells[`D${subRow}`]) {
        outputCells[`D${subRow}`].v = actSum;
        outputCells[`D${subRow}`].f = `SUM(D${startR}:D${endR})`;
        outputCells[`D${subRow}`].res = actSum;
        outputCells[`D${subRow}`].isCalculated = true;
      }
      if (outputCells[`E${subRow}`]) {
        outputCells[`E${subRow}`].v = actSum - authSum;
        outputCells[`E${subRow}`].f = `D${subRow}-C${subRow}`;
        outputCells[`E${subRow}`].res = actSum - authSum;
        outputCells[`E${subRow}`].isCalculated = true;
      }
    });

    // Category Totals
    const pcoRows = [10, 14, 18, 22, 26, 30, 34, 38];
    const pncoRows = [11, 15, 19, 23, 27, 31, 35, 39];
    const nupRows = [12, 16, 20, 24, 28, 32, 36, 40];

    const calcCategory = (targetRow, sourceRows) => {
      let auth = 0;
      let act = 0;
      sourceRows.forEach(r => {
        auth += Number(outputCells[`C${r}`]?.v || 0);
        act += Number(outputCells[`D${r}`]?.v || 0);
      });
      if (outputCells[`C${targetRow}`]) {
        outputCells[`C${targetRow}`].v = auth;
        outputCells[`C${targetRow}`].f = sourceRows.map(r => `C${r}`).join('+');
        outputCells[`C${targetRow}`].res = auth;
        outputCells[`C${targetRow}`].isCalculated = true;
      }
      if (outputCells[`D${targetRow}`]) {
        outputCells[`D${targetRow}`].v = act;
        outputCells[`D${targetRow}`].f = sourceRows.map(r => `D${r}`).join('+');
        outputCells[`D${targetRow}`].res = act;
        outputCells[`D${targetRow}`].isCalculated = true;
      }
      if (outputCells[`E${targetRow}`]) {
        outputCells[`E${targetRow}`].v = act - auth;
        outputCells[`E${targetRow}`].f = `D${targetRow}-C${targetRow}`;
        outputCells[`E${targetRow}`].res = act - auth;
        outputCells[`E${targetRow}`].isCalculated = true;
      }
    };

    calcCategory(42, pcoRows);
    calcCategory(43, pncoRows);
    calcCategory(44, nupRows);

    // Grand Total Row 45
    const grandAuth = Number(outputCells['C42']?.v || 0) + Number(outputCells['C43']?.v || 0) + Number(outputCells['C44']?.v || 0);
    const grandAct = Number(outputCells['D42']?.v || 0) + Number(outputCells['D43']?.v || 0) + Number(outputCells['D44']?.v || 0);
    if (outputCells['C45']) {
      outputCells['C45'].v = grandAuth;
      outputCells['C45'].f = 'SUM(C42:C44)';
      outputCells['C45'].res = grandAuth;
      outputCells['C45'].isCalculated = true;
    }
    if (outputCells['D45']) {
      outputCells['D45'].v = grandAct;
      outputCells['D45'].f = 'SUM(D42:D44)';
      outputCells['D45'].res = grandAct;
      outputCells['D45'].isCalculated = true;
    }
    if (outputCells['E45']) {
      outputCells['E45'].v = grandAct - grandAuth;
      outputCells['E45'].f = 'D45-C45';
      outputCells['E45'].res = grandAct - grandAuth;
      outputCells['E45'].isCalculated = true;
    }
  }

  // 5. Rank Profile with OSSP: Variance and Strength Totals
  if (sheet.name === 'Rank Profile with OSSP' || sheet.legacyOrder === 11 || (sheet.order >= 9 && sheet.order <= 11)) {
    const rankCounts = {};
    personnelList.forEach(p => {
      const r = (p.rank || '').toUpperCase().trim();
      rankCounts[r] = (rankCounts[r] || 0) + 1;
    });

    for (let r = 9; r <= 33; r++) {
      const bCell = outputCells[`B${r}`];
      const hCell = outputCells[`H${r}`];
      const iCell = outputCells[`I${r}`];
      const jCell = outputCells[`J${r}`];
      const kCell = outputCells[`K${r}`];

      // Update actual strength if live personnel records exist
      const rankCell = outputCells[`A${r}`];
      if (rankCell?.v && personnelList.length > 0) {
        const rName = String(rankCell.v).toUpperCase().trim();
        if (rankCounts[rName] !== undefined && jCell) {
          jCell.v = rankCounts[rName];
          jCell.res = rankCounts[rName];
        }
      }

      // Column K: Variance = Actual (J) - Total Authorized (I)
      if (kCell) {
        const actual = Number(jCell?.v || 0);
        const auth = Number(iCell?.v || 0);
        kCell.v = actual - auth;
        kCell.res = kCell.v;
        kCell.f = `J${r}-I${r}`;
        kCell.isCalculated = true;
      }
    }
  }

  // 6. Updates for ADMO: Totals
  if (sheet.name === 'Updates for ADMO') {
    [10, 11, 12].forEach(r => {
      const iCell = outputCells[`I${r}`];
      const nCell = outputCells[`N${r}`];
      if (iCell) {
        let sum = 0;
        ['E', 'F', 'G', 'H'].forEach(col => {
          sum += Number(outputCells[`${col}${r}`]?.v || 0);
        });
        iCell.v = sum;
        iCell.res = sum;
        iCell.f = `SUM(E${r}:H${r})`;
        iCell.isCalculated = true;
      }
      if (nCell) {
        const c = Number(outputCells[`C${r}`]?.v || 0);
        const i = Number(outputCells[`I${r}`]?.v || 0);
        const j = Number(outputCells[`J${r}`]?.v || 0);
        const l = Number(outputCells[`L${r}`]?.v || 0);
        nCell.v = c + i + j + l;
        nCell.res = nCell.v;
        nCell.f = `C${r}+I${r}+J${r}+L${r}`;
        nCell.isCalculated = true;
      }
    });

    const c13 = Number(outputCells['C10']?.v || 0) + Number(outputCells['C11']?.v || 0) + Number(outputCells['C12']?.v || 0);
    const i13 = Number(outputCells['I10']?.v || 0) + Number(outputCells['I11']?.v || 0) + Number(outputCells['I12']?.v || 0);
    const j13 = Number(outputCells['J10']?.v || 0) + Number(outputCells['J11']?.v || 0) + Number(outputCells['J12']?.v || 0);
    const l13 = Number(outputCells['L10']?.v || 0) + Number(outputCells['L11']?.v || 0) + Number(outputCells['L12']?.v || 0);
    if (outputCells['C13']) { outputCells['C13'].v = c13; outputCells['C13'].res = c13; outputCells['C13'].isCalculated = true; }
    if (outputCells['I13']) { outputCells['I13'].v = i13; outputCells['I13'].res = i13; outputCells['I13'].isCalculated = true; }
    if (outputCells['J13']) { outputCells['J13'].v = j13; outputCells['J13'].res = j13; outputCells['J13'].isCalculated = true; }
    if (outputCells['L13']) { outputCells['L13'].v = l13; outputCells['L13'].res = l13; outputCells['L13'].isCalculated = true; }
    if (outputCells['N13']) {
      outputCells['N13'].v = c13 + i13 + j13 + l13;
      outputCells['N13'].res = outputCells['N13'].v;
      outputCells['N13'].f = 'C13+I13+J13+L13';
      outputCells['N13'].isCalculated = true;
    }
  }

  return {
    ...sheet,
    cells: outputCells
  };
}

/**
 * Handle direct cell update
 */
export async function updateWorksheetCell(sheetId, cellUpdate, user, db) {
  await loadWorksheetPersistence({ required: Boolean(db) });
  const { address, value, oldValue } = cellUpdate;
  const sheet = getWorksheetDetail(sheetId);
  if (!sheet) throw new Error(`Worksheet not found: ${sheetId}`);

  const { row, letter, col } = parseAddress(address);
  const field = getSheetFieldMapping(sheet, row, letter);

  let personnelUpdated = null;

  if (field && db) {
    // Determine the person on this row
    const lastCell = sheet.cells[`E${row}`];
    const firstCell = sheet.cells[`F${row}`];
    if (lastCell?.v && firstCell?.v) {
      const query = `${lastCell.v} ${firstCell.v}`;
      const people = await db.getPersonnel({ search: query });
      const matched = people.find(p => 
        p.lastName?.toUpperCase().trim() === String(lastCell.v).toUpperCase().trim() &&
        p.firstName?.toUpperCase().trim() === String(firstCell.v).toUpperCase().trim()
      );

      if (matched) {
        const payload = { [field]: value };
        // Sync fullName if name parts changed
        if (field === 'lastName') {
          payload.fullName = `${value}, ${matched.firstName} ${matched.middleName || ''}`.trim();
        } else if (field === 'firstName') {
          payload.fullName = `${matched.lastName}, ${value} ${matched.middleName || ''}`.trim();
        }
        await db.updatePersonnel(matched.id, payload);
        personnelUpdated = { id: matched.id, field, value };
      }
    }
  }

  // Record cell override in memory
  const overrideKey = `${sheet.id}:${address}`;
  const existingOverride = cellOverrides.get(overrideKey) || {};
  const override = {
    value: value !== undefined ? value : existingOverride.value,
    formula: cellUpdate.formula !== undefined ? cellUpdate.formula : existingOverride.formula,
    formulaResult: cellUpdate.formulaResult !== undefined ? cellUpdate.formulaResult : existingOverride.formulaResult,
    style: cellUpdate.style ? { ...(existingOverride.style || {}), ...cellUpdate.style } : existingOverride.style,
    updatedBy: user?.displayName || user?.email || 'Admin',
    updatedAt: new Date().toISOString()
  };
  await persistWorksheetOverride(sheet, address, override, Boolean(db));
  cellOverrides.set(overrideKey, override);

  // Log to audit trail
  const logEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    worksheetId: sheet.id,
    worksheetName: sheet.name,
    cellAddress: address,
    personnelId: personnelUpdated?.id || null,
    fieldName: field || 'Cell Value',
    oldValue: String(oldValue ?? ''),
    newValue: String(value ?? ''),
    action: 'UPDATE_CELL',
    modifiedBy: user?.displayName || user?.email || 'Admin',
    timestamp: new Date().toISOString()
  };
  await persistWorksheetAudit(logEntry, Boolean(db));
  auditLogs.unshift(logEntry);

  return {
    success: true,
    sheetId: sheet.id,
    address,
    value,
    personnelUpdated,
    auditLog: logEntry
  };
}

/**
 * Retrieve recent audit logs
 */
export function getWorksheetAuditLogs(limit = 100) {
  return auditLogs.slice(0, limit);
}

/**
 * Export workbook or single worksheet to authentic ExcelJS buffer
 */
export async function generateExcelExport(sheetId = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PNP-ITMS PAIS 2.0';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  const todayDate = new Date();
  const todayFormatted = todayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const cachedSheets = getLoadedWorksheets();

  // Load from reference workbook to clone authentic master layout
  const refWb = new ExcelJS.Workbook();
  await refWb.xlsx.readFile(getReferencePath());

  let targetSheetName = null;
  if (sheetId) {
    try {
      const target = getWorksheetDetail(sheetId);
      targetSheetName = target?.name || null;
    } catch {
      targetSheetName = sheetId;
    }
  }

  refWb.worksheets.forEach((refSheet, idx) => {
    // Include all 13 reference worksheets
    const isAllowed = ALLOWED_WORKSHEET_NAMES.some(n => n.trim().toLowerCase() === refSheet.name.trim().toLowerCase());
    if (!isAllowed) return;

    const cachedSheet = cachedSheets.find(s => s.name.trim().toLowerCase() === refSheet.name.trim().toLowerCase());
    const sId = cachedSheet ? cachedSheet.id : `sheet-${idx + 1}`;
    if (sheetId && sheetId !== sId && sheetId !== refSheet.name && targetSheetName !== refSheet.name) return;

    // Get live evaluated detail for this sheet (handles dynamic as of dates, TODAY() formulas, subtotals, overrides)
    let sheetDetail = null;
    try {
      sheetDetail = getWorksheetDetail(sId);
    } catch (e) {
      console.warn(`[WorksheetDataService] Unable to get detail for ${sId}:`, e.message);
    }

    const outSheet = wb.addWorksheet(refSheet.name, {
      views: refSheet.views
    });

    // Copy columns
    if (refSheet.columns) {
      outSheet.columns = refSheet.columns.map(c => ({
        width: c.width,
        hidden: c.hidden
      }));
    }

    // Copy rows and cells with styles
    refSheet.eachRow({ includeEmpty: true }, (r, rNum) => {
      const outRow = outSheet.getRow(rNum);
      if (r.height) outRow.height = r.height;
      if (r.hidden) outRow.hidden = r.hidden;

      r.eachCell({ includeEmpty: true }, (cell, cNum) => {
        const outCell = outRow.getCell(cNum);
        const addr = cell.address;
        
        // Copy styles first
        if (cell.font) outCell.font = cell.font;
        if (cell.alignment) outCell.alignment = cell.alignment;
        if (cell.fill) outCell.fill = cell.fill;
        if (cell.border) outCell.border = cell.border;
        if (cell.numFmt) {
          if (refSheet.name === 'Alpha List' && (addr.startsWith('I') || addr.startsWith('K')) && parseInt(addr.slice(1), 10) >= 9) {
            outCell.numFmt = '@';
          } else {
            outCell.numFmt = cell.numFmt;
          }
        }

        const detailCell = sheetDetail?.cells?.[addr];
        // Check for override
        const overrideKey = `${sId}:${addr}`;
        if (cellOverrides.has(overrideKey)) {
          const ov = cellOverrides.get(overrideKey);
          if (ov.formula) {
            let formula = String(ov.formula).trim();
            if (formula.startsWith('=')) formula = formula.slice(1).trim();
            formula = formula.replace(/\[1\]Disposition/g, "'Disposition'");
            formula = formula.replace(/DATE\(2026,4,30\)/g, 'TODAY()');
            const cachedResult = ov.formulaResult !== undefined ? ov.formulaResult : detailCell?.res;
            const result = cachedResult !== null && cachedResult !== undefined && !Number.isNaN(cachedResult) ? cachedResult : '';
            outCell.value = { formula, result };
          } else {
            let v = ov.value;
            if (typeof v === 'string' && /\(as of\s+[^)]+\)/i.test(v)) {
              v = v.replace(/\(as of\s+[^)]+\)/gi, `(As of ${todayFormatted})`);
            }
            outCell.value = (v !== undefined && !Number.isNaN(v)) ? v : null;
          }
          if (ov.style) applyWorksheetOverrideStyle(outCell, ov.style);
          return;
        }

        // Use resolved sheetDetail cell if available
        if (detailCell) {
          if (detailCell.f) {
            let formula = String(detailCell.f).trim();
            if (formula.startsWith('=')) formula = formula.slice(1).trim();
            formula = formula.replace(/\[1\]Disposition/g, "'Disposition'");
            formula = formula.replace(/DATE\(2026,4,30\)/g, 'TODAY()');

            let result = detailCell.res !== undefined ? detailCell.res : detailCell.v;
            if (result === null || result === undefined || Number.isNaN(result)) {
              result = '';
            }

            outCell.value = { formula, result };
          } else {
            let v = detailCell.v;
            if (typeof v === 'string' && /\(as of\s+[^)]+\)/i.test(v)) {
              v = v.replace(/\(as of\s+[^)]+\)/gi, `(As of ${todayFormatted})`);
            }
            outCell.value = (v !== undefined && !Number.isNaN(v)) ? v : null;
          }
          return;
        }

        // Fallback to reference cell if not in detail
        const val = cell.value;
        if (val && typeof val === 'object' && val.formula) {
          let formula = String(val.formula).trim();
          if (formula.startsWith('=')) formula = formula.slice(1).trim();
          formula = formula.replace(/\[1\]Disposition/g, "'Disposition'");
          formula = formula.replace(/DATE\(2026,4,30\)/g, 'TODAY()');
          const result = (val.result !== undefined && val.result !== null && !Number.isNaN(val.result)) ? val.result : '';
          outCell.value = { formula, result };
        } else if (val && typeof val === 'object' && val.sharedFormula) {
          const result = (val.result !== undefined && val.result !== null && !Number.isNaN(val.result)) ? val.result : '';
          outCell.value = result;
        } else {
          let v = val;
          if (typeof v === 'string' && /\(as of\s+[^)]+\)/i.test(v)) {
            v = v.replace(/\(as of\s+[^)]+\)/gi, `(As of ${todayFormatted})`);
          }
          outCell.value = (v !== undefined && !Number.isNaN(v)) ? v : null;
        }
      });
    });

    // Copy merges (ignore any degenerate single-cell merges)
    if (refSheet.model?.merges) {
      refSheet.model.merges.forEach(mergeRange => {
        try {
          const [start, end] = String(mergeRange).split(':');
          if (start && end && start !== end) {
            outSheet.mergeCells(mergeRange);
          }
        } catch (e) {}
      });
    }

    // Include edited cells outside the reference worksheet's used range.
    for (const [overrideKey, override] of cellOverrides.entries()) {
      if (!overrideKey.startsWith(`${sId}:`)) continue;
      const address = overrideKey.slice(sId.length + 1);
      const outCell = outSheet.getCell(address);
      const result = override.formulaResult ?? sheetDetail?.cells?.[address]?.res ?? '';
      if (override.formula) {
        outCell.value = { formula: String(override.formula).replace(/^=/, ''), result };
      } else {
        let value = override.value;
        if (typeof value === 'string' && /\(as of\s+[^)]+\)/i.test(value)) {
          value = value.replace(/\(as of\s+[^)]+\)/gi, `(As of ${todayFormatted})`);
        }
        outCell.value = value ?? null;
      }
      if (override.style) {
        applyWorksheetOverrideStyle(outCell, override.style);
      }
    }
  });

  if (wb.worksheets.length === 0) {
    cachedSheets.forEach(sheet => {
      const outSheet = wb.addWorksheet(sheet.name || 'Sheet1');
      if (sheet.cells) {
        for (const [addr, cell] of Object.entries(sheet.cells)) {
          if (!cell) continue;
          const outCell = outSheet.getCell(addr);
          if (cell.f) {
            outCell.value = { formula: String(cell.f).replace(/^=/, ''), result: cell.res ?? cell.v ?? '' };
          } else if (cell.v !== null && cell.v !== undefined) {
            outCell.value = cell.v;
          }
        }
      }
      for (const [overrideKey, override] of cellOverrides.entries()) {
        if (!overrideKey.startsWith(`${sheet.id}:`)) continue;
        const address = overrideKey.slice(sheet.id.length + 1);
        const outCell = outSheet.getCell(address);
        if (override.formula) {
          outCell.value = { formula: String(override.formula).replace(/^=/, ''), result: override.formulaResult ?? '' };
        } else {
          outCell.value = override.value ?? null;
        }
        if (override.style) applyWorksheetOverrideStyle(outCell, override.style);
      }
    });
    if (wb.worksheets.length === 0) {
      wb.addWorksheet('Sheet1');
    }
  }

  return await wb.xlsx.writeBuffer();
}
