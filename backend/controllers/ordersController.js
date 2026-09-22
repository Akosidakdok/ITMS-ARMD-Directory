import { db } from '../store/repository.js';
import mammoth from 'mammoth';
import { ORDER_PURPOSE_CODES, ORDER_SERIES_CODES } from '../utils/orderNumber.js';
import { ORDER_LOCKED_STATUSES, normalizeOrderStatus } from '../utils/orderWorkflow.js';
import {
  buildOrderDocumentPath,
  createOrderDocumentUrl,
  downloadOrderDocument,
  isDocxZip,
  removeOrderDocument,
  uploadOrderDocument as storeOrderDocument
} from '../services/orderDocumentStorage.js';

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
    const { series, purposeCode, orderType, subject, issuedDate } = req.body;
    if (!series || !purposeCode || !orderType || !subject || !issuedDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: series, purposeCode, orderType, subject, and issuedDate are required'
      });
    }
    if (!ORDER_SERIES_CODES.has(series)) {
      return res.status(400).json({ success: false, message: 'Invalid order series. Use GO, SO, or LO.' });
    }
    if (!ORDER_PURPOSE_CODES.has(purposeCode)) {
      return res.status(400).json({ success: false, message: 'Invalid order purpose code.' });
    }

    const created = await db.createOrder({
      ...req.body,
      createdBy: req.user?.displayName || req.user?.email || req.user?.id || 'system'
    });
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
    const updated = await db.updateOrder(req.params.id, {
      ...req.body,
      updatedBy: req.user?.displayName || req.user?.email || req.user?.id || 'system'
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({
      success: true,
      message: 'Order updated successfully',
      data: updated
    });
  } catch (error) {
    const isWorkflowError = /locked|workflow action/i.test(error.message);
    res.status(isWorkflowError ? 409 : 500).json({ success: false, message: error.message, error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const currentStatus = normalizeOrderStatus(order);
    if (!['Draft', 'Revoked'].includes(currentStatus)) {
      return res.status(409).json({
        success: false,
        message: `Only Draft or Revoked orders can be deleted. ${currentStatus} orders remain in the register.`
      });
    }
    const success = await db.deleteOrder(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.storagePath) await removeOrderDocument(order.storagePath).catch(() => {});
    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const restoreOrder = async (req, res) => {
  try {
    const restored = await db.restoreRevokedOrder(req.params.id, {
      actor: req.user?.displayName || req.user?.email || req.user?.id || 'system',
      reason: String(req.body?.reason || '').trim()
    });
    if (!restored) return res.status(404).json({ success: false, message: 'Order not found' });
    const status = normalizeOrderStatus(restored);
    res.json({ success: true, message: `Order restored to ${status}.`, data: restored });
  } catch (error) {
    const isWorkflowError = /Only revoked|restore/i.test(error.message);
    res.status(isWorkflowError ? 409 : 500).json({ success: false, message: error.message, error: error.message });
  }
};

export const transitionOrderStatus = async (req, res) => {
  try {
    const { status, reason } = req.body || {};
    if (!status) return res.status(400).json({ success: false, message: 'A target status is required.' });
    const updated = await db.transitionOrderStatus(req.params.id, status, {
      actor: req.user?.displayName || req.user?.email || req.user?.id || 'system',
      reason
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: `Order moved to ${status}.`, data: updated });
  } catch (error) {
    const isWorkflowError = /Invalid order status/.test(error.message);
    res.status(isWorkflowError ? 400 : 500).json({ success: false, message: error.message, error: error.message });
  }
};

export const getOrderStatusHistory = async (req, res) => {
  try {
    const history = await db.getOrderStatusHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const uploadOrderDocument = async (req, res) => {
  let uploadedPath = '';
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (ORDER_LOCKED_STATUSES.includes(normalizeOrderStatus(order))) {
      return res.status(409).json({ success: false, message: 'Documents cannot be replaced on locked orders.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'Select a .docx file to upload.' });
    if (!isDocxZip(req.file.buffer)) {
      return res.status(400).json({ success: false, message: 'The selected file is not a valid DOCX package.' });
    }

    const version = Number(order.documentVersion || 0) + 1;
    uploadedPath = buildOrderDocumentPath({ order, version });
    await storeOrderDocument({
      path: uploadedPath,
      buffer: req.file.buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    let updated;
    try {
      updated = await db.attachOrderDocument(req.params.id, {
        fileName: req.file.originalname,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: req.file.size,
        storagePath: uploadedPath,
        documentVersion: version,
        documentUploadedAt: new Date().toISOString()
      });
    } catch (error) {
      await removeOrderDocument(uploadedPath).catch(() => {});
      throw error;
    }
    if (order.storagePath && order.storagePath !== uploadedPath) {
      await removeOrderDocument(order.storagePath).catch(() => {});
    }
    res.status(201).json({ success: true, message: 'DOCX document uploaded successfully.', data: updated });
  } catch (error) {
    if (uploadedPath) await removeOrderDocument(uploadedPath).catch(() => {});
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const getOrderDocument = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.storagePath) return res.status(404).json({ success: false, message: 'This order has no uploaded document.' });
    const url = await createOrderDocumentUrl(order.storagePath);
    res.json({ success: true, data: { url, fileName: order.fileName, expiresIn: 300 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const previewOrderDocument = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.storagePath) return res.status(404).json({ success: false, message: 'This order has no uploaded document.' });
    const buffer = await downloadOrderDocument(order.storagePath);
    const result = await mammoth.convertToHtml({ buffer });
    res.json({
      success: true,
      data: {
        fileName: order.fileName,
        html: result.value,
        messages: result.messages || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const deleteOrderDocument = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (ORDER_LOCKED_STATUSES.includes(normalizeOrderStatus(order))) {
      return res.status(409).json({ success: false, message: 'Documents cannot be removed from locked orders.' });
    }
    if (order.storagePath) await removeOrderDocument(order.storagePath);
    const updated = await db.clearOrderDocument(req.params.id);
    res.json({ success: true, message: 'Order document removed.', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};
