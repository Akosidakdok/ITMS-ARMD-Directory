import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertOrderStatusTransition,
  canTransitionOrderStatus,
  normalizeOrderStatus
} from '../backend/utils/orderWorkflow.js';

test('normalizes legacy order statuses into the controlled workflow', () => {
  assert.equal(normalizeOrderStatus({ status: 'Active' }), 'Draft');
  assert.equal(normalizeOrderStatus({ status: 'Pending' }), 'For Approval');
  assert.equal(normalizeOrderStatus({ documentStatus: 'Signed' }), 'Signed');
});

test('allows only the defined order status transitions', () => {
  assert.equal(canTransitionOrderStatus('Draft', 'For Approval'), true);
  assert.equal(canTransitionOrderStatus('Draft', 'Signed'), false);
  assert.doesNotThrow(() => assertOrderStatusTransition('Signed', 'Released'));
  assert.throws(() => assertOrderStatusTransition('Released', 'Draft'), /Invalid order status transition/);
});
