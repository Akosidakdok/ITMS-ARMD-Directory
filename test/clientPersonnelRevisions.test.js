import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestRepository } from '../test-support/repository.js';
import { getClientPersonnelCorrections } from '../backend/utils/clientPersonnelCorrections.js';
import { getDivisionStrength, resolveCountedOrganization, isRetired, getPersonnelDesignations } from '../src/utils/personnelStrength.ts';
import { getTemplatePersonnelRows, restoreTemplatePersonnelIds } from '../src/utils/orderTemplatePersonnel.ts';
import { buildOrderTemplateHtml, buildOrderTemplatePdf } from '../src/utils/orderTemplateDocument.ts';
import { filterPersonnel, getPersonnelStrengthSummary } from '../src/utils/personnelCounting.ts';

const person = (id, patch = {}) => ({ id, rank: 'PCPT', firstName: 'TEST', middleName: 'MIDDLE', lastName: id, fullName: `TEST MIDDLE ${id}`, badgeNo: id, designation: 'Officer', status: 'Active', ...patch });
const home = 'Information Technology Program Management Division';
const examples = [
  person('gonzales', { rank: 'NUP', firstName: 'NECILDA', middleName: 'JAVINIAR', lastName: 'GONZALES', sub_unit: home, subUnitCode: 'C0224' }),
  person('ornido', { firstName: 'JAN MICHAEL', middleName: 'PONTILA', lastName: 'ORNIDO', sub_unit: home, subUnitCode: 'C0224' }),
  person('santos', { rank: 'PLTCOL', firstName: 'JAY WALTER', middleName: 'SANTIAGO', lastName: 'SANTOS', sub_unit: home, subUnitCode: 'C0224' }),
  person('santiago', { rank: 'NUP', firstName: 'MOISES REUEL', middleName: 'DE ASIS', lastName: 'SANTIAGO' }),
  person('apalla', { rank: 'Pat', firstName: 'RUEL', middleName: 'AMPIS', lastName: 'APALLA', designation: 'Action PNCO', sub_unit: 'ARMD' })
];

test('client corrections preserve home units, identify each counted unit, and are idempotent', () => {
  const patches = getClientPersonnelCorrections(examples);
  assert.equal(patches.some(p => p.error), false);
  const corrected = examples.map(p => ({ ...p, ...patches.find(c => c.id === p.id).patch }));
  assert.deepEqual(corrected.map(p => resolveCountedOrganization(p).countedUnit), ['DICTM', 'NCRPO', 'FS', 'ARMD', 'ARMD']);
  assert.equal(corrected[0].sub_unit, home);
  assert.deepEqual(corrected[1].dutyAssignments.map(a => a.unit), ['NCRPO', 'SAF', 'EOD/K9']);
  assert.deepEqual(corrected[2].dutyAssignments.map(a => [a.kind, a.unit]), [['Main', 'RICTMD'], ['Additional', 'FS']]);
  assert.equal(corrected[3].station, 'Logistics Section');
  assert.equal(corrected[3].dutyAssignments[0].kind, 'Technical assistance');
  assert.equal(getPersonnelDesignations(corrected[4]), 'Action PNCO / PAIS Encoder / Focal Person / OJT Coordinator / Alternate Secretary');
  assert.ok(getClientPersonnelCorrections(corrected).every(c => Object.keys(c.patch).length === 0));
  const strength = getDivisionStrength(corrected);
  assert.equal(strength.total, 5);
  assert.equal(strength.groups.reduce((n, group) => n + group.total, 0), 5);
  assert.equal(strength.rows.filter(row => row.group === 'ITPMD Detailed').reduce((n, row) => n + row.total, 0), 3);
});

test('missing or ambiguous client identities cannot be silently corrected', () => {
  assert.ok(getClientPersonnelCorrections([]).every(c => c.error));
  assert.ok(getClientPersonnelCorrections([...examples, { ...examples[0], id: 'duplicate' }])[0].error);
  const changed = examples.map(p => p.id === 'ornido' ? { ...p, countedUnit: 'NEWER UNIT' } : p);
  assert.equal(getClientPersonnelCorrections(changed)[1].patch.countedUnit, undefined);
});

