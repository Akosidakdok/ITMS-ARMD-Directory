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
  degree: string;
  institution: string;
  yearGraduated?: number;
  honors?: string;
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
  'yeargraduated', 'honors', 'certifications'
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

    // TYPE CHECK: must have at least degree or institution to be an education row
    const hasDegree = !!raw.degree;
    const hasInstitution = !!raw.institution;
    if (!hasDegree && !hasInstitution) { droppedCount++; return; }

    const issues: EducationImportIssue[] = [];

    if (!raw.personnelid) {
      issues.push({ row: rowNum, field: 'personnelId', message: 'personnelId is required', raw });
    }
    if (!raw.degree) {
      issues.push({ row: rowNum, field: 'degree', message: 'degree is required', raw });
    }
    if (!raw.institution) {
      issues.push({ row: rowNum, field: 'institution', message: 'institution is required', raw });
    }

    if (issues.length > 0) {
      invalidRows.push(...issues);
      return;
    }

    // Parse certifications: may be "CISSP,CEH" inside cell
    const certs = raw.certifications
      ? raw.certifications.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    const yearGraduated = raw.yeargraduated ? parseInt(raw.yeargraduated, 10) : undefined;

    validRows.push({
      personnelId: raw.personnelid,
      fullName: raw.fullname || undefined,
      degree: raw.degree,
      institution: raw.institution,
      yearGraduated: yearGraduated && !isNaN(yearGraduated) ? yearGraduated : undefined,
      honors: raw.honors || undefined,
      certifications: certs.length > 0 ? certs : undefined,
    });
  });

  return { validRows, invalidRows, droppedCount };
}

/** Generate a downloadable CSV template for education bulk upload */
export function generateEducationCsvTemplate(): string {
  const headers = 'personnelId,fullName,degree,institution,yearGraduated,honors,certifications';
  const example = 'pnp-001,Juan Dela Cruz,Bachelor of Science in Computer Science,Polytechnic University of the Philippines,2015,Cum Laude,"CISSP,CEH"';
  return `${headers}\n${example}\n`;
}
