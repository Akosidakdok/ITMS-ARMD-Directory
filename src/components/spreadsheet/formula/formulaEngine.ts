import * as FormulaJS from '@formulajs/formulajs';
import { colLetterToNum, colNumToLetter, parseAddress } from '../../../utils/spreadsheetUtils.ts';

export interface FormulaCell {
  v?: any;
  f?: string | null;
  res?: any;
  s?: any;
}

export interface CellValueMap {
  [sheetNameOrId: string]: {
    name?: string;
    cells: Record<string, FormulaCell>;
  };
}

type FormulaError = '#VALUE!' | '#REF!' | '#NAME?' | '#DIV/0!' | '#NUM!' | '#N/A' | '#CIRCULAR!';
type RangeValue = {
  kind: 'range';
  values: any[][];
  bounds?: { sheetName: string; row: number; col: number; endRow?: number; endCol?: number };
};
type FormulaValue = any | RangeValue;

interface Token {
  type: 'number' | 'string' | 'reference' | 'identifier' | 'operator' | 'eof';
  value: string;
}

const EXCEL_ERRORS = new Set<FormulaError>(['#VALUE!', '#REF!', '#NAME?', '#DIV/0!', '#NUM!', '#N/A', '#CIRCULAR!']);
const EXCEL_DATE_EPOCH = Date.UTC(1899, 11, 30);

function isFormulaError(value: any): value is FormulaError {
  return typeof value === 'string' && EXCEL_ERRORS.has(value as FormulaError);
}

function dateToSerial(value: Date): number {
  return (Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) - EXCEL_DATE_EPOCH) / 86400000
    + (value.getHours() * 3600 + value.getMinutes() * 60 + value.getSeconds()) / 86400;
}

function toExcelValue(value: any): any {
  if (value instanceof Date) return dateToSerial(value);
  if (value && typeof value === 'object' && typeof value.error === 'string') return value.error;
  return value;
}

function normalizeCellValue(value: any): any {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return dateToSerial(value);
  if (typeof value === 'object') {
    if (value.result !== undefined && value.result !== null) return normalizeCellValue(value.result);
    if (value.text !== undefined && value.text !== null) return String(value.text);
    if (value.error) return String(value.error);
    return '';
  }
  return value;
}

function splitSheetReference(reference: string, currentSheetName: string): { sheetName: string; address: string } | FormulaError {
  const bang = reference.lastIndexOf('!');
  if (bang < 0) return { sheetName: currentSheetName, address: reference.replace(/\$/g, '').toUpperCase() };
  let sheetName = reference.slice(0, bang).trim();
  if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
    sheetName = sheetName.slice(1, -1).replace(/''/g, "'");
  }
  const address = reference.slice(bang + 1).replace(/\$/g, '').toUpperCase();
  if (!/^[A-Z]{1,3}\d+$/.test(address)) return '#REF!';
  return { sheetName, address };
}

function makeTokenizer(formula: string): () => Token {
  const referencePattern = /^(?:(?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_. -]*)!)?\$?[A-Za-z]{1,3}\$?\d+/;
  let index = 0;
  return () => {
    while (/\s/.test(formula[index] || '')) index++;
    if (index >= formula.length) return { type: 'eof', value: '' };
    const remaining = formula.slice(index);

    if (formula[index] === '"') {
      index++;
      let value = '';
      while (index < formula.length) {
        if (formula[index] === '"') {
          if (formula[index + 1] === '"') {
            value += '"';
            index += 2;
            continue;
          }
          index++;
          return { type: 'string', value };
        }
        value += formula[index++];
      }
      throw new Error('Unclosed text string');
    }

    const reference = remaining.match(referencePattern)?.[0];
    if (reference) {
      index += reference.length;
      return { type: 'reference', value: reference };
    }

    const number = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?/)?.[0];
    if (number) {
      index += number.length;
      return { type: 'number', value: number };
    }

    const identifier = remaining.match(/^[A-Za-z_][A-Za-z0-9_.]*/)?.[0];
    if (identifier) {
      index += identifier.length;
      return { type: 'identifier', value: identifier };
    }

    const operator = ['<=', '>=', '<>', '!=', '+', '-', '*', '/', '^', '&', '=', '<', '>', ':', '(', ')', ';', '%', ',']
      .find(candidate => formula.startsWith(candidate, index));
    if (operator) {
      index += operator.length;
      return { type: 'operator', value: operator.trim() };
    }
    throw new Error(`Unexpected character '${formula[index]}'`);
  };
}

