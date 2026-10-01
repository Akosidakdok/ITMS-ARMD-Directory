import type { Personnel, RankCategory } from '../types/pais.ts';
import { getRankCategory } from '../constants/ranks.ts';

export type PersonnelImportField = keyof Personnel;

export interface PersonnelImportRow {
  rowNumber: number;
  data: Partial<Personnel>;
}

export interface PersonnelImportIssue {
  rowNumber: number;
  field?: string;
  originalValue?: string;
  messages: string[];
}

export interface PersonnelCsvResult {
  acceptedHeaders: string[];
  ignoredHeaders: string[];
  detectedHeaderRowIndex: number;
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
];

export const PERSONNEL_REQUIRED_IMPORT_FIELDS: PersonnelImportField[] = [
  'rank',
  'firstName',
  'lastName'
];

// Header aliases mapped to approved schema fields
const HEADER_ALIASES: Record<string, PersonnelImportField> = {
  // Rank
  rank:               'rank',
  rankabbr:           'rank',
  rankfullname:       'rankFullName',
  rankname:           'rankFullName',
  rankcategory:       'rankCategory',
  'rank category':    'rankCategory',
  categoryofrank:     'rankCategory',

  // Status & PStatus
  status:             'status',
  pstatus:            'status',
  dutystatus:         'status',
  pstatusdate:        'pstatusDate',
  'pstatus date':     'pstatusDate',
  rankstatus:         'rankStatus',
  'rank status':      'rankStatus',

  // Badge No / Salary Grade
  badgenosg:          'badgeNo',
  'badgenosg':        'badgeNo',
  'badgenumber/sg':   'badgeNo',
  badge:              'badgeNo',
  badgeno:            'badgeNo',
  badgenumber:        'badgeNo',
  'badge number':     'badgeNo',
  salarygrade:        'salaryGrade',
  salarygradesgst:    'salaryGrade',
  sg:                 'salaryGrade',
  sgst:               'salaryGrade',
  plantilla:          'plantilla',
  plantillaitem:      'plantilla',

  // Names
  lastname:           'lastName',
  'last name':        'lastName',
  lname:              'lastName',
  surname:            'lastName',
  firstname:          'firstName',
  'first name':       'firstName',
  fname:              'firstName',
  middlename:         'middleName',
  'middle name':      'middleName',
  mname:              'middleName',
  qual:               'qualification',
  qualifier:          'qualification',
  qualification:      'qualification',

  // Age & Birthdate
  agetodate:          'ageToDate',
  'age to date':      'ageToDate',
  age:                'ageToDate',
  birthdate:          'birthdate',
  birthday:           'birthdate',
  'birth date':       'birthdate',
  dob:                'birthdate',
  dateofbirth:        'birthdate',

  // Service, Commissionship, & Promotions
  dateenteredservice: 'dateOfEntry',
  'date entered service': 'dateOfEntry',
  dateofentry:        'dateOfEntry',
  'date of entry':    'dateOfEntry',
  entrydate:          'dateOfEntry',
  desup:              'desUp',
  'des(up)':          'desUp',
  'des (up)':         'desUp',
  des:                'desUp',
  pnco:               'pnco',
  nup:                'nup',
  sourceofcommissionship: 'sourceOfCommissionship',
  'source of commissionship': 'sourceOfCommissionship',
  dateofofficershiporcommission: 'dateOfOfficershipOrCommission',
  'date of officership or commission': 'dateOfOfficershipOrCommission',
  lastpromotiondate:  'lastPromotionDate',
  'last promotion date': 'lastPromotionDate',
  ageofservicetodate: 'ageOfServiceToDate',
  'age of service to date': 'ageOfServiceToDate',
  lengthofservice:    'ageOfServiceToDate',
  los:                'ageOfServiceToDate',

  // Organizational assignment: Unit, Sub Unit, Station, Sub Station
  unitcode:           'unitCode',
  'unit code':        'unitCode',
  unit:               'unit',
  subunitcode:        'subUnitCode',
  'sub unit code':    'subUnitCode',
  subunit:            'sub_unit',
  sub_unit:           'sub_unit',
  'sub-unit':         'sub_unit',
  'sub unit':         'sub_unit',
  division:           'sub_unit',
  officedivision:     'officeDivision',
  'office/division':  'officeDivision',
  'office / division':'officeDivision',
  office:             'officeDivision',
  stationcode:        'stationCode',
  'station code':     'stationCode',
  station:            'station',
  dutystation:        'station',
  substationcode:     'subStationCode',
  'sub station code': 'subStationCode',
  substation:         'subStation',
  'sub station':      'subStation',
  details:            'details',
  detail:             'details',

  // Designation & Positions
  designation:        'designation',
  position:           'designation',
  designationdate:    'designationDate',
  'designation date': 'designationDate',
  effectivedate:      'effectiveDate',
  'effective date':   'effectiveDate',
  enterinofficerpositiondate: 'enterInOfficerPositionDate',

  // Identification & Contact Numbers
  email:              'email',
  phonenumber:        'contactNumber',
  'phone number':     'contactNumber',
  contactnumber:      'contactNumber',
  'contact number':   'contactNumber',
  contact:            'contactNumber',
  mobile:             'contactNumber',
  tin:                'tin',
  gsisnumber:         'gsisNumber',
  'gsis number':      'gsisNumber',
  gsis:               'gsisNumber',
  gsisno:             'gsisNumber',
  philhealthno:       'philHealthNo',
  'phil health no':   'philHealthNo',
  philhealth:         'philHealthNo',
  philhealthnumber:   'philHealthNo',
  pagibigno:          'pagibigNo',
  'pagibig no':       'pagibigNo',
  pagibig:            'pagibigNo',
  pagibignumber:      'pagibigNo',

  // Personal Info
  gender:             'gender',
  sex:                'gender',
  civilstatus:        'civilStatus',
  'civil status':     'civilStatus',
  religion:           'religion',
  address:            'address'
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
  'badgenosg',
  'badge',
  'badgeno',
  'badgenumber',
  'lastname',
  'firstname',
  'middlename',
  'qual',
  'qualifier',
  'qualification',
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
  'officedivision',
  'office',
  'division',
  'subunit',
  'sub_unit',
  'designation',
  'position',
  'salarygrade',
  'sg',
  'plantilla',
  'details',
  'station',
  'address',
  'gender',
  'sex',
  'contactnumber',
  'contact',
  'dateofentry',
  'lastpromotiondate'
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

export const calculateYearsBetween = (startDateStr: string, endDate = new Date()): string | null => {
  if (!startDateStr) return null;
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return null;
  let years = endDate.getFullYear() - start.getFullYear();
  const m = endDate.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && endDate.getDate() < start.getDate())) {
    years--;
  }
  return years >= 0 ? String(years) : null;
};

