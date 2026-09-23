import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGeneratedOrderDocumentPath,
  buildOrderDocumentPath,
  buildSignedOrderDocumentPath,
  isDocxZip,
  isSignedOrderImage
} from '../backend/services/orderDocumentStorage.js';

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

test('builds separate generated and signed-document paths', () => {
  const order = { id: 'order/1', series: 'SO', orderNumber: 'ITMS-SO-TR-2026-0001', issuedDate: '2026-09-22' };
  assert.equal(
    buildGeneratedOrderDocumentPath({ order, version: 1 }),
    'generated/2026/SO/ITMS-SO-TR-2026-0001/v1/order.docx'
  );
  assert.equal(
    buildSignedOrderDocumentPath({ order, version: 2, extension: 'JPG' }),
    'signed/2026/SO/ITMS-SO-TR-2026-0001/v2/signed-order.jpg'
  );
});

test('validates signed scan signatures for supported image types', () => {
  assert.equal(isSignedOrderImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'), true);
  assert.equal(isSignedOrderImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'), true);
  assert.equal(isSignedOrderImage(Buffer.from('RIFFxxxxWEBPdata'), 'image/webp'), true);
  assert.equal(isSignedOrderImage(Buffer.from('%PDF-1.7'), 'image/png'), false);
});