const PRECEDENCE: Record<string, number> = {
  '=': 1, '<>': 1, '!=': 1, '<': 1, '>': 1, '<=': 1, '>=': 1,
  '&': 2,
  '+': 3, '-': 3,
  '*': 4, '/': 4,
  '^': 5,
  ':': 6
};

class FormulaParser {
  private token: Token;
  private readonly nextToken: () => Token;
  private readonly currentSheetName: string;
  private readonly resolveCell: (sheetName: string, address: string) => any;

  constructor(
    formula: string,
    currentSheetName: string,
    resolveCell: (sheetName: string, address: string) => any
  ) {
    this.currentSheetName = currentSheetName;
    this.resolveCell = resolveCell;
    this.nextToken = makeTokenizer(formula);
    this.token = this.nextToken();
  }

  parse(): FormulaValue {
    const result = this.parseExpression(0);
    if (this.token.type !== 'eof') throw new Error(`Unexpected token '${this.token.value}'`);
    return result;
  }

  private parseExpression(minPrecedence: number, evaluate = true): FormulaValue {
    let left = this.parsePrefix(evaluate);
    while (this.token.type === 'operator') {
      if (this.token.value === '%') {
        this.advance();
        left = evaluate ? this.applyOperator('%', left, 1) : 0;
        continue;
      }
      if ((PRECEDENCE[this.token.value] || 0) < minPrecedence) break;
      const operator = this.token.value;
      const precedence = PRECEDENCE[operator];
      if (!precedence) break;
      this.advance();
      const right = this.parseExpression(precedence + (operator === '^' ? 0 : 1), evaluate);
      left = evaluate ? this.applyOperator(operator, left, right) : 0;
    }
    return left;
  }

  private parsePrefix(evaluate = true): FormulaValue {
    const token = this.token;
    if (token.type === 'operator' && ['+', '-'].includes(token.value)) {
      this.advance();
      const operand = this.parseExpression(5, evaluate);
      if (!evaluate) return 0;
      if (isFormulaError(operand)) return operand;
      return token.value === '-' ? -this.toNumber(operand) : this.toNumber(operand);
    }
    if (token.type === 'number') {
      this.advance();
      return Number(token.value);
    }
    if (token.type === 'string') {
      this.advance();
      return token.value;
    }
    if (token.type === 'reference') {
      this.advance();
      if (!evaluate) return 0;
      const reference = splitSheetReference(token.value, this.currentSheetName);
      if (typeof reference === 'string') return reference;
      const parsed = parseAddress(reference.address);
      return {
        kind: 'range',
        values: [[this.resolveCell(reference.sheetName, reference.address)]],
        bounds: { sheetName: reference.sheetName, row: parsed.row, col: parsed.col }
      };
    }
    if (token.type === 'identifier') {
      this.advance();
      const name = token.value.toUpperCase();
      if (name === 'TRUE') return true;
      if (name === 'FALSE') return false;
      if (this.token.value !== '(') throw new Error(`Unknown name '${token.value}'`);
      this.advance();
      const args: FormulaValue[] = [];
      if (String(this.token.value) !== ')') {
        do {
          let evaluateArgument = evaluate;
          if (evaluate && name === 'IF' && args.length > 0) {
            const condition = this.truthy(this.unwrapRange(args[0]));
            evaluateArgument = args.length === 1 ? condition : !condition;
          } else if (evaluate && name === 'IFERROR' && args.length > 0) {
            evaluateArgument = args.length === 1 && isFormulaError(this.unwrapRange(args[0]));
          }
          args.push(this.parseExpression(0, evaluateArgument));
          if (String(this.token.value) !== ',' && String(this.token.value) !== ';') break;
          this.advance();
        } while (this.token.type !== 'eof');
      }
      if (String(this.token.value) !== ')') throw new Error('Missing closing parenthesis');
      this.advance();
      return evaluate ? this.callFunction(name, args) : 0;
    }
    if (token.value === '(') {
      this.advance();
      const value = this.parseExpression(0, evaluate);
      if (String(this.token.value) !== ')') throw new Error('Missing closing parenthesis');
      this.advance();
      return value;
    }
    throw new Error(`Unexpected token '${token.value}'`);
  }

