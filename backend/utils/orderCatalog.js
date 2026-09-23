import catalog from '../../shared/orderCatalog.json' with { type: 'json' };

export const ORDER_CATALOG = catalog;
export const ORDER_SERIES_CODES = new Set(catalog.series.map(option => option.value));
export const ORDER_PURPOSE_CODES = new Set(catalog.purposes.map(option => option.value));
export const ORDER_DOCUMENT_STATUS_CODES = new Set(catalog.statuses.map(option => option.value));

export const getOrderPurposeDefinition = purposeCode =>
  catalog.purposes.find(purpose => purpose.value === purposeCode) || null;

export const getOrderPurposeLabel = purposeCode =>
  getOrderPurposeDefinition(purposeCode)?.label || purposeCode || '';

const hasValue = value => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim().length > 0;
};

export function validatePurposeData(purposeCode, purposeData = {}) {
  const definition = getOrderPurposeDefinition(purposeCode);
  if (!definition) return [`Invalid order purpose code: ${purposeCode}`];

  const errors = [];
  for (const field of definition.fields.filter(item => item.required)) {
    if (!hasValue(purposeData[field.key])) errors.push(`${field.label} is required for ${definition.label}.`);
  }
  return errors;
}

export function validatePersonnelInvolvement(purposeCode, personnelInvolvement = []) {
  const definition = getOrderPurposeDefinition(purposeCode);
  if (!definition) return [`Invalid order purpose code: ${purposeCode}`];

  const entries = Array.isArray(personnelInvolvement) ? personnelInvolvement : [];
  const errors = [];
  const allowedRoles = new Set(definition.personnelRoles.map(role => role.code));
  for (const entry of entries) {
    if (!allowedRoles.has(entry?.role)) {
      errors.push(`Personnel role "${entry?.role || 'unknown'}" is not supported for ${definition.label}.`);
    }
  }
  for (const role of definition.personnelRoles.filter(item => item.required)) {
    const matching = entries.filter(entry => entry?.role === role.code && hasValue(entry?.personnelId));
    if (!matching.length) errors.push(`${role.label} is required for ${definition.label}.`);
    if (!role.multiple && matching.length > 1) errors.push(`${role.label} allows only one personnel record.`);
  }
  return errors;
}

export function validateOrderPurposePayload({ purposeCode, purposeData, personnelInvolvement } = {}) {
  const errors = [];
  if (!ORDER_PURPOSE_CODES.has(purposeCode)) return [`Invalid order purpose code: ${purposeCode}`];

  // Legacy records may not have purposeData or role-based personnel links yet.
  // Once either new payload is supplied, validate it against the registry.
  if (purposeData !== undefined) errors.push(...validatePurposeData(purposeCode, purposeData));
  if (personnelInvolvement !== undefined) errors.push(...validatePersonnelInvolvement(purposeCode, personnelInvolvement));
  return errors;
}
