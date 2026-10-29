import { dlosError, parseDlosVersion } from './dlosCaseSchema.js';

export const DLOS_WORKFLOW = {
  roi: { fields: { roiDate: 'date', receivedDate: 'date' }, files: ['roi', 'memo'] },
  resolution: { fields: { resolutionDate: 'date' }, files: ['resolution'] },
  decision: { fields: { decisionDate: 'date', authority: 'text', liability: 'text', penalty: 'text', penaltyCategory: 'text' }, files: ['decision'] },
  decision_resolution: { fields: { resolutionDate: 'date' }, files: ['resolution'] },
  decision_service: { fields: { proofType: 'text', receivedDate: 'date' }, files: ['proof'] },
  mr_resolution: { fields: { filedDate: 'date', resolutionDate: 'date', resolution: 'text' }, files: ['mr_resolution'] },
  mr_service: { fields: { serviceDate: 'date' }, files: ['proof'] },
  finality: { fields: { finalityDate: 'date' }, files: ['certificate'] },
  implementation: { fields: { respondentKey: 'uuid', orderDate: 'date', effectivityDate: 'date', penaltyDuration: 'text', penaltyCategory: 'text' }, files: ['order'] },
  sho_amendment: { fields: { shoName: 'text', shoPersonnelId: 'text', memorandumDate: 'date' }, files: ['memorandum'] }
};

const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const parseDlosWorkflow = (step, body, files = []) => {
  const definition = DLOS_WORKFLOW[step];
  if (!definition) throw dlosError('Workflow step is invalid.');
  const version = parseDlosVersion(body?.version);
  let fields;
  try { fields = JSON.parse(body?.fields || '{}'); }
  catch { throw dlosError('Workflow fields must be valid JSON.'); }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw dlosError('Workflow fields are invalid.');
  for (const [key, value] of Object.entries(fields)) {
    const type = definition.fields[key];
    if (!type || typeof value !== 'string' || value.length > 2000) throw dlosError(`Invalid workflow field: ${key}.`);
    if (type === 'date' && value && !validDate(value)) throw dlosError(`${key} must be a valid date.`);
    if (type === 'uuid' && value && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw dlosError(`${key} must be a valid respondent ID.`);
  }
  if (step === 'sho_amendment' && !String(fields.shoName || '').trim()) throw dlosError('New SHO is required.');
  if (step === 'sho_amendment' && !fields.memorandumDate) throw dlosError('Memorandum date is required.');
  if (step === 'implementation' && !fields.respondentKey) throw dlosError('Select a respondent.');
  if (['decision', 'implementation'].includes(step) && fields.penaltyCategory && !['suspension', 'demotion', 'dismissal', 'exonerated'].includes(fields.penaltyCategory)) {
    throw dlosError('Penalty category is invalid.');
  }
  if (step === 'decision' && (!fields.decisionDate || !fields.authority || !fields.liability || !fields.penalty)) {
    throw dlosError('Decision date, disciplinary authority, liability, and penalty are required.');
  }
  if (files.length > 2 || files.some(file => !definition.files.includes(file.fieldname))) throw dlosError('Unexpected workflow file.');
  if (files.length !== new Set(files.map(file => file.fieldname)).size) throw dlosError('Duplicate workflow file.');
  const noDocument = body?.noDocument === 'true';
  if (!Object.values(fields).some(value => value.trim()) && !files.length) throw dlosError('Enter workflow details.');
  return { step, version, fields, noDocument };
};
