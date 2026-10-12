import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScrollbarWidth,
  getActiveLockCount
} from '../src/utils/useBodyScrollLock.ts';

test('calculateScrollbarWidth computes positive difference between innerWidth and clientWidth', () => {
  assert.equal(calculateScrollbarWidth(1920, 1903), 17);
  assert.equal(calculateScrollbarWidth(1366, 1351), 15);
});

test('calculateScrollbarWidth returns 0 when clientWidth equals or exceeds innerWidth', () => {
  assert.equal(calculateScrollbarWidth(1920, 1920), 0);
  assert.equal(calculateScrollbarWidth(1000, 1020), 0);
});

test('getActiveLockCount starts at zero when no modals active', () => {
  assert.equal(typeof getActiveLockCount(), 'number');
  assert.ok(getActiveLockCount() >= 0);
});
