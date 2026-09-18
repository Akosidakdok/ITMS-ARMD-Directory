import express from 'express';
import { exportExcelTemplate, getExcelTemplateById, getExcelTemplates, previewExcelTemplate } from '../controllers/excelTemplatesController.js';

const router = express.Router();
router.get('/', getExcelTemplates);
router.get('/:templateId/preview', previewExcelTemplate);
router.get('/:templateId/export', exportExcelTemplate);
router.get('/:templateId', getExcelTemplateById);
export default router;
