import { supabaseAdmin } from '../config/supabase.js';

const unavailable = () => Object.assign(new Error('DLOS database is unavailable. Check the service-role configuration and migration.'), { statusCode: 503 });
const databaseError = error => {
  if (!error) return unavailable();
  const statusCode = error.code === 'P0002' ? 404 : error.code === '40001' ? 409 : error.code === '22023' || error.code === '23514' ? 400 : 503;
  return Object.assign(new Error(statusCode === 503 ? 'DLOS database request failed. Check the migration and database connection.' : error.message), { statusCode, cause: error });
};
const client = () => {
  if (!supabaseAdmin) throw unavailable();
  return supabaseAdmin;
};
const result = ({ data, error }) => {
  if (error) throw databaseError(error);
  return data;
};

export const getDlosAccess = async userId => {
  const db = client();
  const data = result(await db.from('dlos_user_access').select('accessRole, active').eq('userId', userId).maybeSingle());
  return data?.active ? data.accessRole : null;
};

const manilaToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const calendarDaysBetween = (from, to) => {
  if (!from || !to) return null;
  const days = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
  return Number.isFinite(days) && days >= 0 ? days : null;
};
export const enrichDlosCase = item => {
  const asOfDate = manilaToday();
  return {
    ...item,
    people: [...(item.people || [])].sort((a, b) => a.position - b.position),
    aging: {
      asOfDate,
      forShoDays: calendarDaysBetween(item.receivedByShoDate, item.resolvedByShoDate || asOfDate),
      forReviewDays: calendarDaysBetween(item.resolvedByShoDate, item.decisionIssuedDate || asOfDate)
    }
  };
};

export const getDlosOptions = async () => result(await client().rpc('dlos_case_options')) || [];

export const getDlosPenaltyDirectory = async year => {
  const db = client();
  const readAll = async buildQuery => {
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const batch = result(await buildQuery().range(start, start + 999)) || [];
      rows.push(...batch);
      if (batch.length < 1000) return rows;
    }
  };
  const workflows = await readAll(() => db.from('dlos_case_workflow')
    .select('caseId,stepKey,respondentKey,fields').in('stepKey', ['decision', 'implementation']));
  const caseIds = [...new Set(workflows.filter(row => row.stepKey === 'decision').map(row => row.caseId))];
  if (!caseIds.length) return [];
  const cases = [];
  for (let start = 0; start < caseIds.length; start += 200) {
    cases.push(...(result(await db.from('dlos_cases')
      .select('id,docketNumber,people:dlos_case_personnel(id,role,nameSnapshot)')
      .in('id', caseIds.slice(start, start + 200)).is('archivedAt', null)
      .gte('caseDate', `${year}-01-01`).lte('caseDate', `${year}-12-31`)) || []));
  }
  const casesById = new Map(cases.map(row => [row.id, row]));
  const implementations = new Map(workflows.filter(row => row.stepKey === 'implementation').map(row => [`${row.caseId}:${row.respondentKey}`, row.fields || {}]));
  const labels = ['suspension', 'demotion', 'dismissal', 'exonerated'];
  const resultEntries = [];
  for (const decision of workflows.filter(row => row.stepKey === 'decision')) {
    const item = casesById.get(decision.caseId);
    if (!item) continue;
    const fields = decision.fields || {};
    const penalty = String(fields.penalty || '');
    for (const person of (item.people || []).filter(person => person.role === 'respondent')) {
      const implementation = implementations.get(`${item.id}:${person.id}`) || {};
      const category = labels.includes(implementation.penaltyCategory) ? implementation.penaltyCategory
        : labels.includes(fields.penaltyCategory) ? fields.penaltyCategory
          : labels.find(label => label === 'exonerated' ? /exon[eo]rat/i.test(penalty) : new RegExp(label, 'i').test(penalty));
      if (!category) continue;
      resultEntries.push({
        id: `${item.id}:${person.id}`, category, name: person.nameSnapshot,
        caseId: item.id, docketNumber: item.docketNumber,
        effectivityDate: implementation.effectivityDate || implementation.orderDate || '',
        duration: category === 'suspension' ? implementation.penaltyDuration || '' : ''
      });
    }
  }
  return resultEntries;
};

export const searchDlosCases = async ({ year, month, classification, page, pageSize, sort, direction, filters }) => {
  const data = result(await client().rpc('dlos_search_cases', {
    p_year: year, p_month: month, p_classification: classification, p_filters: filters,
    p_page: page, p_page_size: pageSize, p_sort: sort, p_direction: direction
  }));
  return { items: (data?.items || []).map(enrichDlosCase), total: data?.total || 0, page, pageSize };
};

