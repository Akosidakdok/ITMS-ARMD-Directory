import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOrderNumber,
  extractOrderSequence,
  getOrderYear
} from '../backend/utils/orderNumber.js';
import { formatOfficialOrderNumber, getOfficialOrderNumber } from '../shared/orderNumber.js';
import { PAISRepository } from '../backend/store/repository.js';
import { createTestRepository, issueTestOrder } from '../test-support/repository.js';

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

test('preserves the full official order number wherever it is formatted', () => {
  const officialNumber = 'ITMS-GO-RCA-2026-0001';
  assert.equal(formatOfficialOrderNumber(officialNumber), officialNumber);
  assert.equal(getOfficialOrderNumber({ orderNumber: officialNumber }), officialNumber);
  assert.equal(getOfficialOrderNumber({ orderNo: officialNumber }), officialNumber);
});

test('test issuance adapter keeps one ordered series across purpose codes', async () => {
  const repository = createTestRepository();
  const first = await issueTestOrder(repository, {
    id: 'test-order-series-1', series: 'SO', purposeCode: 'DES', issuedDate: '2026-09-01'
  });
  const second = await issueTestOrder(repository, {
    id: 'test-order-series-2', series: 'SO', purposeCode: 'TR', issuedDate: '2026-09-02'
  });
  const otherSeries = await issueTestOrder(repository, {
    id: 'test-order-series-3', series: 'GO', purposeCode: 'DES', issuedDate: '2026-09-02'
  });

  assert.equal(first.orderNumber, 'ITMS-SO-DES-2026-0001');
  assert.equal(second.orderNumber, 'ITMS-SO-TR-2026-0002');
  assert.equal(otherSeries.orderNumber, 'ITMS-GO-DES-2026-0001');
});

test('test issuance adapter makes retries idempotent and concurrent numbers unique', async () => {
  const repository = createTestRepository();
  const retryPayload = {
    id: 'test-order-idempotent', series: 'SO', purposeCode: 'DES', issuedDate: '2026-09-01'
  };
  const firstAttempt = await issueTestOrder(repository, retryPayload);
  const retry = await issueTestOrder(repository, retryPayload);
  assert.equal(retry.orderNumber, firstAttempt.orderNumber);
  assert.equal((await repository.getOrders()).length, 1);

  const concurrent = await Promise.all(Array.from({ length: 32 }, (_, index) => issueTestOrder(repository, {
    id: `test-order-concurrent-${index}`,
    series: 'LO', purposeCode: 'TR', issuedDate: '2026-09-01'
  })));
  const sequences = concurrent.map(order => extractOrderSequence(order.orderNumber).sequence).sort((a, b) => a - b);
  assert.deepEqual(sequences, Array.from({ length: 32 }, (_, index) => index + 1));
});

test('production repository still refuses official issuance without Supabase', async () => {
  const repository = new PAISRepository({ initialData: false });
  await assert.rejects(
    repository.createOrder({
      id: 'must-not-issue-offline', series: 'SO', purposeCode: 'DES', issuedDate: '2026-09-01',
      orderType: 'SO — Designation', subject: 'Offline issuance guard'
    }),
    /requires a live Supabase database connection/i
  );
});