  private callFunction(name: string, args: FormulaValue[]): FormulaValue {
    if (args.some(isFormulaError) && name !== 'IFERROR') return args.find(isFormulaError)!;
    const expanded = args.map(value => this.unwrapRange(value));
    const first = expanded[0];

    switch (name) {
      case 'IF': return this.truthy(first) ? (expanded[1] ?? true) : (expanded[2] ?? false);
      case 'IFERROR': return isFormulaError(first) ? (expanded[1] ?? '') : first;
      case 'AND': return expanded.flat(Infinity).every(value => this.truthy(value));
      case 'OR': return expanded.flat(Infinity).some(value => this.truthy(value));
      case 'NOT': return !this.truthy(first);
      case 'TODAY': return dateToSerial(new Date());
      case 'NOW': return (Date.now() - EXCEL_DATE_EPOCH) / 86400000;
      case 'DATEDIF': return this.dateDiff(expanded);
      case 'CONCAT':
      case 'CONCATENATE': return expanded.flat(Infinity).map(value => value ?? '').join('');
    }

    const candidate = (FormulaJS as Record<string, any>)[name];
    if (typeof candidate !== 'function') return '#NAME?';
    try {
      const result = toExcelValue(candidate(...expanded));
      if (result && typeof result === 'object' && typeof result.error === 'string') return result.error;
      return result;
    } catch (error: any) {
      return this.toFormulaError(error);
    }
  }

