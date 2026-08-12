import express from 'express';
import {
  getAllTraining,
  createTraining,
  updateTraining,
  deleteTraining,
  bulkUpsertTraining
} from '../controllers/trainingController.js';

const router = express.Router();

router.get('/', getAllTraining);
router.post('/bulk', bulkUpsertTraining);   // must be before /:id
router.post('/', createTraining);
router.put('/:id', updateTraining);
router.delete('/:id', deleteTraining);

export default router;
