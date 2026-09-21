// Excel Formula Evaluation Engine for PAIS 2.0 Spreadsheet Module
import { colLetterToNum, colNumToLetter, parseAddress } from '../../../utils/spreadsheetUtils';

export interface CellValueMap {
  [sheetNameOrId: string]: {
    cells: Record<string, { v?: any; f?: string | null; res?: any }>;
  };
}

/**
 * Expand a range like "A1:C3" into an array of cell addresses ["A1", "A2", "A3", "B1", ...]
 */
export function expandCellRange(rangeStr: string): string[] {
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return [rangeStr.replace(/\$/g, '')];

  const start = parseAddress(parts[0].replace(/\$/g, ''));
  const end = parseAddress(parts[1].replace(/\$/g, ''));

  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const addresses: string[] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      addresses.push(`${colNumToLetter(c)}${r}`);
    }
  }
  return addresses;
}

/**
 * Resolve a single cell reference value from the active sheet or cross-sheet reference
 */
export function getCellValue(
  refStr: string,
  currentSheetCells: Record<string, { v?: any; res?: any }>,
  allSheetsMap?: CellValueMap
): any {
  let cleanRef = refStr.trim().replace(/\$/g, '');
  let targetSheetCells = currentSheetCells;

  // Cross sheet reference: e.g. 'Alpha List'!A1 or Disposition!B5
  if (cleanRef.includes('!')) {
    const [sheetPart, addrPart] = cleanRef.split('!');
    const sheetName = sheetPart.replace(/^['"]|['"]$/g, '').trim();
    cleanRef = addrPart;

    if (allSheetsMap) {
      for (const [key, data] of Object.entries(allSheetsMap)) {
        if (key.toLowerCase() === sheetName.toLowerCase()) {
          targetSheetCells = data.cells;
          break;
        }
      }
    }
  }

  const cell = targetSheetCells[cleanRef];
  if (!cell) return 0;
  const val = cell.res !== undefined ? cell.res : cell.v;
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== '') return num;
    return val;
  }
  return val;
}

/**
 * Evaluate common Excel formulas
 */
