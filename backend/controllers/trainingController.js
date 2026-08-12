import { db } from '../store/repository.js';

export const getAllTraining = async (req, res) => {
  try {
    const { personnelId } = req.query;
    const training = await db.getTraining(personnelId);
    res.json({
      success: true,
      count: training.length,
      data: training
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createTraining = async (req, res) => {
  try {
    const { personnelId, courseName, provider } = req.body;
    if (!personnelId || !courseName || !provider) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: personnelId, courseName, provider are required'
      });
    }

    const created = await db.createTraining(req.body);
    res.status(201).json({
      success: true,
      message: 'Training record registered successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.updateTraining(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Training record not found' });
    }
    res.json({
      success: true,
      message: 'Training record updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteTraining = async (req, res) => {
  try {
    const success = await db.deleteTraining(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Training record not found' });
    }
    res.json({
      success: true,
      message: 'Training record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/training/bulk
 * Accepts array of training records. For each:
 *  - Unknown columns already stripped by CSV parser on client.
 *  - Rows with missing personnelId/courseName are skipped.
 *  - Match by personnelId + courseName → update (replace); else → insert.
 */
export const bulkUpsertTraining = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided. Send { records: [...] }'
      });
    }

    const results = await db.bulkUpsertTraining(records);

    res.status(207).json({
      success: true,
      message: 'Bulk upsert completed',
      data: {
        addedCount: results.added.length,
        replacedCount: results.replaced.length,
        skippedCount: results.skipped.length,
        added: results.added,
        replaced: results.replaced,
        skipped: results.skipped
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
