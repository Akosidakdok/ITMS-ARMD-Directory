import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPersonnelOrgDisplay } from '../src/utils/personnelDisplay.ts';

test('formatPersonnelOrgDisplay formats full sub-unit, details, and station', () => {
  const result = formatPersonnelOrgDisplay('Network Operations Section', 'Network Monitoring', 'Camp Crame');
  assert.equal(result, 'Network Operations Section - Network Monitoring - Camp Crame');
});

test('formatPersonnelOrgDisplay handles missing details with fallback', () => {
  const result = formatPersonnelOrgDisplay('Network Operations Section', '', 'Camp Crame');
  assert.equal(result, 'Network Operations Section - No Details recorded - Camp Crame');
});

test('formatPersonnelOrgDisplay handles missing sub-unit and details', () => {
  const result = formatPersonnelOrgDisplay('', '', 'Camp Crame');
  assert.equal(result, 'No Details recorded - Camp Crame');
});

test('formatPersonnelOrgDisplay handles missing station with fallback', () => {
  const result1 = formatPersonnelOrgDisplay('Network Operations Section', 'Network Monitoring', '');
  assert.equal(result1, 'Network Operations Section - Network Monitoring - No Station recorded');

  const result2 = formatPersonnelOrgDisplay('', '', '');
  assert.equal(result2, 'No Details recorded - No Station recorded');
});

test('formatPersonnelOrgDisplay handles null and whitespace values without old fallback', () => {
  const result = formatPersonnelOrgDisplay(null, undefined, '   ');
  assert.equal(result, 'No Details recorded - No Station recorded');
  assert.equal(result.includes('No sub-unit recorded'), false);
});

test('createPersonnel rejects requests missing rank, firstName, or lastName (DEF-PERS-01)', async () => {
  const { createPersonnel } = await import('../backend/controllers/personnelController.js');

  const invalidPayloads = [
    { firstName: 'Juan', lastName: 'Dela Cruz' },
    { rank: 'PLTCOL', lastName: 'Dela Cruz' },
    { rank: 'PLTCOL', firstName: 'Juan' },
    { rank: '', firstName: 'Juan', lastName: 'Dela Cruz' },
    { rank: '   ', firstName: 'Juan', lastName: 'Dela Cruz' }
  ];

  for (const body of invalidPayloads) {
    let statusCode = null;
    let responseBody = null;
    const req = { body };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseBody = data; return this; }
    };
    await createPersonnel(req, res);
    assert.equal(statusCode, 400);
    assert.equal(responseBody.success, false);
    assert.equal(responseBody.message, 'Missing required fields: rank, firstName, and lastName are required');
  }
});
