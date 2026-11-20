import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestRepository } from '../test-support/repository.js';
import { deliverRanks, receiveAssignment } from '../backend/services/paisSpalIntegration.js';

function setEnvironment(t, variables) {
  for (const [key, value] of Object.entries(variables)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
}

test('assignment receiver authenticates the peer and validates the event allowlist', async t => {
  setEnvironment(t, { PAIS_SPAL_ENABLED: 'true', PAIS_SPAL_ASSIGNMENT_TOKEN: 'test-assignment-token' });
  const payload = {
    event_id: '97ab4186-f536-4fe3-a354-50c8a633c7cf',
    personnel_uuid: 'e24d5cad-5bde-487e-b07b-3aae55c348f6',
    type: 'personnel.assignment_changed.v1',
    revision: 2,
    plan_id: '10',
    movement_id: '11',
    effective_date: '2026-09-01',
    office_code: 'ITMS',
    dashboard_unit_key: 'hq',
    designation: 'Test designation',
    location: 'Test location',
  };
  const rpc = t.mock.fn(async () => ({ status: 'applied' }));
  const handler = receiveAssignment(rpc);
  async function send(body, token = 'test-assignment-token') {
    const request = { body, get: () => 'Bearer ' + token, is: () => true };
    const response = {
      status(code) { this.code = code; return this; },
      json(data) { this.data = data; return this; },
    };
    await handler(request, response);
    return [response.code, response.data];
  }
  assert.equal((await send(payload, 'wrong'))[0], 401);
  assert.equal((await send({ ...payload, rank: 'PLT' }))[0], 400);
  assert.equal((await send({ ...payload, effective_date: '2026-02-30' }))[0], 400);
  assert.equal(rpc.mock.callCount(), 0);
  assert.deepEqual(await send(payload), [200, { status: 'applied' }]);
  assert.deepEqual(rpc.mock.calls[0].arguments, ['pais_spal_apply_assignment', { p_event: payload }]);
});

test('rank delivery retains failures and acknowledges a safe retry', async t => {
  setEnvironment(t, { PAIS_SPAL_SPAL_URL: 'http://127.0.0.1:8000', PAIS_SPAL_RANK_TOKEN: 'test-token' });
  const event = { event_id: 'synthetic-rank-event' };
  const rpc = t.mock.fn(async name => (name === 'pais_spal_pending_ranks' ? [event] : null));
  const responses = [{ ok: false }, { ok: true, json: async () => ({ status: 'duplicate' }) }];
  const send = t.mock.fn(async () => responses.shift());
  assert.deepEqual(await deliverRanks(rpc, send), { delivered: 0, failed: 1 });
  assert.deepEqual(rpc.mock.calls[1].arguments, ['pais_spal_finish_rank', {
    p_event_id: event.event_id, p_delivered: false,
  }]);
  assert.deepEqual(await deliverRanks(rpc, send), { delivered: 1, failed: 0 });
  assert.deepEqual(rpc.mock.calls[3].arguments, ['pais_spal_finish_rank', {
    p_event_id: event.event_id, p_delivered: true,
  }]);
  for (const { arguments: [url, options] } of send.mock.calls) {
    assert.equal(url.pathname, '/api/integration/v1/ranks/');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), event);
  }
});

test('partial personnel updates preserve unrelated identity, rank, and assignment fields', async () => {
  const repository = createTestRepository();
  const original = {
    id: 'synthetic-id', firstName: 'Synthetic', lastName: 'Member', badgeNo: '0001',
    birthdate: '1990-01-01', sub_unit: 'Other unit', rank: 'PLT', rankCategory: 'PCO', status: 'Suspended', salaryGrade: 12,
  };
  repository.inMemoryPersonnel.push(original);
  await repository.updatePersonnel(original.id, { designation: 'New designation' });
  assert.deepEqual(repository.inMemoryPersonnel[0], { ...original, designation: 'New designation' });
});

test('assignment reads reconcile local postings and leave linked main postings alone', async () => {
  const repository = createTestRepository();
  repository.spalOwnedPostings = async ids => {
    assert.deepEqual(ids, ['linked', 'local']);
    return new Set(['linked']);
  };
  repository.inMemoryAssignments.push(
    { id: 'linked-posting', personnelId: 'linked', positionCategory: 'Main', status: 'Scheduled', startDate: '2025-01-01' },
    { id: 'local-posting', personnelId: 'local', positionCategory: 'Main', status: 'Scheduled', startDate: '2025-01-01' },
  );
  const rows = await repository.getAssignments();
  assert.deepEqual(rows.map(({ id, status }) => [id, status]), [
    ['linked-posting', 'Scheduled'],
    ['local-posting', 'Current'],
  ]);
});
