export const LEAVE_TYPES = Object.freeze([
  'Vacation Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Calamity Leave',
  'Special Leave for Women (Magna Carta of Women)',
  'Compensatory Time Off (CTO)'
]);

// Previously stored values remain valid so existing records can still be edited.
export const LEGACY_LEAVE_TYPES = Object.freeze([
  'Vacation',
  'Sick',
  'Maternity',
  'Paternity',
  'Special',
  'Service Leave',
  'Mandatory Leave',
  'Special Privilege Leave',
  'Mandatory',
  'Study',
  'Special Privilege',
  'Emergency'
]);

export const ALLOWED_LEAVE_TYPES = Object.freeze([
  ...LEAVE_TYPES,
  ...LEGACY_LEAVE_TYPES
]);

export const isAllowedLeaveType = leaveType => ALLOWED_LEAVE_TYPES.includes(leaveType);

// Maps legacy/short-form values to the canonical names stored in the DB.
export const LEGACY_LEAVE_TYPE_ALIASES = Object.freeze({
  Vacation: 'Vacation Leave',
  Sick: 'Sick Leave',
  Maternity: 'Maternity Leave',
  Paternity: 'Paternity Leave',
  Special: 'Special Leave for Women (Magna Carta of Women)',
  Mandatory: 'Mandatory Leave',
  Study: 'Study Leave',
  'Special Privilege': 'Special Privilege Leave',
  Emergency: 'Emergency Leave',
});

// Returns the canonical leave type string accepted by the database constraint.
export const normalizeLeaveType = leaveType =>
  LEGACY_LEAVE_TYPE_ALIASES[leaveType] || leaveType;
