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
    const { personnelId, degree, institution, yearGraduated } = req.body;
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
