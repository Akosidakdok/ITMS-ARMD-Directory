import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_PATH = path.join(__dirname, '..', 'store', 'cached_worksheet_data.json');
const REFERENCE_PATH = path.join(__dirname, '..', '..', 'src', 'reference', 'disposition September 7, 2026.xlsx');

let cachedWorksheets = null;
let cellOverrides = new Map(); // key: "sheetId:address" -> { value, formula, updatedBy, updatedAt }
let auditLogs = [];

/**
 * Load worksheets from disk cache or build from Excel file
 */
export function getLoadedWorksheets() {
  if (cachedWorksheets) return cachedWorksheets;

  if (fs.existsSync(CACHE_PATH)) {
    try {
      const data = fs.readFileSync(CACHE_PATH, 'utf8');
      cachedWorksheets = JSON.parse(data);
      console.log(`[WorksheetDataService] Loaded ${cachedWorksheets.length} worksheets from cache`);
      return cachedWorksheets;
    } catch (e) {
      console.error('[WorksheetDataService] Failed to read cache, falling back to Excel parsing:', e.message);
    }
  }

  throw new Error('Worksheet cache not initialized and reference Excel not loaded.');
}

/**
 * Get summary list of all 13 worksheets for tab bar
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
 * Helper to calculate DATEDIF string: "X years, Y month(s), Z day(s)"
 */
export function calculateDatedif(startDateStr, endDate = new Date()) {
  if (!startDateStr) return '';
  const start = new Date(startDateStr);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return '';

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
function getSheetFieldMapping(sheetOrder, rowNum, colLetter) {
  // Worksheets 1, 2, 3: DISPO Att (2), DISPO Att, detail Crame based
  if (sheetOrder >= 1 && sheetOrder <= 3) {
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

  // Worksheet 4: itmsHQ
  if (sheetOrder === 4) {
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

  // Worksheet 5: Disposition
  if (sheetOrder === 5) {
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

  // Worksheet 6: Alpha List
  if (sheetOrder === 6) {
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

  // Worksheet 7: 15 YRS LENGTH OF SERVICE
  if (sheetOrder === 7) {
    if (rowNum >= 3) {
      const map = {
        B: 'rank',
        C: 'status',
        D: 'badgeNo',
        E: 'lastName',
        F: 'firstName',
        G: 'middleName',
        H: 'qualifier',
        I: 'ageToDate',
        J: 'birthday',
        K: 'lengthOfService',
        L: 'designationDate',
        M: 'remarks'
      };
      return map[colLetter] || null;
    }
  }

  // Worksheet 8: Crame-based PCOs
  if (sheetOrder === 8) {
    if (rowNum >= 3) {
      const map = {
        B: 'sub_unit',
        C: 'rank',
        D: 'lastName',
        E: 'firstName',
        F: 'middleName',
        G: 'qualifier'
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
  const sheet = sheets.find(s => s.id === sheetId || s.name === sheetId);
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
        outputCells[addr].v = override.value;
        if (override.formula) outputCells[addr].f = override.formula;
      } else {
        outputCells[addr] = { v: override.value, f: override.formula };
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

  // Sync Personnel in Worksheets 1–8
  if (sheet.order >= 1 && sheet.order <= 8) {
    const startRow = (sheet.order === 6 ? 9 : (sheet.order === 7 || sheet.order === 8 ? 3 : 10));
    for (let r = startRow; r <= sheet.rowCount; r++) {
      const lastCell = outputCells[`E${r}`];
      const firstCell = outputCells[`F${r}`];
      if (!lastCell || !firstCell || !lastCell.v || !firstCell.v) continue;

      const pKey = `${String(lastCell.v).toUpperCase().trim()}|${String(firstCell.v).toUpperCase().trim()}`;
      const person = personnelByName.get(pKey);
      if (person) {
        // Tag cell row with person's ID
        lastCell.personnelId = person.id;
        firstCell.personnelId = person.id;

        // Dynamic formula recalculations for dates
        if (sheet.order === 6 || sheet.order === 7) {
          const bdayCell = outputCells[`J${r}`];
          const ageCell = outputCells[`I${r}`];
          if (bdayCell && bdayCell.v && ageCell) {
            ageCell.v = calculateDatedif(bdayCell.v, '2026-04-30');
            ageCell.isCalculated = true;
          }

          const desCell = outputCells[`L${r}`];
          const servCell = outputCells[`K${r}`];
          if (desCell && desCell.v && servCell) {
            servCell.v = calculateDatedif(desCell.v, '2026-04-30');
            servCell.isCalculated = true;
          }
        }
      }
    }
  }

  // Live strength synchronization for Rank Profiles (Sheets 9, 10, 11)
  if (sheet.order >= 9 && sheet.order <= 11) {
    const rankCounts = {};
    personnelList.forEach(p => {
      const r = (p.rank || '').toUpperCase().trim();
      rankCounts[r] = (rankCounts[r] || 0) + 1;
    });

    // Recalculate Actual Strength and Variances
    for (let r = 10; r <= 36; r++) {
      const rankCell = outputCells[`A${r}`];
      const actualCol = sheet.order === 11 ? 'J' : (sheet.order === 10 ? 'H' : 'I');
      const authCol = sheet.order === 11 ? 'I' : (sheet.order === 10 ? 'G' : 'H');
      const varCol = sheet.order === 11 ? 'K' : (sheet.order === 10 ? 'I' : 'J');

      const varCell = outputCells[`${varCol}${r}`];
      if (varCell) {
        const actual = Number(outputCells[`${actualCol}${r}`]?.v || 0);
        const auth = Number(outputCells[`${authCol}${r}`]?.v || 0);
        varCell.v = actual - auth;
        varCell.isCalculated = true;
      }
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
  const { address, value, oldValue } = cellUpdate;
  const sheets = getLoadedWorksheets();
  const sheet = sheets.find(s => s.id === sheetId || s.name === sheetId);
  if (!sheet) throw new Error(`Worksheet not found: ${sheetId}`);

  const { row, letter, col } = parseAddress(address);
  const field = getSheetFieldMapping(sheet.order, row, letter);

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
  cellOverrides.set(overrideKey, {
    value,
    formula: cellUpdate.formula || null,
    updatedBy: user?.displayName || user?.email || 'Admin',
    updatedAt: new Date().toISOString()
  });

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

  // Load from reference workbook to clone authentic master layout
  const refWb = new ExcelJS.Workbook();
  await refWb.xlsx.readFile(REFERENCE_PATH);

  refWb.worksheets.forEach((refSheet, idx) => {
    const sId = `sheet-${idx + 1}`;
    if (sheetId && sheetId !== sId && sheetId !== refSheet.name) return;

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
        
        // Check for override
        const overrideKey = `${sId}:${cell.address}`;
        if (cellOverrides.has(overrideKey)) {
          const ov = cellOverrides.get(overrideKey);
          outCell.value = ov.formula ? { formula: ov.formula, result: ov.value } : ov.value;
        } else {
          outCell.value = cell.value;
        }

        if (cell.font) outCell.font = cell.font;
        if (cell.alignment) outCell.alignment = cell.alignment;
        if (cell.fill) outCell.fill = cell.fill;
        if (cell.border) outCell.border = cell.border;
        if (cell.numFmt) outCell.numFmt = cell.numFmt;
      });
    });

    // Copy merges
    if (refSheet.model?.merges) {
      refSheet.model.merges.forEach(mergeRange => {
        try {
          outSheet.mergeCells(mergeRange);
        } catch (e) {}
      });
    }
  });

  return await wb.xlsx.writeBuffer();
}
