import { ORDER_PURPOSE_CODES, ORDER_SERIES_CODES } from './orderCatalog.js';

export { ORDER_PURPOSE_CODES, ORDER_SERIES_CODES };

export function getOrderYear(issuedDate) {
  const match = String(issuedDate || '').match(/^(\d{4})-/);
  const year = match ? Number(match[1]) : NaN;
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error('A valid issued date is required to generate the order number.');
  }
  return year;
}

export function buildOrderNumber({ series, purposeCode, year, sequence }) {
  if (!ORDER_SERIES_CODES.has(series)) throw new Error(`Invalid order series: ${series}`);
  if (!ORDER_PURPOSE_CODES.has(purposeCode)) throw new Error(`Invalid order purpose code: ${purposeCode}`);
  if (!Number.isInteger(year) || !Number.isInteger(sequence) || sequence < 1) {
    throw new Error('A valid order year and sequence are required.');
  }
  return `ITMS-${series}-${purposeCode}-${year}-${String(sequence).padStart(4, '0')}`;
}

export function extractOrderSequence(orderNumber) {
  const match = String(orderNumber || '').match(/^ITMS-(GO|SO|LO)-[A-Z0-9]+-(\d{4})-(\d+)$/);
  if (!match) return null;
  return { series: match[1], year: Number(match[2]), sequence: Number(match[3]) };
}
