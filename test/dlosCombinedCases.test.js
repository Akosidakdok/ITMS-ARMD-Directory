import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCombinedDlosCases } from '../src/utils/dlosCombinedCases.ts';

const cases = Array.from({ length: 130 }, (_, index) => ({
  id: String(index).padStart(3, '0'),
  classification: index % 2 ? 'less_grave' : 'grave',
  docketNumber: String(index).padStart(3, '0'),
  caseDate: '2026-01-15',
  caseStatus: 'For Investigation',
  updatedAt: '2026-01-16T00:00:00Z'
}));

test('All cases merges the two server searches before pagination', async () => {
  const calls = [];
  const fetchPage = async query => {
    calls.push(query.toString());
    const matching = cases.filter(item => item.classification === query.get('classification'));
    const size = Number(query.get('pageSize'));
    const page = Number(query.get('page'));
    return { items: matching.slice((page - 1) * size, page * size), total: matching.length, page, pageSize: size };
  };

  const result = await fetchCombinedDlosCases(new URLSearchParams('year=2026&month=1&page=6&pageSize=10&sort=docketNumber&direction=asc'), fetchPage);
  assert.deepEqual(result.items.map(item => item.docketNumber), Array.from({ length: 10 }, (_, index) => String(index + 50).padStart(3, '0')));
  assert.equal(result.total, 130);
  assert.equal(result.page, 6);
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.includes('year=2026') && call.includes('month=1')));
});

test('All cases keeps the database ID tie break when sort values match', async () => {
  const fetchPage = async query => {
    const matching = cases.filter(item => item.classification === query.get('classification')).toReversed();
    const size = Number(query.get('pageSize'));
    return { items: matching.slice(0, size), total: matching.length, page: 1, pageSize: size };
  };

  const result = await fetchCombinedDlosCases(new URLSearchParams('pageSize=3'), fetchPage);
  assert.deepEqual(result.items.map(item => item.id), ['129', '128', '127']);
});
