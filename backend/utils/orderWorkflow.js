export const ORDER_WORKFLOW_STATUSES = Object.freeze([
  'Draft',
  'For Approval',
  'Signed',
  'Released',
  'Archived',
  'Revoked'
]);

export const ORDER_WORKFLOW_TRANSITIONS = Object.freeze({
  Draft: ['For Approval'],
  'For Approval': ['Signed', 'Revoked'],
  Signed: ['Released', 'Revoked'],
  Released: ['Archived', 'Revoked'],
  Archived: [],
  Revoked: []
});

export const ORDER_LOCKED_STATUSES = Object.freeze(['Signed', 'Released', 'Archived', 'Revoked']);

export function normalizeOrderStatus(orderOrStatus) {
  const value = typeof orderOrStatus === 'string'
    ? orderOrStatus
    : orderOrStatus?.documentStatus || orderOrStatus?.status;

  if (ORDER_WORKFLOW_STATUSES.includes(value)) return value;
  if (value === 'Pending') return 'For Approval';
  if (value === 'Active') return 'Draft';
  return 'Draft';
}

export function canTransitionOrderStatus(fromStatus, toStatus) {
  return ORDER_WORKFLOW_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
}

export function assertOrderStatusTransition(fromStatus, toStatus) {
  if (!ORDER_WORKFLOW_STATUSES.includes(toStatus)) {
    throw new Error(`Invalid order status: ${toStatus}`);
  }
  if (!canTransitionOrderStatus(fromStatus, toStatus)) {
    throw new Error(`Invalid order status transition: ${fromStatus} to ${toStatus}`);
  }
}
