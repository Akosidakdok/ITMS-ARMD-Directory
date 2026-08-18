export const hasManagementAccess = (role?: string) => role === 'admin' || role === 'superadmin';

export const getRoleLabel = (role?: string) => {
  if (role === 'superadmin') return 'Superadmin';
  if (role === 'admin') return 'Administrator';
  return 'View-only user';
};

export const getRoleDescription = (role?: string) => {
  if (role === 'superadmin') return 'Full system and account administration';
  if (role === 'admin') return 'Personnel and records administration';
  return 'Read-only records access';
};
