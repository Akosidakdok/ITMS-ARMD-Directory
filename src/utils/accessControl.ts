const normalizeRole = (role?: string) => role?.trim().toLowerCase() || '';

export const hasManagementAccess = (role?: string) => {
  const norm = normalizeRole(role);
  return norm === 'admin' || norm === 'superadmin';
};

export const canManagePersonnel = (role?: string) => hasManagementAccess(role);

export const getRoleLabel = (role?: string) => {
  const norm = normalizeRole(role);
  if (norm === 'superadmin') return 'Superadmin';
  if (norm === 'admin') return 'Administrator';
  return 'View-only user';
};

export const getRoleDescription = (role?: string) => {
  const norm = normalizeRole(role);
  if (norm === 'superadmin') return 'Full system and account administration';
  if (norm === 'admin') return 'Personnel and records administration';
  return 'Read-only records access';
};
