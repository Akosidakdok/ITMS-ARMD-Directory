import express from 'express';
import {
  getAllEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  bulkUpsertEducation
} from '../controllers/educationController.js';

const router = express.Router();

router.get('/', getAllEducation);
router.post('/bulk', bulkUpsertEducation);   // must be before /:id
router.post('/', createEducation);
router.put('/:id', updateEducation);
router.delete('/:id', deleteEducation);

export default router;
