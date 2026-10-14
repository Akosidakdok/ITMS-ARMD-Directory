import test from 'node:test';
import assert from 'node:assert/strict';
import {
  colNumToLetter,
  colLetterToNum,
  parseAddress,
  formatCellValue,
  formatExcelDateSerial
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
