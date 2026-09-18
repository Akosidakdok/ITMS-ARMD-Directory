const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const PROMOTION_EVALUATION_STATUSES = ['Draft', 'For Review', 'Approved', 'Rejected'];
export const PROMOTION_FACTOR_KEYS = [
  'awards',
  'diversity',
  'serviceReputation',
  'interviewRating',
  'seniority',
  'otherQualifications'
];

// Deliberately empty until the approved worksheet/policy is supplied.
export const SCORING_CONFIGURATIONS = Object.freeze({
  PCO: Object.freeze({
    version: 'PCO-reference-worksheet-CY2026',
    status: 'Reference worksheet maxima loaded; formula/source mapping requires approval',
    factors: Object.freeze({ seniority: 25, awards: 10, diversity: 25, serviceReputation: 25, interviewRating: 10, otherQualifications: 5 })
  }),
  PNCO: Object.freeze({
    version: 'PNCO-reference-worksheet-CY2026',
    status: 'Reference worksheet maxima loaded; formula/source mapping requires approval',
    factors: Object.freeze({ seniority: 30, awards: 10, diversity: 20, serviceReputation: 20, interviewRating: 15, otherQualifications: 5 })
  })
});

const getScoringConfiguration = rank => {
  const clean = String(rank || '').toUpperCase();
  return ['PAT', 'PCPL', 'PSSG', 'PMSG', 'PSMS', 'PCMS', 'PEMS'].includes(clean)
    ? SCORING_CONFIGURATIONS.PNCO
    : SCORING_CONFIGURATIONS.PCO;
};

const toUtcDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysBetween = (start, end) => Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY));

export const formatDuration = days => {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days - years * 365 - months * 30;
  return `${years}y ${months}m ${remainingDays}d (${days} days)`;
};

export const normalizeRegion = value => {
  const region = String(value || '').trim().toLowerCase();
  if (region === 'luzon') return 'Luzon';
  if (region === 'visayas' || region === 'visaya') return 'Visayas';
  if (region === 'mindanao') return 'Mindanao';
  return null;
};

export const calculateRegionalService = (assignments = [], evaluationDate = new Date().toISOString().slice(0, 10)) => {
  const endDate = toUtcDate(evaluationDate);
  const warnings = [];
  const intervalsByRegion = { Luzon: [], Visayas: [], Mindanao: [] };

  if (!endDate) warnings.push({ code: 'INVALID_EVALUATION_DATE', message: 'Evaluation date is invalid.' });

  assignments.forEach(assignment => {
    const region = normalizeRegion(assignment.region);
    const start = toUtcDate(assignment.startDate);
    const assignmentEnd = assignment.endDate ? toUtcDate(assignment.endDate) : endDate;
    if (!region) {
      warnings.push({ code: 'MISSING_REGION', assignmentId: assignment.id, message: 'Assignment has no approved Luzon, Visayas, or Mindanao region.' });
      return;
    }
    if (!start || (!assignmentEnd && !assignment.endDate)) {
      warnings.push({ code: 'MISSING_ASSIGNMENT_DATE', assignmentId: assignment.id, message: 'Assignment is missing a valid start or evaluation end date.' });
      return;
    }
    if (!assignmentEnd || assignmentEnd < start) {
      warnings.push({ code: 'INVALID_ASSIGNMENT_RANGE', assignmentId: assignment.id, message: 'Assignment end date cannot be before its start date.' });
      return;
    }
    intervalsByRegion[region].push({ start, end: assignmentEnd, assignmentId: assignment.id });
  });

  const totals = {};
  for (const [region, intervals] of Object.entries(intervalsByRegion)) {
    intervals.sort((a, b) => a.start - b.start);
    const merged = [];
    intervals.forEach(interval => {
      const previous = merged[merged.length - 1];
      if (previous && interval.start <= previous.end) {
        warnings.push({ code: 'OVERLAPPING_ASSIGNMENTS', region, assignmentId: interval.assignmentId, message: `Overlapping ${region} assignments were merged to prevent double counting.` });
        if (interval.end > previous.end) previous.end = interval.end;
      } else {
        merged.push({ ...interval });
      }
    });
    const days = merged.reduce((total, interval) => total + daysBetween(interval.start, interval.end) + 1, 0);
    totals[region] = { days, duration: formatDuration(days), assignmentCount: intervals.length };
  }

  return { totals, warnings, convention: 'Calendar-day intervals are inclusive of start and end dates; active assignments end on the evaluation date; overlapping intervals are merged.' };
};

