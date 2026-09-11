import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateTimeInGrade } from '../src/utils/timeInGrade.ts';

test('marks personnel eligible on the exact three-year anniversary', () => {
  const beforeAnniversary = calculateTimeInGrade('2023-08-18', '2026-08-17');
  const onAnniversary = calculateTimeInGrade('2023-08-18', '2026-08-18');
  const afterAnniversary = calculateTimeInGrade('2023-08-18', '2026-08-19');

  assert.equal(beforeAnniversary.eligibleForPromotion, false);
  assert.equal(beforeAnniversary.years, 2);
  assert.equal(onAnniversary.eligibleForPromotion, true);
  assert.deepEqual(
    { years: onAnniversary.years, months: onAnniversary.months, days: onAnniversary.days },
    { years: 3, months: 0, days: 0 }
  );
  assert.equal(afterAnniversary.eligibleForPromotion, true);
  assert.deepEqual(
    { years: afterAnniversary.years, months: afterAnniversary.months, days: afterAnniversary.days },
    { years: 3, months: 0, days: 1 }
  );
});

test('uses calendar-day arithmetic across leap years', () => {
  const result = calculateTimeInGrade('2024-02-29', '2025-02-28');

  assert.equal(result.totalDays, 365);
  assert.deepEqual(
    { years: result.years, months: result.months, days: result.days },
    { years: 0, months: 11, days: 30 }
  );

  // Leap day to 1 full calendar year (March 1)
  const toMarch = calculateTimeInGrade('2024-02-29', '2025-03-01');
  assert.equal(toMarch.totalDays, 366);
  assert.equal(toMarch.years, 1);
  assert.equal(toMarch.months, 0);
  assert.equal(toMarch.days, 0);

  // Leap day to next leap day (4 full years)
  const fullCycle = calculateTimeInGrade('2024-02-29', '2028-02-29');
  assert.equal(fullCycle.totalDays, 1461); // 365*3 + 366
  assert.deepEqual(
    { years: fullCycle.years, months: fullCycle.months, days: fullCycle.days },
    { years: 4, months: 0, days: 0 }
  );
  assert.equal(fullCycle.eligibleForPromotion, true);
});

test('handles month-end boundary transitions accurately', () => {
  // Jan 31 to Feb 28 in non-leap year
  const janToFeb = calculateTimeInGrade('2025-01-31', '2025-02-28');
  assert.equal(janToFeb.totalDays, 28);
  assert.equal(janToFeb.months, 0);
  assert.equal(janToFeb.days, 28);

  // Mar 31 to Apr 30
  const marToApr = calculateTimeInGrade('2025-03-31', '2025-04-30');
  assert.equal(marToApr.totalDays, 30);
  assert.equal(marToApr.months, 0);
  assert.equal(marToApr.days, 30);
});

test('returns N/A and safe defaults for missing, null, impossible, or future promotion dates', () => {
  for (const fromDate of ['', '   ', null, undefined, 'not-a-date', '2026-02-30', '2025-04-31', '2026-08-19']) {
    const result = calculateTimeInGrade(fromDate, '2026-08-18');

    assert.equal(result.formatted, 'N/A');
    assert.equal(result.totalDays, 0);
    assert.equal(result.eligibleForPromotion, false);
  }

  // Check specific flags
  const future = calculateTimeInGrade('2026-08-20', '2026-08-18');
  assert.equal(future.isFuture, true);
  assert.equal(future.statusText, 'Pending Effective Date');

  const invalid = calculateTimeInGrade('2026-02-30', '2026-08-18');
  assert.equal(invalid.isInvalid, true);
  assert.equal(invalid.statusText, 'Invalid date');
});

test('supports custom minimum TIG eligibility thresholds for rank groups', () => {
  // PNCO 2-year threshold
  const twoYearTig = calculateTimeInGrade('2024-08-18', '2026-08-18', 2);
  assert.equal(twoYearTig.years, 2);
  assert.equal(twoYearTig.eligibleForPromotion, true);

  // Standard 3-year threshold on same dates should be ineligible
  const threeYearTig = calculateTimeInGrade('2024-08-18', '2026-08-18', 3);
  assert.equal(threeYearTig.years, 2);
  assert.equal(threeYearTig.eligibleForPromotion, false);
});
