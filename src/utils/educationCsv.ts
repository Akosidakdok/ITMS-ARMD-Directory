/**
 * Education CSV Parser
 *
 * Tolerant parsing rules:
 * - Unknown columns are silently DROPPED (only known edu columns are absorbed)
 * - Empty rows / spacer rows are silently SKIPPED
 * - certifications column accepts comma-separated values inside a cell (e.g. "CISSP,CEH")
 */

export interface EducationImportRow {
  personnelId: string;
  fullName?: string;
  academicLevel?: string;
  degree?: string;
  institution?: string;
  major?: string;
  startYear?: number;
  yearGraduated?: number;
  honors?: string;
  highest?: boolean;
  ranking?: number;
  certifications?: string[];
}

export interface EducationImportIssue {
  row: number;
  field: string;
  message: string;
  raw: Record<string, string>;
}

export interface EducationParseResult {
  validRows: EducationImportRow[];
  invalidRows: EducationImportIssue[];
  droppedCount: number; // rows silently dropped (empty / irrelevant)
}

/** All column names that belong to the Education schema */
const EDUCATION_COLUMNS = new Set([
  'personnelid', 'fullname', 'degree', 'institution',
  'yeargraduated', 'honors', 'certifications',
  'academiclevel', 'school', 'course', 'major', 'startyear',
  'endyear', 'grade', 'highest', 'ranking'
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

  // Filter: keep only columns we know about (education schema)
  const keepIndices: number[] = [];
  const keepHeaders: string[] = [];
  normalizedHeaders.forEach((nh, idx) => {
    if (EDUCATION_COLUMNS.has(nh)) {
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
export function parseEducationCsv(text: string): EducationParseResult {
  const allRows = parseCsvText(text);
  const validRows: EducationImportRow[] = [];
  const invalidRows: EducationImportIssue[] = [];
  let droppedCount = 0;

  allRows.forEach((raw, idx) => {
    const rowNum = idx + 2; // +2: 1-indexed + header row

    // ROW FILTER: if all known-column values are empty → drop silently
    const allEmpty = Object.values(raw).every(v => !v);
    if (allEmpty) { droppedCount++; return; }

    const course = raw.course || raw.degree;
    const school = raw.school || raw.institution;

    // TYPE CHECK: must contain at least one recognizable academic value.
    if (!raw.academiclevel && !course && !school) { droppedCount++; return; }

    const issues: EducationImportIssue[] = [];

    if (!raw.personnelid) {
      issues.push({ row: rowNum, field: 'personnelId', message: 'personnelId is required', raw });
    }
    if (!raw.academiclevel && !course) {
      issues.push({ row: rowNum, field: 'academicLevel', message: 'academicLevel or course is required', raw });
    }

    if (issues.length > 0) {
      invalidRows.push(...issues);
      return;
    }

    // Parse certifications: may be "CISSP,CEH" inside cell
    const certs = raw.certifications
      ? raw.certifications.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    const startYear = raw.startyear ? parseInt(raw.startyear, 10) : undefined;
    const endYearValue = raw.endyear || raw.yeargraduated;
    const yearGraduated = endYearValue ? parseInt(endYearValue, 10) : undefined;
    const ranking = raw.ranking ? parseInt(raw.ranking, 10) : undefined;
    const highest = /^(yes|true|1)$/i.test(raw.highest || '');

    validRows.push({
      personnelId: raw.personnelid,
      fullName: raw.fullname || undefined,
      academicLevel: raw.academiclevel,
      degree: course || undefined,
      institution: school || undefined,
      major: raw.major || undefined,
      startYear: startYear !== undefined && !isNaN(startYear) ? startYear : undefined,
      yearGraduated: yearGraduated && !isNaN(yearGraduated) ? yearGraduated : undefined,
      honors: raw.grade || raw.honors || undefined,
      highest,
      ranking: ranking !== undefined && !isNaN(ranking) ? ranking : undefined,
      certifications: certs.length > 0 ? certs : undefined,
    });
  });

  return { validRows, invalidRows, droppedCount };
}

/** Generate a downloadable CSV template for education bulk upload */
export function generateEducationCsvTemplate(): string {
  const headers = 'personnelId,fullName,academicLevel,school,course,major,startYear,endYear,grade,highest,ranking';
  const example = 'pnp-001,Juan Dela Cruz,College,ICCT Colleges,BS Criminology,,2015,2018,,Yes,0';
  return `${headers}\n${example}\n`;
}
