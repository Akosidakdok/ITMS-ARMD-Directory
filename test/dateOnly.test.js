import test from 'node:test';
import assert from 'node:assert/strict';
import { previousCalendarDate } from '../backend/utils/dateOnly.js';

test('previousCalendarDate uses date-only UTC calendar arithmetic', () => {
  assert.equal(previousCalendarDate('2026-09-01'), '2026-08-31');
  assert.equal(previousCalendarDate('2026-01-01'), '2025-12-31');
  assert.equal(previousCalendarDate('2024-03-01'), '2024-02-29');
});

test('previousCalendarDate rejects malformed or impossible date-only values', () => {
  assert.throws(() => previousCalendarDate(''), /valid YYYY-MM-DD/);
  assert.throws(() => previousCalendarDate('2026-02-30'), /valid YYYY-MM-DD/);
});
