import express from 'express';
import { 
  getAllPromotions, 
  createPromotion, 
  updatePromotion,
  deletePromotion 
} from '../controllers/promotionsController.js';

const router = express.Router();

router.get('/', getAllPromotions);
router.post('/', createPromotion);
router.put('/:id', updatePromotion);
router.delete('/:id', deletePromotion);

export default router;
