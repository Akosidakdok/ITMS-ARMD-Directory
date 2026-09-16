import type { Personnel } from '../types/pais';

export type PersonnelImportField = keyof Personnel;

export interface PersonnelImportRow {
  rowNumber: number;
  data: Partial<Personnel>;
}

export interface PersonnelImportIssue {
  rowNumber: number;
  messages: string[];
}

export interface PersonnelCsvResult {
  acceptedHeaders: string[];
  ignoredHeaders: string[];
  rows: PersonnelImportRow[];
  errors: PersonnelImportIssue[];
}

// Import only the Personnel Information and Summary Profile fields stored by the app.
export const PERSONNEL_IMPORTABLE_FIELDS: PersonnelImportField[] = [
  'rank',
  'rankFullName',
  'rankCategory',
  'firstName',
  'middleName',
  'lastName',
  'qualifier',
  'badgeNo',
  'salaryGrade',
  'plantilla',
  'positionCategory',
  'unitCategory',
  'subUnitCategory',
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
  'designationDate',
  'effectiveDate',
  'lastPromotionDate',
  'status'
];

export const PERSONNEL_REQUIRED_IMPORT_FIELDS: PersonnelImportField[] = [
  'rank',
  'firstName',
  'lastName'
];

// Header aliases — only Personnel Information columns accepted
const HEADER_ALIASES: Record<string, PersonnelImportField> = {
  // Summary Profile
  rank:              'rank',
  rankabbr:          'rank',
  rankfullname:      'rankFullName',   // "Rank Full Name" → rankfullname
  rankname:          'rankFullName',
  rankcategory:      'rankCategory',
  'rank category':   'rankCategory',
  categoryofrank:    'rankCategory',
  'category of rank':'rankCategory',
  badge:             'badgeNo',
  badgeno:           'badgeNo',
  badgenumber:       'badgeNo',        // "Badge Number"   → badgenumber
  salarygrade:       'salaryGrade',
  salarygradesgst:   'salaryGrade',    // "Salary Grade (SG-ST)" → salarygradesgst
  salarygradesgst2:  'salaryGrade',
  sg:                'salaryGrade',
  sgst:              'salaryGrade',
  plantilla:         'plantilla',
  plantillaitem:     'plantilla',

  // Assignment Categories: Position Category, Unit Category, Sub-Unit Category
  positioncategory:        'positionCategory',
  'position category':     'positionCategory',
  categoryofposition:      'positionCategory',
  'category of position':  'positionCategory',
  unitcategory:            'unitCategory',
  'unit category':         'unitCategory',
  categoryofunit:          'unitCategory',
  'category of unit':      'unitCategory',
  subunitcategory:         'subUnitCategory',
  'sub-unit category':     'subUnitCategory',
  'sub unit category':     'subUnitCategory',
  categoryofsubunit:       'subUnitCategory',

  // Organizational assignment: SUB-UNIT, DETAILS, STATION
  subunit:           'sub_unit',
  sub_unit:          'sub_unit',
  division:          'sub_unit',       // Legacy "DIVISION" column maps to sub_unit
  officedivision:    'sub_unit',
  office:            'sub_unit',
  unit:              'sub_unit',
  unitdivision:      'sub_unit',
  details:           'details',
  detail:            'details',
  detailsubunit:     'details',
  station:           'station',
  dutystation:       'station',
  assignedstation:   'station',

  designation:       'designation',
  position:          'designation',
  desup:             'designation',
  des:               'designation',
  designationdate:   'designationDate',
  'designation date':'designationDate',
  effectivedate:     'effectiveDate',
  'effective date':  'effectiveDate',

  // First Name
  firstname:         'firstName',
  'first name':      'firstName',
  fname:             'firstName',

  // Middle Name
  middlename:        'middleName',
  'middle name':     'middleName',
  mname:             'middleName',

  // Last Name
  lastname:          'lastName',
  'last name':       'lastName',
  lname:             'lastName',
  surname:           'lastName',

  // Qualifier
  qualifier:         'qualifier',
  qual:              'qualifier',

  // Address
  address:           'address',

  // Gender
  gender:            'gender',
  sex:               'gender',

  // Contact Number
  contactnumber:     'contactNumber',
  'contact number':  'contactNumber',
  contact:           'contactNumber',
  mobile:            'contactNumber',
  phone:             'contactNumber',

  // Birthday
  birthday:          'birthday',
  birthdate:         'birthday',
  dob:               'birthday',
  dateofbirth:       'birthday',

  // Date of Entry
  dateofentry:       'dateOfEntry',
  'date of entry':   'dateOfEntry',
  entrydate:         'dateOfEntry',

  // Enter in Officer Position / Designation Date
  enterinofficerposition:      'enterInOfficerPositionDate',
  enterinofficerpositiondate:  'enterInOfficerPositionDate',
  'enter in officer position': 'enterInOfficerPositionDate',
  officerpositiondate:         'enterInOfficerPositionDate',
  'enter in officer position date': 'enterInOfficerPositionDate',
  designationdate:             'enterInOfficerPositionDate',
  'designation date':          'enterInOfficerPositionDate',

  // Last Promotion Date
  lastpromotiondate:       'lastPromotionDate',
  'last promotion date':   'lastPromotionDate',
  promotiondate:           'lastPromotionDate',
  lastpromotion:           'lastPromotionDate',

  // Status
  status:            'status',
  pstatus:           'status',
  dutystatus:        'status',
};

