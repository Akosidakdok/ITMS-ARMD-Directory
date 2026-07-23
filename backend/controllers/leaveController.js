import { db } from '../store/repository.js';

export const getAllLeave = async (req, res) => {
  try {
    const { personnelId } = req.query;
    const leave = await db.getLeave(personnelId);
    res.json({
      success: true,
      count: leave.length,
      data: leave
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createLeave = async (req, res) => {
  try {
    const { personnelId, leaveType, startDate, endDate, days } = req.body;
    if (!personnelId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: personnelId, leaveType, startDate, endDate are required'
      });
    }

    const created = await db.createLeave(req.body);
    res.status(201).json({
      success: true,
      message: 'Leave application filed successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { status, approvedBy } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status field is required' });
    }

    const updated = await db.updateLeaveStatus(req.params.id, status, approvedBy);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Leave record not found' });
    }
    res.json({
      success: true,
      message: `Leave status updated to ${status}`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteLeave = async (req, res) => {
  try {
    const success = await db.deleteLeave(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Leave record not found' });
    }
    res.json({
      success: true,
      message: 'Leave record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
