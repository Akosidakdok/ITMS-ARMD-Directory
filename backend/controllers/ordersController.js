import { db } from '../store/repository.js';

export const getAllOrders = async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { orderNumber, orderType, subject, issuedDate, effectiveDate } = req.body;
    if (!orderNumber || !orderType || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderNumber, orderType, and subject are required'
      });
    }

    const created = await db.createOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Official order issued successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const updated = await db.updateOrder(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({
      success: true,
      message: 'Order updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const success = await db.deleteOrder(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
