import { randomUUID } from 'node:crypto';

// Only schema-backed Personnel Information and Summary Profile fields are accepted.
export const PERSONNEL_IMPORTABLE_FIELDS = Object.freeze([
  'rank',
  'rankFullName',
  'firstName',
  'middleName',
  'lastName',
  'qualifier',
  'badgeNo',
  'salaryGrade',
  'plantilla',
  'sub_unit',
  'details',
  'station',
  'designation',
  'address',
  'gender',
  'contactNumber',
  'birthday',
  'dateOfEntry',
  'enterInOfficerPositionDate',
  'lastPromotionDate',
  'status'
]);

export const PERSONNEL_REQUIRED_IMPORT_FIELDS = Object.freeze([
  'rank',
  'firstName',
  'lastName'
]);

const STRING_FIELDS = new Set(PERSONNEL_IMPORTABLE_FIELDS);

const normalizeString = value => (
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : ''
);

export const buildFullName = personnel => [
  personnel.firstName,
  personnel.middleName,
  personnel.lastName,
  personnel.qualifier
].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

/**
 * Projects an uploaded row onto the database schema.
 * Unknown properties are never accessed, validated, or copied.
 */
export const sanitizePersonnelImportRow = input => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const personnel = {};
  const errors = [];

  const hasField = field => {
    if (Object.prototype.hasOwnProperty.call(source, field)) return true;
    if (field === 'sub_unit' && Object.prototype.hasOwnProperty.call(source, 'division')) return true;
    if (field === 'details' && Object.prototype.hasOwnProperty.call(source, 'detail')) return true;
    return false;
  };

  const getFieldValue = field => {
    if (Object.prototype.hasOwnProperty.call(source, field)) return source[field];
    if (field === 'sub_unit' && Object.prototype.hasOwnProperty.call(source, 'division')) return source.division;
    if (field === 'details' && Object.prototype.hasOwnProperty.call(source, 'detail')) return source.detail;
    return undefined;
  };

  for (const field of PERSONNEL_IMPORTABLE_FIELDS) {
    if (!hasField(field)) continue;

    if (STRING_FIELDS.has(field)) {
      const value = normalizeString(getFieldValue(field));
      if (value) personnel[field] = value;
    }
  }

  if (!personnel.fullName) {
    personnel.fullName = buildFullName(personnel);
  }
  if (!personnel.status) {
    personnel.status = 'Active';
  }
  if (!personnel.id) {
    personnel.id = `pnp-${randomUUID()}`;
  }

  for (const field of PERSONNEL_REQUIRED_IMPORT_FIELDS) {
    if (!personnel[field]) {
      errors.push(`${field} is required`);
    }
  }

  return { personnel, errors };
};
