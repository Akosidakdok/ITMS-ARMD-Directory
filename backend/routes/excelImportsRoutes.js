import express from 'express';
import multer from 'multer';
import { commitExcelImport, getExcelImportHistory, previewExcelImport } from '../controllers/excelImportsController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => callback(null, file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.originalname.toLowerCase().endsWith('.xlsx'))
});
const router = express.Router();
router.get('/history', getExcelImportHistory);
router.post('/preview', upload.single('file'), previewExcelImport);
router.post('/commit', commitExcelImport);
export default router;
