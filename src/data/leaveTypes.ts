export const LEAVE_TYPE_DEFINITIONS = [
  {
    value: 'Vacation Leave',
    colorClassName: 'bg-blue-100 border-blue-300 text-blue-900',
    dotClassName: 'bg-blue-500',
  },
  {
    value: 'Sick Leave',
    colorClassName: 'bg-rose-100 border-rose-300 text-rose-900',
    dotClassName: 'bg-rose-500',
  },
  {
    value: 'Maternity Leave',
    colorClassName: 'bg-pink-100 border-pink-300 text-pink-900',
    dotClassName: 'bg-pink-500',
  },
  {
    value: 'Paternity Leave',
    colorClassName: 'bg-indigo-100 border-indigo-300 text-indigo-900',
    dotClassName: 'bg-indigo-500',
  },
  {
    value: 'Calamity Leave',
    colorClassName: 'bg-amber-100 border-amber-300 text-amber-900',
    dotClassName: 'bg-amber-500',
  },
  {
    value: 'Special Leave for Women (Magna Carta of Women)',
    colorClassName: 'bg-violet-100 border-violet-300 text-violet-900',
    dotClassName: 'bg-violet-500',
  },
  {
    value: 'Compensatory Time Off (CTO)',
    colorClassName: 'bg-teal-100 border-teal-300 text-teal-900',
    dotClassName: 'bg-teal-500',
  },
] as const;

export const LEGACY_LEAVE_TYPE_DEFINITIONS = [
  {
    value: 'Service Leave',
    colorClassName: 'bg-cyan-100 border-cyan-300 text-cyan-900',
    dotClassName: 'bg-cyan-500',
  },
  {
    value: 'Mandatory Leave',
    colorClassName: 'bg-orange-100 border-orange-300 text-orange-900',
    dotClassName: 'bg-orange-500',
  },
  {
    value: 'Special Privilege Leave',
    colorClassName: 'bg-purple-100 border-purple-300 text-purple-900',
    dotClassName: 'bg-purple-500',
  },
  {
    value: 'Study Leave',
    colorClassName: 'bg-lime-100 border-lime-300 text-lime-900',
    dotClassName: 'bg-lime-500',
  },
  {
    value: 'Emergency Leave',
    colorClassName: 'bg-red-100 border-red-300 text-red-900',
    dotClassName: 'bg-red-500',
  },
] as const;

export type LeaveType = (typeof LEAVE_TYPE_DEFINITIONS)[number]['value'];

export const LEAVE_TYPES = LEAVE_TYPE_DEFINITIONS.map(({ value }) => value);

const LEGACY_LEAVE_TYPE_ALIASES: Record<string, string> = {
  Vacation: 'Vacation Leave',
  Sick: 'Sick Leave',
  Maternity: 'Maternity Leave',
  Paternity: 'Paternity Leave',
  Special: 'Special Leave for Women (Magna Carta of Women)',
  Mandatory: 'Mandatory Leave',
  Study: 'Study Leave',
  'Special Privilege': 'Special Privilege Leave',
  Emergency: 'Emergency Leave',
};

export const normalizeLeaveType = (leaveType: string) =>
  LEGACY_LEAVE_TYPE_ALIASES[leaveType] || leaveType;

export const getLeaveTypePresentation = (leaveType: string) => {
  const normalizedType = normalizeLeaveType(leaveType);
  const definition = [...LEAVE_TYPE_DEFINITIONS, ...LEGACY_LEAVE_TYPE_DEFINITIONS]
    .find(({ value }) => value === normalizedType);

  return definition || {
    value: normalizedType || 'Unspecified Leave',
    colorClassName: 'bg-slate-100 border-slate-300 text-slate-800',
    dotClassName: 'bg-slate-500',
  };
};
