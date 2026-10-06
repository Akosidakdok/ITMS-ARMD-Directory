import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { extractOrderSequence } from '../backend/utils/orderNumber.js';

const enabled = process.env.PAIS_RUN_ORDER_DB_INTEGRATION === 'true';
const explicitlySelected = process.env.npm_lifecycle_event === 'test:order-db';

test('Supabase issues concurrent order numbers atomically', { skip: !enabled && !explicitlySelected }, async () => {
  assert.equal(enabled, true, 'Set PAIS_RUN_ORDER_DB_INTEGRATION=true to run against a dedicated test project.');
  const url = process.env.PAIS_TEST_SUPABASE_URL;
  const serviceRoleKey = process.env.PAIS_TEST_SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url && serviceRoleKey, 'Set dedicated PAIS_TEST_SUPABASE_URL and PAIS_TEST_SUPABASE_SERVICE_ROLE_KEY values.');

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const year = 2999;
  const series = 'GO';
  const ids = Array.from({ length: 12 }, () => randomUUID());
  const { data: counter, error: counterError } = await supabase
    .from('order_sequences')
    .select('last_number')
    .eq('year', year)
    .eq('series', series)
    .maybeSingle();
  if (counterError) throw new Error(`Could not read the isolated test sequence: ${counterError.message}`);
  const startingSequence = Number(counter?.last_number || 0);

  try {
    const results = await Promise.allSettled(ids.map(async (id, index) => {
      const { data, error } = await supabase.rpc('issue_itms_order', {
        p_order: {
          id,
          series,
          purposeCode: 'DES',
          orderType: 'GO — Designation',
          subject: `Numbering integration check ${id}`,
          issuedDate: `${year}-12-31`,
          personnelIds: [],
          status: 'Draft',
          documentStatus: 'Draft',
          affectedPersonnelCount: 1,
          description: `Integration request ${index + 1}`
        }
      });
      if (error) throw new Error(`Official issuance RPC failed: ${error.message}`);
      return Array.isArray(data) ? data[0] : data;
    }));
    const failedResult = results.find(result => result.status === 'rejected');
    if (failedResult?.status === 'rejected') throw failedResult.reason;
    const orders = results.map(result => result.status === 'fulfilled' ? result.value : null);

    const parsed = orders.map(order => extractOrderSequence(order?.orderNumber));
    assert.ok(parsed.every(Boolean), 'Every returned order must have the full official number format.');
    assert.ok(parsed.every(order => order.series === series && order.year === year));
    const sequences = parsed.map(order => order.sequence).sort((a, b) => a - b);
    assert.deepEqual(
      sequences,
      Array.from({ length: ids.length }, (_, index) => startingSequence + index + 1),
      'Concurrent issuance should allocate each sequence exactly once without gaps.'
    );
  } finally {
    const { error } = await supabase.from('orders').delete().in('id', ids);
    if (error) throw new Error(`Integration orders could not be cleaned up: ${error.message}`);
  }
});
