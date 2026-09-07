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
