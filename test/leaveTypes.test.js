import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_LEAVE_TYPES,
  LEAVE_TYPES,
  isAllowedLeaveType
} from '../backend/constants/leaveTypes.js';

const requestedLeaveTypes = [
  'Vacation Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Calamity Leave',
  'Special Leave for Women (Magna Carta of Women)',
  'Compensatory Time Off (CTO)'
];

test('publishes the requested leave-type catalog in display order', () => {
  assert.deepEqual(LEAVE_TYPES, requestedLeaveTypes);
});

test('backend validation accepts every requested leave type', () => {
  for (const leaveType of requestedLeaveTypes) {
    assert.equal(ALLOWED_LEAVE_TYPES.includes(leaveType), true);
    assert.equal(isAllowedLeaveType(leaveType), true);
  }
  assert.equal(isAllowedLeaveType('Unknown Leave Type'), false);
});
