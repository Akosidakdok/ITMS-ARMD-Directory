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

function isValidCalendarDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

export const createPromotion = async (req, res) => {
  try {
    const { personnelId, rankFrom, rankTo, promotionDate, orderNumber } = req.body;
    if (!personnelId || !rankFrom || !rankTo || !promotionDate || !orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: personnelId, rankFrom, rankTo, promotionDate, and orderNumber are required.'
      });
    }

    if (rankFrom.trim() === rankTo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Previous rank and new promoted rank cannot be identical.'
      });
    }

    if (!isValidCalendarDate(promotionDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promotion date. Must be a valid calendar date in YYYY-MM-DD format.'
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
      message: 'Promotion record deleted and personnel rank synchronized successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const { personnelId, rankFrom, rankTo, promotionDate, orderNumber } = req.body;
    if (!personnelId || !rankFrom || !rankTo || !promotionDate || !orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Personnel, ranks, promotion date, and order number are required.'
      });
    }

    if (rankFrom.trim() === rankTo.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Previous rank and new promoted rank cannot be identical.'
      });
    }

    if (!isValidCalendarDate(promotionDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promotion date. Must be a valid calendar date in YYYY-MM-DD format.'
      });
    }

    const updated = await db.updatePromotion(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Promotion record not found' });
    return res.json({ success: true, message: 'Promotion record updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
