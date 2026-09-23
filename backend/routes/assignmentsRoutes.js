import express from 'express';
import { 
  getAllAssignments, 
  getAssignmentById,
  createAssignment, 
  updateAssignment,
  deleteAssignment 
} from '../controllers/assignmentsController.js';

const router = express.Router();

router.get('/', getAllAssignments);
router.get('/:id', getAssignmentById);
router.post('/', createAssignment);
router.put('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);

export default router;
