import assert from 'node:assert/strict';
import test from 'node:test';
import mammoth from 'mammoth';
import { formatDocumentOrderNumber, generateOrderDocx } from '../backend/services/orderDocxGenerator.js';
import { isDocxZip } from '../backend/services/orderDocumentStorage.js';

test('generates a reference-based DOCX with order and personnel content', async () => {
  const { buffer, manifest } = await generateOrderDocx({
    id: 'order-travel-1',
    orderNumber: 'ITMS-SO-TR-2026-0001',
    series: 'SO',
    purposeCode: 'TR',
    issuedDate: '2026-09-22',
    subject: 'Official Travel',
    purposeData: {
      destinations: ['Manila', 'Cebu'],
      travelStartDate: '2026-10-01',
      travelEndDate: '2026-10-03',
      activity: 'ITMS coordination conference'
    },
    personnelSnapshot: [
      { personnelId: 'p-1', role: 'traveler', sequence: 1, rank: 'PSSG', fullName: 'JUAN DELA CRUZ' },
      { personnelId: 'p-2', role: 'driver', sequence: 2, rank: 'PCPL', fullName: 'MARIA SANTOS' }
    ]
  });

  assert.equal(isDocxZip(buffer), true);
  assert.equal(manifest.templateKey, 'pnp-itms-letter-orders');
  assert.equal(manifest.templateVersion, '1.1.0');
  assert.equal(manifest.personnelSnapshot.length, 2);

  const converted = await mammoth.convertToHtml({ buffer });
  assert.match(converted.value, /NUMBER ITMS-SO-TR-2026-0001/);
  assert.doesNotMatch(converted.value, /NUMBER 2026-0001/);
  assert.match(converted.value, /OFFICIAL TRAVEL/i);
  assert.match(converted.value, /JUAN DELA CRUZ/);
  assert.match(converted.value, /MARIA SANTOS/);
});

test('formats document order numbers using only year and sequence', () => {
  assert.equal(formatDocumentOrderNumber('ITMS-GO-RCA-2026-0003'), 'ITMS-GO-RCA-2026-0003');
  assert.equal(formatDocumentOrderNumber('legacy-number'), 'legacy-number');
});

test('renders non-Travel purpose details in the generated document', async () => {
  const { buffer } = await generateOrderDocx({
    id: 'order-designation-1',
    orderNumber: 'ITMS-GO-DES-2026-0002',
    series: 'GO',
    purposeCode: 'DES',
    issuedDate: '2026-09-22',
    subject: 'Designation',
    purposeData: { designation: 'Operations Officer', assignedUnit: 'ITMS Operations Division' },
    personnelSnapshot: [{ personnelId: 'p-1', role: 'affected', sequence: 1, rank: 'PSSG', fullName: 'JUAN DELA CRUZ' }]
  });
  const converted = await mammoth.convertToHtml({ buffer });
  assert.match(converted.value, /Operations Officer/);
  assert.match(converted.value, /ITMS Operations Division/);
});

test('generates an Award-purpose Administrative Order with citation and recipient', async () => {
  const { buffer } = await generateOrderDocx({
    id: 'order-award-1',
    orderNumber: 'ITMS-GO-AW-2026-0001',
    series: 'GO',
    purposeCode: 'AW',
    issuedDate: '2026-09-22',
    subject: 'Medalya Ng Pagkilala',
    purposeData: {
      awardTitle: 'Medalya Ng Pagkilala',
      citation: 'For meritorious service in support of ITMS operations.'
    },
    personnelSnapshot: [
      { personnelId: 'p-award-1', role: 'recipient', sequence: 1, rank: 'PSSG', fullName: 'ALEX REYES' }
    ]
  });

  assert.equal(isDocxZip(buffer), true);
  const converted = await mammoth.convertToHtml({ buffer });
  assert.match(converted.value, /NUMBER ITMS-GO-AW-2026-0001/);
  assert.match(converted.value, /Medalya Ng Pagkilala/);
  assert.match(converted.value, /For meritorious service in support of ITMS operations/);
  assert.match(converted.value, /ALEX REYES/);
  assert.match(converted.value, /Award recipient/i);
});