test('retired personnel remain stored while current strength excludes them and due retirement stays included', async () => {
  const db = createTestRepository();
  const record = await db.createPersonnel(person('retirement', { sub_unit: 'ARMD' }));
  await db.updatePersonnel(record.id, { status: 'Retired' });
  const stored = await db.getPersonnelById(record.id);
  assert.equal(stored.status, 'Retired');
  const roster = [stored, person('due', { status: 'DUTY/DUE RET' })];
  assert.equal(isRetired(roster[1]), false);
  assert.equal(getDivisionStrength(roster, 'current').total, 1);
  assert.equal(getDivisionStrength(roster, 'all').total, 2);
  assert.equal(getDivisionStrength(roster, 'retired').total, 1);
  db.inMemoryPersonnel.push(roster[1]);
  const stats = await db.getDispositionStats();
  assert.equal(stats.total, 1);
  assert.equal(stats.byUnit['Needs assignment'], 1);
  assert.equal((await db.getDispositionStats('ALL')).total, 2);
});

test('division totals reconcile with rank totals, missing assignments, retired scope, and duplicate references', () => {
  const roster = [person('a', { sub_unit: 'ARMD', station: 'Personnel Holding & Accounting Sec' }), person('b', { rank: 'NUP' }), person('c', { rank: 'Pat', subUnitCode: 'C0222', sub_unit: 'System Management Division' }), person('d', { subUnitCode: 'C025', sub_unit: 'Systems Management Division' }), person('unknown', { subUnitCode: 'B178', sub_unit: 'Systems Management and Infostructure Division' }), person('retired', { status: 'Retired' })];
  for (const scope of ['current', 'all', 'retired']) {
    const strength = getDivisionStrength([...roster, roster[0]], scope);
    assert.equal(strength.groups.reduce((n, row) => n + row.total, 0), strength.total);
    assert.equal(strength.rows.reduce((n, row) => n + row.total, 0), strength.total);
    for (const row of strength.rows) assert.equal(row.total, row.pcoCount + row.pncoCount + row.nupCount);
  }
  const strength = getDivisionStrength(roster);
  assert.equal(strength.groups.find(g => g.group === 'SMD').total, 2);
  assert.equal(strength.groups.find(g => g.group === 'Needs assignment').total, 1);
  assert.equal(strength.groups.find(g => g.group === 'Other units / Needs mapping').total, 1);
  assert.equal(strength.groups.find(g => g.group === 'ARMD, PHAS').total, 1);
  assert.equal(getDivisionStrength(roster, 'current', { rankCategory: 'NUP' }).total, 1);
});

test('counted-unit filters and charts normalize source codes and explicit overrides consistently', () => {
  const roster = [person('home', { sub_unit: 'Administrative and Resource Management Division', subUnitCode: 'C0216' }), person('override', { sub_unit: 'ITPMD', countedUnit: 'ARMD' }), person('external', { sub_unit: 'ITPMD', countedUnit: 'NCRPO' })];
  assert.equal(getPersonnelStrengthSummary(roster).bySubUnit.ARMD, 2);
  assert.equal(filterPersonnel(roster, { sub_unit: 'ARMD' }).length, 2);
  assert.equal(getDivisionStrength(roster, 'current', { sub_unit: 'ARMD' }).total, 2);
  assert.equal(filterPersonnel(roster, { sub_unit: 'NCRPO' }).length, 1);
});

