import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateOrderPurposePayload } from '../backend/utils/orderCatalog.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(testDirectory, '..', 'shared', 'orderCatalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

test('order catalog includes all required series', () => {
  for (const code of ['GO', 'SO', 'LO']) {
    assert.ok(catalog.series.some(option => option.value === code));
  }
});

test('order catalog includes every required purpose code', () => {
  const requiredCodes = [
    'DES', 'TDS', 'DO', 'DOX', 'TR', 'RA', 'UA', 'CSC', 'LV', 'AW',
    'CCS', 'AO', 'PR', 'PA', 'RG', 'LP', 'RCA', 'SP', 'AWOL', 'CN', 'CHAPS'
  ];

  for (const code of requiredCodes) {
    assert.ok(catalog.purposes.some(option => option.value === code));
  }
});

test('order catalog includes the required document lifecycle statuses', () => {
  for (const status of ['Draft', 'For Approval', 'Signed', 'Released', 'Archived', 'Revoked']) {
    assert.ok(catalog.statuses.some(option => option.value === status));
  }
});

test('every purpose has a template, narrative key, fields, and personnel roles', () => {
  assert.equal(catalog.purposes.length, 21);
  for (const purpose of catalog.purposes) {
    assert.ok(purpose.templateKey);
    assert.ok(purpose.narrativeKey);
    assert.ok(Array.isArray(purpose.fields));
    assert.ok(Array.isArray(purpose.personnelRoles));
    assert.ok(purpose.personnelRoles.some(role => role.required));
  }
});

test('purpose payload validation uses the selected definition', () => {
  assert.deepEqual(validateOrderPurposePayload({
    purposeCode: 'TR',
    purposeData: {
      destinations: 'Marikina City',
      travelStartDate: '2026-08-20',
      travelEndDate: '2026-08-24',
      activity: 'TWG post-qualification'
    },
    personnelInvolvement: [{ personnelId: 'p-001', role: 'affected', sequence: 1 }]
  }), []);
  assert.match(
    validateOrderPurposePayload({ purposeCode: 'TR', purposeData: {} }).join(' '),
    /Destination\(s\).*required/i
  );
});
