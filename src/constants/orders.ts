export const ORDER_SERIES_OPTIONS = [
  { value: 'GO', label: 'GO — General Order' },
  { value: 'SO', label: 'SO — Special Order' },
  { value: 'LO', label: 'LO — Letter Order' }
] as const;

export type OrderSeries = typeof ORDER_SERIES_OPTIONS[number]['value'];

export const ORDER_PURPOSE_OPTIONS = [
  { value: 'DES', label: 'DES — Designation' },
  { value: 'TDS', label: 'TDS — Termination of Designation' },
  { value: 'DO', label: 'DO — Detail' },
  { value: 'DOX', label: 'DOX — Extension of Detail' },
  { value: 'TR', label: 'TR — Travel' },
  { value: 'RA', label: 'RA — Sub-unit Reassignment' },
  { value: 'UA', label: 'UA — Unit Reassignment' },
  { value: 'CSC', label: 'CSC — Combination of Service' },
  { value: 'LV', label: 'LV — Leave' },
  { value: 'AW', label: 'AW — Award' },
  { value: 'CCS', label: 'CCS — Change of Civil Status' },
  { value: 'AO', label: 'AO — Assignment Order' },
  { value: 'PR', label: 'PR — Promotion' },
  { value: 'PA', label: 'PA — Appointment' },
  { value: 'RG', label: 'RG — Resignation' },
  { value: 'LP', label: 'LP — Longevity Pay' },
  { value: 'RCA', label: 'RCA — Replacement Clothing Allowance' },
  { value: 'SP', label: 'SP — Specialist Pay' },
  { value: 'AWOL', label: 'AWOL — Absent Without Leave' },
  { value: 'CN', label: 'CN — Change Name' },
  { value: 'CHAPS', label: 'CHAPS — Change in Appointed Status' }
] as const;

export type OrderPurposeCode = typeof ORDER_PURPOSE_OPTIONS[number]['value'];

export const ORDER_DOCUMENT_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'For Approval', label: 'For Approval' },
  { value: 'Signed', label: 'Signed' },
  { value: 'Released', label: 'Released' },
  { value: 'Archived', label: 'Archived' },
  { value: 'Revoked', label: 'Revoked' }
] as const;

export type OrderDocumentStatus = typeof ORDER_DOCUMENT_STATUS_OPTIONS[number]['value'];

export const LEGACY_ORDER_STATUS_OPTIONS = ['Active', 'Pending'] as const;

export const getOrderPurposeLabel = (code?: string) =>
  ORDER_PURPOSE_OPTIONS.find(option => option.value === code)?.label || code || 'Unclassified';
