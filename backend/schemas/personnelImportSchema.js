import { randomUUID } from 'node:crypto';

// Only schema-backed Personnel Information and Summary Profile fields are accepted.
export const PERSONNEL_IMPORTABLE_FIELDS = Object.freeze([
  'rank',
  'rankFullName',
  'rankCategory',
  'firstName',
  'middleName',
  'lastName',
  'qualifier',
  'qualification',
  'badgeNo',
  'salaryGrade',
  'plantilla',
  'positionCategory',
  'unitCategory',
  'subUnitCategory',
  'sub_unit',
  'officeDivision',
  'details',
  'station',
  'designation',
  'address',
  'gender',
  'contactNumber',
  'birthday',
  'birthdate',
  'dateOfEntry',
  'enterInOfficerPositionDate',
  'designationDate',
  'effectiveDate',
  'lastPromotionDate',
  'status',
  'ageToDate',
  'ageOfServiceToDate',
  'desUp',
  'pnco',
  'nup',
  // 34-column schema additions
  'civilStatus',
  'religion',
  'email',
  'tin',
  'gsisNumber',
  'philHealthNo',
  'pagibigNo',
  'sourceOfCommissionship',
  'dateOfOfficershipOrCommission',
  'pstatus',
  'pstatusDate',
  'rankStatus',
  'unitCode',
  'unit',
  'subUnitCode',
  'stationCode',
  'subStationCode',
  'subStation',
  'dateEnteredService',
  'badge_number'
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
  personnel.qualifier || personnel.qualification
].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const PCO_RANKS = new Set([
  'PBGEN', 'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT',
  'PMGEN', 'PLTGEN', 'PGEN',
  'P/BGEN', 'P/COL', 'P/LCOL', 'P/LTCOL', 'P/MAJ', 'P/CAPT', 'P/CPT', 'P/LT',
  'P/MGEN', 'P/LTGEN', 'P/GEN'
]);

export const detectRankCategory = rank => {
  if (!rank) return 'PNCO';
  const clean = String(rank).trim().toUpperCase();
  if (clean === 'NUP' || clean.includes('NON-UNIFORMED')) return 'NUP';
  if (PCO_RANKS.has(clean) || clean.startsWith('POLICE ')) return 'PCO';
  const noSlash = clean.replace(/[\s/]/g, '');
  if (['PBGEN', 'PCOL', 'PLTCOL', 'PLCOL', 'PMAJ', 'PCPT', 'PCAPT', 'PLT', 'PMGEN', 'PLTGEN', 'PGEN'].includes(noSlash)) {
    return 'PCO';
  }
  return 'PNCO';
};

const calculateYears = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    years--;
  }
  return years >= 0 ? String(years) : null;
};

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
    if (field === 'sub_unit' && (Object.prototype.hasOwnProperty.call(source, 'division') || Object.prototype.hasOwnProperty.call(source, 'officeDivision') || Object.prototype.hasOwnProperty.call(source, 'OFFICE/DIVISION'))) return true;
    if (field === 'officeDivision' && (Object.prototype.hasOwnProperty.call(source, 'division') || Object.prototype.hasOwnProperty.call(source, 'sub_unit') || Object.prototype.hasOwnProperty.call(source, 'OFFICE/DIVISION'))) return true;
    if (field === 'details' && Object.prototype.hasOwnProperty.call(source, 'detail')) return true;
    if (field === 'birthdate' && (Object.prototype.hasOwnProperty.call(source, 'birthday') || Object.prototype.hasOwnProperty.call(source, 'Birthdate') || Object.prototype.hasOwnProperty.call(source, 'BIRTHDATE'))) return true;
    if (field === 'birthday' && (Object.prototype.hasOwnProperty.call(source, 'birthdate') || Object.prototype.hasOwnProperty.call(source, 'Birthdate') || Object.prototype.hasOwnProperty.call(source, 'BIRTHDATE'))) return true;
    if (field === 'qualifier' && (Object.prototype.hasOwnProperty.call(source, 'qualification') || Object.prototype.hasOwnProperty.call(source, 'QUAL.') || Object.prototype.hasOwnProperty.call(source, 'QUAL'))) return true;
    if (field === 'qualification' && (Object.prototype.hasOwnProperty.call(source, 'qualifier') || Object.prototype.hasOwnProperty.call(source, 'QUAL.') || Object.prototype.hasOwnProperty.call(source, 'QUAL'))) return true;
    if (field === 'desUp' && (Object.prototype.hasOwnProperty.call(source, 'dateOfEntry') || Object.prototype.hasOwnProperty.call(source, 'DES (UP)') || Object.prototype.hasOwnProperty.call(source, 'DES(UP)'))) return true;
    if (field === 'dateOfEntry' && (Object.prototype.hasOwnProperty.call(source, 'desUp') || Object.prototype.hasOwnProperty.call(source, 'DES (UP)') || Object.prototype.hasOwnProperty.call(source, 'DES(UP)'))) return true;
    if (field === 'designation' && Object.prototype.hasOwnProperty.call(source, 'DESIGNATION')) return true;
    if (field === 'rank' && Object.prototype.hasOwnProperty.call(source, 'RANK')) return true;
    if (field === 'status' && Object.prototype.hasOwnProperty.call(source, 'STATUS')) return true;
    if (field === 'badgeNo' && Object.prototype.hasOwnProperty.call(source, 'BADGE NO/SG')) return true;
    if (field === 'salaryGrade' && Object.prototype.hasOwnProperty.call(source, 'BADGE NO/SG')) return true;
    if (field === 'lastName' && Object.prototype.hasOwnProperty.call(source, 'LAST NAME')) return true;
    if (field === 'firstName' && Object.prototype.hasOwnProperty.call(source, 'FIRST NAME')) return true;
    if (field === 'middleName' && Object.prototype.hasOwnProperty.call(source, 'MIDDLE NAME')) return true;
    if (field === 'ageToDate' && Object.prototype.hasOwnProperty.call(source, 'AGE TO DATE')) return true;
    if (field === 'ageOfServiceToDate' && Object.prototype.hasOwnProperty.call(source, 'AGE OF SERVICE TO DATE')) return true;
    if (field === 'pnco' && Object.prototype.hasOwnProperty.call(source, 'PNCO')) return true;
    if (field === 'nup' && Object.prototype.hasOwnProperty.call(source, 'NUP')) return true;
    return false;
  };

  const getFieldValue = field => {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) return source[field];
    if (field === 'sub_unit') return source.officeDivision ?? source.division ?? source['OFFICE/DIVISION'];
    if (field === 'officeDivision') return source.sub_unit ?? source.division ?? source['OFFICE/DIVISION'];
    if (field === 'details') return source.detail;
    if (field === 'birthdate') return source.birthday ?? source.Birthdate ?? source.BIRTHDATE;
    if (field === 'birthday') return source.birthdate ?? source.Birthdate ?? source.BIRTHDATE;
    if (field === 'qualifier') return source.qualification ?? source['QUAL.'] ?? source.QUAL;
    if (field === 'qualification') return source.qualifier ?? source['QUAL.'] ?? source.QUAL;
    if (field === 'desUp') return source.dateOfEntry ?? source['DES (UP)'] ?? source['DES(UP)'];
    if (field === 'dateOfEntry') return source.desUp ?? source['DES (UP)'] ?? source['DES(UP)'];
    if (field === 'designation') return source.DESIGNATION;
    if (field === 'rank') return source.RANK;
    if (field === 'status') return source.STATUS;
    if (field === 'badgeNo') return source['BADGE NO/SG'];
    if (field === 'salaryGrade') return source['BADGE NO/SG'];
    if (field === 'lastName') return source['LAST NAME'];
    if (field === 'firstName') return source['FIRST NAME'];
    if (field === 'middleName') return source['MIDDLE NAME'];
    if (field === 'ageToDate') return source['AGE TO DATE'];
    if (field === 'ageOfServiceToDate') return source['AGE OF SERVICE TO DATE'];
    if (field === 'pnco') return source.PNCO;
    if (field === 'nup') return source.NUP;
    return undefined;
  };

  for (const field of PERSONNEL_IMPORTABLE_FIELDS) {
    if (!hasField(field)) continue;

    if (STRING_FIELDS.has(field)) {
      const value = normalizeString(getFieldValue(field));
      if (value) personnel[field] = value;
    }
  }

  // Ignore footer summary rows (e.g. "Count: 600", "Total", etc.)
  const isNumericRank = !personnel.rank || /^\d+$/.test(String(personnel.rank).trim());
  const isSummaryKeyword = /^(count|total|sum|records?|subtotal)/i.test(String(personnel.rank || '').trim());
  if (!personnel.lastName && !personnel.firstName && (isNumericRank || isSummaryKeyword)) {
    return { personnel: null, errors: [] };
  }

  // Clean middleName if it contains "(no middle name)" or "N/A"
  if (personnel.middleName && (/^\(no middle name\)$/i.test(personnel.middleName) || personnel.middleName.toUpperCase() === 'N/A')) {
    personnel.middleName = '';
  }

  // Derive Rank Category
  const category = detectRankCategory(personnel.rank);
  personnel.rankCategory = category;

  // Handle Badge Number vs Salary Grade
  if (category === 'NUP') {
    // For NUP: if badgeNo is provided and looks like a salary grade or salaryGrade is not set
    if (!personnel.salaryGrade && personnel.badgeNo) {
      personnel.salaryGrade = personnel.badgeNo.replace(/^SG-?/i, '');
      personnel.badgeNo = '';
    } else if (personnel.salaryGrade) {
      personnel.badgeNo = '';
    }
  } else {
    // For Uniformed Personnel: do not assign salary grade
    delete personnel.salaryGrade;
  }

  // Synchronize bidirectional aliases
  if (personnel.birthdate && !personnel.birthday) personnel.birthday = personnel.birthdate;
  if (personnel.birthday && !personnel.birthdate) personnel.birthdate = personnel.birthday;

  if (personnel.qualification && !personnel.qualifier) personnel.qualifier = personnel.qualification;
  if (personnel.qualifier && !personnel.qualification) personnel.qualification = personnel.qualifier;


  if (personnel.desUp && !personnel.dateOfEntry) personnel.dateOfEntry = personnel.desUp;
  if (personnel.dateOfEntry && !personnel.desUp) personnel.desUp = personnel.dateOfEntry;

  // Age and Age of Service handling
  if (!personnel.ageToDate && (personnel.birthdate || personnel.birthday)) {
    const calcAge = calculateYears(personnel.birthdate || personnel.birthday);
    if (calcAge) personnel.ageToDate = calcAge;
  }

  if (!personnel.ageOfServiceToDate) {
    const earliest = personnel.pnco || personnel.desUp || personnel.nup || personnel.dateOfEntry;
    if (earliest) {
      const calcService = calculateYears(earliest);
      if (calcService) personnel.ageOfServiceToDate = calcService;
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
