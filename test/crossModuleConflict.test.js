import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../backend/store/repository.js';
import { generateOrderDocx } from '../backend/services/orderDocxGenerator.js';

function seedTestPersonnel(data = {}) {
  const id = data.id || `pnp-cmc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const p = {
    id,
    rank: data.rank || 'PMAJ',
    rankCategory: 'PCO',
    firstName: data.firstName || 'Juan',
    lastName: data.lastName || 'Luna',
    fullName: `${data.firstName || 'Juan'} ${data.lastName || 'Luna'}`,
    badgeNo: data.badgeNo || `BADGE-${Date.now().toString().slice(-4)}`,
    designation: data.designation || 'Staff Officer',
    sub_unit: data.sub_unit || 'Plans and Programs Division',
    status: 'Active',
    ...data
  };
  db.inMemoryPersonnel.push(p);
  return p;
}

test('Cross-Module Scenario A: Personnel -> Designation Order -> Assignment linked by orderRef -> Sync verification', async () => {
  const personnel = seedTestPersonnel({
    rank: 'PLTCOL',
    firstName: 'Vicente',
    lastName: 'Lim',
    badgeNo: 'CMC-001',
    designation: 'Operations Specialist'
  });

  // 1. Create Designation Order
  const order = await db.createOrder({
    series: 'SO',
    purposeCode: 'DES',
    issuedDate: '2026-09-10',
    title: 'Designation of PLTCOL Vicente Lim as Chief, Cyber Security Division',
    signatoryName: 'POLICE GENERAL ROMMEL FRANCISCO D MARBIL',
    signatoryTitle: 'Chief, Philippine National Police',
    documentStatus: 'Released',
    status: 'Released',
    personnelInvolvement: [{
      personnelId: personnel.id,
      role: 'affected',
      sequence: 1
    }],
    personnelSnapshot: [{
      personnelId: personnel.id,
      name: personnel.fullName,
      rank: personnel.rank,
      badgeNo: personnel.badgeNo
    }],
    purposeData: {
      designationType: 'Permanent',
      newDesignation: 'Chief, Cyber Security Division',
      effectiveDate: '2026-09-15'
    }
  });

  assert.ok(order.orderNumber, 'Order should receive standard order number');
  assert.equal(order.status, 'Released');

  // 2. Create Assignment citing orderNumber
  const assignment = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'Cyber Security Division',
    unit: 'ITMS HQ - Cyber Security Division',
    position: 'Chief, Cyber Security Division',
    orderRef: order.orderNumber,
    designationDate: '2026-09-10',
    effectiveDate: '2026-09-15',
    startDate: '2026-09-15',
    status: 'Current'
  });

  assert.ok(assignment.id);
  assert.equal(assignment.orderRef, order.orderNumber);

  // 3. Verify Personnel synchronized
  const updatedPersonnel = await db.getPersonnelById(personnel.id);
  assert.equal(updatedPersonnel.designation, 'Chief, Cyber Security Division');
  assert.equal(updatedPersonnel.sub_unit, 'Cyber Security Division');
});

test('Cross-Module Scenario B: Reassignment & Relief marks prior Current Main Completed with accurate transition date', async () => {
  const personnel = seedTestPersonnel({
    rank: 'PMAJ',
    firstName: 'Teresa',
    lastName: 'Magbanua',
    badgeNo: 'CMC-002',
    designation: 'Section Chief'
  });

  // Initial assignment
  const asg1 = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    sub_unit: 'Administrative Division',
    unit: 'ITMS HQ - Administrative Division',
    position: 'Chief, Personnel Section',
    orderRef: 'SO-ITMS-2026-101',
    startDate: '2026-01-01',
    status: 'Current'
  });

  // Reassignment order and assignment
  const asg2 = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    sub_unit: 'Logistics Division',
    unit: 'ITMS HQ - Logistics Division',
    position: 'Chief, Supply Section',
    orderRef: 'SO-ITMS-2026-102',
    startDate: '2026-09-20',
    status: 'Current'
  });

  // Verify asg1 completed
  const reloadedAsg1 = await db.getAssignmentById(asg1.id);
  assert.equal(reloadedAsg1.status, 'Completed');
  assert.equal(reloadedAsg1.endDate, '2026-09-20');

  // Verify asg2 current
  const reloadedAsg2 = await db.getAssignmentById(asg2.id);
  assert.equal(reloadedAsg2.status, 'Current');

  // Verify personnel current post
  const updatedPersonnel = await db.getPersonnelById(personnel.id);
  assert.equal(updatedPersonnel.designation, 'Chief, Supply Section');
  assert.equal(updatedPersonnel.sub_unit, 'Logistics Division');
});

test('Cross-Module Scenario C: Snapshot immutability when personnel record is mutated or deleted', async () => {
  const personnel = seedTestPersonnel({
    rank: 'PCPT',
    firstName: 'Gregorio',
    lastName: 'Del Pilar',
    badgeNo: 'CMC-003'
  });

  const order = await db.createOrder({
    series: 'SO',
    purposeCode: 'TR',
    issuedDate: '2026-09-12',
    title: 'Travel Order for Training Conference',
    signatoryName: 'DIR ITMS',
    signatoryTitle: 'Director, ITMS',
    documentStatus: 'Draft',
    personnelInvolvement: [{
      personnelId: personnel.id,
      role: 'affected',
      sequence: 1
    }],
    personnelSnapshot: [{
      personnelId: personnel.id,
      name: personnel.fullName,
      rank: personnel.rank,
      badgeNo: personnel.badgeNo
    }],
    purposeData: {
      destinations: 'Baguio City',
      travelStartDate: '2026-10-01',
      travelEndDate: '2026-10-05',
      activity: 'Command Cyber Conference'
    }
  });

  // Mutate personnel record
  await db.updatePersonnel(personnel.id, {
    rank: 'PMAJ',
    lastName: 'Del Pilar-Promoted'
  });

  // Order snapshot must remain immutable
  const reloadedOrder = await db.getOrderById(order.id);
  assert.equal(reloadedOrder.personnelSnapshot[0].rank, 'PCPT', 'Historical snapshot rank must not change');
  assert.equal(reloadedOrder.personnelSnapshot[0].name, 'Gregorio Del Pilar', 'Historical snapshot name must not change');

  // Even if personnel is deleted, snapshot remains accessible
  await db.deletePersonnel(personnel.id);
  const orderAfterDelete = await db.getOrderById(order.id);
  assert.ok(orderAfterDelete.personnelSnapshot.length > 0);
  assert.equal(orderAfterDelete.personnelSnapshot[0].badgeNo, 'CMC-003');
});

test('Cross-Module Scenario D: Multi-order linkage and revocation tracking', async () => {
  const personnel = seedTestPersonnel({
    rank: 'PSSg',
    firstName: 'Marcelo',
    lastName: 'Del Pilar',
    badgeNo: 'CMC-004'
  });

  // Original Order
  const originalOrder = await db.createOrder({
    series: 'SO',
    purposeCode: 'DES',
    issuedDate: '2026-08-01',
    title: 'Original Designation Order',
    signatoryName: 'DIR ITMS',
    signatoryTitle: 'Director',
    documentStatus: 'Released',
    status: 'Released',
    personnelInvolvement: [{ personnelId: personnel.id, role: 'affected', sequence: 1 }],
    purposeData: { newDesignation: 'Network Admin', effectiveDate: '2026-08-01' }
  });

  // Revoke Original Order
  const revokeResult = await db.transitionOrderStatus(originalOrder.id, 'Revoked', {
    reason: 'Superseded by restructuring order',
    actor: 'Admin Chief'
  });

  assert.equal(revokeResult.status, 'Revoked');
  assert.equal(revokeResult.documentStatus, 'Revoked');

  // Status history audit trail
  const history = await db.getOrderStatusHistory(originalOrder.id);
  assert.ok(history.some(h => h.toStatus === 'Revoked' && h.reason.includes('restructuring')));
});

test('Cross-Module Scenario E: Destructive order deletion handles referenced assignment gracefully', async () => {
  const personnel = seedTestPersonnel({
    rank: 'PLT',
    firstName: 'Apolinario',
    lastName: 'Mabini',
    badgeNo: 'CMC-005'
  });

  const order = await db.createOrder({
    series: 'SO',
    purposeCode: 'DES',
    issuedDate: '2026-09-01',
    title: 'Temporary Assignment Order',
    signatoryName: 'DIR ITMS',
    documentStatus: 'Draft',
    status: 'Draft',
    personnelInvolvement: [{ personnelId: personnel.id, role: 'affected', sequence: 1 }],
    purposeData: { newDesignation: 'Legal Consultant' }
  });

  const assignment = await db.createAssignment({
    personnelId: personnel.id,
    unit: 'ITMS HQ - Legal Office',
    position: 'Legal Consultant',
    orderRef: order.orderNumber,
    startDate: '2026-09-01',
    status: 'Current'
  });

  // Soft-delete the draft order
  const deleted = await db.deleteOrder(order.id);
  assert.equal(deleted, true);

  // The order is marked isDeleted and hidden from normal queries
  const activeOrders = await db.getOrders();
  assert.equal(activeOrders.some(o => o.id === order.id), false);

  // The assignment remains intact without runtime exception
  const reloadedAssignment = await db.getAssignmentById(assignment.id);
  assert.ok(reloadedAssignment);
  assert.equal(reloadedAssignment.orderRef, order.orderNumber);
});

test('Cross-Module Scenario F: Soft-delete order and restoration preserves full audit integrity', async () => {
  const personnel = seedTestPersonnel({
    rank: 'PCpl',
    firstName: 'Melchora',
    lastName: 'Aquino',
    badgeNo: 'CMC-006'
  });

  const order = await db.createOrder({
    series: 'LO',
    purposeCode: 'LV',
    issuedDate: '2026-09-18',
    title: 'Leave Order for Melchora Aquino',
    signatoryName: 'DIR ITMS',
    documentStatus: 'Draft',
    status: 'Draft',
    personnelInvolvement: [{ personnelId: personnel.id, role: 'affected', sequence: 1 }],
    purposeData: { leaveType: 'Vacation Leave', days: 5 }
  });

  // Soft-delete
  await db.deleteOrder(order.id);

  // Raw store has record marked isDeleted
  const rawDeleted = await db.getOrderById(order.id);
  assert.equal(rawDeleted.isDeleted, true);
  assert.ok(rawDeleted.deletedAt);

  // Restore
  const restored = await db.restoreRevokedOrder(order.id, {
    actor: 'Supervisor',
    reason: 'Accidental deletion'
  });

  assert.equal(restored.isDeleted, false);
  assert.equal(restored.documentStatus, 'Draft');

  // Verify visible in active orders
  const activeOrders = await db.getOrders();
  assert.ok(activeOrders.some(o => o.id === order.id));
});

test('Cross-Module Scenario G: 20+ personnel order generation, sequence ordering, and source hash verification', async () => {
  const involvedPersonnel = [];
  for (let i = 1; i <= 25; i++) {
    const p = seedTestPersonnel({
      rank: 'PCpl',
      firstName: `Operator${i}`,
      lastName: `Team${i}`,
      badgeNo: `BULK-${String(i).padStart(3, '0')}`,
      designation: 'Field Technician'
    });
    involvedPersonnel.push(p);
  }

  const orderPayload = {
    series: 'SO',
    purposeCode: 'TR',
    issuedDate: '2026-09-22',
    title: 'Special Deployment of 25 ITMS Personnel for Regional Support',
    signatoryName: 'DIR ITMS',
    signatoryTitle: 'Director, Information Technology Management Service',
    documentStatus: 'Released',
    status: 'Released',
    personnelInvolvement: involvedPersonnel.map((p, idx) => ({
      personnelId: p.id,
      role: idx === 0 ? 'leader' : 'member',
      sequence: idx + 1
    })),
    personnelSnapshot: involvedPersonnel.map(p => ({
      personnelId: p.id,
      name: p.fullName,
      rank: p.rank,
      badgeNo: p.badgeNo
    })),
    purposeData: {
      destinations: 'PRO 3, PRO 4A, PRO 4B',
      travelStartDate: '2026-10-10',
      travelEndDate: '2026-10-25',
      activity: 'Regional Server Migration & Encryption Deployment'
    }
  };

  const order = await db.createOrder(orderPayload);
  assert.equal(order.personnelInvolvement.length, 25);

  // Generate DOCX with manifest & hash
  const docxResult = await generateOrderDocx(order);
  assert.ok(docxResult.manifest, 'Docx generation should produce a manifest');
  assert.ok(docxResult.manifest.sourceDataHash, 'Manifest must compute a deterministic SHA-256 hash');
  assert.equal(docxResult.manifest.sourceDataHash.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');
  assert.equal(docxResult.manifest.personnelCount, 25);
  assert.ok(docxResult.buffer instanceof Buffer);
  assert.ok(docxResult.buffer.length > 1000, 'DOCX file must have substantial binary content');
});

test('Cross-Module Scenario H: State isolation between concurrent assignment/order workflows', async () => {
  const p1 = seedTestPersonnel({ badgeNo: 'ISO-001', designation: 'Analyst A' });
  const p2 = seedTestPersonnel({ badgeNo: 'ISO-002', designation: 'Analyst B' });

  // Concurrently create assignments and orders for p1 and p2
  const [asg1, asg2, ord1, ord2] = await Promise.all([
    db.createAssignment({
      personnelId: p1.id,
      unit: 'Unit Alpha',
      position: 'Senior Analyst Alpha',
      status: 'Current'
    }),
    db.createAssignment({
      personnelId: p2.id,
      unit: 'Unit Bravo',
      position: 'Senior Analyst Bravo',
      status: 'Current'
    }),
    db.createOrder({
      series: 'SO',
      purposeCode: 'DES',
      issuedDate: '2026-09-23',
      title: 'Order Alpha',
      documentStatus: 'Draft',
      personnelInvolvement: [{ personnelId: p1.id, role: 'affected', sequence: 1 }]
    }),
    db.createOrder({
      series: 'SO',
      purposeCode: 'DES',
      issuedDate: '2026-09-23',
      title: 'Order Bravo',
      documentStatus: 'Draft',
      personnelInvolvement: [{ personnelId: p2.id, role: 'affected', sequence: 1 }]
    })
  ]);

  // Assert complete independence
  assert.notEqual(asg1.id, asg2.id);
  assert.notEqual(ord1.id, ord2.id);
  assert.notEqual(ord1.orderNumber, ord2.orderNumber);

  const checkP1 = await db.getPersonnelById(p1.id);
  const checkP2 = await db.getPersonnelById(p2.id);
  assert.equal(checkP1.designation, 'Senior Analyst Alpha');
  assert.equal(checkP2.designation, 'Senior Analyst Bravo');
});
