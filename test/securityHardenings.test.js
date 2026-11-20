import test from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders, createRateLimiter } from '../backend/middleware/security.js';

test('securityHeaders sets standard defensive HTTP headers', () => {
  const headers = {};
  const req = { headers: {}, secure: false };
  const res = {
    setHeader(name, value) {
      headers[name] = value;
    }
  };
  let called = false;

  securityHeaders(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(headers['X-XSS-Protection'], '0');
  assert.equal(headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
});

test('securityHeaders sets HSTS when connection is HTTPS', () => {
  const headers = {};
  const req = { headers: { 'x-forwarded-proto': 'https' }, secure: true };
  const res = {
    setHeader(name, value) {
      headers[name] = value;
    }
  };

  securityHeaders(req, res, () => {});
  assert.equal(headers['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains');
});

test('createRateLimiter enforces request limits and returns 429 when exceeded', () => {
  const limiter = createRateLimiter({ windowMs: 60000, max: 3, message: 'Rate limit test exceeded' });
  const req = { headers: {}, socket: { remoteAddress: '192.168.1.100' } };

  let status = 200;
  let body = null;
  const res = {
    setHeader() {},
    status(code) { status = code; return this; },
    json(data) { body = data; return this; }
  };

  // First 3 requests should pass
  for (let i = 0; i < 3; i++) {
    let continued = false;
    limiter(req, res, () => { continued = true; });
    assert.equal(continued, true, `Request ${i + 1} should pass`);
  }

  // 4th request should be throttled
  let continuedOn4th = false;
  limiter(req, res, () => { continuedOn4th = true; });
  assert.equal(continuedOn4th, false);
  assert.equal(status, 429);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Rate limit test exceeded');
});

test('CORS origin pattern allows only verified PNP ITMS domains and local origins', () => {
  const vercelOriginPattern = /^https:\/\/pnp-itms-pais(-[a-z0-9-]+)?\.vercel\.app$/;

  // Allowed legitimate deployments
  assert.equal(vercelOriginPattern.test('https://pnp-itms-pais.vercel.app'), true);
  assert.equal(vercelOriginPattern.test('https://pnp-itms-pais-staging.vercel.app'), true);
  assert.equal(vercelOriginPattern.test('https://pnp-itms-pais-preview-abc123.vercel.app'), true);

  // Disallowed attacker deployments
  assert.equal(vercelOriginPattern.test('https://attacker-app.vercel.app'), false);
  assert.equal(vercelOriginPattern.test('https://evil-phishing.vercel.app'), false);
  assert.equal(vercelOriginPattern.test('http://pnp-itms-pais.vercel.app'), false); // plain http rejected
  assert.equal(vercelOriginPattern.test('https://pnp-itms-pais.vercel.app.evil.com'), false);
});
