import { randomUUID } from 'node:crypto';

// Only schema-backed Personnel Information and Summary Profile fields are accepted.
export const PERSONNEL_IMPORTABLE_FIELDS = Object.freeze([
  'rank',
  'firstName',
  'middleName',
  'lastName',
  'qualifier',
  'badgeNo',
  'salaryGrade',
  'plantilla',
  'division',
  'detail',
  'designation',
  'address',
  'gender',
  'contactNumber',
  'birthday',
  'dateOfEntry',
  'enterInOfficerPositionDate',
  'status'
]);

export const PERSONNEL_REQUIRED_IMPORT_FIELDS = Object.freeze([
  'rank',
  'firstName',
  'lastName',
  'division'
]);

const STRING_FIELDS = new Set(
  PERSONNEL_IMPORTABLE_FIELDS.filter(field => field !== 'salaryGrade')
);

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

  for (const field of PERSONNEL_IMPORTABLE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) continue;

    if (field === 'salaryGrade') {
      if (source.salaryGrade === '' || source.salaryGrade === null || source.salaryGrade === undefined) {
        continue;
      }
      const salaryGrade = Number(source.salaryGrade);
      if (!Number.isFinite(salaryGrade)) {
        errors.push('salaryGrade must be a number');
      } else {
        personnel.salaryGrade = salaryGrade;
      }
      continue;
    }

    if (STRING_FIELDS.has(field)) {
      const value = normalizeString(source[field]);
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
