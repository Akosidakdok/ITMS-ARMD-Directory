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
