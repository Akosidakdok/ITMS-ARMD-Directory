import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatAssignmentTenure, formatTenure, getCurrentMainAssignment,
  getLatestPromotionDate, getTodayInPhilippines
} from '../src/utils/personnelTenure.ts';

const assignment = (id, overrides = {}) => ({
  id, personnelId: 'p1', positionCategory: 'Main', unit: 'ITMS HQ',
  position: 'Officer', orderRef: '', effectiveDate: '2024-01-31',
  startDate: '2024-01-31', status: 'Current', ...overrides
});

test('uses Philippine calendar date at the UTC day boundary', () => {
  assert.equal(getTodayInPhilippines(new Date('2026-10-15T16:30:00Z')), '2026-10-16');
});

test('uses the latest effective promotion date for time in grade', () => {
  const person = { id: 'p1', lastPromotionDate: '2023-05-01' };
  const promotions = [
    { personnelId: 'p1', promotionDate: '2024-06-15' },
    { personnelId: 'p2', promotionDate: '2025-01-01' },
    { personnelId: 'p1', promotionDate: '2022-01-01' }
  ];
  assert.equal(getLatestPromotionDate(person, promotions), '2024-06-15');
  assert.equal(formatTenure('2024-06-15', '2026-10-16'), '2 yrs, 4 mos, 1 day');
});

test('counts each unit posting independently and stops completed postings at their end date', () => {
  const previous = assignment('old', {
    sub_unit: 'ARMD', status: 'Completed', endDate: '2025-03-01'
  });
  const current = assignment('new', {
    sub_unit: 'CSD', effectiveDate: '2025-03-01', startDate: '2025-03-01'
  });
  const concurrent = assignment('additional', {
    positionCategory: 'In Addition/Concurrent', effectiveDate: '2026-01-01'
  });
  assert.equal(getCurrentMainAssignment([previous, current, concurrent], 'p1')?.id, 'new');
  assert.equal(formatAssignmentTenure(previous, '2026-10-16'), '1 yr, 29 days');
  assert.equal(formatAssignmentTenure(current, '2026-10-16'), '1 yr, 7 mos, 15 days');
});

test('does not count future or undated postings as active tenure', () => {
  assert.equal(formatTenure('', '2026-10-16'), 'Not recorded');
  assert.equal(formatAssignmentTenure(assignment('future', {
    effectiveDate: '2026-11-01', startDate: '2026-11-01'
  }), '2026-10-16'), 'Pending effective date');
  assert.equal(formatAssignmentTenure(assignment('ended', {
    status: 'Completed', endDate: undefined
  }), '2026-10-16'), 'End date not recorded');
});