export const getDlosCase = async id => {
  const data = result(await client().from('dlos_cases')
    .select('*, people:dlos_case_personnel(*)').eq('id', id).is('archivedAt', null).maybeSingle());
  if (!data) return null;
  return enrichDlosCase(data);
};

export const getDlosHistory = async id => result(await client().from('dlos_case_events')
  .select('id,eventType,changedFields,fromStatus,toStatus,actorName,reason,createdAt')
  .eq('caseId', id).order('createdAt', { ascending: false }).limit(200));

export const saveDlosCase = async (caseData, people, actor, id = null, expectedVersion = null) => {
  const caseId = result(await client().rpc('dlos_save_case', {
    p_case: caseData, p_people: people, p_actor: actor.id, p_actor_name: actor.displayName || actor.email || actor.username,
    p_id: id, p_expected_version: expectedVersion
  }));
  return getDlosCase(caseId);
};

export const applyDlosAction = async (id, action, expectedVersion, payload, actor) => {
  result(await client().rpc('dlos_case_action', {
    p_id: id, p_action: action, p_expected_version: expectedVersion,
    p_actor: actor.id, p_actor_name: actor.displayName || actor.email || actor.username, p_payload: payload
  }));
  return getDlosCase(id);
};

export const getDlosUpdates = async id => result(await client().from('dlos_case_updates')
  .select('id,updateDate,note,actorName,createdAt').eq('caseId', id)
  .order('updateDate', { ascending: false }).order('createdAt', { ascending: false }).limit(200));

export const getDlosWorkflow = async id => result(await client().from('dlos_case_workflow')
  .select('id,caseId,stepKey,respondentKey,fields,noDocument,actorName,updatedAt')
  .eq('caseId', id).order('updatedAt', { ascending: false }).limit(100));

export const getDlosDocuments = async id => result(await client().from('dlos_case_documents')
  .select('id,caseId,kind,stepKey,fileRole,respondentKey,documentDate,fileName,mimeType,fileSize,uploaderName,uploadedAt').eq('caseId', id)
  .order('uploadedAt', { ascending: false }).limit(200));

export const getDlosDocument = async (caseId, documentId) => result(await client().from('dlos_case_documents')
  .select('id,caseId,kind,fileName,mimeType,fileSize,storagePath').eq('caseId', caseId)
  .eq('id', documentId).maybeSingle());

export const recordDlosDocument = async (caseId, kind, documentDate, file, storagePath, actor) => {
  const fileName = file.originalname.replace(/[\x00-\x1f\x7f\\/]/g, '_').slice(0, 180);
  const id = result(await client().rpc('dlos_record_dated_document', {
    p_case_id: caseId, p_kind: kind, p_document_date: documentDate,
    p_file_name: fileName, p_mime_type: file.mimetype,
    p_file_size: file.size, p_storage_path: storagePath,
    p_actor: actor.id, p_actor_name: actor.displayName || actor.email || actor.username
  }));
  return {
    id, caseId, kind, documentDate, fileName, mimeType: file.mimetype, fileSize: file.size,
    uploaderName: actor.displayName || actor.email || actor.username,
    uploadedAt: new Date().toISOString()
  };
};

export const recordDlosWorkflow = async (caseId, { step, version, fields, noDocument }, files, actor) => {
  const metadata = files.map(({ file, path }) => ({
    fileRole: file.fieldname,
    fileName: file.originalname.replace(/[\x00-\x1f\x7f\\/]/g, '_').slice(0, 180),
    mimeType: file.mimetype,
    fileSize: file.size,
    storagePath: path
  }));
  return result(await client().rpc('dlos_record_workflow', {
    p_case_id: caseId, p_step: step, p_expected_version: version, p_fields: fields,
    p_no_document: noDocument, p_files: metadata, p_actor: actor.id,
    p_actor_name: actor.displayName || actor.email || actor.username
  }));
};

export const listDlosGrants = async () => result(await client().from('dlos_user_access')
  .select('userId,accessRole,active,grantedAt,revokedAt,updatedAt'));

export const setDlosGrant = async (userId, accessRole, active, actorId) => {
  const data = {
    userId, accessRole, active, updatedAt: new Date().toISOString(),
    grantedByUserId: active ? actorId : null,
    grantedAt: active ? new Date().toISOString() : undefined,
    revokedByUserId: active ? null : actorId,
    revokedAt: active ? null : new Date().toISOString()
  };
  return result(await client().from('dlos_user_access').upsert(data, { onConflict: 'userId' })
    .select('userId,accessRole,active,grantedAt,revokedAt').single());
};
