import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../backend/store/repository.js';

function seedPersonnel(data = {}) {
  const id = data.id || `pnp-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const p = {
    id,
    rank: data.rank || 'PLTCOL',
    firstName: data.firstName || 'Juan',
    lastName: data.lastName || 'Dela Cruz',
    fullName: `${data.firstName || 'Juan'} ${data.lastName || 'Dela Cruz'}`,
    badgeNo: data.badgeNo || 'TEST-001',
    designation: data.designation || 'Staff Officer',
    status: 'Active',
    ...data
  };
  db.inMemoryPersonnel.push(p);
  return p;
}

test('Assignment Module: Create assignment persists correctly with all relational keys', async () => {
  const personnel = seedPersonnel({
    rank: 'PLTCOL',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    badgeNo: 'TEST-001',
    designation: 'Staff Officer'
  });

  const assignment = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'Plans and Programs Division',
    station: 'Station 1',
    details: 'IT Policy Desk',
    region: 'Luzon',
    unit: 'ITMS HQ - Plans and Programs Division',
    position: 'Chief, Policy Section',
    orderRef: 'SO-ITMS-2026-001',
    designationDate: '2026-09-01',
    effectiveDate: '2026-09-05',
    startDate: '2026-09-05',
    status: 'Current'
  });

  assert.ok(assignment.id, 'Assignment should have an id');
  assert.equal(assignment.personnelId, personnel.id);
  assert.equal(assignment.sub_unit, 'Plans and Programs Division');
  assert.equal(assignment.station, 'Station 1');
  assert.equal(assignment.positionCategory, 'Main');
  assert.equal(assignment.status, 'Current');

  // Verify personnel synchronization
  const updatedPersonnel = await db.getPersonnelById(personnel.id);
  assert.equal(updatedPersonnel.designation, 'Chief, Policy Section', 'Personnel designation should match assignment position');
  assert.equal(updatedPersonnel.sub_unit, 'Plans and Programs Division', 'Personnel sub_unit should match assignment');
  assert.equal(updatedPersonnel.station, 'Station 1', 'Personnel station should match assignment');
  assert.equal(updatedPersonnel.details, 'IT Policy Desk', 'Personnel details should match assignment');
});

test('Assignment Module: Marking an assignment as Current automatically completes prior Current Main records', async () => {
  const personnel = seedPersonnel({
    rank: 'PMAJ',
    firstName: 'Maria',
    lastName: 'Santos',
    badgeNo: 'TEST-002',
    designation: 'Action Officer'
  });

  // First Current assignment
  const asg1 = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'Systems Development Division',
    unit: 'ITMS HQ - Systems Development Division',
    position: 'Lead Developer',
    orderRef: 'SO-ITMS-2026-010',
    startDate: '2026-01-15',
    status: 'Current'
  });

  assert.equal(asg1.status, 'Current');

  // Second Current Main assignment for same personnel
  const asg2 = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    sub_unit: 'Network and Communications Division',
    unit: 'ITMS HQ - Network and Communications Division',
    position: 'Network Operations Chief',
    orderRef: 'SO-ITMS-2026-020',
    startDate: '2026-09-01',
    status: 'Current'
  });

  assert.equal(asg2.status, 'Current');

  // Verify asg1 was transitioned to Completed
  const reloadedAsg1 = await db.getAssignmentById(asg1.id);
  assert.equal(reloadedAsg1.status, 'Completed', 'Prior Current Main assignment should be marked Completed');
  assert.equal(reloadedAsg1.endDate, '2026-09-01', 'Prior assignment endDate should be set to new assignment startDate');

  // Verify personnel was updated to asg2
  const updatedPersonnel = await db.getPersonnelById(personnel.id);
  assert.equal(updatedPersonnel.designation, 'Network Operations Chief');
  assert.equal(updatedPersonnel.sub_unit, 'Network and Communications Division');
});

test('Assignment Module: In Addition / Concurrent assignments do NOT complete existing Current Main assignments', async () => {
  const personnel = seedPersonnel({
    rank: 'PCPT',
    firstName: 'Antonio',
    lastName: 'Luna',
    badgeNo: 'TEST-003',
    designation: 'Security Officer'
  });

  const mainAsg = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    sub_unit: 'Cybersecurity Division',
    unit: 'ITMS HQ - Cybersecurity Division',
    position: 'Cyber Defense Officer',
    orderRef: 'SO-ITMS-2026-030',
    startDate: '2026-02-01',
    status: 'Current'
  });

  const concurrentAsg = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'In Addition/Concurrent',
    unitCategory: 'ITMS HQ',
    sub_unit: 'Information Technology Division',
    unit: 'ITMS HQ - Information Technology Division',
    position: 'Special Investigator',
    orderRef: 'SO-ITMS-2026-031',
    startDate: '2026-05-01',
    status: 'Current'
  });

  const reloadedMain = await db.getAssignmentById(mainAsg.id);
  assert.equal(reloadedMain.status, 'Current', 'Main assignment should remain Current when concurrent assignment is created');
  assert.equal(concurrentAsg.status, 'Current');
});

test('Assignment Module: Editing an assignment updates targeted record without corrupting historical timeline', async () => {
  const personnel = seedPersonnel({
    rank: 'PLT',
    firstName: 'Jose',
    lastName: 'Rizal',
    badgeNo: 'TEST-004',
    designation: 'Admin Officer'
  });

  const asg = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    sub_unit: 'Administrative Division',
    unit: 'ITMS HQ - Administrative Division',
    position: 'Records Officer',
    orderRef: 'SO-ITMS-2026-040',
    startDate: '2026-03-01',
    status: 'Current'
  });

  const updated = await db.updateAssignment(asg.id, {
    position: 'Chief Records Officer',
    details: 'Digital Archives Section'
  });

  assert.equal(updated.position, 'Chief Records Officer');
  assert.equal(updated.details, 'Digital Archives Section');

  const reloadedPersonnel = await db.getPersonnelById(personnel.id);
  assert.equal(reloadedPersonnel.designation, 'Chief Records Officer');
  assert.equal(reloadedPersonnel.details, 'Digital Archives Section');
});

test('Assignment Module: Deleting an assignment preserves personnel profile stability and falls back safely', async () => {
  const personnel = seedPersonnel({
    rank: 'Pat',
    firstName: 'Emilio',
    lastName: 'Aguinaldo',
    badgeNo: 'TEST-005',
    designation: 'Patrol Officer'
  });

  const asg1 = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    sub_unit: 'Data Center',
    unit: 'ITMS HQ - Data Center',
    position: 'Server Custodian',
    orderRef: 'SO-ITMS-2026-050',
    startDate: '2026-01-01',
    endDate: '2026-06-01',
    status: 'Completed'
  });

  const asg2 = await db.createAssignment({
    personnelId: personnel.id,
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    sub_unit: 'IT Support Center',
    unit: 'ITMS HQ - IT Support Center',
    position: 'Helpdesk Specialist',
    orderRef: 'SO-ITMS-2026-055',
    startDate: '2026-06-02',
    status: 'Current'
  });

  let p = await db.getPersonnelById(personnel.id);
  assert.equal(p.designation, 'Helpdesk Specialist');

  const deleted = await db.deleteAssignment(asg2.id);
  assert.equal(deleted, true);

  p = await db.getPersonnelById(personnel.id);
  assert.equal(p.designation, 'Server Custodian');
  assert.equal(p.sub_unit, 'Data Center');
});

test('Assignment Module: Optional fields (details, station, endDate, remarks) can remain empty without failure', async () => {
  const personnel = seedPersonnel({
    rank: 'NUP',
    firstName: 'Ana',
    lastName: 'Reyes',
    badgeNo: 'TEST-006',
    designation: 'Clerk'
  });

  const assignment = await db.createAssignment({
    personnelId: personnel.id,
    unit: 'ITMS HQ',
    position: 'Administrative Aide',
    startDate: '2026-07-01',
    status: 'Current'
  });

  assert.ok(assignment.id);
  assert.equal(assignment.details, undefined);
  assert.equal(assignment.station, undefined);
  assert.equal(assignment.endDate, undefined);
  assert.equal(assignment.remarks, undefined);

  const updated = await db.updateAssignment(assignment.id, {
    position: 'Senior Administrative Aide'
  });
  assert.equal(updated.position, 'Senior Administrative Aide');
});
