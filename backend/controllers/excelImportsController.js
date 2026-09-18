import crypto from 'node:crypto';
import { commitExcelPreview, createExcelPreview } from '../services/excelImport.js';
import { db } from '../store/repository.js';

const actor = req => req.user?.displayName || req.user?.email || 'System';

export const previewExcelImport = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ success: false, message: 'Attach an .xlsx workbook in the file field.' });
    const data = await createExcelPreview({ templateId: req.body.templateId, buffer: req.file.buffer, fileHash: crypto.createHash('sha256').update(req.file.buffer).digest('hex'), filename: req.file.originalname, actor: actor(req) });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to preview Excel import.' });
  }
};

export const getExcelImportHistory = async (req, res) => {
  try { return res.json({ success: true, data: await db.getExcelImportAudits(req.query.limit) }); }
  catch (error) { return res.status(500).json({ success: false, message: error.message || 'Unable to load Excel import history.' }); }
};

export const commitExcelImport = async (req, res) => {
  try {
    if (!req.body?.previewId) return res.status(400).json({ success: false, message: 'previewId is required.' });
    const data = await commitExcelPreview({ previewId: req.body.previewId, actor: actor(req) });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to commit Excel import.' });
  }
};
