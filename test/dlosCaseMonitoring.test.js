import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDlosAction, parseDlosCase, parseDlosDocumentDate, parseDlosListQuery, parseDlosPeople } from '../backend/schemas/dlosCaseSchema.js';
import { parseDlosWorkflow } from '../backend/schemas/dlosWorkflowSchema.js';
import { enrichDlosCase } from '../backend/store/dlosRepository.js';
import { validDlosFile } from '../backend/middleware/dlosUpload.js';
import { requireAdminForMutation } from '../backend/middleware/auth.js';
import { requireDlosRole } from '../backend/middleware/dlosAccess.js';

const baseCase = { classification: 'grave', caseDate: '2026-10-21', docketNumber: '001/2026' };

test('registration date and classification are validated independently of other case dates', () => {
  assert.equal(parseDlosCase(baseCase).caseDate, '2026-10-21');
  assert.throws(() => parseDlosCase({ ...baseCase, caseDate: '2026-02-30' }), /valid YYYY-MM-DD/);
  assert.throws(() => parseDlosCase({ ...baseCase, classification: 'other' }), /Grave or Less Grave/);
  assert.throws(() => parseDlosCase({ ...baseCase, receivedByShoDate: '2026-10-21', resolvedByShoDate: '2026-10-20' }), /cannot precede/);
});

test('case actions validate notes and referral reasons; SHO amendment uses workflow', () => {
  assert.deepEqual(parseDlosAction({ action: 'add_update', version: 1, updateDate: '2026-10-21', note: '  Followed up  ' }).payload,
    { updateDate: '2026-10-21', note: 'Followed up' });
  assert.throws(() => parseDlosAction({ action: 'add_update', version: 1, updateDate: '2026-10-21', note: '' }), /required/);
  assert.throws(() => parseDlosAction({ action: 'send_to_sho', version: 1 }), /Action is invalid/);
  assert.deepEqual(parseDlosAction({ action: 'refer_case', version: 2, reason: '  Wrong office  ' }).payload,
    { reason: 'Wrong office' });
  assert.throws(() => parseDlosAction({ action: 'refer_case', version: 1, reason: '' }), /required/);
  assert.throws(() => parseDlosAction({ action: 'change_sho', version: 1, shoName: 'Officer' }), /Action is invalid/);
  assert.equal(parseDlosAction({ action: 'set_status', version: 2, caseStatus: '8 Decision', reason: 'Decision signed' }).payload.caseStatus, '8 Decision');
  assert.throws(() => parseDlosAction({ action: 'set_status', version: 2, caseStatus: 'Arbitrary', reason: 'x' }), /status is invalid/);
});

test('person and list input limits prevent malformed searches and oversized records', () => {
  assert.throws(() => parseDlosPeople([{ role: 'respondent' }]), /needs a name/);
  assert.equal(parseDlosPeople([{ role: 'witness', nameSnapshot: 'Witness A', unit: 'Unit A' }])[0].unit, 'Unit A');
  assert.throws(() => parseDlosPeople(Array.from({ length: 26 }, () => ({ nameSnapshot: 'Name' }))), /up to 25/);
  assert.equal(parseDlosListQuery({ year: '2026', month: '10', classification: 'less_grave', dateField: 'caseDate', dateFrom: '2026-10-01', dateTo: '2026-10-31' }).filters.dateTo, '2026-10-31');
  assert.throws(() => parseDlosListQuery({ year: '2026', month: '10', classification: 'grave', dateFrom: '2026-10-01' }), /Select a date field/);
  assert.throws(() => parseDlosListQuery({ year: '2026', month: '13', classification: 'grave' }), /Month must be/);
});

test('workflow accepts only fields and file slots for the chosen step', () => {
  const decision = parseDlosWorkflow('decision', {
    version: '3', fields: JSON.stringify({ decisionDate: '2026-10-21', authority: 'DA', liability: 'Liable', penalty: 'Suspension' }),
    noDocument: 'true'
  });
  assert.equal(decision.fields.authority, 'DA');
  assert.throws(() => parseDlosWorkflow('decision', { version: '3', fields: '{}' }), /required/);
  assert.throws(() => parseDlosWorkflow('roi', { version: '1', fields: '{"roiDate":"2026-02-30"}' }), /valid date/);
  assert.throws(() => parseDlosWorkflow('roi', { version: '1', fields: '{"penalty":"x"}' }), /Invalid workflow field/);
  assert.throws(() => parseDlosWorkflow('roi', { version: '1', fields: '{}' }, [{ fieldname: 'order' }]), /Unexpected workflow file/);
  assert.throws(() => parseDlosWorkflow('implementation', { version: '1', fields: '{}' }), /Select a respondent/);
  assert.throws(() => parseDlosWorkflow('sho_amendment', { version: '1', fields: '{"shoName":"Officer"}' }), /Memorandum date/);
});

test('document date is required and valid', () => {
  assert.equal(parseDlosDocumentDate('2026-10-21'), '2026-10-21');
  assert.throws(() => parseDlosDocumentDate(''), /required/);
  assert.throws(() => parseDlosDocumentDate('2026-02-30'), /valid YYYY-MM-DD/);
});

test('aging counts calendar days and preserves missing starts', () => {
  const result = enrichDlosCase({ receivedByShoDate: '2026-10-01', resolvedByShoDate: '2026-10-11', decisionIssuedDate: '2026-10-21', people: [] });
  assert.equal(result.aging.forShoDays, 10);
  assert.equal(result.aging.forReviewDays, 10);
  const missing = enrichDlosCase({ receivedByShoDate: null, resolvedByShoDate: null, decisionIssuedDate: null });
  assert.equal(missing.aging.forShoDays, null);
  assert.equal(missing.aging.forReviewDays, null);
});

test('upload magic bytes must match accepted file type', () => {
  assert.equal(validDlosFile({ mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7') }), true);
  assert.equal(validDlosFile({ mimetype: 'application/pdf', buffer: Buffer.from('<script>') }), false);
  assert.equal(validDlosFile({ mimetype: 'image/png', buffer: Buffer.from('%PDF-1.7') }), false);
});

test('global mutation guard routes DLOS writes to DLOS entitlement middleware', () => {
  const request = { method: 'POST', originalUrl: '/api/dlos/cases', user: { role: 'view_only' } };
  let passed = false;
  requireAdminForMutation(request, { status: () => { throw new Error('Unexpected denial'); } }, () => { passed = true; });
  assert.equal(passed, true);
});

test('DLOS viewer cannot use encoder actions', () => {
  let denied = 0;
  const response = { status: code => { denied = code; return { json: () => undefined }; } };
  requireDlosRole('encoder', 'reviewer')({ dlosRole: 'viewer' }, response, () => { throw new Error('Viewer was allowed'); });
  assert.equal(denied, 403);
  let passed = false;
  requireDlosRole('encoder', 'reviewer')({ dlosRole: 'encoder' }, response, () => { passed = true; });
  assert.equal(passed, true);
});