  private dateDiff(args: any[]): any {
    if (args.length < 3) return '#VALUE!';
    const start = this.asDate(args[0]);
    const end = this.asDate(args[1]);
    const unit = String(args[2] ?? '').replace(/['"]/g, '').toUpperCase();
    if (!start || !end || end < start) return '#NUM!';
    let years = end.getFullYear() - start.getFullYear();
    if (end.getMonth() < start.getMonth() || (end.getMonth() === start.getMonth() && end.getDate() < start.getDate())) years--;
    let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    if (end.getDate() < start.getDate()) months--;
    const days = Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
    if (unit === 'Y') return years;
    if (unit === 'M') return months;
    if (unit === 'D') return days;
    if (unit === 'YM') return ((months % 12) + 12) % 12;
    if (unit === 'YD') {
      const anniversary = new Date(end.getFullYear(), start.getMonth(), start.getDate());
      if (anniversary > end) anniversary.setFullYear(anniversary.getFullYear() - 1);
      return Math.floor((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(anniversary.getFullYear(), anniversary.getMonth(), anniversary.getDate())) / 86400000);
    }
    if (unit === 'MD') return end.getDate() >= start.getDate()
      ? end.getDate() - start.getDate()
      : new Date(end.getFullYear(), end.getMonth(), 0).getDate() - start.getDate() + end.getDate();
    return '#VALUE!';
  }

  private asDate(value: any): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return new Date(EXCEL_DATE_EPOCH + value * 86400000);
    if (typeof value === 'string' && value.trim()) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private applyOperator(operator: string, left: FormulaValue, right: FormulaValue): any {
    if (isFormulaError(left)) return left;
    if (isFormulaError(right)) return right;
    if (operator === ':') {
      const start = this.referenceBounds(left);
      const end = this.referenceBounds(right);
      if (!start || !end || start.sheetName.toLowerCase() !== end.sheetName.toLowerCase()) return '#REF!';
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      const values: any[][] = [];
      for (let row = minRow; row <= maxRow; row++) {
        const valuesRow: any[] = [];
        for (let col = minCol; col <= maxCol; col++) {
          valuesRow.push(this.resolveCell(start.sheetName, `${colNumToLetter(col)}${row}`));
        }
        values.push(valuesRow);
      }
      return { kind: 'range', values, bounds: {
        sheetName: start.sheetName,
        row: minRow,
        col: minCol,
        endRow: maxRow,
        endCol: maxCol
      } } as RangeValue;
    }
    const l = this.unwrapRange(left);
    const r = this.unwrapRange(right);
    if (isFormulaError(l)) return l;
    if (isFormulaError(r)) return r;
    if (['=', '<>', '!=', '<', '>', '<=', '>='].includes(operator)) return this.compare(operator, l, r);
    if (operator === '&') return `${l ?? ''}${r ?? ''}`;
    if (operator === '%') return this.toNumber(l) / 100;
    const leftNumber = this.toNumber(l);
    const rightNumber = this.toNumber(r);
    switch (operator) {
      case '+': return leftNumber + rightNumber;
      case '-': return leftNumber - rightNumber;
      case '*': return leftNumber * rightNumber;
      case '/': return rightNumber === 0 ? '#DIV/0!' : leftNumber / rightNumber;
      case '^': return Math.pow(leftNumber, rightNumber);
      default: return '#VALUE!';
    }
  }

  private referenceBounds(value: FormulaValue): { sheetName: string; row: number; col: number } | null {
    if (!value || typeof value !== 'object' || (value as RangeValue).kind !== 'range') return null;
    // A cell reference is represented by a one-cell range; preserve its original address through metadata.
    const bounds = (value as RangeValue).bounds;
    return bounds ? { sheetName: bounds.sheetName, row: bounds.row, col: bounds.col } : null;
  }

  private compare(operator: string, left: any, right: any): boolean {
    const leftNumber = this.tryNumber(left);
    const rightNumber = this.tryNumber(right);
    const comparableLeft = leftNumber !== null && rightNumber !== null ? leftNumber : String(left ?? '').toLocaleLowerCase();
    const comparableRight = leftNumber !== null && rightNumber !== null ? rightNumber : String(right ?? '').toLocaleLowerCase();
    switch (operator) {
      case '=': return comparableLeft === comparableRight;
      case '<>':
      case '!=': return comparableLeft !== comparableRight;
      case '<': return comparableLeft < comparableRight;
      case '>': return comparableLeft > comparableRight;
      case '<=': return comparableLeft <= comparableRight;
      case '>=': return comparableLeft >= comparableRight;
      default: return false;
    }
  }

  private unwrapRange(value: FormulaValue): any {
    if (!value || typeof value !== 'object' || (value as RangeValue).kind !== 'range') return value;
    const values = (value as RangeValue).values;
    return values.length === 1 && values[0].length === 1 ? values[0][0] : values;
  }

  private toNumber(value: any): number {
    if (value === true) return 1;
    if (value === false || value === '' || value === null || value === undefined) return 0;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
    if (typeof value === 'string' && /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(value)) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return dateToSerial(date);
    }
    return 0;
  }

  private tryNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    return null;
  }

  private truthy(value: any): boolean {
    if (isFormulaError(value)) return false;
    if (typeof value === 'string') return value.toUpperCase() !== 'FALSE' && value !== '';
    return value !== false && value !== 0 && value !== null && value !== undefined;
  }

