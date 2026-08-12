import express from 'express';
import {
  getAllAwards,
  createAward,
  updateAward,
  deleteAward
} from '../controllers/awardsController.js';

const router = express.Router();

router.get('/', getAllAwards);
router.post('/', createAward);
router.put('/:id', updateAward);
router.delete('/:id', deleteAward);

export default router;
