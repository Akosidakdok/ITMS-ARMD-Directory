import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { db } from '../store/repository.js';
import { getExcelTemplate } from './excelTemplateRegistry.js';
import { fingerprintRecords, getExcelSnapshot, snapshotValue } from './excelSnapshots.js';

const PREVIEW_TTL_MS = 10 * 60 * 1000;
const previews = new Map();

const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const blank = value => value === null || value === undefined || String(value).trim() === '';

const dateValue = value => {
  if (blank(value)) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + Math.round(value) * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const scalarValue = value => value && typeof value === 'object' && 'result' in value ? value.result : value;
const comparable = value => String(snapshotValue(scalarValue(value)) ?? '').trim().toLowerCase();

const readMetadata = workbook => {
  const sheet = workbook.getWorksheet('PAIS Metadata');
  if (!sheet) return {};
  const metadata = {};
  for (let row = 1; row <= sheet.rowCount; row += 1) metadata[normalize(sheet.getCell(row, 1).value)] = sheet.getCell(row, 2).value;
  return metadata;
};

const resolveHeader = (header, mappings) => mappings.find(mapping => mapping.headerAliases.some(alias => normalize(alias) === normalize(header)));

const findHeader = (worksheet, mappings) => {
  let best = null;
  const maxRows = Math.min(worksheet.rowCount, 40);
  for (let rowNumber = 1; rowNumber <= maxRows; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const matches = [];
    row.eachCell((cell, columnNumber) => {
      const mapping = resolveHeader(scalarValue(cell.value), mappings);
      if (mapping) matches.push({ columnNumber, mapping });
    });
    if (!best || matches.length > best.matches.length) best = { rowNumber, matches };
  }
  return best && best.matches.length >= 2 ? best : null;
};

const cleanPreviewCache = () => {
  const now = Date.now();
  for (const [id, preview] of previews) if (preview.expiresAt <= now) previews.delete(id);
};

const mapRow = (row, header, template, peopleByKey) => {
  const record = {};
  const errors = [];
  header.matches.forEach(({ columnNumber, mapping }) => {
    let value = scalarValue(row.getCell(columnNumber).value);
    if (mapping.kind === 'date') value = dateValue(value);
    if (mapping.kind === 'number' && !blank(value)) value = Number(value);
    if (mapping.kind === 'boolean' && !blank(value)) value = Boolean(value);
    record[mapping.target] = value;
  });

  const personnelKey = String(record.personnelId || '').trim().toLowerCase();
  const matches = peopleByKey.get(personnelKey) || [];
  const person = matches.length === 1 ? matches[0] : null;
  if (!person) errors.push({ field: 'personnelId', message: matches.length > 1 ? 'Personnel ID or badge number matches multiple PAIS records.' : 'Personnel ID or badge number does not match exactly one PAIS record.' });
  else record.personnelId = person.id;

  for (const mapping of template.fieldMappings) {
    if (mapping.required && blank(record[mapping.target])) errors.push({ field: mapping.target, message: 'Required value is missing.' });
  }
  if (record.startDate && !record.completionDate && template.id === 'training-import') errors.push({ field: 'completionDate', message: 'Completion date is required for training imports.' });
  if (record.startDate && record.completionDate && record.completionDate < record.startDate) errors.push({ field: 'completionDate', message: 'Completion date cannot precede start date.' });
  if (template.id === 'education-import') {
    for (const field of ['startYear', 'yearGraduated']) {
      if (!blank(record[field]) && (!Number.isInteger(record[field]) || record[field] < 1900 || record[field] > 2200)) errors.push({ field, message: 'Year must be a valid four-digit year.' });
    }
  }
  return { record, errors };
};

export const createExcelPreview = async ({ templateId, buffer, actor, filename = null, fileHash = null }) => {
  cleanPreviewCache();
  const template = getExcelTemplate(templateId);
  if (!template) throw Object.assign(new Error('Excel template definition not found.'), { statusCode: 404 });
  if (!['training-import', 'education-import'].includes(templateId)) throw Object.assign(new Error('This template is report-only or not yet approved for imports.'), { statusCode: 422 });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const metadata = readMetadata(workbook);
  const snapshot = metadata['export id'] ? getExcelSnapshot(String(metadata['export id'])) : null;
  const people = await db.getPersonnel();
  const currentSourceRecords = templateId === 'training-import' ? await db.getTraining() : await db.getEducation();
  const staleExport = Boolean(snapshot?.sourceFingerprint && snapshot.sourceFingerprint !== fingerprintRecords(currentSourceRecords));
  const peopleByKey = new Map();
  people.forEach(person => {
    [person.id, person.badgeNo, person.personnelId].filter(Boolean).forEach(key => {
      const normalizedKey = String(key).trim().toLowerCase();
      peopleByKey.set(normalizedKey, [...(peopleByKey.get(normalizedKey) || []), person]);
    });
  });

  const rows = [];
  const errors = [];
  const changes = [];
  let detectedSheet = null;
  for (const worksheet of workbook.worksheets) {
    const header = findHeader(worksheet, template.fieldMappings);
    if (!header) continue;
    detectedSheet = worksheet.name;
    for (let rowNumber = header.rowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const values = row.values || [];
      if (!values.some(value => !blank(scalarValue(value)))) continue;
      const result = mapRow(row, header, template, peopleByKey);
      rows.push({ rowNumber, record: result.record, valid: result.errors.length === 0 });
      const baseline = snapshot?.sheets.find(sheet => sheet.name === worksheet.name)?.rows?.[rowNumber - 1];
      if (!snapshot) changes.push({ rowNumber, type: 'no-baseline', message: 'No active export snapshot was found for this workbook.' });
      else if (!baseline) changes.push({ rowNumber, type: 'added', message: 'This row was not present in the exported snapshot.' });
      else {
        const details = header.matches
          .filter(({ columnNumber }) => comparable(row.getCell(columnNumber).value) !== comparable(baseline[columnNumber - 1]))
          .map(({ columnNumber, mapping }) => ({ field: mapping.target, before: snapshotValue(baseline[columnNumber - 1]), after: snapshotValue(row.getCell(columnNumber).value) }));
        changes.push({ rowNumber, type: details.length ? 'changed' : 'unchanged', fields: details.map(detail => detail.field), details });
      }
      result.errors.forEach(error => errors.push({ rowNumber, ...error }));
    }
    break;
  }
  if (!detectedSheet) throw Object.assign(new Error('No worksheet contains enough recognized template headers.'), { statusCode: 422 });

  const duplicateKey = record => templateId === 'training-import'
    ? [record.personnelId, record.courseName, record.startDate, record.completionDate].map(value => String(value || '').trim().toLowerCase()).join('|')
    : [record.personnelId, record.academicLevel, record.degree, record.institution].map(value => String(value || '').trim().toLowerCase()).join('|');
  const existingKeys = new Set(currentSourceRecords.map(duplicateKey));
  const seenKeys = new Set();
  const duplicateWarnings = [];
  rows.filter(row => row.valid).forEach(row => {
    const key = duplicateKey(row.record);
    if (seenKeys.has(key) || existingKeys.has(key)) duplicateWarnings.push({ rowNumber: row.rowNumber, message: 'This record matches an existing or repeated record and will be reviewed by the upsert process.' });
    seenKeys.add(key);
  });

  const previewId = crypto.randomUUID();
  const audit = await db.createExcelImportAudit({ templateId, templateVersion: template.version, exportId: metadata['export id'] || null, uploadedFilename: filename, uploadedBy: actor, fileHash, status: 'Previewed', rowCount: rows.length, validCount: rows.filter(row => row.valid).length, invalidCount: rows.filter(row => !row.valid).length, sourceFingerprint: snapshot?.sourceFingerprint || null, details: { changes, staleExport, errors, duplicateWarnings } });
  previews.set(previewId, { templateId, rows: rows.filter(row => row.valid).map(row => row.record), errors, changes, staleExport, auditId: audit.id, createdBy: actor, createdAt: new Date().toISOString(), expiresAt: Date.now() + PREVIEW_TTL_MS });
  return {
    previewId,
    templateId,
    templateVersion: template.version,
    detectedSheet,
    rowCount: rows.length,
    validCount: rows.filter(row => row.valid).length,
    invalidCount: rows.filter(row => !row.valid).length,
    canCommit: rows.length > 0 && errors.length === 0 && !staleExport,
    snapshotAvailable: Boolean(snapshot),
    staleExport,
    duplicateWarnings,
    changes,
    errors,
    expiresInSeconds: PREVIEW_TTL_MS / 1000
  };
};

export const commitExcelPreview = async ({ previewId, actor }) => {
  cleanPreviewCache();
  const preview = previews.get(previewId);
  if (!preview) throw Object.assign(new Error('Preview not found or expired. Upload the workbook again.'), { statusCode: 410 });
  if (preview.errors.length) throw Object.assign(new Error('Resolve all preview validation errors before committing.'), { statusCode: 422 });
  if (preview.staleExport) throw Object.assign(new Error('PAIS data changed after this workbook was exported. Generate a fresh workbook and review it again.'), { statusCode: 409 });
  if (!preview.rows.length) throw Object.assign(new Error('There are no valid rows to commit.'), { statusCode: 422 });
  const result = preview.templateId === 'training-import'
    ? await db.bulkUpsertTraining(preview.rows)
    : await db.bulkUpsertEducation(preview.rows);
  previews.delete(previewId);
  const committedAt = new Date().toISOString();
  await db.updateExcelImportAudit(preview.auditId, { status: 'Committed', approvedBy: actor, approvedAt: committedAt, addedCount: result.added.length, replacedCount: result.replaced.length, skippedCount: result.skipped.length });
  return { previewId, templateId: preview.templateId, committedBy: actor, committedAt, addedCount: result.added.length, replacedCount: result.replaced.length, skippedCount: result.skipped.length };
};