const normalizeHeader = (header: string) => (
  header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
);

export const getPersonnelImportField = (
  header: string
): PersonnelImportField | undefined => HEADER_ALIASES[normalizeHeader(header)];

export const EXPECTED_PERSONNEL_HEADERS = new Set([
  'no',
  'itemno',
  'item',
  'rank',
  'status',
  'badge',
  'badgeno',
  'badgenumber',
  'lastname',
  'firstname',
  'middlename',
  'qual',
  'qualifier',
  'agetodate',
  'age',
  'birthdate',
  'birthday',
  'ageofservicetodate',
  'lengthofservice',
  'los',
  'desup',
  'des',
  'pnco',
  'nup',
  'pco',
  'officedivision',
  'office',
  'division',
  'sub_unit',
  'subunit',
  'designation',
  'position',
  'salarygrade',
  'sg',
  'sgst',
  'plantilla',
  'details',
  'station',
  'address',
  'gender',
  'sex',
  'contactnumber',
  'contact',
  'dateofentry',
  'lastpromotiondate',
  'civilstatus',
  'tin',
  'remarks',
  'remark'
]);

export const isExpectedPersonnelHeader = (header: unknown): boolean => {
  if (header === null || header === undefined) return false;
  const normalized = normalizeHeader(String(header));
  if (!normalized) return false;
  return Boolean(HEADER_ALIASES[normalized] || EXPECTED_PERSONNEL_HEADERS.has(normalized));
};

export const countMatchingHeaders = (row: ReadonlyArray<unknown>): number => {
  if (!row || !Array.isArray(row)) return 0;
  let count = 0;
  const seen = new Set<string>();
  for (const cell of row) {
    if (cell === null || cell === undefined) continue;
    const str = String(cell).trim();
    if (!str) continue;
    const normalized = normalizeHeader(str);
    if (!normalized || seen.has(normalized)) continue;
    if (isExpectedPersonnelHeader(str)) {
      seen.add(normalized);
      count += 1;
    }
  }
  return count;
};

export const findPersonnelHeaderRowIndex = (
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  maxScanRows = 30,
  minMatches = 2
): number => {
  const scanLimit = Math.min(rows.length, maxScanRows);
  let bestIndex = -1;
  let maxCount = 0;

  for (let index = 0; index < scanLimit; index += 1) {
    const row = rows[index];
    if (!row || !Array.isArray(row)) continue;
    const matchCount = countMatchingHeaders(row);
    if (matchCount > maxCount) {
      maxCount = matchCount;
      bestIndex = index;
    }
  }

  if (maxCount < minMatches) {
    return -1;
  }

  return bestIndex;
};

interface ParsedRow {
  nextIndex: number;
  values: Map<number, string>;
  endedInOpenQuote: boolean;
}

interface ColumnProjection {
  index: number;
  field: PersonnelImportField;
}

/**
 * Scans one CSV row and retains values only for selected columns.
 * Characters belonging to ignored columns are never accumulated in memory.
 */
const readProjectedCsvRow = (
  csv: string,
  startIndex: number,
  selectedColumns: ReadonlySet<number> | null
): ParsedRow => {
  const values = new Map<number, string>();
  let index = startIndex;
  let columnIndex = 0;
  let inQuotes = false;
  let value = '';

  const shouldCapture = () => selectedColumns === null || selectedColumns.has(columnIndex);
  const finishField = () => {
    if (shouldCapture()) values.set(columnIndex, value.trim());
    value = '';
    columnIndex += 1;
  };

  while (index < csv.length) {
    const char = csv[index];

    if (char === '"') {
      if (inQuotes && csv[index + 1] === '"') {
        if (shouldCapture()) value += '"';
        index += 2;
        continue;
      }
      inQuotes = !inQuotes;
      index += 1;
      continue;
    }

    if (!inQuotes && char === ',') {
      finishField();
      index += 1;
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      finishField();
      if (char === '\r' && csv[index + 1] === '\n') index += 1;
      return { nextIndex: index + 1, values, endedInOpenQuote: false };
    }

    if (shouldCapture()) value += char;
    index += 1;
  }

  finishField();
  return { nextIndex: index, values, endedInOpenQuote: inQuotes };
};

const buildFullName = (record: Partial<Personnel>) => [
  record.firstName,
  record.middleName,
  record.lastName,
  record.qualifier
].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const createColumnProjections = (
  headers: Array<{ index: number; value: string }>,
  result: PersonnelCsvResult
): ColumnProjection[] => {
  const projections: ColumnProjection[] = [];
  const usedFields = new Set<PersonnelImportField>();

  for (const { index, value } of headers) {
    const header = value.trim();
    const field = getPersonnelImportField(header);
    if (!field || usedFields.has(field)) {
      result.ignoredHeaders.push(header || `Column ${index + 1}`);
      continue;
    }
    usedFields.add(field);
    projections.push({ index, field });
    result.acceptedHeaders.push(header);
  }

  return projections;
};

