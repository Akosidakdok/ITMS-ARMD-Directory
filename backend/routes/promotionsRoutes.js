import express from 'express';
import { 
  getAllPromotions, 
  createPromotion, 
  deletePromotion 
} from '../controllers/promotionsController.js';

const router = express.Router();

router.get('/', getAllPromotions);
router.post('/', createPromotion);
router.delete('/:id', deletePromotion);

export default router;
