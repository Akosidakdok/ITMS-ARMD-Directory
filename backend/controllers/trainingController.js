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
    const { personnelId, courseName, category, provider, hours } = req.body;
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
