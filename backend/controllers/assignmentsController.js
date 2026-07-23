import { db } from '../store/repository.js';

export const getAllAssignments = async (req, res) => {
  try {
    const { personnelId } = req.query;
    const assignments = await db.getAssignments(personnelId);
    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createAssignment = async (req, res) => {
  try {
    const { personnelId, unit, position, orderRef, startDate } = req.body;
    if (!personnelId || !unit || !position) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: personnelId, unit, position are required'
      });
    }

    const created = await db.createAssignment(req.body);
    res.status(201).json({
      success: true,
      message: 'Duty assignment created successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteAssignment = async (req, res) => {
  try {
    const success = await db.deleteAssignment(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Assignment record not found' });
    }
    res.json({
      success: true,
      message: 'Assignment record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
