import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';

const accepted = new Set(['applied', 'duplicate', 'stale']);
const eventFields = [
  'event_id', 'type', 'personnel_uuid', 'revision', 'effective_date', 'movement_id',
  'plan_id', 'office_code', 'dashboard_unit_key', 'designation', 'location',
];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const textFields = { office_code: 80, dashboard_unit_key: 320, designation: 220, location: 220 };

export const paisSpalEnabled = () => process.env.PAIS_SPAL_ENABLED === 'true';

export async function integrationRpc(name, parameters, client = supabaseAdmin) {
  if (!client) throw new Error('PAIS-SPAL requires a server-side Supabase service role.');
  const { data, error } = await client.rpc(name, parameters);
  if (error) throw error;
  return data;
}

function validEvent(event) {
  if (!event || Array.isArray(event) || typeof event !== 'object'
    || Object.keys(event).length !== eventFields.length
    || eventFields.some(field => !Object.hasOwn(event, field))) return false;

  const effective = typeof event.effective_date === 'string' && datePattern.test(event.effective_date)
    ? new Date(event.effective_date + 'T00:00:00Z')
    : null;

  return event.type === 'personnel.assignment_changed.v1'
    && [event.event_id, event.personnel_uuid].every(id => typeof id === 'string' && uuid.test(id))
    && Number.isSafeInteger(event.revision) && event.revision > 0
    && [event.movement_id, event.plan_id].every(id => typeof id === 'string' && /^[1-9]\d{0,19}$/.test(id))
    && effective && Number.isFinite(effective.getTime()) && effective.toISOString().slice(0, 10) === event.effective_date
    && event.effective_date >= '0001-01-01'
    && Object.entries(textFields).every(([key, limit]) =>
      typeof event[key] === 'string' && [...event[key]].length <= limit && !event[key].includes('\0'))
    && Boolean(event.office_code.trim() && event.location.trim());
}

export function receiveAssignment(rpc = integrationRpc) {
  return async (req, res) => {
    if (!paisSpalEnabled()) return res.status(404).json({ error: 'integration_disabled' });
    const token = process.env.PAIS_SPAL_ASSIGNMENT_TOKEN;
    const authorization = Buffer.from(req.get('Authorization') || '');
    const expected = Buffer.from('Bearer ' + (token || ''));
    if (!token || authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (!req.is('application/json')) return res.status(415).json({ error: 'invalid_content_type' });
    if (!validEvent(req.body)) return res.status(400).json({ error: 'invalid_event' });

    try {
      const result = await rpc('pais_spal_apply_assignment', { p_event: req.body });
      return res.status(accepted.has(result.status) ? 200 : 409).json(result);
    } catch (error) {
      // Keep database details and personnel data out of the HTTP response and application logs.
      console.error('PAIS-SPAL assignment write failed:', error.code || error.name);
      return res.status(503).json({ error: 'assignment_write_failed' });
    }
  };
}

export async function deliverRanks(rpc = integrationRpc, send = fetch) {
  const token = process.env.PAIS_SPAL_RANK_TOKEN;
  const url = new URL((process.env.PAIS_SPAL_SPAL_URL || '').replace(/\/+$/, '') + '/api/integration/v1/ranks/');
  if (!token || (url.protocol !== 'https:' && !(
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ))) throw new Error('Configure a SPAL HTTPS base URL and rank token.');

  const pending = await rpc('pais_spal_pending_ranks');
  let delivered = 0;
  for (const event of pending) {
    let success = false;
    try {
      const response = await send(url, {
        method: 'POST',
        redirect: 'error',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(8000),
      });
      success = response.ok && accepted.has((await response.json()).status);
    } catch {
      // The pending event stays durable and can be retried after the peer recovers.
    }
    await rpc('pais_spal_finish_rank', { p_event_id: event.event_id, p_delivered: success });
    if (success) delivered += 1;
  }
  return { delivered, failed: pending.length - delivered };
}

export function startRankDelivery() {
  if (!paisSpalEnabled()) return;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const { failed } = await deliverRanks();
      if (failed) console.warn('PAIS-SPAL rank events pending retry:', failed);
    } catch (error) {
      console.error('PAIS-SPAL rank delivery failed:', error.code || error.name);
    } finally {
      running = false;
    }
  };
  void run();
  setInterval(run, 60_000).unref();
}
