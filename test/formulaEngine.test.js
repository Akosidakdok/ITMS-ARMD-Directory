import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateFormula,
  recalculateWorkbook,
  translateFormulaReferences,
  parseCellInput,
  applyCellEdits
} from '../src/components/spreadsheet/formula/formulaEngine.ts';

const cells = {
  A1: { v: 12 },
  A2: { v: 4 },
  B1: { v: 3 },
  B2: { v: '4' },
  C1: { v: '' },
  D1: { v: 'Officer' }
};

test('evaluates Excel operator precedence, comparisons, and concatenation', () => {
  assert.equal(evaluateFormula('=A1+B1*2', cells), 18);
  assert.equal(evaluateFormula('=-2^2', cells), -4);
  assert.equal(evaluateFormula('=A1>=10', cells), true);
  assert.equal(evaluateFormula('=D1&" #"&A1', cells), 'Officer #12');
});

test('handles blank cells as blank in COUNT, COUNTA, and AVERAGE', () => {
  assert.equal(evaluateFormula('=COUNT(A1:C1)', cells), 2);
  assert.equal(evaluateFormula('=COUNTA(A1:C1)', cells), 2);
  assert.equal(evaluateFormula('=AVERAGE(A1:C1)', cells), 7.5);
});

test('supports cross-sheet references and absolute references', () => {
  const workbook = {
    Summary: { cells: { A1: { v: 5 } } },
    'Sheet Two': { cells: { B2: { v: 7 } } }
  };
  assert.equal(evaluateFormula("='Sheet Two'!B2+$A$1", workbook.Summary.cells, workbook), 12);
});

test('supports criteria operators and common logical functions', () => {
  assert.equal(evaluateFormula('=COUNTIF(A1:B2,">10")', cells), 1);
  assert.equal(evaluateFormula('=IF(AND(A1>10,B1=3),"yes","no")', cells), 'yes');
  assert.equal(evaluateFormula('=AVERAGEIF(A1:B2,">10")', cells), 12);
  assert.equal(evaluateFormula('=IFERROR(1/0,9)', cells), 9);
  assert.equal(evaluateFormula('=IF(FALSE,1/0,7)', cells), 7);
  assert.equal(evaluateFormula('=IF(TRUE,8,UNKNOWN(1))', cells), 8);
});

test('recalculates dependent formulas and reports circular references', () => {
  const workbook = {
    Sheet1: { cells: { A1: { v: 2 }, B1: { f: 'A1*3', v: null }, C1: { f: 'B1+1', v: null } } }
  };
  const recalculated = recalculateWorkbook(workbook);
  assert.equal(recalculated.Sheet1.cells.C1.res, 7);

  const circular = recalculateWorkbook({
    Sheet1: { cells: { A1: { f: 'B1+1' }, B1: { f: 'A1+1' } } }
  });
  assert.equal(circular.Sheet1.cells.A1.res, '#CIRCULAR!');
  assert.equal(circular.Sheet1.cells.B1.res, '#CIRCULAR!');
});

test('recalculates dependent values after an input changes and clears stale formula state', () => {
  const workbook = {
    Sheet1: { cells: { A1: { v: 2 }, B1: { f: 'A1*3', v: '=A1*3', res: 6 } } }
  };
  workbook.Sheet1.cells.A1 = { ...workbook.Sheet1.cells.A1, v: 5 };
  assert.equal(recalculateWorkbook(workbook).Sheet1.cells.B1.res, 15);

  const literal = parseCellInput('7', workbook.Sheet1.cells);
  assert.equal(literal.formula, null);
  assert.equal(literal.value, 7);
  assert.equal(literal.result, 7);

  const edited = applyCellEdits(workbook.Sheet1.cells, [{ address: 'B1', input: '7' }], 'Sheet1');
  assert.equal(edited.cells.B1.f, null);
  assert.equal(edited.cells.B1.res, 7);
  assert.equal(edited.changes[0].oldFormula, 'A1*3');
});

test('supports percentages and date serial results', () => {
  assert.equal(evaluateFormula('=50%+25%', cells), 0.75);
  const value = evaluateFormula('=DATE(2026,1,1)', cells);
  assert.equal(value, 46023);
  assert.equal(evaluateFormula('=DATEDIF(A1,B1,"Y")', { A1: { v: '1990-01-01' }, B1: { v: '2026-04-30' } }), 36);
});

test('translates relative formula references while retaining absolute coordinates', () => {
  assert.equal(translateFormulaReferences('=SUM(A1:$B$2)+C$3+$D4', 2, 1), '=SUM(B3:$B$2)+D$3+$D6');
  assert.equal(translateFormulaReferences('=IF(A1="A1",A1,0)', 1, 1), '=IF(B2="A1",B2,0)');
});

test('returns Excel-style errors for invalid formulas, unknown functions, and bad references', () => {
  assert.equal(evaluateFormula('=DOESNOTEXIST(1)', cells), '#NAME?');
  assert.equal(evaluateFormula('=A1/0', cells), '#DIV/0!');
  assert.equal(evaluateFormula('=ZZ999', cells), 0);
  assert.equal(evaluateFormula("='Missing Sheet'!A1", cells), '#REF!');
  assert.equal(evaluateFormula('=SUM(A1:', cells), '#VALUE!');
});
