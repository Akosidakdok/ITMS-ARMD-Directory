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
  let num = 0;
  for (let i = 0; i < letter.length; i++) {
    num = num * 26 + (letter.charCodeAt(i) - 64);
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

// Format a cell value according to its number format type
export function formatCellValue(value: any, numFmt?: string): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.result !== undefined && value.result !== null) return String(value.result);
    return '';
  }

  const str = String(value);
  if (!numFmt || numFmt === 'General' || numFmt === '@') return str;

  const num = Number(value);
  if (isNaN(num)) return str;

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