export const calculateCurrentRankSeniority = ({ promotions = [], personnel = {}, evaluationDate = new Date().toISOString().slice(0, 10) }) => {
  const warnings = [];
  const end = toUtcDate(evaluationDate);
  const sorted = [...promotions].filter(p => toUtcDate(p.promotionDate)).sort((a, b) => b.promotionDate.localeCompare(a.promotionDate));
  const latest = sorted[0];
  const promotionDate = latest?.promotionDate || personnel.lastPromotionDate;
  const start = toUtcDate(promotionDate);
  if (latest?.rankTo && personnel.rank && latest.rankTo !== personnel.rank) {
    warnings.push({ code: 'RANK_SOURCE_CONFLICT', message: 'Latest promotion rank differs from the current personnel rank.' });
  }
  if (personnel.lastPromotionDate && latest?.promotionDate && personnel.lastPromotionDate !== latest.promotionDate) {
    warnings.push({ code: 'PROMOTION_DATE_SOURCE_CONFLICT', message: 'Personnel lastPromotionDate differs from promotion history; promotion history was used.' });
  }
  if (!start || !end) {
    warnings.push({ code: 'MISSING_SENIORITY_DATE', message: 'No valid current-rank promotion date is available.' });
    return { promotionDate: promotionDate || null, days: 0, duration: 'Not available', warnings, source: latest ? 'promotion-history' : 'personnel.lastPromotionDate' };
  }
  if (end < start) {
    warnings.push({ code: 'INVALID_SENIORITY_RANGE', message: 'Promotion date is after the evaluation date.' });
    return { promotionDate, days: 0, duration: 'Invalid date range', warnings, source: latest ? 'promotion-history' : 'personnel.lastPromotionDate' };
  }
  const days = daysBetween(start, end);
  return { promotionDate, days, duration: formatDuration(days), warnings, source: latest ? 'promotion-history' : 'personnel.lastPromotionDate' };
};

export const calculatePromotionEvaluation = ({ personnel, assignments = [], promotions = [], awards = [], evaluationDate, externalFactors = {} }) => {
  const date = evaluationDate || new Date().toISOString().slice(0, 10);
  const scoringConfiguration = getScoringConfiguration(personnel?.rank);
  const diversity = calculateRegionalService(assignments, date);
  const seniority = calculateCurrentRankSeniority({ promotions, personnel, evaluationDate: date });
  const warnings = [...diversity.warnings, ...seniority.warnings];
  const factors = [
    { key: 'awards', label: 'Awards', value: { count: awards.length, awards: awards.map(({ id, awardName, authorityDate }) => ({ id, awardName, authorityDate })) }, points: null, maxPoints: scoringConfiguration.factors.awards, source: awards.length ? 'PAIS awards' : 'PAIS awards (none recorded)', status: 'Formula/source mapping requires approval' },
    { key: 'diversity', label: 'Diversity of Assignment', value: diversity.totals, points: null, maxPoints: scoringConfiguration.factors.diversity, source: 'PAIS assignments', status: 'Formula/source mapping requires approval' },
    { key: 'seniority', label: 'Current-Rank Seniority', value: seniority, points: null, maxPoints: scoringConfiguration.factors.seniority, source: seniority.source, status: 'Formula/source mapping requires approval' },
    ...['serviceReputation', 'interviewRating', 'otherQualifications'].map(key => ({
      key,
      label: key === 'serviceReputation' ? 'Service Reputation' : key === 'interviewRating' ? 'Interview Rating' : 'Other Qualifications',
      value: externalFactors[key]?.value ?? null,
      points: externalFactors[key]?.points ?? null,
      source: externalFactors[key]?.source || 'Manual/external input',
      remarks: externalFactors[key]?.remarks || '',
      enteredBy: externalFactors[key]?.enteredBy || null,
      enteredAt: externalFactors[key]?.enteredAt || null,
      maxPoints: scoringConfiguration.factors[key],
      status: externalFactors[key]?.status || 'Pending input'
    }))
  ];
  const totalPoints = factors.reduce((sum, factor) => sum + (typeof factor.points === 'number' ? factor.points : 0), 0);
  if (factors.some(factor => factor.points === null)) warnings.push({ code: 'SCORING_FORMULA_PENDING', message: `Reference worksheet maxima are loaded for ${scoringConfiguration.version}, but factor formulas/source mappings still require approval before points are calculated automatically.` });
  return { evaluationDate: date, factors, totalPoints, warnings, scoringConfiguration };
};
