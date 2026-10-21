import { DLOS_STATUS_LABELS } from './dlosStatusLabels.js';

export const DLOS_CLASSIFICATIONS = ['grave', 'less_grave'];
export const DLOS_ACCESS_ROLES = ['viewer', 'encoder', 'reviewer'];
export const DLOS_ACTIONS = ['record_sho_received', 'add_update', 'refer_case', 'set_status'];

const DATE_FIELDS = [
  'caseDate', 'signedByDaDate', 'complaintDate', 'forwardedToDlodDate',
  'receivedByShoDate', 'resolvedByShoDate', 'decisionIssuedDate'
];
const FILTER_FIELDS = [
  'rank', 'firstName', 'middleName', 'lastName', 'shoName', 'docketNumber',
  'didmNsuDocketNumber', 'didmReferenceNumber', 'summaryHearingDocketNumber',
  'presidentialConfirmation', 'unitOfficeCaseFrom', 'caseStatus', 'dateField',
  'dateFrom', 'dateTo'
];

export const dlosError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const text = (value, label, max = 160) => {
  if (value == null) return '';
  if (typeof value !== 'string') throw dlosError(`${label} must be text.`);
  const result = value.trim();
  if (result.length > max) throw dlosError(`${label} must be ${max} characters or fewer.`);
  return result;
};

