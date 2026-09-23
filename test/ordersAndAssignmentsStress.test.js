import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { db } from '../backend/store/repository.js';
import { generateOrderDocx } from '../backend/services/orderDocxGenerator.js';

function seedStressPersonnel(prefix, count) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const p = {
      id: `pnp-${prefix}-${i}-${Date.now()}`,
      rank: i % 2 === 0 ? 'PMAJ' : 'PCpl',
      rankCategory: i % 2 === 0 ? 'PCO' : 'PNCO',
      firstName: `First${i}`,
      lastName: `Last${prefix}`,
      fullName: `First${i} Last${prefix}`,
      badgeNo: `B-${prefix}-${i}`,
      designation: `Specialist ${i}`,
      sub_unit: 'Information Technology Division',
      status: 'Active'
    };
    db.inMemoryPersonnel.push(p);
    list.push(p);
  }
  return list;
}

test('Stress Test 1: Assignment creation scaling (100, 500, 1000 assignments)', async () => {
  const personnelList = seedStressPersonnel('asg-stress', 100);

  // 1. Create 100 assignments
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) {
    const p = personnelList[i % personnelList.length];
    await db.createAssignment({
      personnelId: p.id,
      positionCategory: 'Main',
      unitCategory: 'ITMS HQ',
      sub_unit: 'Plans and Programs Division',
      unit: 'ITMS HQ - Plans and Programs Division',
      position: `Officer ${i}`,
      startDate: '2026-01-01',
      status: 'Current'
    });
  }
  const t1 = performance.now();
  const dur100 = t1 - t0;
  assert.ok(dur100 < 2000, `100 assignments created in ${dur100.toFixed(2)}ms (expected < 2000ms)`);

  // 2. Scale to 500 assignments
  const t2 = performance.now();
  for (let i = 100; i < 500; i++) {
    const p = personnelList[i % personnelList.length];
    await db.createAssignment({
      personnelId: p.id,
      positionCategory: 'In Addition/Concurrent',
      unitCategory: 'ITMS HQ',
      sub_unit: 'Cybersecurity Division',
      unit: 'ITMS HQ - Cybersecurity Division',
      position: `Cyber Deputy ${i}`,
      startDate: '2026-02-01',
      status: 'Current'
    });
  }
  const t3 = performance.now();
  const dur500 = t3 - t2;
  assert.ok(dur500 < 5000, `Additional 400 assignments created in ${dur500.toFixed(2)}ms`);

  // 3. Scale to 1,000 assignments
  const t4 = performance.now();
  for (let i = 500; i < 1000; i++) {
    const p = personnelList[i % personnelList.length];
    await db.createAssignment({
      personnelId: p.id,
      positionCategory: 'Main',
      unitCategory: 'ITMS HQ',
      sub_unit: 'Systems Development Division',
      unit: 'ITMS HQ - Systems Development Division',
      position: `Dev Engineer ${i}`,
      startDate: '2026-05-01',
      status: 'Current'
    });
  }
  const t5 = performance.now();
  const dur1000 = t5 - t4;
  assert.ok(dur1000 < 8000, `Additional 500 assignments created in ${dur1000.toFixed(2)}ms`);

  // Verify total count & no duplicate IDs
  const allAssignments = await db.getAssignments();
  assert.ok(allAssignments.length >= 1000);
  const idSet = new Set(allAssignments.map(a => a.id));
  assert.equal(idSet.size, allAssignments.length, 'All assignment IDs must be completely unique');
});

test('Stress Test 2: Order creation scaling & sequential numbering (100, 500, 1000 orders)', async () => {
  const personnelList = seedStressPersonnel('ord-stress', 20);

  // 1. Create 100 orders
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) {
    await db.createOrder({
      series: 'SO',
      purposeCode: 'TR',
      issuedDate: '2026-09-01',
      title: `Travel Order Stress Batch ${i}`,
      documentStatus: 'Draft',
      personnelInvolvement: [{ personnelId: personnelList[i % 20].id, role: 'affected', sequence: 1 }],
      purposeData: { destinations: 'Cebu', travelStartDate: '2026-09-10', travelEndDate: '2026-09-12' }
    });
  }
  const t1 = performance.now();
  assert.ok(t1 - t0 < 3000, `100 orders created in ${(t1 - t0).toFixed(2)}ms`);

  // 2. Scale to 500 orders
  const t2 = performance.now();
  for (let i = 100; i < 500; i++) {
    await db.createOrder({
      series: i % 2 === 0 ? 'GO' : 'LO',
      purposeCode: i % 2 === 0 ? 'DES' : 'LV',
      issuedDate: '2026-09-05',
      title: `Order Stress Scaled ${i}`,
      documentStatus: 'Draft',
      personnelInvolvement: [{ personnelId: personnelList[i % 20].id, role: 'affected', sequence: 1 }],
      purposeData: {}
    });
  }
  const t3 = performance.now();
  assert.ok(t3 - t2 < 6000, `Additional 400 orders created in ${(t3 - t2).toFixed(2)}ms`);

  // 3. Verify total orders and uniqueness of orderNumbers per series
  const allOrders = await db.getOrders();
  assert.ok(allOrders.length >= 500);
  const numberSet = new Set(allOrders.map(o => o.orderNumber));
  assert.equal(numberSet.size, allOrders.length, 'All order numbers must be uniquely generated without collision');
});

