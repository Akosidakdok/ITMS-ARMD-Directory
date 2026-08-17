import assert from 'node:assert/strict';
import test from 'node:test';

process.env.AUTH_ADMIN_EMAILS = 'cjbaldonado11@gmail.com';

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
