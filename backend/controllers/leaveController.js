import { db } from '../store/repository.js';
import { isAllowedLeaveType } from '../constants/leaveTypes.js';

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
    const cleanText = value => typeof value === 'string' ? value.trim() : '';
    const personnelId = cleanText(req.body.personnelId);
    const leaveType = cleanText(req.body.leaveType);
    const startDate = cleanText(req.body.startDate);
    const endDate = cleanText(req.body.endDate);

    if (!personnelId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: personnelId, leaveType, startDate, endDate are required'
      });
    }
    if (!isAllowedLeaveType(leaveType)) {
      return res.status(400).json({ success: false, message: 'Invalid Type of Leave' });
    }
    if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
      return res.status(400).json({ success: false, message: 'Leave dates are invalid' });
    }
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End Date cannot be earlier than Start Date'
      });
    }

    const created = await db.createLeave({
      id: cleanText(req.body.id),
      personnelId,
      leaveType,
      startDate,
      endDate,
      days: Math.floor((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1,
      purpose: cleanText(req.body.purpose),
      status: cleanText(req.body.status) || 'Pending',
      approvedBy: cleanText(req.body.approvedBy)
    });
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

export const updateLeave = async (req, res) => {
  try {
    const personnelId = typeof req.body.personnelId === 'string' ? req.body.personnelId.trim() : '';
    const leaveType = typeof req.body.leaveType === 'string' ? req.body.leaveType.trim() : '';
    const startDate = typeof req.body.startDate === 'string' ? req.body.startDate.trim() : '';
    const endDate = typeof req.body.endDate === 'string' ? req.body.endDate.trim() : '';

    if (!personnelId || !leaveType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Name of Personnel, Type of Leave, Start Date, and End Date are required'
      });
    }
    if (!isAllowedLeaveType(leaveType)) {
      return res.status(400).json({ success: false, message: 'Invalid Type of Leave' });
    }
    if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
      return res.status(400).json({ success: false, message: 'Leave dates are invalid' });
    }
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End Date cannot be earlier than Start Date'
      });
    }

    const updated = await db.updateLeave(req.params.id, {
      personnelId,
      leaveType,
      startDate,
      endDate,
      days: Math.floor((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1,
      purpose: typeof req.body.purpose === 'string' ? req.body.purpose.trim() : '',
      status: req.body.status || 'Approved'
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Leave record not found' });
    }
    return res.json({
      success: true,
      message: 'Leave record updated successfully',
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to update leave record',
      error: error.message
    });
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