const date = (value, label, required = false) => {
  const result = text(value, label, 10);
  if (!result) {
    if (required) throw dlosError(`${label} is required.`);
    return null;
  }
  const parsed = new Date(`${result}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== result) {
    throw dlosError(`${label} must be a valid YYYY-MM-DD date.`);
  }
  return result;
};

const integer = (value, label, min, max) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw dlosError(`${label} must be between ${min} and ${max}.`);
  }
  return parsed;
};

export const parseDlosCase = body => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw dlosError('A case object is required.');
  const classification = text(body.classification, 'Classification', 20);
  if (!DLOS_CLASSIFICATIONS.includes(classification)) throw dlosError('Classification must be Grave or Less Grave.');
  const caseDate = date(body.caseDate, 'Case registration date', true);
  const docketNumber = text(body.docketNumber, 'Docket number');
  if (!docketNumber) throw dlosError('Docket number is required.');
  const presidentialConfirmation = text(body.presidentialConfirmation || 'not_applicable', 'Presidential confirmation', 30);
  if (!['not_applicable', 'pending', 'confirmed', 'not_confirmed'].includes(presidentialConfirmation)) {
    throw dlosError('Presidential confirmation has an invalid value.');
  }
  const result = {
    classification,
    caseDate,
    docketNumber,
    didmNsuDocketNumber: text(body.didmNsuDocketNumber, 'DIDM/NSU docket number'),
    didmReferenceNumber: text(body.didmReferenceNumber, 'DIDM reference number'),
    summaryHearingDocketNumber: text(body.summaryHearingDocketNumber, 'Summary hearing docket number'),
    presidentialConfirmation,
    unitOfficeCaseFrom: text(body.unitOfficeCaseFrom, 'Unit/Office case from'),
    caseSource: text(body.caseSource, 'Case source'),
    complaintDate: date(body.complaintDate, 'Complaint date'),
    forwardedToDlodDate: date(body.forwardedToDlodDate, 'Forwarded to DLOD date'),
    shoName: text(body.shoName, 'Name of SHO'),
    receivedByShoDate: date(body.receivedByShoDate, 'Received by SHO date'),
    resolvedByShoDate: date(body.resolvedByShoDate, 'Resolved by SHO date'),
    decisionIssuedDate: date(body.decisionIssuedDate, 'Decision issued date'),
    signedByDaDate: date(body.signedByDaDate, 'Date signed by DA'),
    dlodDocketNumber: text(body.dlodDocketNumber, 'DLOD docket number'),
    complaintSource: text(body.complaintSource, 'Source of complaint'),
    initialComplaint: text(body.initialComplaint, 'Initial complaint', 500),
    occurrenceAt: text(body.occurrenceAt, 'Occurrence date and time', 35) || null,
    occurrencePlace: text(body.occurrencePlace, 'Place of occurrence', 500),
    complaintDetails: text(body.complaintDetails, 'Complaint details', 5000),
    sourceSystem: text(body.sourceSystem, 'Source system'),
    sourceRecordId: text(body.sourceRecordId, 'Source record ID')
  };
  if (result.occurrenceAt && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?$/.test(result.occurrenceAt)
    || Number.isNaN(Date.parse(result.occurrenceAt)))) throw dlosError('Occurrence date and time is invalid.');
  if (result.occurrenceAt) date(result.occurrenceAt.slice(0, 10), 'Occurrence date', true);
  if (result.receivedByShoDate && result.resolvedByShoDate && result.resolvedByShoDate < result.receivedByShoDate) {
    throw dlosError('Resolved by SHO date cannot precede received by SHO date.');
  }
  if (result.resolvedByShoDate && result.decisionIssuedDate && result.decisionIssuedDate < result.resolvedByShoDate) {
    throw dlosError('Decision issued date cannot precede resolved by SHO date.');
  }
  return result;
};

export const parseDlosPeople = value => {
  if (!Array.isArray(value) || value.length > 25) throw dlosError('Provide up to 25 involved people.');
  return value.map((person, index) => {
    if (!person || typeof person !== 'object' || Array.isArray(person)) throw dlosError(`Person ${index + 1} is invalid.`);
    const role = text(person.role || 'involved', `Person ${index + 1} role`, 20);
    if (!['involved', 'complainant', 'respondent', 'witness'].includes(role)) throw dlosError(`Person ${index + 1} role is invalid.`);
    const firstName = text(person.firstName, `Person ${index + 1} first name`);
    const middleName = text(person.middleName, `Person ${index + 1} middle name`);
    const lastName = text(person.lastName, `Person ${index + 1} last name`);
    const nameSnapshot = text(person.nameSnapshot || [firstName, middleName, lastName].filter(Boolean).join(' '), `Person ${index + 1} name`, 240);
    if (!nameSnapshot) throw dlosError(`Person ${index + 1} needs a name.`);
    if (person.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(person.id)) {
      throw dlosError(`Person ${index + 1} ID is invalid.`);
    }
    return {
      id: person.id ? text(person.id, `Person ${index + 1} ID`, 36) : null,
      personnelId: text(person.personnelId, `Person ${index + 1} personnel ID`, 120) || null,
      role,
      rank: text(person.rank, `Person ${index + 1} rank`, 80),
      firstName, middleName, lastName, nameSnapshot,
      unit: text(person.unit, `Person ${index + 1} unit`, 160),
      status: text(person.status, `Person ${index + 1} status`, 120)
    };
  });
};

export const parseDlosListQuery = query => {
  const year = integer(query.year, 'Year', 1900, 2100);
  const month = integer(query.month, 'Month', 1, 12);
  const classification = text(query.classification, 'Classification', 20);
  if (!DLOS_CLASSIFICATIONS.includes(classification)) throw dlosError('Classification must be Grave or Less Grave.');
  const page = integer(query.page || 1, 'Page', 1, 100000);
  const pageSize = integer(query.pageSize || 10, 'Page size', 1, 50);
  const sort = text(query.sort || 'caseDate', 'Sort field', 30);
  const direction = text(query.direction || 'desc', 'Sort direction', 5);
  if (!['caseDate', 'docketNumber', 'caseStatus', 'updatedAt'].includes(sort)) throw dlosError('Sort field is invalid.');
  if (!['asc', 'desc'].includes(direction)) throw dlosError('Sort direction is invalid.');
  const filters = {};
  for (const field of FILTER_FIELDS) {
    if (query[field] !== undefined && query[field] !== '') filters[field] = text(query[field], field, 160);
  }
  if (filters.presidentialConfirmation && !['not_applicable', 'pending', 'confirmed', 'not_confirmed'].includes(filters.presidentialConfirmation)) {
    throw dlosError('Presidential confirmation is invalid.');
  }
  if (filters.dateField && !DATE_FIELDS.includes(filters.dateField)) throw dlosError('Date field is invalid.');
  if ((filters.dateFrom || filters.dateTo) && !filters.dateField) throw dlosError('Select a date field for the date range.');
  if (filters.dateFrom) filters.dateFrom = date(filters.dateFrom, 'Date from');
  if (filters.dateTo) filters.dateTo = date(filters.dateTo, 'Date to');
  if (filters.dateFrom && filters.dateTo && filters.dateTo < filters.dateFrom) throw dlosError('Date to cannot precede date from.');
  return { year, month, classification, page, pageSize, sort, direction, filters };
};

export const parseDlosVersion = value => integer(value, 'Version', 1, 2147483647);
export const parseDlosDocumentDate = value => date(value, 'Document date', true);

export const parseDlosAction = body => {
  const action = text(body?.action, 'Action', 40);
  if (!DLOS_ACTIONS.includes(action)) throw dlosError('Action is invalid.');
  const payload = {};
  if (action === 'record_sho_received') {
    payload.receivedByShoDate = date(body?.receivedByShoDate, 'Received by SHO date', true);
  } else if (action === 'refer_case') {
    payload.reason = text(body?.reason, 'Referral reason', 2000);
    if (!payload.reason) throw dlosError('Referral reason is required.');
  } else if (action === 'set_status') {
    payload.caseStatus = text(body?.caseStatus, 'Case status');
    payload.reason = text(body?.reason, 'Status change reason', 500);
    if (!DLOS_STATUS_LABELS.includes(payload.caseStatus)) throw dlosError('Case status is invalid.');
    if (!payload.reason) throw dlosError('Status change reason is required.');
  } else {
    payload.updateDate = date(body?.updateDate, 'Update date', true);
    payload.note = text(body?.note, 'Case update note', 2000);
    if (!payload.note) throw dlosError('Case update note is required.');
  }
  return { action, expectedVersion: parseDlosVersion(body?.version), payload };
};