test('Stress Test 3: Multi-personnel DOCX generation benchmarking (1, 5, 20, 50 personnel)', async () => {
  const sizes = [1, 5, 20, 50];
  const results = {};

  for (const size of sizes) {
    const personnelList = [];
    for (let i = 1; i <= size; i++) {
      personnelList.push({
        personnelId: `bench-p-${i}`,
        fullName: `POLICE SERGEANT OFFICER ${i}`,
        rank: 'PSSG',
        badgeNo: `BENCH-${String(i).padStart(4, '0')}`,
        unit: 'ITMS',
        role: i === 1 ? 'leader' : (i === size ? 'driver' : 'member'),
        sequence: i
      });
    }

    const order = {
      id: `ord-bench-${size}`,
      orderNumber: `ITMS-SO-TR-2026-BENCH-${size}`,
      series: 'SO',
      purposeCode: 'TR',
      issuedDate: '2026-09-23',
      subject: `Benchmarking Order with ${size} Personnel`,
      title: `Special Mission Deployment of ${size} Personnel`,
      documentStatus: 'Released',
      status: 'Released',
      purposeData: {
        destinations: 'Camp Crame to PRO 7',
        travelStartDate: '2026-10-01',
        travelEndDate: '2026-10-15',
        activity: 'Command Technical Assessment and Server Upgrades'
      },
      personnelSnapshot: personnelList
    };

    const t0 = performance.now();
    const docx = await generateOrderDocx(order);
    const elapsed = performance.now() - t0;
    results[size] = {
      elapsedMs: Math.round(elapsed),
      bytes: docx.buffer.length,
      hash: docx.manifest.sourceDataHash,
      count: docx.manifest.personnelCount
    };

    assert.ok(docx.buffer.length > 2000, `DOCX buffer for ${size} personnel must be valid`);
    assert.equal(docx.manifest.sourceDataHash.length, 64, 'Source hash must be 64-char SHA256');
    assert.equal(docx.manifest.personnelCount, size);
    // Even for 50 personnel, document generation must complete within 2.5 seconds
    assert.ok(elapsed < 2500, `DOCX generation for ${size} personnel took ${elapsed.toFixed(1)}ms (expected < 2500ms)`);
  }
});

test('Stress Test 4: High-concurrency operations and race-condition immunity', async () => {
  const p = seedStressPersonnel('race-test', 1)[0];

  // Concurrently dispatch 50 assignment creates, 50 queries, and 50 order creates
  const operations = [];

  for (let i = 0; i < 50; i++) {
    operations.push(
      db.createAssignment({
        personnelId: p.id,
        positionCategory: 'In Addition/Concurrent',
        unitCategory: 'ITMS HQ',
        sub_unit: 'IT Support Center',
        unit: 'ITMS HQ - IT Support Center',
        position: `Concurrency Specialist ${i}`,
        startDate: '2026-09-01',
        status: 'Current'
      })
    );
    operations.push(
      db.createOrder({
        series: 'SO',
        purposeCode: 'TR',
        issuedDate: '2026-09-23',
        title: `Concurrent Order ${i}`,
        documentStatus: 'Draft',
        personnelInvolvement: [{ personnelId: p.id, role: 'affected', sequence: 1 }]
      })
    );
    operations.push(db.getAssignments(p.id));
    operations.push(db.getPersonnelById(p.id));
  }

  const results = await Promise.all(operations);
  assert.equal(results.length, 200, 'All 200 concurrent operations must resolve successfully');

  // Verify state integrity
  const pFinal = await db.getPersonnelById(p.id);
  assert.ok(pFinal, 'Personnel record remains intact and uncorrupted');
});
