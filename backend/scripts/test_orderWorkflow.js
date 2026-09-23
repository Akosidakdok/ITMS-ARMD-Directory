import assert from 'node:assert/strict';
import {
  assertOrderStatusTransition,
  canTransitionOrderStatus,
  normalizeOrderStatus
} from '../utils/orderWorkflow.js';

assert.equal(normalizeOrderStatus({ status: 'Active' }), 'Draft');
assert.equal(normalizeOrderStatus({ status: 'Pending' }), 'For Approval');
assert.equal(normalizeOrderStatus({ documentStatus: 'Signed' }), 'Signed');
assert.equal(canTransitionOrderStatus('Draft', 'For Approval'), true);
assert.equal(canTransitionOrderStatus('Draft', 'Signed'), false);
assert.doesNotThrow(() => assertOrderStatusTransition('Signed', 'Released'));
assert.throws(() => assertOrderStatusTransition('Released', 'Draft'));

console.log('Order workflow tests passed');