interface ColumnProjection {
  index: number;
  field: PersonnelImportField;
  headerName: string;
}

const createColumnProjections = (
  headers: Array<{ index: number; value: string }>,
  result: PersonnelCsvResult
): ColumnProjection[] => {
  const projections: ColumnProjection[] = [];
  const usedFields = new Set<PersonnelImportField>();

  for (let i = 0; i < headers.length; i += 1) {
    const item = headers[i];
    if (!item) continue;
    const { index, value } = item;
    const header = (value || '').trim();
    if (!header) continue;
    const field = getPersonnelImportField(header);
    if (!field || usedFields.has(field)) {
      result.ignoredHeaders.push(header || `Column ${index + 1}`);
      continue;
    }
    usedFields.add(field);
    projections.push({ index, field, headerName: header });
    result.acceptedHeaders.push(header);
  }

  return projections;
};

const buildFullName = (record: Partial<Personnel>) => [
  record.firstName,
  record.middleName,
  record.lastName,
  record.qualifier || record.qualification
].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

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

  if (!hasSchemaValue) return {};

  // Ignore footer summary rows (e.g. "Count: 600", "Total: 100", etc.)
  const isNumericRank = !data.rank || /^\d+$/.test(String(data.rank).trim());
  const isSummaryRank = /^(count|total|sum|records?|subtotal)/i.test(String(data.rank || '').trim());
  if (!data.lastName && !data.firstName && (isNumericRank || isSummaryRank)) {
    return {};
  }

  // Clean middleName
  if (data.middleName && (/^\(no middle name\)$/i.test(data.middleName) || data.middleName.toUpperCase() === 'N/A')) {
    data.middleName = '';
  }

  // Derive Rank Category
  const rankCategory = (data.rank ? getRankCategory(data.rank) : 'PNCO') as RankCategory;

  // Badge No / Salary Grade interpretation
  if (rankCategory === 'NUP') {
    if (!data.salaryGrade && data.badgeNo) {
      data.salaryGrade = data.badgeNo.replace(/^SG-?/i, '');
      data.badgeNo = '';
    } else if (data.salaryGrade) {
      data.badgeNo = '';
    }
  } else {
    // Uniformed personnel
    delete data.salaryGrade;
  }

  // Synchronize bidirectional aliases
  if (data.birthdate && !data.birthday) data.birthday = data.birthdate;
  if (data.birthday && !data.birthdate) data.birthdate = data.birthday;

  if (data.qualification && !data.qualifier) data.qualifier = data.qualification;
  if (data.qualifier && !data.qualification) data.qualification = data.qualifier;

  if (data.desUp && !data.dateOfEntry) data.dateOfEntry = data.desUp;
  if (data.dateOfEntry && !data.desUp) data.desUp = data.dateOfEntry;
  if (data.dateEnteredService && !data.dateOfEntry) {
    data.dateOfEntry = data.dateEnteredService;
    data.desUp = data.dateEnteredService;
  }

  if (data.officeDivision && !data.sub_unit) data.sub_unit = data.officeDivision;
  if (data.pstatus && !data.status) data.status = data.pstatus;
  if (data.status && !data.pstatus) data.pstatus = data.status;

  if (data.dateOfOfficershipOrCommission && !data.enterInOfficerPositionDate) {
    data.enterInOfficerPositionDate = data.dateOfOfficershipOrCommission;
  }

  // Calculate or parse Age
  if (data.ageToDate !== undefined && data.ageToDate !== null && String(data.ageToDate).trim() !== '' && !String(data.ageToDate).includes('Invalid')) {
    const num = Number(data.ageToDate);
    if (!isNaN(num)) data.ageToDate = num;
  } else {
    const calcAge = calculateYearsBetween(data.birthdate || data.birthday || '');
    if (calcAge) data.ageToDate = calcAge;
  }

  // Calculate or parse Service
  if (data.ageOfServiceToDate !== undefined && data.ageOfServiceToDate !== null && String(data.ageOfServiceToDate).trim() !== '' && !String(data.ageOfServiceToDate).includes('Invalid')) {
    const num = Number(data.ageOfServiceToDate);
    if (!isNaN(num)) data.ageOfServiceToDate = num;
  } else {
    const earliest = data.pnco || data.desUp || data.nup || data.dateOfEntry || data.dateEnteredService;
    if (earliest) {
      const calcService = calculateYearsBetween(earliest);
      if (calcService) data.ageOfServiceToDate = calcService;
    }
  }

  if (!data.fullName) data.fullName = buildFullName(data);
  if (!data.status) data.status = 'Active';

  // Validation
  for (const field of PERSONNEL_REQUIRED_IMPORT_FIELDS) {
    if (!String(data[field] || '').trim()) {
      messages.push(`${field} is required`);
    }
  }

  // In-file duplicate badge check for uniformed personnel
  if (rankCategory !== 'NUP' && data.badgeNo) {
    const normalizedBadge = String(data.badgeNo).trim().toUpperCase();
    if (seenBadges.has(normalizedBadge)) {
      messages.push(`Badge number "${data.badgeNo}" is duplicated in this file`);
    } else {
      seenBadges.add(normalizedBadge);
    }
  }

  return messages.length > 0
    ? { issue: { rowNumber, messages } }
    : { row: { rowNumber, data } };
};

const formatSpreadsheetCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof value === 'object' && 'result' in (value as Record<string, unknown>)) {
    const res = (value as { result?: unknown }).result;
    return res !== null && res !== undefined ? String(res).trim() : '';
  }
  return String(value).trim();
};

export const parsePersonnelExcelRows = (
  spreadsheetRows: ReadonlyArray<ReadonlyArray<unknown>>,
  explicitHeaderRowIndex?: number
): PersonnelCsvResult => {
  const result: PersonnelCsvResult = {
    acceptedHeaders: [],
    ignoredHeaders: [],
    detectedHeaderRowIndex: 0,
    rows: [],
    errors: []
  };
  if (!spreadsheetRows || spreadsheetRows.length === 0) return result;

  const headerRowIndex = explicitHeaderRowIndex !== undefined
    ? explicitHeaderRowIndex
    : findPersonnelHeaderRowIndex(spreadsheetRows);

  result.detectedHeaderRowIndex = headerRowIndex;

  if (headerRowIndex < 0) {
    result.errors.push({
      rowNumber: 1,
      messages: ['Unable to detect the personnel table header. Please check the Excel file.']
    });
    return result;
  }

  const headerRow = spreadsheetRows[headerRowIndex] || [];
  const rawHeaderItems: Array<{ index: number; value: string }> = [];
  for (let i = 0; i < headerRow.length; i += 1) {
    rawHeaderItems.push({
      index: i,
      value: formatSpreadsheetCell(headerRow[i])
    });
  }
  const projections = createColumnProjections(rawHeaderItems, result);

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
    // Skip completely empty rows
    const hasValues = spreadsheetRow.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasValues) continue;

    // Skip summary / aggregate footer rows (e.g. rows containing "Count:", "Total:", etc.)
    const isSummaryFooterRow = spreadsheetRow.some(cell => {
      if (cell === null || cell === undefined) return false;
      const str = String(cell).trim().toLowerCase();
      return str.startsWith('count:') || str.startsWith('total:') || str === 'count' || str === 'total' || str === 'grand total';
    });
    if (isSummaryFooterRow) continue;

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

