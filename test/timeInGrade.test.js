import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateTimeInGrade } from '../src/utils/timeInGrade.ts';

test('marks personnel eligible on the exact three-year anniversary', () => {
  const beforeAnniversary = calculateTimeInGrade('2023-08-18', '2026-08-17');
  const onAnniversary = calculateTimeInGrade('2023-08-18', '2026-08-18');

  assert.equal(beforeAnniversary.eligibleForPromotion, false);
  assert.equal(onAnniversary.eligibleForPromotion, true);
  assert.deepEqual(
    { years: onAnniversary.years, months: onAnniversary.months, days: onAnniversary.days },
    { years: 3, months: 0, days: 0 }
  );
});

test('uses calendar-day arithmetic across leap years', () => {
  const result = calculateTimeInGrade('2024-02-29', '2025-02-28');

  assert.equal(result.totalDays, 365);
  assert.deepEqual(
    { years: result.years, months: result.months, days: result.days },
    { years: 0, months: 11, days: 30 }
  );
});

test('returns N/A for missing, impossible, or future promotion dates', () => {
  for (const fromDate of ['', 'not-a-date', '2026-02-30', '2026-08-19']) {
    const result = calculateTimeInGrade(fromDate, '2026-08-18');

    assert.equal(result.formatted, 'N/A');
    assert.equal(result.totalDays, 0);
    assert.equal(result.eligibleForPromotion, false);
  }
});
