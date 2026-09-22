import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrderDocumentPath, isDocxZip } from '../backend/services/orderDocumentStorage.js';

test('builds a safe versioned private path for an order document', () => {
  assert.equal(
    buildOrderDocumentPath({ order: { id: 'order/1', series: 'SO', orderNumber: 'ITMS-SO-DES-2026-0001', issuedDate: '2026-09-22' }, version: 2 }),
    '2026/SO/ITMS-SO-DES-2026-0001/v2/source.docx'
  );
});

test('accepts DOCX ZIP signatures and rejects non-ZIP content', () => {
  assert.equal(isDocxZip(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])), true);
  assert.equal(isDocxZip(Buffer.from('%PDF-1.7')), false);
  assert.equal(isDocxZip(Buffer.from('')), false);
});
