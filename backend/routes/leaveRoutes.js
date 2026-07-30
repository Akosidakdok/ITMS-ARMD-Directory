import express from 'express';
import { 
  getAllLeave, 
  createLeave,
  updateLeave,
  updateLeaveStatus,
  deleteLeave 
} from '../controllers/leaveController.js';

const router = express.Router();

router.get('/', getAllLeave);
router.post('/', createLeave);
router.put('/:id', updateLeave);
router.patch('/:id/status', updateLeaveStatus);
router.delete('/:id', deleteLeave);

export default router;