export function evaluateFormula(
  formulaStr: string,
  currentSheetCells: Record<string, { v?: any; res?: any }>,
  allSheetsMap?: CellValueMap
): any {
  if (!formulaStr || typeof formulaStr !== 'string') return '';
  let f = formulaStr.trim();
  if (f.startsWith('=')) f = f.slice(1).trim();
  if (!f) return '';

  const upper = f.toUpperCase();

  try {
    // TODAY() & NOW()
    if (upper === 'TODAY()' || upper === 'TODAY') {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    if (upper === 'NOW()' || upper === 'NOW') {
      return new Date().toLocaleString();
    }

    // Mathematical: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, ROUND, IF, etc.
    const funcMatch = f.match(/^([A-Z0-9_.]+)\s*\((.*)\)$/i);
    if (funcMatch) {
      const funcName = funcMatch[1].toUpperCase();
      const argsRaw = funcMatch[2];

      const parseArgs = (raw: string): any[] => {
        if (!raw.trim()) return [];
        const result: string[] = [];
        let depth = 0;
        let current = '';
        for (let i = 0; i < raw.length; i++) {
          const char = raw[i];
          if (char === '(') depth++;
          else if (char === ')') depth--;
          if (char === ',' && depth === 0) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        if (current.trim()) result.push(current.trim());
        return result;
      };

      const args = parseArgs(argsRaw);

      const getFlatNumbers = (): number[] => {
        const nums: number[] = [];
        args.forEach(arg => {
          if (arg.includes(':')) {
            const addrs = expandCellRange(arg);
            addrs.forEach(addr => {
              const val = getCellValue(addr, currentSheetCells, allSheetsMap);
              const n = Number(val);
              if (!isNaN(n)) nums.push(n);
            });
          } else if (/^[A-Z]+\d+$/i.test(arg.replace(/\$/g, ''))) {
            const val = getCellValue(arg, currentSheetCells, allSheetsMap);
            const n = Number(val);
            if (!isNaN(n)) nums.push(n);
          } else {
            const evaluated = evaluateFormula(arg, currentSheetCells, allSheetsMap);
            const n = Number(evaluated);
            if (!isNaN(n)) nums.push(n);
          }
        });
        return nums;
      };

      switch (funcName) {
        case 'SUM': {
          const nums = getFlatNumbers();
          return nums.reduce((acc, curr) => acc + curr, 0);
        }
        case 'AVERAGE': {
          const nums = getFlatNumbers();
          if (nums.length === 0) return 0;
          return nums.reduce((acc, curr) => acc + curr, 0) / nums.length;
        }
        case 'MIN': {
          const nums = getFlatNumbers();
          return nums.length > 0 ? Math.min(...nums) : 0;
        }
        case 'MAX': {
          const nums = getFlatNumbers();
          return nums.length > 0 ? Math.max(...nums) : 0;
        }
        case 'COUNT': {
          const nums = getFlatNumbers();
          return nums.length;
        }
        case 'COUNTA': {
          let count = 0;
          args.forEach(arg => {
            if (arg.includes(':')) {
              const addrs = expandCellRange(arg);
              addrs.forEach(addr => {
                const val = getCellValue(addr, currentSheetCells, allSheetsMap);
                if (val !== '' && val !== null && val !== undefined) count++;
              });
            } else {
              const val = getCellValue(arg, currentSheetCells, allSheetsMap);
              if (val !== '' && val !== null && val !== undefined) count++;
            }
          });
          return count;
        }
        case 'ROUND': {
          if (args.length >= 2) {
            const n = Number(evaluateFormula(args[0], currentSheetCells, allSheetsMap));
            const decimals = Number(evaluateFormula(args[1], currentSheetCells, allSheetsMap)) || 0;
            const factor = Math.pow(10, decimals);
            return Math.round(n * factor) / factor;
          }
          return 0;
        }
        case 'IF': {
          if (args.length >= 2) {
            const cond = evaluateFormula(args[0], currentSheetCells, allSheetsMap);
            const isTrue = !!cond && cond !== 'FALSE' && cond !== 0 && cond !== '0';
            if (isTrue) {
              return evaluateFormula(args[1], currentSheetCells, allSheetsMap);
            }
            return args.length >= 3 ? evaluateFormula(args[2], currentSheetCells, allSheetsMap) : '';
          }
          return '';
        }
        case 'IFERROR': {
          try {
            const res = evaluateFormula(args[0], currentSheetCells, allSheetsMap);
            if (res === '#ERROR!' || res === '#VALUE!' || res === '#N/A' || isNaN(res)) {
              return args[1] ? evaluateFormula(args[1], currentSheetCells, allSheetsMap) : '';
            }
            return res;
          } catch {
            return args[1] ? evaluateFormula(args[1], currentSheetCells, allSheetsMap) : '';
          }
        }
        case 'CONCAT':
        case 'CONCATENATE': {
          return args.map(arg => {
            if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
            if (/^[A-Z]+\d+$/i.test(arg.replace(/\$/g, ''))) {
              return String(getCellValue(arg, currentSheetCells, allSheetsMap) ?? '');
            }
            return String(evaluateFormula(arg, currentSheetCells, allSheetsMap) ?? '');
          }).join('');
        }
        case 'UPPER': {
          const val = evaluateFormula(args[0], currentSheetCells, allSheetsMap);
          return String(val ?? '').toUpperCase();
        }
        case 'LOWER': {
          const val = evaluateFormula(args[0], currentSheetCells, allSheetsMap);
          return String(val ?? '').toLowerCase();
        }
        case 'LEN': {
          const val = evaluateFormula(args[0], currentSheetCells, allSheetsMap);
          return String(val ?? '').length;
        }
        case 'TRIM': {
          const val = evaluateFormula(args[0], currentSheetCells, allSheetsMap);
          return String(val ?? '').trim();
        }
        case 'LEFT': {
          const text = String(evaluateFormula(args[0], currentSheetCells, allSheetsMap) ?? '');
          const count = args[1] ? Number(evaluateFormula(args[1], currentSheetCells, allSheetsMap)) : 1;
          return text.slice(0, count);
        }
        case 'RIGHT': {
          const text = String(evaluateFormula(args[0], currentSheetCells, allSheetsMap) ?? '');
          const count = args[1] ? Number(evaluateFormula(args[1], currentSheetCells, allSheetsMap)) : 1;
          return text.slice(-count);
        }
        case 'DATEDIF': {
          if (args.length >= 3) {
            const startRaw = String(evaluateFormula(args[0], currentSheetCells, allSheetsMap));
            const endRaw = String(evaluateFormula(args[1], currentSheetCells, allSheetsMap));
            const unit = String(args[2]).replace(/['"]/g, '').toUpperCase();
            const start = new Date(startRaw);
            const end = endRaw.toUpperCase() === 'TODAY()' || endRaw === '' ? new Date() : new Date(endRaw);

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const diffYears = end.getFullYear() - start.getFullYear();
              if (unit === 'Y') return diffYears;
              if (unit === 'D') return diffDays;
              if (unit === 'M') return diffYears * 12 + (end.getMonth() - start.getMonth());
            }
          }
          return '';
        }
        case 'SUMIF': {
          if (args.length >= 2) {
            const rangeAddrs = expandCellRange(args[0]);
            const criteria = String(evaluateFormula(args[1], currentSheetCells, allSheetsMap)).replace(/['"]/g, '');
            const sumAddrs = args[2] ? expandCellRange(args[2]) : rangeAddrs;
            let sum = 0;
            rangeAddrs.forEach((addr, idx) => {
              const checkVal = String(getCellValue(addr, currentSheetCells, allSheetsMap));
              if (checkVal.toLowerCase() === criteria.toLowerCase()) {
                const sumVal = Number(getCellValue(sumAddrs[idx] || addr, currentSheetCells, allSheetsMap));
                if (!isNaN(sumVal)) sum += sumVal;
              }
            });
            return sum;
          }
          return 0;
        }
        case 'COUNTIF': {
          if (args.length >= 2) {
            const rangeAddrs = expandCellRange(args[0]);
            const criteria = String(evaluateFormula(args[1], currentSheetCells, allSheetsMap)).replace(/['"]/g, '');
            let count = 0;
            rangeAddrs.forEach(addr => {
              const checkVal = String(getCellValue(addr, currentSheetCells, allSheetsMap));
              if (checkVal.toLowerCase() === criteria.toLowerCase()) {
                count++;
              }
            });
            return count;
          }
          return 0;
        }
        default:
          break;
      }
    }

    // Direct cell reference (e.g. A1, J18, 'Disposition'!C10)
    if (/^('?[A-Za-z0-9 _.-]+'?!|\$?[A-Za-z]+\$?\d+)$/.test(f)) {
      return getCellValue(f, currentSheetCells, allSheetsMap);
    }

    // Arithmetic expression with cell references (e.g. J11-I11, C13+I13+J13+L13)
    const replacedExpr = f.replace(/('?[A-Za-z0-9 _.-]+'?!|\$?[A-Za-z]+\$?\d+)/g, match => {
      const v = getCellValue(match, currentSheetCells, allSheetsMap);
      return typeof v === 'number' ? String(v) : '0';
    });

    if (/^[0-9+\-*/(). ^]+$/.test(replacedExpr)) {
      const sanitized = replacedExpr.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized})`)();
      return typeof result === 'number' && !isNaN(result) ? result : 0;
    }

    return f;
  } catch (err) {
    console.warn(`Formula evaluation error on "${formulaStr}":`, err);
    return '#ERROR!';
  }
}
