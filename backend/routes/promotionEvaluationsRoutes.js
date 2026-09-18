import express from 'express';
import {
  getPromotionEvaluations,
  previewPromotionEvaluation,
  createPromotionEvaluation,
  updatePromotionEvaluation
} from '../controllers/promotionEvaluationsController.js';

const router = express.Router();
router.get('/', getPromotionEvaluations);
router.get('/preview/:personnelId', previewPromotionEvaluation);
router.post('/', createPromotionEvaluation);
router.put('/:id', updatePromotionEvaluation);
export default router;
