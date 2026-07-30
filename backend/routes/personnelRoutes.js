import express from 'express';
import { 
  getAllPersonnel, 
  getPersonnelById, 
  createPersonnel, 
  getPersonnelImportSchema,
  createPersonnelBulk,
  updatePersonnel, 
  deletePersonnel 
} from '../controllers/personnelController.js';

const router = express.Router();

router.get('/', getAllPersonnel);
router.get('/import/schema', getPersonnelImportSchema);
router.get('/:id', getPersonnelById);
router.post('/', createPersonnel);
router.post('/import/bulk', createPersonnelBulk);
router.put('/:id', updatePersonnel);
router.delete('/:id', deletePersonnel);

export default router;