const projectPersonnelRow = (
  projections: ColumnProjection[],
  getValue: (columnIndex: number) => string,
  rowNumber: number,
  seenBadges: Set<string>
): { row?: PersonnelImportRow; issue?: PersonnelImportIssue } => {
  const data: Partial<Personnel> = {};
  let hasSchemaValue = false;
  const messages: string[] = [];

  for (const projection of projections) {
    const rawValue = getValue(projection.index).trim();
    if (!rawValue) continue;
    hasSchemaValue = true;

    (data as Record<string, unknown>)[projection.field] = rawValue;
  }

  // Data that exists exclusively in ignored columns must not create an import row.
  if (!hasSchemaValue) return {};

  if (!data.fullName) data.fullName = buildFullName(data);
  if (!data.status) data.status = 'Active';

  for (const field of PERSONNEL_REQUIRED_IMPORT_FIELDS) {
    if (!String(data[field] || '').trim()) messages.push(`${field} is required`);
  }

  const normalizedBadge = String(data.badgeNo || '').toLowerCase();
  if (normalizedBadge && seenBadges.has(normalizedBadge)) {
    messages.push(`badgeNo "${data.badgeNo}" is duplicated in this file`);
  }
  if (normalizedBadge) seenBadges.add(normalizedBadge);

  return messages.length > 0
    ? { issue: { rowNumber, messages } }
    : { row: { rowNumber, data } };
};

const formatSpreadsheetCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
};

export const parsePersonnelExcelRows = (
  spreadsheetRows: ReadonlyArray<ReadonlyArray<unknown>>
): PersonnelCsvResult => {
  const result: PersonnelCsvResult = {
    acceptedHeaders: [],
    ignoredHeaders: [],
    rows: [],
    errors: []
  };
  if (!spreadsheetRows || spreadsheetRows.length === 0) return result;

  const headerRowIndex = findPersonnelHeaderRowIndex(spreadsheetRows);
  if (headerRowIndex < 0) {
    result.errors.push({
      rowNumber: 1,
      messages: ['Unable to detect the personnel table header. Please check the Excel file.']
    });
    return result;
  }

  const headerRow = spreadsheetRows[headerRowIndex] || [];
  const projections = createColumnProjections(
    headerRow.map((value, index) => ({
      index,
      value: formatSpreadsheetCell(value)
    })),
    result
  );

  if (projections.length === 0) {
    result.errors.push({
      rowNumber: headerRowIndex + 1,
      messages: ['The worksheet header has no columns that match the personnel database schema']
    });
    return result;
  }

  const seenBadges = new Set<string>();
  for (let index = headerRowIndex + 1; index < spreadsheetRows.length; index += 1) {
    const spreadsheetRow = spreadsheetRows[index];
    if (!spreadsheetRow || !Array.isArray(spreadsheetRow)) continue;
    const projected = projectPersonnelRow(
      projections,
      columnIndex => formatSpreadsheetCell(spreadsheetRow[columnIndex]),
      index + 1,
      seenBadges
    );
    if (projected.row) result.rows.push(projected.row);
    if (projected.issue) result.errors.push(projected.issue);
  }

  return result;
};

export const parsePersonnelCsv = (csv: string): PersonnelCsvResult => {
  const result: PersonnelCsvResult = {
    acceptedHeaders: [],
    ignoredHeaders: [],
    rows: [],
    errors: []
  };
  if (!csv.trim()) return result;

  const headerRow = readProjectedCsvRow(csv, 0, null);
  if (headerRow.endedInOpenQuote) {
    result.errors.push({ rowNumber: 1, messages: ['Header row contains an unclosed quote'] });
    return result;
  }

  const projections = createColumnProjections(
    Array.from(headerRow.values.entries()).map(([index, value]) => ({ index, value })),
    result
  );

  if (projections.length === 0) {
    result.errors.push({
      rowNumber: 1,
      messages: ['The CSV has no columns that match the personnel database schema']
    });
    return result;
  }

  const selectedIndexes = new Set(projections.map(projection => projection.index));
  const seenBadges = new Set<string>();
  let csvIndex = headerRow.nextIndex;
  let rowNumber = 2;

  while (csvIndex < csv.length) {
    const parsed = readProjectedCsvRow(csv, csvIndex, selectedIndexes);
    const currentRowNumber = rowNumber;
    csvIndex = parsed.nextIndex;
    rowNumber += 1;

    if (parsed.endedInOpenQuote) {
      result.errors.push({
        rowNumber: currentRowNumber,
        messages: ['Row contains an unclosed quote']
      });
      break;
    }

    const projected = projectPersonnelRow(
      projections,
      columnIndex => parsed.values.get(columnIndex) || '',
      currentRowNumber,
      seenBadges
    );
    if (projected.row) result.rows.push(projected.row);
    if (projected.issue) result.errors.push(projected.issue);
  }

  return result;
};