test('duty data survives API repository roundtrips and assignment updates; invalid duty payloads are rejected', async () => {
  const db = createTestRepository();
  const created = await db.createPersonnel(person('duties', { countedUnit: ' NCRPO ', dutyAssignments: [{ kind: 'Detail', unit: 'NCRPO' }, { kind: 'Detail', unit: 'SAF' }], additionalDesignations: ['Encoder', 'Encoder'] }));
  assert.equal(created.countedUnit, 'NCRPO');
  assert.deepEqual(created.additionalDesignations, ['Encoder']);
  const payload = db.toSupabasePersonnelPayload(created);
  assert.equal(payload.dutyAssignments.length, 2);
  assert.equal(payload.countedUnit, 'NCRPO');
  await db.updatePersonnel(created.id, { sub_unit: 'ITPMD', designation: 'New duty' });
  const updated = await db.getPersonnelById(created.id);
  assert.equal(updated.countedUnit, 'NCRPO');
  assert.equal(updated.dutyAssignments.length, 2);
  assert.equal((await db.getDispositionStats()).byUnit.NCRPO, 1);
  await db.updatePersonnel(created.id, { countedUnit: '', additionalDesignations: [], dutyAssignments: [] });
  assert.equal((await db.getPersonnelById(created.id)).countedUnit, '');
  await assert.rejects(db.updatePersonnel(created.id, { dutyAssignments: [{ kind: 'Unknown', unit: 'X' }] }), /valid kind/);
  await assert.rejects(db.updatePersonnel(created.id, { dutyAssignments: [{ kind: 'Main', unit: 'A' }, { kind: 'Main', unit: 'B' }] }), /one duty assignment/);
  await assert.rejects(db.updatePersonnel(created.id, { additionalDesignations: 'Not a list' }), /list of titles/);
});

test('multi-person template rows retain selection order and every badge, unit, and designation', () => {
  const roster = Array.from({ length: 100 }, (_, i) => person(`person-${i}`, { sub_unit: 'ARMD', additionalDesignations: ['Encoder'] }));
  const ids = roster.map(p => p.id).reverse();
  const rows = getTemplatePersonnelRows(roster, [...ids, ids[0]]);
  assert.equal(rows.length, 100);
  assert.deepEqual(rows.map(row => row.id), ids);
  assert.equal(rows[99].badgeNo, 'person-0');
  assert.equal(rows[99].unit, 'ARMD');
  assert.equal(rows[99].designation, 'Officer / Encoder');
  assert.ok(rows[0].name.includes('MIDDLE'));
  assert.match(getTemplatePersonnelRows(roster, ['missing'])[0].name, /no longer in roster/);
  assert.deepEqual(restoreTemplatePersonnelIds({ personnelId: 'legacy-person' }), ['legacy-person']);
  assert.deepEqual(restoreTemplatePersonnelIds({ personnelId: 'old', personnelIds: ['a', 'b', 'a', null] }), ['a', 'b']);
  assert.deepEqual(restoreTemplatePersonnelIds({ personnelIds: [] }), []);
});

test('the actual template exporters retain a large selection, escape HTML, and paginate PDF in memory', async () => {
  const roster = Array.from({ length: 123 }, (_, i) => person(`P${i}`, { sub_unit: 'ARMD', additionalDesignations: ['Encoder'] }));
  const document = {
    orderNumber: 'ITMS-SO-DES-2026-####', series: 'SO', purposeLabel: 'Designation', status: 'Draft',
    fields: { date: '2026-11-26', personnelName: '', badgeNo: '', unit: '', designation: '', subject: 'Shared assignment', description: 'Shared unit and date. '.repeat(300), signatory: 'TEST SIGNATORY', signatoryTitle: 'Director' },
    personnel: getTemplatePersonnelRows(roster, roster.map(p => p.id))
  };
  const html = buildOrderTemplateHtml(document);
  for (const row of document.personnel) assert.ok(html.includes(`<td>${row.badgeNo}</td>`));
  assert.ok(html.includes('Officer / Encoder'));
  const escaped = buildOrderTemplateHtml({ ...document, fields: { ...document.fields, subject: '<script>alert(1)</script>' } });
  assert.ok(!escaped.includes('<script>'));
  assert.ok(escaped.includes('&lt;script&gt;'));
  const pdf = await buildOrderTemplatePdf(document);
  assert.ok(pdf.getNumberOfPages() > 2);
  const output = pdf.output();
  assert.ok(output.startsWith('%PDF'));
  for (const row of document.personnel) assert.ok(output.includes(`(${row.badgeNo})`), `Missing PDF badge ${row.badgeNo}`);
  assert.ok(output.includes('(TEST SIGNATORY)'));
  assert.ok(output.includes('(Director)'));
});
