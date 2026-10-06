import catalog from '../../shared/orderCatalog.json';

export type OrderSeries = 'GO' | 'SO' | 'LO';
export type OrderPurposeCode =
  | 'DES' | 'TDS' | 'DO' | 'DOX' | 'TR' | 'RA' | 'UA'
  | 'CSC' | 'LV' | 'AW' | 'CCS' | 'AO' | 'PR' | 'PA'
  | 'RG' | 'LP' | 'RCA' | 'SP' | 'AWOL' | 'CN' | 'CHAPS';
export type OrderDocumentStatus = 'Draft' | 'For Approval' | 'Signed' | 'Released' | 'Archived' | 'Revoked';
export type OrderPurposeFieldType = 'text' | 'textarea' | 'date' | 'date-range' | 'select' | 'personnel' | 'unit' | 'number';
export type OrderPersonnelRoleCode =
  | 'affected' | 'recipient' | 'driver' | 'recommending' | 'relieved'
  | 'replacement' | 'appointing' | 'witness' | 'other';

export interface OrderPurposeFieldDefinition {
  key: string;
  label: string;
  type: OrderPurposeFieldType;
  required: boolean;
}

export interface OrderPersonnelRoleDefinition {
  code: OrderPersonnelRoleCode;
  label: string;
  multiple: boolean;
  required: boolean;
}

export interface OrderPurposeDefinition {
  value: OrderPurposeCode;
  label: string;
  templateKey: string;
  narrativeKey: string;
  fields: OrderPurposeFieldDefinition[];
  personnelRoles: OrderPersonnelRoleDefinition[];
}

export const ORDER_SERIES_OPTIONS = catalog.series as Array<{
  readonly value: OrderSeries;
  readonly label: string;
  readonly heading: string;
}>;

export const ORDER_PURPOSE_OPTIONS = catalog.purposes.map(purpose => ({
  value: purpose.value as OrderPurposeCode,
  label: purpose.label
})) as Array<{ readonly value: OrderPurposeCode; readonly label: string }>;

export const ORDER_DOCUMENT_STATUS_OPTIONS = catalog.statuses as Array<{
  readonly value: OrderDocumentStatus;
  readonly label: string;
}>;

export const ORDER_PURPOSE_DEFINITIONS = catalog.purposes as OrderPurposeDefinition[];
export const ORDER_SERIES_HEADINGS = Object.fromEntries(
  catalog.series.map(series => [series.value, series.heading])
) as Record<OrderSeries, string>;

export const LEGACY_ORDER_STATUS_OPTIONS = ['Active', 'Pending'] as const;

export const getOrderPurposeLabel = (code?: string) =>
  ORDER_PURPOSE_OPTIONS.find(option => option.value === code)?.label || code || 'Unclassified';

export const formatOrderPurposeLabel = (code?: string, label?: string) => {
  const purposeLabel = (label || getOrderPurposeLabel(code)).trim();
  if (!code) {
    const repeatedCode = purposeLabel.match(/^([A-Z0-9]+)\s*(?:—|–|-)\s*\1(?=$|\s|[—–-])\s*(?:[—–-]\s*)?(.*)$/i);
    return repeatedCode ? (repeatedCode[2] ? `${repeatedCode[1]} — ${repeatedCode[2]}` : repeatedCode[1]) : purposeLabel || 'Unclassified';
  }

  let purposeName = purposeLabel;
  const prefixedCode = /^([A-Z0-9]+)\s*(?:—|–|-)\s*(.*)$/i;
  while (purposeName) {
    if (purposeName.toUpperCase() === code.toUpperCase()) {
      purposeName = '';
      break;
    }
    const match = purposeName.match(prefixedCode);
    if (!match || match[1].toUpperCase() !== code.toUpperCase()) break;
    purposeName = match[2].trim();
  }

  return purposeName ? `${code} — ${purposeName}` : code;
};

export const getOrderPurposeDefinition = (code?: string) =>
  ORDER_PURPOSE_DEFINITIONS.find(definition => definition.value === code);

export const getOrderSeriesHeading = (series: string) =>
  ORDER_SERIES_HEADINGS[series as OrderSeries] || 'ADMINISTRATIVE ORDERS';
