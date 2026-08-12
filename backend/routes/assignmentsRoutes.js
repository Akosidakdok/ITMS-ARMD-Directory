import express from 'express';
import { 
  getAllAssignments, 
  createAssignment, 
  updateAssignment,
  deleteAssignment 
} from '../controllers/assignmentsController.js';

const router = express.Router();

router.get('/', getAllAssignments);
router.post('/', createAssignment);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

export default router;
