import express from 'express';
import {
  getAllAwards,
  createAward
} from '../controllers/awardsController.js';

const router = express.Router();

router.get('/', getAllAwards);
router.post('/', createAward);

export default router;
