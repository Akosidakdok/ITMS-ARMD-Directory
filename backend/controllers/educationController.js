import { db } from '../store/repository.js';

export const getAllEducation = async (req, res) => {
  try {
    const { personnelId } = req.query;
    const education = await db.getEducation(personnelId);
    res.json({
      success: true,
      count: education.length,
      data: education
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createEducation = async (req, res) => {
  try {
    const { personnelId, degree, institution } = req.body;
    if (!personnelId || !degree || !institution) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: personnelId, degree, institution are required'
      });
    }

    const created = await db.createEducation(req.body);
    res.status(201).json({
      success: true,
      message: 'Educational qualification added successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.updateEducation(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Education record not found' });
    }
    res.json({
      success: true,
      message: 'Education record updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteEducation = async (req, res) => {
  try {
    const success = await db.deleteEducation(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Education record not found' });
    }
    res.json({
      success: true,
      message: 'Education record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/education/bulk
 * Accepts array of education records. For each:
 *  - Unknown columns are already stripped by the CSV parser on the client side.
 *  - Rows with missing personnelId/degree are skipped.
 *  - Match by personnelId + degree → update (replace); else → insert.
 */
export const bulkUpsertEducation = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided. Send { records: [...] }'
      });
    }

    const results = await db.bulkUpsertEducation(records);

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
