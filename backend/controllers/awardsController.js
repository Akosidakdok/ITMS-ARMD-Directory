import { db } from '../store/repository.js';

const AWARD_ORDER_TYPES = new Set([
  'General Order',
  'Special Order',
  'Letter Order'
]);

const cleanText = value => typeof value === 'string' ? value.trim() : '';

export const getAllAwards = async (req, res) => {
  try {
    const awards = await db.getAwards(req.query.personnelId);
    res.json({
      success: true,
      count: awards.length,
      data: awards
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load awards', error: error.message });
  }
};

export const createAward = async (req, res) => {
  try {
    const award = {
      id: cleanText(req.body.id),
      orderType: cleanText(req.body.orderType),
      title: cleanText(req.body.title),
      citationDetails: cleanText(req.body.citationDetails),
      awardName: cleanText(req.body.awardName),
      authorityDate: cleanText(req.body.authorityDate),
      personnelId: cleanText(req.body.personnelId),
      personnelName: cleanText(req.body.personnelName),
      status: 'Active'
    };

    const missing = [
      'orderType',
      'title',
      'citationDetails',
      'awardName',
      'authorityDate',
      'personnelId',
      'personnelName'
    ].filter(field => !award[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }
    if (!AWARD_ORDER_TYPES.has(award.orderType)) {
      return res.status(400).json({
        success: false,
        message: 'Order Type must be General Order, Special Order, or Letter Order'
      });
    }
    if (Number.isNaN(Date.parse(award.authorityDate))) {
      return res.status(400).json({ success: false, message: 'Authority Date is invalid' });
    }

    const created = await db.createAward(award);
    return res.status(201).json({
      success: true,
      message: 'Award record saved successfully',
      data: created
    });
  } catch (error) {
    if (error.code === 'PGRST205' || error.message.includes("table 'public.awards'")) {
      return res.status(503).json({
        success: false,
        message: 'The Supabase awards table is not installed. Run backend/scripts/migrate_awards_and_leave.sql in the Supabase SQL Editor, then try again.',
        error: error.message
      });
    }
    if (error.code === '42501' || error.message.includes('row-level security policy')) {
      return res.status(403).json({
        success: false,
        message: 'Supabase is blocking Award inserts through Row Level Security. Run backend/scripts/fix_awards_rls.sql in the Supabase SQL Editor, then try again.',
        error: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Unable to save award record',
      error: error.message
    });
  }
};

export const updateAward = async (req, res) => {
  try {
    const award = {
      orderType: cleanText(req.body.orderType),
      title: cleanText(req.body.title),
      citationDetails: cleanText(req.body.citationDetails),
      awardName: cleanText(req.body.awardName),
      authorityDate: cleanText(req.body.authorityDate),
      personnelId: cleanText(req.body.personnelId),
      personnelName: cleanText(req.body.personnelName),
      status: cleanText(req.body.status) || 'Active'
    };

    const missing = [
      'orderType',
      'title',
      'citationDetails',
      'awardName',
      'authorityDate',
      'personnelId',
      'personnelName'
    ].filter(field => !award[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }
    if (!AWARD_ORDER_TYPES.has(award.orderType)) {
      return res.status(400).json({
        success: false,
        message: 'Order Type must be General Order, Special Order, or Letter Order'
      });
    }
    if (Number.isNaN(Date.parse(award.authorityDate))) {
      return res.status(400).json({ success: false, message: 'Authority Date is invalid' });
    }

    const updated = await db.updateAward(req.params.id, award);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Award record not found' });
    }
    return res.json({
      success: true,
      message: 'Award record updated successfully',
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to update award record',
      error: error.message
    });
  }
};

export const deleteAward = async (req, res) => {
  try {
    const success = await db.deleteAward(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Award record not found' });
    }
    return res.json({
      success: true,
      message: 'Award record deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to delete award record',
      error: error.message
    });
  }
};
