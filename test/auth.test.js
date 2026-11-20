import assert from 'node:assert/strict';
import test from 'node:test';

process.env.AUTH_SUPERADMIN_EMAILS = 'cjbaldonado11@gmail.com';

const { requireAdminForMutation, resolveAppRole, toAuthenticatedUser } = await import('../backend/middleware/auth.js');

test('maps the configured Supabase account to the superadmin role', () => {
  const user = { id: 'user-1', email: 'CJBALDONADO11@gmail.com', app_metadata: {}, user_metadata: { display_name: 'CJ Baldonado' } };
  assert.equal(resolveAppRole(user), 'superadmin');
  assert.deepEqual(toAuthenticatedUser(user), {
    id: 'user-1', username: 'CJBALDONADO11@gmail.com', email: 'CJBALDONADO11@gmail.com', displayName: 'CJ Baldonado', role: 'superadmin'
  });
});

test('treats other authenticated Supabase users as view-only', () => {
  assert.equal(resolveAppRole({ email: 'viewer@example.com', app_metadata: {} }), 'view_only');
  assert.equal(resolveAppRole({ email: 'managed@example.com', app_metadata: { role: 'admin' } }), 'admin');
});

test('view-only sessions cannot perform mutations', () => {
  let statusCode = 200;
  let responseBody;
  let continued = false;
  const response = { status(code) { statusCode = code; return this; }, json(body) { responseBody = body; return this; } };
  requireAdminForMutation({ method: 'POST', user: { role: 'view_only' } }, response, () => { continued = true; });
  assert.equal(continued, false);
  assert.equal(statusCode, 403);
  assert.equal(responseBody.message, 'Administrator permission is required.');
  requireAdminForMutation({ method: 'GET', user: { role: 'view_only' } }, response, () => { continued = true; });
  assert.equal(continued, true);
});

test('view-only sessions cannot mutate worksheet cells or sheets (DEF-AUTH-01 fix)', () => {
  const mutatingRequests = [
    { method: 'POST', originalUrl: '/api/worksheets/Sheet1/batch', user: { role: 'view_only' } },
    { method: 'PUT', originalUrl: '/api/worksheets/Sheet1/cell', user: { role: 'view_only' } },
    { method: 'POST', originalUrl: '/api/worksheets/custom', user: { role: 'view_only' } },
    { method: 'PUT', originalUrl: '/api/worksheets/Sheet1/rename', user: { role: 'view_only' } },
    { method: 'DELETE', originalUrl: '/api/worksheets/Sheet1', user: { role: 'view_only' } },
    { method: 'PUT', originalUrl: '/api/worksheets/Sheet1/merges', user: { role: 'view_only' } }
  ];

  for (const req of mutatingRequests) {
    let continued = false;
    let statusCode = null;
    const response = {
      status(code) { statusCode = code; return this; },
      json() { return this; }
    };
    requireAdminForMutation(req, response, () => { continued = true; });
    assert.equal(continued, false, `Expected ${req.method} ${req.originalUrl} to be blocked`);
    assert.equal(statusCode, 403);
  }
});

test('view-only sessions can access worksheet export and validation operations', () => {
  const readOnlyRequests = [
    { method: 'GET', originalUrl: '/api/worksheets', user: { role: 'view_only' } },
    { method: 'GET', originalUrl: '/api/worksheets/export/download', user: { role: 'view_only' } },
    { method: 'POST', originalUrl: '/api/worksheets/promotional/validate', user: { role: 'view_only' } },
    { method: 'POST', originalUrl: '/api/worksheets/promotional/export', user: { role: 'view_only' } },
    { method: 'POST', originalUrl: '/api/worksheets/import/preview', user: { role: 'view_only' } }
  ];

  for (const req of readOnlyRequests) {
    let continued = false;
    requireAdminForMutation(req, {}, () => { continued = true; });
    assert.equal(continued, true, `Expected ${req.method} ${req.originalUrl} to be allowed`);
  }
});

test('admin sessions can perform worksheet mutations', () => {
  let continued = false;
  requireAdminForMutation(
    { method: 'PUT', originalUrl: '/api/worksheets/Sheet1/cell', user: { role: 'admin' } },
    {},
    () => { continued = true; }
  );
  assert.equal(continued, true);
});
