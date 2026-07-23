import express from 'express';
import { 
  getAllAssignments, 
  createAssignment, 
  deleteAssignment 
} from '../controllers/assignmentsController.js';

const router = express.Router();

router.get('/', getAllAssignments);
router.post('/', createAssignment);
router.delete('/:id', deleteAssignment);

export default router;