/**
 * Standard CSV row parser that splits text lines while respecting quotes.
 */
export const parseCsvLines = (csv: string): string[][] => {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];

    if (char === '"') {
      if (inQuotes && csv[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && csv[i + 1] === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c !== '')) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c !== '')) {
      lines.push(currentRow);
    }
  }

  return lines;
};

export const parsePersonnelCsv = (
  csv: string,
  explicitHeaderRowIndex?: number
): PersonnelCsvResult => {
  const result: PersonnelCsvResult = {
    acceptedHeaders: [],
    ignoredHeaders: [],
    detectedHeaderRowIndex: 0,
    rows: [],
    errors: []
  };
  if (!csv.trim()) return result;

  const parsedLines = parseCsvLines(csv);
  if (parsedLines.length === 0) return result;

  const headerRowIndex = explicitHeaderRowIndex !== undefined
    ? explicitHeaderRowIndex
    : findPersonnelHeaderRowIndex(parsedLines);

  result.detectedHeaderRowIndex = headerRowIndex;

  if (headerRowIndex < 0) {
    result.errors.push({
      rowNumber: 1,
      messages: ['Unable to detect the personnel table header in CSV. Please check the file.']
    });
    return result;
  }

  const headerRow = parsedLines[headerRowIndex] || [];
  const rawHeaderItems: Array<{ index: number; value: string }> = [];
  for (let i = 0; i < headerRow.length; i += 1) {
    rawHeaderItems.push({
      index: i,
      value: String(headerRow[i] || '').trim()
    });
  }
  const projections = createColumnProjections(rawHeaderItems, result);

  if (projections.length === 0) {
    result.errors.push({
      rowNumber: headerRowIndex + 1,
      messages: ['The CSV has no columns that match the personnel database schema']
    });
    return result;
  }

  const seenBadges = new Set<string>();
  for (let index = headerRowIndex + 1; index < parsedLines.length; index += 1) {
    const row = parsedLines[index];
    if (!row || !row.some(c => c.trim() !== '')) continue;

    // Skip summary / aggregate footer rows
    const isSummaryFooterRow = row.some(cell => {
      const str = cell.trim().toLowerCase();
      return str.startsWith('count:') || str.startsWith('total:') || str === 'count' || str === 'total' || str === 'grand total';
    });
    if (isSummaryFooterRow) continue;
    const projected = projectPersonnelRow(
      projections,
      columnIndex => row[columnIndex] || '',
      index + 1,
      seenBadges
    );
    if (projected.row) result.rows.push(projected.row);
    if (projected.issue) result.errors.push(projected.issue);
  }

  return result;
};
