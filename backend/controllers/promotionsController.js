import { db } from '../store/repository.js';

export const getAllPromotions = async (req, res) => {
  try {
    const { personnelId } = req.query;
    const promotions = await db.getPromotions(personnelId);
    res.json({
      success: true,
      count: promotions.length,
      data: promotions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createPromotion = async (req, res) => {
  try {
    const { personnelId, rankFrom, rankTo, promotionDate, orderNumber } = req.body;
    if (!personnelId || !rankFrom || !rankTo || !promotionDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: personnelId, rankFrom, rankTo, promotionDate are required'
      });
    }

    const created = await db.createPromotion(req.body);
    res.status(201).json({
      success: true,
      message: 'Promotion record logged and personnel rank updated successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const success = await db.deletePromotion(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Promotion record not found' });
    }
    res.json({
      success: true,
      message: 'Promotion record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const { personnelId, rankFrom, rankTo, promotionDate } = req.body;
    if (!personnelId || !rankFrom || !rankTo || !promotionDate) {
      return res.status(400).json({ success: false, message: 'Personnel, ranks, and promotion date are required.' });
    }
    const updated = await db.updatePromotion(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Promotion record not found' });
    return res.json({ success: true, message: 'Promotion record updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
