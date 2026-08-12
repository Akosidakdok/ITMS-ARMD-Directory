/**
 * Training CSV Parser
 *
 * Tolerant parsing rules:
 * - Unknown columns are silently DROPPED (only known training columns are absorbed)
 * - Empty rows / spacer rows are silently SKIPPED
 * - Only personnelId + courseName + provider are required fields for a valid row
 */

export interface TrainingImportRow {
  personnelId: string;
  fullName?: string;
  courseName: string;
  category?: string;
  provider: string;
  startDate?: string;
  completionDate?: string;
  hours?: number;
  certificateNo?: string;
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
  'provider', 'startdate', 'completiondate', 'hours', 'certificateno'
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

    // TYPE CHECK: must have at least courseName or provider to be a training row
    const hasCourseName = !!raw.coursename;
    const hasProvider = !!raw.provider;
    if (!hasCourseName && !hasProvider) { droppedCount++; return; }

    const issues: TrainingImportIssue[] = [];

    if (!raw.personnelid) {
      issues.push({ row: rowNum, field: 'personnelId', message: 'personnelId is required', raw });
    }
    if (!raw.coursename) {
      issues.push({ row: rowNum, field: 'courseName', message: 'courseName is required', raw });
    }
    if (!raw.provider) {
      issues.push({ row: rowNum, field: 'provider', message: 'provider is required', raw });
    }

    if (issues.length > 0) {
      invalidRows.push(...issues);
      return;
    }

    const hours = raw.hours ? parseFloat(raw.hours) : undefined;

    validRows.push({
      personnelId: raw.personnelid,
      fullName: raw.fullname || undefined,
      courseName: raw.coursename,
      category: raw.category || undefined,
      provider: raw.provider,
      startDate: raw.startdate || undefined,
      completionDate: raw.completiondate || undefined,
      hours: hours && !isNaN(hours) ? hours : undefined,
      certificateNo: raw.certificateno || undefined,
    });
  });

  return { validRows, invalidRows, droppedCount };
}

/** Generate a downloadable CSV template for training bulk upload */
export function generateTrainingCsvTemplate(): string {
  const headers = 'personnelId,fullName,courseName,category,provider,startDate,completionDate,hours,certificateNo';
  const example = 'pnp-001,Juan Dela Cruz,Ethical Hacking Fundamentals,Cybersecurity,EC-Council,2024-01-15,2024-01-20,40,CERT-2024-001';
  return `${headers}\n${example}\n`;
}
