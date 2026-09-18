import { db } from '../store/repository.js';
import { PROMOTION_EVALUATION_STATUSES, calculatePromotionEvaluation } from '../services/promotionEvaluation.js';

const clean = value => typeof value === 'string' ? value.trim() : value;

export const getPromotionEvaluations = async (req, res) => {
  try {
    const data = await db.getPromotionEvaluations(req.query.personnelId);
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load promotion evaluations', error: error.message });
  }
};

export const previewPromotionEvaluation = async (req, res) => {
  try {
    const personnel = await db.getPersonnelById(req.params.personnelId);
    if (!personnel) return res.status(404).json({ success: false, message: 'Personnel record not found.' });
    const [assignments, promotions, awards] = await Promise.all([
      db.getAssignments(req.params.personnelId),
      db.getPromotions(req.params.personnelId),
      db.getAwards(req.params.personnelId)
    ]);
    const calculation = calculatePromotionEvaluation({ personnel, assignments, promotions, awards, evaluationDate: clean(req.query.evaluationDate), externalFactors: {} });
    return res.json({ success: true, data: { personnelId: req.params.personnelId, ...calculation } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to calculate promotion evaluation', error: error.message });
  }
};

const validateEvaluation = body => {
  if (!body.personnelId || !body.evaluationDate) return 'Personnel and evaluation date are required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.evaluationDate)) return 'Evaluation date must use YYYY-MM-DD format.';
  if (body.status && !PROMOTION_EVALUATION_STATUSES.includes(body.status)) return `Status must be one of: ${PROMOTION_EVALUATION_STATUSES.join(', ')}.`;
  return null;
};

export const createPromotionEvaluation = async (req, res) => {
  try {
    const validationError = validateEvaluation(req.body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const personnel = await db.getPersonnelById(req.body.personnelId);
    if (!personnel) return res.status(404).json({ success: false, message: 'Personnel record not found.' });
    const [assignments, promotions, awards] = await Promise.all([
      db.getAssignments(req.body.personnelId), db.getPromotions(req.body.personnelId), db.getAwards(req.body.personnelId)
    ]);
    const calculation = calculatePromotionEvaluation({ personnel, assignments, promotions, awards, evaluationDate: req.body.evaluationDate, externalFactors: req.body.externalFactors || {} });
    const created = await db.createPromotionEvaluation({ ...req.body, calculation, evaluator: req.user?.username || req.body.evaluator });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to save promotion evaluation', error: error.message });
  }
};

export const updatePromotionEvaluation = async (req, res) => {
  try {
    const current = await db.getPromotionEvaluation(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Promotion evaluation not found.' });
    const updated = await db.updatePromotionEvaluation(req.params.id, { ...req.body, evaluator: req.user?.username || req.body.evaluator });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update promotion evaluation', error: error.message });
  }
};
