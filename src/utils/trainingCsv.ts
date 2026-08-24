/**
 * Training CSV Parser
 *
 * Tolerant parsing rules:
 * - Unknown columns are silently DROPPED (only known training columns are absorbed)
 * - Empty rows / spacer rows are silently SKIPPED
 * - personnelId + training title + school are required fields for a valid row
 */

export interface TrainingImportRow {
  personnelId: string;
  fullName?: string;
  courseName: string;
  category?: string;
  provider: string;
  location?: string;
  startDate?: string;
  completionDate?: string;
  hours?: number;
  source?: string;
  certificateNo?: string;
  authorityDate?: string;
  issuedBy?: string;
  attachment?: string;
}

export interface TrainingImportIssue {
  row: number;
  field: string;
  message: string;
  raw: Record<string, string>;
}

export interface TrainingParseResult {
  validRows: TrainingImportRow[];
  invalidRows: TrainingImportIssue[];
  droppedCount: number; // rows silently dropped (empty / irrelevant)
}

/** All column names that belong to the Training schema */
const TRAINING_COLUMNS = new Set([
  'personnelid', 'fullname', 'coursename', 'category',
  'provider', 'startdate', 'completiondate', 'hours', 'certificateno',
  'trainingtype', 'trainingtitle', 'school', 'location', 'inclusivestartdate',
  'inclusiveenddate', 'numberofhours', 'source', 'authnumber', 'authdate',
  'issuedby', 'attachment'
]);

/** Normalize a header string to the canonical lowercase-no-space form */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Parse CSV text (RFC 4180 subset) into rows of objects.
 * Handles quoted fields containing commas or newlines.
 */
function parseCsvText(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length === 0) return [];

  // Find first non-empty line as header
  let headerLine = '';
  let headerIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      headerLine = lines[i];
      headerIndex = i;
      break;
    }
  }
  if (!headerLine) return [];

  const rawHeaders = splitCsvRow(headerLine);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // Filter: keep only columns we know about (training schema)
  const keepIndices: number[] = [];
  const keepHeaders: string[] = [];
  normalizedHeaders.forEach((nh, idx) => {
    if (TRAINING_COLUMNS.has(nh)) {
      keepIndices.push(idx);
      keepHeaders.push(nh);
    }
    // else: silently dropped
  });

  const rows: Record<string, string>[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // silently skip blank lines

    const cells = splitCsvRow(lines[i]);
    const obj: Record<string, string> = {};
    keepIndices.forEach((colIdx, mapIdx) => {
      obj[keepHeaders[mapIdx]] = (cells[colIdx] ?? '').trim();
    });

    rows.push(obj);
  }
  return rows;
}

/** Split one CSV row respecting double-quoted fields */
function splitCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Main entry point.
 * Returns validRows (ready to send to API), invalidRows (need user review),
 * and droppedCount (blank / unrecognized rows silently removed).
 */
export function parseTrainingCsv(text: string): TrainingParseResult {
  const allRows = parseCsvText(text);
  const validRows: TrainingImportRow[] = [];
  const invalidRows: TrainingImportIssue[] = [];
  let droppedCount = 0;

  allRows.forEach((raw, idx) => {
    const rowNum = idx + 2; // +2: 1-indexed + header row

    // ROW FILTER: if all known-column values are empty → drop silently
    const allEmpty = Object.values(raw).every(v => !v);
    if (allEmpty) { droppedCount++; return; }

    const trainingTitle = raw.trainingtitle || raw.coursename;
    const trainingType = raw.trainingtype || raw.category;
    const school = raw.school || raw.provider;

    // TYPE CHECK: must contain at least one recognizable training value.
    if (!trainingTitle && !trainingType && !school) { droppedCount++; return; }

    const issues: TrainingImportIssue[] = [];

    if (!raw.personnelid) {
      issues.push({ row: rowNum, field: 'personnelId', message: 'personnelId is required', raw });
    }
    if (!trainingTitle) {
      issues.push({ row: rowNum, field: 'trainingTitle', message: 'trainingTitle is required', raw });
    }
    if (!school) {
      issues.push({ row: rowNum, field: 'school', message: 'school is required', raw });
    }

    if (issues.length > 0) {
      invalidRows.push(...issues);
      return;
    }

    const hoursValue = raw.numberofhours || raw.hours;
    const hours = hoursValue ? parseFloat(hoursValue) : undefined;

    validRows.push({
      personnelId: raw.personnelid,
      fullName: raw.fullname || undefined,
      courseName: trainingTitle,
      category: trainingType,
      provider: school,
      location: raw.location || undefined,
      startDate: raw.inclusivestartdate || raw.startdate || undefined,
      completionDate: raw.inclusiveenddate || raw.completiondate || undefined,
      hours: hours && !isNaN(hours) ? hours : undefined,
      source: raw.source || undefined,
      certificateNo: raw.authnumber || raw.certificateno || undefined,
      authorityDate: raw.authdate || undefined,
      issuedBy: raw.issuedby || undefined,
      attachment: raw.attachment || undefined,
    });
  });

  return { validRows, invalidRows, droppedCount };
}

/** Generate a downloadable CSV template for training bulk upload */
export function generateTrainingCsvTemplate(): string {
  const headers = 'personnelId,fullName,trainingType,trainingTitle,school,location,inclusiveStartDate,inclusiveEndDate,numberOfHours,source,authNumber,authDate,issuedBy,attachment';
  const example = 'pnp-001,Juan Dela Cruz,Specialized,PNP Basic Essentials Computer Course,ITMS,Camp Crame,2024-05-27,2024-06-14,112,GO,2024-286,2024-06-14,PNP TS,';
  return `${headers}\n${example}\n`;
}
