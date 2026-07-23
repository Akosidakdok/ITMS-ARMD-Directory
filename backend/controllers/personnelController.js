import { db } from '../store/repository.js';

export const getAllPersonnel = async (req, res) => {
  try {
    const { division, search, status } = req.query;
    const personnel = await db.getPersonnel({ division, search, status });
    res.json({
      success: true,
      count: personnel.length,
      data: personnel
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPersonnelById = async (req, res) => {
  try {
    const person = await db.getPersonnelById(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: 'Personnel not found' });
    }
    res.json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createPersonnel = async (req, res) => {
  try {
    const { rank, firstName, lastName, badgeNo, division, designation } = req.body;
    if (!rank || !firstName || !lastName || !badgeNo) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: rank, firstName, lastName, badgeNo are required'
      });
    }

    const created = await db.createPersonnel(req.body);
    res.status(201).json({
      success: true,
      message: 'Personnel registered successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePersonnel = async (req, res) => {
  try {
    const updated = await db.updatePersonnel(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Personnel not found' });
    }
    res.json({
      success: true,
      message: 'Personnel record updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePersonnel = async (req, res) => {
  try {
    const success = await db.deletePersonnel(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Personnel not found' });
    }
    res.json({
      success: true,
      message: 'Personnel record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
