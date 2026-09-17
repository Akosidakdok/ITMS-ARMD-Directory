import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCurrentRankSeniority, calculatePromotionEvaluation, calculateRegionalService } from '../backend/services/promotionEvaluation.js';

test('calculates inclusive regional service and merges overlapping assignments', () => {
  const result = calculateRegionalService([
    { id: 'a1', region: 'Luzon', startDate: '2024-01-01', endDate: '2024-01-10' },
    { id: 'a2', region: 'Luzon', startDate: '2024-01-05', endDate: '2024-01-20' },
    { id: 'a3', region: 'Visayas', startDate: '2024-02-01', endDate: '2024-02-03' }
  ], '2024-02-10');
  assert.equal(result.totals.Luzon.days, 20);
  assert.equal(result.totals.Visayas.days, 3);
  assert.ok(result.warnings.some(warning => warning.code === 'OVERLAPPING_ASSIGNMENTS'));
});

test('uses evaluation date for active assignments and flags missing or invalid data', () => {
  const result = calculateRegionalService([
    { id: 'active', region: 'Mindanao', startDate: '2024-01-01' },
    { id: 'missing-region', startDate: '2024-01-01', endDate: '2024-01-02' },
    { id: 'invalid', region: 'Luzon', startDate: '2024-02-03', endDate: '2024-02-01' }
  ], '2024-01-10');
  assert.equal(result.totals.Mindanao.days, 10);
  assert.ok(result.warnings.some(warning => warning.code === 'MISSING_REGION'));
  assert.ok(result.warnings.some(warning => warning.code === 'INVALID_ASSIGNMENT_RANGE'));
});

test('uses promotion history as the authoritative seniority source and flags disagreement', () => {
  const result = calculateCurrentRankSeniority({
    personnel: { rank: 'PSSg', lastPromotionDate: '2022-01-01' },
    promotions: [{ rankTo: 'PMSg', promotionDate: '2023-01-01' }],
    evaluationDate: '2024-01-01'
  });
  assert.equal(result.promotionDate, '2023-01-01');
  assert.equal(result.days, 365);
  assert.ok(result.warnings.some(warning => warning.code === 'RANK_SOURCE_CONFLICT'));
  assert.ok(result.warnings.some(warning => warning.code === 'PROMOTION_DATE_SOURCE_CONFLICT'));
});

test('promotion evaluation exposes track maxima without inventing unmapped points', () => {
  const result = calculatePromotionEvaluation({
    personnel: { id: 'p1', rank: 'PCPT', lastPromotionDate: '2023-01-01' },
    assignments: [{ id: 'a1', region: 'Luzon', startDate: '2023-01-01' }],
    promotions: [],
    awards: [{ id: 'award-1', awardName: 'Service Award', authorityDate: '2023-05-01' }],
    evaluationDate: '2024-01-01',
    externalFactors: { interviewRating: { value: '4/5', points: null } }
  });
  assert.equal(result.totalPoints, 0);
  assert.equal(result.factors.length, 6);
  assert.equal(result.scoringConfiguration.factors.seniority, 25);
  assert.equal(result.scoringConfiguration.factors.diversity, 25);
  assert.ok(result.warnings.some(warning => warning.code === 'SCORING_FORMULA_PENDING'));
});
