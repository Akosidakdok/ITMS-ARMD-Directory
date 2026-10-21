import express from 'express';
import {
  parseDlosAction, parseDlosCase, parseDlosDocumentDate, parseDlosListQuery, parseDlosPeople, parseDlosVersion
} from '../schemas/dlosCaseSchema.js';
import { parseDlosWorkflow } from '../schemas/dlosWorkflowSchema.js';
import { requireDlosAccess, requireDlosRole } from '../middleware/dlosAccess.js';
import { handleDlosUpload, handleDlosWorkflowUpload, validDlosFile } from '../middleware/dlosUpload.js';
import {
  applyDlosAction, getDlosCase, getDlosDocument, getDlosDocuments, getDlosHistory,
  getDlosOptions, getDlosUpdates, getDlosWorkflow, recordDlosDocument,
  recordDlosWorkflow, saveDlosCase, searchDlosCases
} from '../store/dlosRepository.js';
import { downloadDlosFile, removeDlosFile, uploadDlosFile } from '../services/dlosDocumentStorage.js';

const router = express.Router();
router.use(requireDlosAccess);

const respondError = (res, error) => res.status(error.statusCode || 500)
  .json({ success: false, message: error.statusCode ? error.message : 'Unable to complete the DLOS request.' });
const validId = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

router.get('/options', async (_req, res) => {
  try { return res.json({ success: true, data: await getDlosOptions() }); }
  catch (error) { return respondError(res, error); }
});

router.get('/cases', async (req, res) => {
  try { return res.json({ success: true, data: await searchDlosCases(parseDlosListQuery(req.query)) }); }
  catch (error) { return respondError(res, error); }
});

router.get('/cases/:id/history', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  try {
    if (!await getDlosCase(req.params.id)) return res.status(404).json({ success: false, message: 'Case not found.' });
    return res.json({ success: true, data: await getDlosHistory(req.params.id) });
  } catch (error) { return respondError(res, error); }
});

router.get('/cases/:id/updates', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  try {
    if (!await getDlosCase(req.params.id)) return res.status(404).json({ success: false, message: 'Case not found.' });
    return res.json({ success: true, data: await getDlosUpdates(req.params.id) });
  } catch (error) { return respondError(res, error); }
});

router.get('/cases/:id/workflow', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  try {
    if (!await getDlosCase(req.params.id)) return res.status(404).json({ success: false, message: 'Case not found.' });
    return res.json({ success: true, data: await getDlosWorkflow(req.params.id) });
  } catch (error) { return respondError(res, error); }
});

router.get('/cases/:id/documents', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  try {
    if (!await getDlosCase(req.params.id)) return res.status(404).json({ success: false, message: 'Case not found.' });
    return res.json({ success: true, data: await getDlosDocuments(req.params.id) });
  } catch (error) { return respondError(res, error); }
});

router.get('/cases/:id/documents/:documentId', async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.documentId)) return res.status(400).json({ success: false, message: 'Invalid document ID.' });
  try {
    if (!await getDlosCase(req.params.id)) return res.status(404).json({ success: false, message: 'Case not found.' });
    const document = await getDlosDocument(req.params.id, req.params.documentId);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found.' });
    const content = await downloadDlosFile(document.storagePath);
    const safeName = document.fileName.replace(/[\r\n"\\]/g, '_').slice(0, 180);
    res.set('Content-Type', document.mimeType);
    res.set('Content-Disposition', `attachment; filename="${safeName}"`);
    res.set('Cache-Control', 'private, no-store');
    return res.send(content);
  } catch (error) { return respondError(res, error); }
});

router.get('/cases/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  try {
    const data = await getDlosCase(req.params.id);
    return data ? res.json({ success: true, data }) : res.status(404).json({ success: false, message: 'Case not found.' });
  } catch (error) { return respondError(res, error); }
});

router.post('/cases', requireDlosRole('encoder', 'reviewer'), async (req, res) => {
  try {
    const data = await saveDlosCase(parseDlosCase(req.body), parseDlosPeople(req.body?.people || []), req.user);
    return res.status(201).json({ success: true, data });
  } catch (error) { return respondError(res, error); }
});

router.patch('/cases/:id', requireDlosRole('encoder', 'reviewer'), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  try {
    const data = await saveDlosCase(parseDlosCase(req.body), parseDlosPeople(req.body?.people || []),
      req.user, req.params.id, parseDlosVersion(req.body?.version));
    return res.json({ success: true, data });
  } catch (error) { return respondError(res, error); }
});

router.post('/cases/:id/documents', requireDlosRole('encoder', 'reviewer'), handleDlosUpload, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  const kind = String(req.body?.kind || '');
  if (!['transmittal', 'pce'].includes(kind) || !validDlosFile(req.file)) {
    return res.status(400).json({ success: false, message: 'Select Transmittal or PCE and upload a valid PDF or image up to 10 MB.' });
  }
  let path;
  try {
    const documentDate = parseDlosDocumentDate(req.body?.documentDate);
    if (!await getDlosCase(req.params.id)) return res.status(404).json({ success: false, message: 'Case not found.' });
    path = await uploadDlosFile(req.params.id, req.file);
    const data = await recordDlosDocument(req.params.id, kind, documentDate, req.file, path, req.user);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    if (path) await removeDlosFile(path);
    return respondError(res, error);
  }
});

router.post('/cases/:id/workflow/:step', requireDlosRole('encoder', 'reviewer'), handleDlosWorkflowUpload, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  const paths = [];
  let recorded = false;
  try {
    const input = parseDlosWorkflow(req.params.step, req.body, req.files || []);
    if ((req.files || []).some(file => !validDlosFile(file))) {
      return res.status(400).json({ success: false, message: 'Upload a valid PDF or image up to 10 MB.' });
    }
    const existing = await getDlosCase(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Case not found.' });
    if (existing.version !== input.version) return res.status(409).json({ success: false, message: 'Case changed since it was opened.' });
    for (const file of req.files || []) paths.push({ file, path: await uploadDlosFile(req.params.id, file) });
    await recordDlosWorkflow(req.params.id, input, paths, req.user);
    recorded = true;
    return res.json({ success: true, data: await getDlosCase(req.params.id) });
  } catch (error) {
    if (!recorded) await Promise.allSettled(paths.map(({ path }) => removeDlosFile(path)));
    return respondError(res, error);
  }
});

router.post('/cases/:id/actions', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid case ID.' });
  try {
    const { action, expectedVersion, payload } = parseDlosAction(req.body);
    if (!['encoder', 'reviewer'].includes(req.dlosRole)) return res.status(403).json({ success: false, message: 'This DLOS action requires encoder or reviewer access.' });
    return res.json({ success: true, data: await applyDlosAction(req.params.id, action, expectedVersion, payload, req.user) });
  } catch (error) { return respondError(res, error); }
});

export default router;
