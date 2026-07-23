import express from 'express';
import { 
  getAllPersonnel, 
  getPersonnelById, 
  createPersonnel, 
  updatePersonnel, 
  deletePersonnel 
} from '../controllers/personnelController.js';

const router = express.Router();

router.get('/', getAllPersonnel);
router.get('/:id', getPersonnelById);
router.post('/', createPersonnel);
router.put('/:id', updatePersonnel);
router.delete('/:id', deletePersonnel);

export default router;
