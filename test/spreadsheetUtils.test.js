import test from 'node:test';
import assert from 'node:assert/strict';
import {
  colNumToLetter,
  colLetterToNum,
  parseAddress,
  formatCellValue,
  formatExcelDateSerial,
  insertCellReferenceIntoFormula
} from '../src/utils/spreadsheetUtils.ts';

test('colNumToLetter converts 1-based column numbers to Excel column letters', () => {
  assert.equal(colNumToLetter(1), 'A');
  assert.equal(colNumToLetter(26), 'Z');
  assert.equal(colNumToLetter(27), 'AA');
  assert.equal(colNumToLetter(28), 'AB');
  assert.equal(colNumToLetter(702), 'ZZ');
  assert.equal(colNumToLetter(703), 'AAA');
});

test('colNumToLetter returns empty string for non-positive numbers', () => {
  assert.equal(colNumToLetter(0), '');
  assert.equal(colNumToLetter(-5), '');
});

test('colLetterToNum converts uppercase column letters to 1-based numbers', () => {
  assert.equal(colLetterToNum('A'), 1);
  assert.equal(colLetterToNum('Z'), 26);
  assert.equal(colLetterToNum('AA'), 27);
  assert.equal(colLetterToNum('AB'), 28);
  assert.equal(colLetterToNum('ZZ'), 702);
});

test('colLetterToNum supports lowercase and mixed-case column letters', () => {
  assert.equal(colLetterToNum('a'), 1);
  assert.equal(colLetterToNum('z'), 26);
  assert.equal(colLetterToNum('aa'), 27);
  assert.equal(colLetterToNum('ab'), 28);
  assert.equal(colLetterToNum('aB'), 28);
});

test('parseAddress extracts row, col and letter from cell address', () => {
  assert.deepEqual(parseAddress('A1'), { row: 1, col: 1, letter: 'A' });
  assert.deepEqual(parseAddress('AA10'), { row: 10, col: 27, letter: 'AA' });
  assert.deepEqual(parseAddress('b5'), { row: 5, col: 2, letter: 'B' });
});

test('parseAddress falls back safely for invalid addresses', () => {
  assert.deepEqual(parseAddress(''), { row: 1, col: 1, letter: 'A' });
  assert.deepEqual(parseAddress('invalid'), { row: 1, col: 1, letter: 'A' });
});

test('formatCellValue handles null, undefined, and formula objects', () => {
  assert.equal(formatCellValue(null), '');
  assert.equal(formatCellValue(undefined), '');
  assert.equal(formatCellValue({ formula: '=SUM(A1:A5)', result: 1500 }), '1500');
  assert.equal(formatCellValue({ formula: '=A1', result: null }), '');
});

test('formatCellValue formats Philippine Peso currency and accounting formats', () => {
  assert.equal(formatCellValue(50000, 'currency'), '₱50,000.00');
  assert.equal(formatCellValue(50000, '₱#,##0.00'), '₱50,000.00');
  assert.equal(formatCellValue(2500.5, 'accounting'), '₱2,500.50');
  assert.equal(formatCellValue(-1200, 'accounting'), '(₱1,200.00)');
  assert.equal(formatCellValue(1234.56, 'number'), '1,234.56');
  assert.equal(formatCellValue(0.125, 'percentage'), '12.5%');
});

test('formats Excel date serials using the cell date format', () => {
  assert.match(formatExcelDateSerial(46023, 'mm/dd/yyyy'), /2026/);
  assert.equal(formatExcelDateSerial(46023, '#,##0.00'), null);
  assert.match(formatCellValue(46023, 'mm/dd/yyyy'), /2026/);
});

test('formatCellValue formats Date objects in date format without returning empty string', () => {
  const d = new Date('2026-05-15T12:00:00Z');
  const formatted = formatCellValue(d, 'date');
  assert.notEqual(formatted, '');
  assert.match(formatted, /2026|5\/15\/2026|15\/5\/2026/);
});

test('insertCellReferenceIntoFormula appends and auto-opens parenthesis for function names', () => {
  assert.equal(insertCellReferenceIntoFormula('=sum', 'A1'), '=sum(A1');
  assert.equal(insertCellReferenceIntoFormula('=SUM', 'C5'), '=SUM(C5');
  assert.equal(insertCellReferenceIntoFormula('=', 'B2'), '=B2');
  assert.equal(insertCellReferenceIntoFormula('=SUM(', 'A1:A10'), '=SUM(A1:A10');
  assert.equal(insertCellReferenceIntoFormula('=A1+', 'B2'), '=A1+B2');
  assert.equal(insertCellReferenceIntoFormula('=A1*B1,', 'C1'), '=A1*B1,C1');
});

test('insertCellReferenceIntoFormula replaces trailing reference when dragged or re-clicked', () => {
  assert.equal(insertCellReferenceIntoFormula('=sum(A1', 'A1:A5', 'A1'), '=sum(A1:A5');
  assert.equal(insertCellReferenceIntoFormula('=A1+B1', 'C1', 'B1'), '=A1+C1');
  assert.equal(insertCellReferenceIntoFormula('=B2', 'C3'), '=C3');
});

test('getFormulaSearchContext returns all formulas when writing equal sign', async () => {
  const { getFormulaSearchContext, SPREADSHEET_FUNCTIONS } = await import('../src/constants/spreadsheetFunctions.ts');

  // Exact '=' must trigger formula list with empty search term (matches all)
  const ctxEqual = getFormulaSearchContext('=');
  assert.equal(ctxEqual.isFormula, true);
  assert.equal(ctxEqual.searchTerm, '');
  assert.equal(ctxEqual.prefixText, '=');

  // Should contain all cataloged formulas
  assert.ok(SPREADSHEET_FUNCTIONS.length >= 40);
  assert.ok(SPREADSHEET_FUNCTIONS.some(f => f.name === 'SUM'));
  assert.ok(SPREADSHEET_FUNCTIONS.some(f => f.name === 'AVERAGE'));
  assert.ok(SPREADSHEET_FUNCTIONS.some(f => f.name === 'DATEDIF'));
  assert.ok(SPREADSHEET_FUNCTIONS.some(f => f.name === 'IF'));

  // Typing '=s' or '=sum' filters prefix
  const ctxS = getFormulaSearchContext('=s');
  assert.equal(ctxS.isFormula, true);
  assert.equal(ctxS.searchTerm, 'S');

  const ctxSum = getFormulaSearchContext('=sum');
  assert.equal(ctxSum.isFormula, true);
  assert.equal(ctxSum.searchTerm, 'SUM');

  // Operator-preceded formula context: e.g. '=A1+s' or '=SUM(A1, a'
  const ctxAdd = getFormulaSearchContext('=A1+s');
  assert.equal(ctxAdd.isFormula, true);
  assert.equal(ctxAdd.searchTerm, 'S');
  assert.equal(ctxAdd.prefixText, '=A1+');

  const ctxComma = getFormulaSearchContext('=SUM(A1, a');
  assert.equal(ctxComma.isFormula, true);
  assert.equal(ctxComma.searchTerm, 'A');
  assert.equal(ctxComma.prefixText, '=SUM(A1, ');

  // Non-formula inputs
  assert.equal(getFormulaSearchContext('Normal text').isFormula, false);
  assert.equal(getFormulaSearchContext('12345').isFormula, false);
  assert.equal(getFormulaSearchContext('').isFormula, false);
});


