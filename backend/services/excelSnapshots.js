import crypto from 'node:crypto';

const SNAPSHOT_TTL_MS = 30 * 60 * 1000;
const snapshots = new Map();

export const fingerprintRecords = records => crypto.createHash('sha256')
  .update(JSON.stringify((records || []).map(record => record && typeof record === 'object' ? Object.keys(record).sort().reduce((result, key) => ({ ...result, [key]: record[key] }), {}) : record)))
  .digest('hex');

const clean = value => value === null || value === undefined ? null : String(value).trim();

export const createExcelSnapshot = ({ exportId = crypto.randomUUID(), templateId, templateVersion, sheets, sourceFingerprint = null }) => {
  snapshots.set(exportId, { exportId, templateId, templateVersion, sheets, sourceFingerprint, createdAt: new Date().toISOString(), expiresAt: Date.now() + SNAPSHOT_TTL_MS });
  return exportId;
};

export const getExcelSnapshot = exportId => {
  const snapshot = snapshots.get(exportId);
  if (!snapshot || snapshot.expiresAt <= Date.now()) { snapshots.delete(exportId); return null; }
  return snapshot;
};

export const snapshotValue = value => {
  if (value && typeof value === 'object' && 'result' in value) return clean(value.result);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return clean(value);
};

export const SNAPSHOT_TTL_SECONDS = SNAPSHOT_TTL_MS / 1000;
