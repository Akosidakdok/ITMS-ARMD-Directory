import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(testDirectory, '..', 'src', 'constants', 'orders.ts');
const catalogSource = fs.readFileSync(catalogPath, 'utf8');

test('order catalog includes all required series', () => {
  for (const code of ['GO', 'SO', 'LO']) {
    assert.match(catalogSource, new RegExp(`value: '${code}'`));
  }
});

test('order catalog includes every required purpose code', () => {
  const requiredCodes = [
    'DES', 'TDS', 'DO', 'DOX', 'TR', 'RA', 'UA', 'CSC', 'LV', 'AW',
    'CCS', 'AO', 'PR', 'PA', 'RG', 'LP', 'RCA', 'SP', 'AWOL', 'CN', 'CHAPS'
  ];

  for (const code of requiredCodes) {
    assert.match(catalogSource, new RegExp(`value: '${code}'`));
  }
});

test('order catalog includes the required document lifecycle statuses', () => {
  for (const status of ['Draft', 'For Approval', 'Signed', 'Released', 'Archived', 'Revoked']) {
    assert.match(catalogSource, new RegExp(`value: '${status}'`));
  }
});