  private toFormulaError(error: any): FormulaError {
    const message = String(error?.message || error || '').toUpperCase();
    if (message.includes('DIV/0') || message.includes('DIVISION BY ZERO')) return '#DIV/0!';
    if (message.includes('NUM')) return '#NUM!';
    if (message.includes('N/A')) return '#N/A';
    if (message.includes('REF')) return '#REF!';
    return '#VALUE!';
  }

  private advance(): void {
    this.token = this.nextToken();
  }
}

function findSheetKey(allSheetsMap: CellValueMap | undefined, sheetName: string, fallbackCells: Record<string, FormulaCell>): string {
  if (!allSheetsMap) return sheetName;
  const key = Object.keys(allSheetsMap).find(candidate => (
    candidate.toLowerCase() === sheetName.toLowerCase()
    || allSheetsMap[candidate].name?.toLowerCase() === sheetName.toLowerCase()
  ));
  if (key) return key;
  if (sheetName) return sheetName;
  const currentKey = Object.keys(allSheetsMap).find(candidate => allSheetsMap[candidate].cells === fallbackCells);
  return currentKey || sheetName;
}

function calculateCell(
  sheetName: string,
  address: string,
  sheets: CellValueMap,
  fallbackCells: Record<string, FormulaCell>,
  visiting: Set<string>,
  results: Map<string, any>
): any {
  const key = findSheetKey(sheets, sheetName, fallbackCells);
  const cellKey = `${key.toLowerCase()}!${address.toUpperCase()}`;
  if (results.has(cellKey)) return results.get(cellKey);
  const targetCells = sheets[key]?.cells;
  if (!targetCells) return '#REF!';
  const cell = targetCells[address.toUpperCase()] || targetCells[address];
  if (!cell) return '';
  if (!cell.f) return normalizeCellValue(cell.v);
  if (visiting.has(cellKey)) return '#CIRCULAR!';
  visiting.add(cellKey);
  const result = evaluateParsedFormula(cell.f, key, targetCells, sheets, visiting, results);
  visiting.delete(cellKey);
  results.set(cellKey, result);
  return result;
}

function evaluateParsedFormula(
  formula: string,
  sheetName: string,
  currentCells: Record<string, FormulaCell>,
  sheets: CellValueMap,
  visiting = new Set<string>(),
  results = new Map<string, any>()
): any {
  const trimmed = String(formula || '').trim().replace(/^=/, '');
  if (!trimmed) return '';
  try {
    const parser = new FormulaParser(trimmed, sheetName, (targetSheet, address) => (
      calculateCell(targetSheet, address, sheets, currentCells, visiting, results)
    ));
    const value = parser.parse();
    if (value && typeof value === 'object' && (value as RangeValue).kind === 'range') {
      const range = value as RangeValue;
      if (range.bounds && range.bounds.endRow === undefined && range.bounds.endCol === undefined) {
        return range.values[0]?.[0] === '' ? 0 : range.values[0]?.[0] ?? 0;
      }
      return '#VALUE!';
    }
    return value;
  } catch (error: any) {
    return String(error?.message || '').startsWith("Unknown name '") ? '#NAME?' : '#VALUE!';
  }
}

export function evaluateFormula(
  formulaStr: string,
  currentSheetCells: Record<string, FormulaCell>,
  allSheetsMap?: CellValueMap
): any {
  if (!formulaStr || typeof formulaStr !== 'string') return '';
  const currentSheetName = findSheetKey(allSheetsMap, '', currentSheetCells);
  const sheets = allSheetsMap || { [currentSheetName]: { name: currentSheetName, cells: currentSheetCells } };
  return evaluateParsedFormula(formulaStr, currentSheetName, currentSheetCells, sheets);
}

export function parseCellInput(rawInput: string, cells: Record<string, FormulaCell>, sheets?: CellValueMap): {
  value: any;
  formula: string | null;
  result: any;
} {
  const input = String(rawInput ?? '');
  if (input.startsWith('=')) {
    const formula = input.slice(1).trim();
    return { value: input, formula, result: evaluateFormula(formula, cells, sheets) };
  }
  if (input !== '' && Number.isFinite(Number(input))) {
    const value = Number(input);
    return { value, formula: null, result: value };
  }
  return { value: input, formula: null, result: input };
}

