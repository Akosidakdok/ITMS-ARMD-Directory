import express from 'express';
import { 
  getAllEducation, 
  createEducation, 
  deleteEducation 
} from '../controllers/educationController.js';

const router = express.Router();

router.get('/', getAllEducation);
router.post('/', createEducation);
router.delete('/:id', deleteEducation);

export default router;
