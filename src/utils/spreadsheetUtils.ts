// Spreadsheet Utility Functions for PAIS 2.0

// Helper to convert column number (1-based) to letter
export function colNumToLetter(num: number): string {
  let letter = '';
  while (num > 0) {
    const mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - mod) / 26);
  }
  return letter;
}

// Helper to convert column letter to number (1-based)
export function colLetterToNum(letter: string): number {
  const upper = letter.toUpperCase();
  let num = 0;
  for (let i = 0; i < upper.length; i++) {
    num = num * 26 + (upper.charCodeAt(i) - 64);
  }
  return num;
}

// Parse an Excel address string like "A1" or "AA10" into { row, col, letter }
export function parseAddress(address: string): { row: number; col: number; letter: string } {
  const match = address.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return { row: 1, col: 1, letter: 'A' };
  return {
    letter: match[1].toUpperCase(),
    col: colLetterToNum(match[1].toUpperCase()),
    row: parseInt(match[2], 10)
  };
}

export function formatExcelDateSerial(value: number, numFmt?: string): string | null {
  if (!Number.isFinite(value) || !numFmt || ['general', '@', 'currency', 'accounting', 'number', 'percentage'].includes(numFmt.toLowerCase())) return null;
  const dateFormat = numFmt.replace(/"[^"]*"/g, '').replace(/\\./g, '');
  if (!/(y{1,4}|d{1,2})/i.test(dateFormat) && !/(^|[^a-z])m{1,4}([^a-z]|$)/i.test(dateFormat)) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + value * 86400000);
  if (Number.isNaN(date.getTime())) return null;
  const hasTime = /[hs]/i.test(dateFormat);
  return hasTime ? date.toLocaleString('en-US') : date.toLocaleDateString('en-US');
}

// Format a cell value according to its number format type
export function formatCellValue(value: any, numFmt?: string): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : value.toLocaleDateString('en-US');
  }
  if (typeof value === 'object') {
    if (value.result !== undefined && value.result !== null) return String(value.result);
    return '';
  }

  const str = String(value);
  if (!numFmt || numFmt === 'General' || numFmt === '@') return str;

  const num = Number(value);
  if (isNaN(num)) return str;

  const dateValue = formatExcelDateSerial(num, numFmt);
  if (dateValue !== null) return dateValue;

  switch (numFmt) {
    case 'currency':
    case '₱#,##0.00':
      return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'accounting':
      return num < 0
        ? `(₱${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
        : `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'number':
    case '#,##0.00':
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'percentage':
    case '0.0%':
      return `${(num * 100).toFixed(1)}%`;
    case 'date':
      try {
        const d = new Date(value);
        return isNaN(d.getTime()) ? str : d.toLocaleDateString('en-US');
      } catch {
        return str;
      }
    default:
      return str;
  }
}

/**
 * Inserts or replaces a cell reference / range into an active formula string.
 * Supports '=SUM' -> '=SUM(A1', dragging '=SUM(A1:A5', operators '=A1+B1', etc.
 */
export function insertCellReferenceIntoFormula(
  formula: string,
  newRef: string,
  lastInsertedRef?: string
): string {
  let text = String(formula || '').trim();
  if (!text.startsWith('=')) {
    text = '=' + text;
  }

  // If text is like '=SUM' or '=AVERAGE' or '=IF' (function name without open paren)
  if (/^=[A-Za-z]+$/i.test(text)) {
    text = text + '(';
  } else if (/([+\-*/,(<>=&])([A-Za-z]+)$/i.test(text)) {
    text = text + '(';
  }

  // If user previously inserted a reference during this editing step and text ends with it, replace it
  if (lastInsertedRef && text.endsWith(lastInsertedRef)) {
    return text.slice(0, -lastInsertedRef.length) + newRef;
  }

  // If formula ends with an open paren, comma, colon, or operator: simply append
  if (/[\(=,+\-*/&><:]$/.test(text)) {
    return text + newRef;
  }

  // If formula ends with an existing cell reference or range, replace it
  const trailingRefMatch = text.match(/([A-Za-z]+\d+(?::[A-Za-z]+\d+)?)$/);
  if (trailingRefMatch) {
    return text.slice(0, -trailingRefMatch[1].length) + newRef;
  }

  return text + newRef;
}

export interface NormalizedMergeRange {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  rangeStr: string;
  startAddress: string;
  endAddress: string;
}

export function parseMergeRange(rangeStr: string): NormalizedMergeRange | null {
  if (!rangeStr || typeof rangeStr !== 'string' || !rangeStr.includes(':')) return null;
  const parts = rangeStr.split(':');
  if (parts.length !== 2) return null;
  const p1 = parseAddress(parts[0]);
  const p2 = parseAddress(parts[1]);
  const minRow = Math.min(p1.row, p2.row);
  const maxRow = Math.max(p1.row, p2.row);
  const minCol = Math.min(p1.col, p2.col);
  const maxCol = Math.max(p1.col, p2.col);
  const startAddress = `${colNumToLetter(minCol)}${minRow}`;
  const endAddress = `${colNumToLetter(maxCol)}${maxRow}`;
  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    rangeStr: `${startAddress}:${endAddress}`,
    startAddress,
    endAddress
  };
}

export function isCellInMergeRange(row: number, col: number, rangeStr: string): boolean {
  const parsed = parseMergeRange(rangeStr);
  if (!parsed) return false;
  return row >= parsed.minRow && row <= parsed.maxRow && col >= parsed.minCol && col <= parsed.maxCol;
}

export function isMergeOverlappingRange(
  rangeStr: string,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number
): boolean {
  const parsed = parseMergeRange(rangeStr);
  if (!parsed) return false;
  const noOverlap = parsed.maxRow < minRow || parsed.minRow > maxRow || parsed.maxCol < minCol || parsed.minCol > maxCol;
  return !noOverlap;
}

