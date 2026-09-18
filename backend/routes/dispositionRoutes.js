import express from 'express';
import { db } from '../store/repository.js';

const router = express.Router();
router.get('/stats', async (req, res) => {
  try {
    const data = await db.getDispositionStats(req.query.status || 'Active');
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to calculate disposition statistics', error: error.message });
  }
});

router.get('/authorized-strength', async (req, res) => {
  try {
    const data = await db.getAuthorizedStrengths({ reportType: req.query.reportType || null, asOfDate: req.query.asOfDate || null });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load authorized strength', error: error.message });
  }
});

router.put('/authorized-strength', async (req, res) => {
  try {
    const records = Array.isArray(req.body?.records) ? req.body.records : [req.body];
    if (!records.length || records.length > 500) return res.status(400).json({ success: false, message: 'Provide between 1 and 500 authorized-strength records.' });
    const data = await db.upsertAuthorizedStrengths(records, req.user?.email || req.user?.id || null);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