export function applyCellEdits(
  cells: Record<string, FormulaCell>,
  edits: Array<{ address: string; input: string }>,
  sheetName = 'Sheet1',
  workbookSheets?: CellValueMap
): { cells: Record<string, FormulaCell>; changes: Array<{ address: string; oldValue: any; newValue: any; oldFormula: string | null; formula: string | null }> } {
  const nextCells: Record<string, FormulaCell> = Object.fromEntries(Object.entries(cells).map(([address, cell]) => [address, { ...cell }]));
  const changes: Array<{ address: string; oldValue: any; newValue: any; oldFormula: string | null; formula: string | null }> = [];

  for (const edit of edits) {
    const address = edit.address.toUpperCase();
    const oldCell = nextCells[address] || {};
    const parsed = parseCellInput(edit.input, nextCells, {
      ...(workbookSheets || {}),
      [sheetName]: { ...(workbookSheets?.[sheetName] || {}), name: sheetName, cells: nextCells }
    });
    if (String(oldCell.v ?? '') === String(parsed.value ?? '') && (oldCell.f || null) === parsed.formula) continue;
    nextCells[address] = { ...oldCell, v: parsed.value, f: parsed.formula, res: parsed.result };
    changes.push({
      address,
      oldValue: oldCell.v,
      newValue: parsed.value,
      oldFormula: oldCell.f || null,
      formula: parsed.formula
    });
  }

  const workbook = recalculateWorkbook({
    ...(workbookSheets || {}),
    [sheetName]: { ...(workbookSheets?.[sheetName] || {}), name: sheetName, cells: nextCells }
  });
  return { cells: workbook[sheetName]?.cells || nextCells, changes };
}

export function recalculateWorkbook(workbook: CellValueMap): CellValueMap {
  const recalculated: CellValueMap = Object.fromEntries(Object.entries(workbook).map(([key, sheet]) => [key, {
    ...sheet,
    cells: Object.fromEntries(Object.entries(sheet.cells).map(([address, cell]) => [address, { ...cell }]))
  }]));
  const results = new Map<string, any>();
  const visiting = new Set<string>();
  for (const [key, sheet] of Object.entries(recalculated)) {
    for (const [address, cell] of Object.entries(sheet.cells)) {
      if (cell.f) {
        const value = calculateCell(key, address, recalculated, sheet.cells, visiting, results);
        cell.res = value;
      }
    }
  }
  return recalculated;
}

export function translateFormulaReferences(formula: string, rowDelta: number, colDelta: number): string {
  if (!formula) return formula;
  const referencePattern = /(?<![A-Za-z0-9_.])((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_. -]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_])/g;
  const translatePart = (part: string) => part.replace(referencePattern, (match, sheetPrefix = '', absCol = '', letters = '', absRow = '', rowText = '') => {
    const col = colLetterToNum(letters);
    const row = Number(rowText);
    const nextCol = absCol ? col : col + colDelta;
    const nextRow = absRow ? row : row + rowDelta;
    if (nextCol < 1 || nextCol > 16384 || nextRow < 1 || nextRow > 1048576) return '#REF!';
    return `${sheetPrefix}${absCol}${colNumToLetter(nextCol)}${absRow}${nextRow}`;
  });
  let result = '';
  let plain = '';
  let inString = false;
  for (let index = 0; index < formula.length; index++) {
    const char = formula[index];
    if (char === '"') {
      if (formula[index + 1] === '"' && inString) {
        plain += '""';
        index++;
        continue;
      }
      result += translatePart(plain);
      plain = '';
      inString = !inString;
      result += char;
      continue;
    }
    if (inString) result += char;
    else plain += char;
  }
  return result + translatePart(plain);
}
