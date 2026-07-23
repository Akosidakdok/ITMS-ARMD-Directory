import express from 'express';
import { 
  getAllTraining, 
  createTraining, 
  deleteTraining 
} from '../controllers/trainingController.js';

const router = express.Router();

router.get('/', getAllTraining);
router.post('/', createTraining);
router.delete('/:id', deleteTraining);

export default router;
