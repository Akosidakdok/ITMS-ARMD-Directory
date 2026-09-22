import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderNumber,
  extractOrderSequence,
  getOrderYear
} from '../backend/utils/orderNumber.js';

test('builds the required ITMS order-number format', () => {
  assert.equal(
    buildOrderNumber({ series: 'SO', purposeCode: 'DES', year: 2026, sequence: 1 }),
    'ITMS-SO-DES-2026-0001'
  );
  assert.equal(
    buildOrderNumber({ series: 'GO', purposeCode: 'CHAPS', year: 2026, sequence: 42 }),
    'ITMS-GO-CHAPS-2026-0042'
  );
});

test('extracts the series, year, and sequence from an order number', () => {
  assert.deepEqual(extractOrderSequence('ITMS-SO-UA-2026-0017'), {
    series: 'SO',
    year: 2026,
    sequence: 17
  });
  assert.equal(extractOrderSequence('SO-2026-0017'), null);
});

test('requires a valid issued-date year', () => {
  assert.equal(getOrderYear('2026-09-22'), 2026);
  assert.throws(() => getOrderYear(''), /valid issued date/i);
});
