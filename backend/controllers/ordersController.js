import { db } from '../store/repository.js';
import mammoth from 'mammoth';
import { ORDER_PURPOSE_CODES, ORDER_SERIES_CODES } from '../utils/orderNumber.js';
import { validateOrderPurposePayload } from '../utils/orderCatalog.js';
import { ORDER_LOCKED_STATUSES, normalizeOrderStatus } from '../utils/orderWorkflow.js';
import {
  buildOrderDocumentPath,
  buildGeneratedOrderDocumentPath,
  buildSignedOrderDocumentPath,
  createOrderDocumentUrl,
  downloadOrderDocument,
  GENERATED_ORDER_DOCUMENT_MIME,
  isSignedOrderImage,
  isDocxZip,
  removeOrderDocument,
  uploadOrderDocument as storeOrderDocument
} from '../services/orderDocumentStorage.js';
import { generateOrderDocx } from '../services/orderDocxGenerator.js';

const getPersonnelDisplayName = person => person.fullName || [person.rank, person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');

const prepareOrderPersonnel = async body => {
  const hasInvolvementPayload = Array.isArray(body?.personnelInvolvement);
  const hasIdsPayload = Array.isArray(body?.personnelIds);
  if (!hasInvolvementPayload && !hasIdsPayload) return {};

  const rawInvolvement = hasInvolvementPayload
    ? body.personnelInvolvement
    : body.personnelIds.map((personnelId, index) => ({ personnelId, role: 'affected', sequence: index + 1 }));
  const involvement = rawInvolvement.map((entry, index) => ({
    personnelId: String(entry?.personnelId || '').trim(),
    role: entry?.role || 'affected',
    sequence: Number.isInteger(entry?.sequence) ? entry.sequence : index + 1,
    ...(entry?.remarks ? { remarks: String(entry.remarks).trim() } : {})
  }));
  const personnelIds = [...new Set(involvement.map(entry => entry.personnelId).filter(Boolean))];
  const people = await Promise.all(personnelIds.map(personnelId => db.getPersonnelById(personnelId)));
  const missing = personnelIds.filter((personnelId, index) => !people[index]);
  if (missing.length) throw new Error(`Unknown personnel reference${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}`);

  const peopleById = new Map(people.filter(Boolean).map(person => [String(person.id), person]));
  const personnelSnapshot = involvement.map(entry => {
    const person = peopleById.get(entry.personnelId);
    return {
      personnelId: entry.personnelId,
      role: entry.role,
      sequence: entry.sequence,
      ...(entry.remarks ? { remarks: entry.remarks } : {}),
      rank: person.rank || '',
      fullName: getPersonnelDisplayName(person),
      badgeNo: person.badgeNo || '',
      unit: person.sub_unit || person.division || person.unitCategory || '',
      designation: person.designation || ''
    };
  });

  return { personnelIds, personnelInvolvement: involvement, personnelSnapshot };
};

const isOrderValidationError = message => /Invalid order|Unknown personnel|is required for|allows only|not supported for/i.test(message);

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
    const personnelPayload = await prepareOrderPersonnel(req.body);
    if (normalizeOrderStatus(req.body) === 'Signed' && !req.body.signedDocument?.storagePath) {
      return res.status(409).json({ success: false, message: 'A signed order scan must be uploaded before creating a Signed order.' });
    }
    const purposeErrors = validateOrderPurposePayload({ ...req.body, ...personnelPayload });
    if (purposeErrors.length) {
      return res.status(400).json({ success: false, message: purposeErrors.join(' ') });
    }

    const created = await db.createOrder({
      ...req.body,
      ...personnelPayload,
      createdBy: req.user?.displayName || req.user?.email || req.user?.id || 'system'
    });
    res.status(201).json({
      success: true,
      message: 'Official order issued successfully',
      data: created
    });
  } catch (error) {
    res.status(isOrderValidationError(error.message) ? 400 : 500).json({ success: false, message: error.message, error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const existing = await db.getOrderById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
    const personnelPayload = await prepareOrderPersonnel(req.body);
    const purposeErrors = validateOrderPurposePayload({
      ...req.body,
      ...(req.body.purposeCode ? {} : { purposeCode: existing.purposeCode })
    });
    if (purposeErrors.length) return res.status(400).json({ success: false, message: purposeErrors.join(' ') });
    const updated = await db.updateOrder(req.params.id, {
      ...req.body,
      ...personnelPayload,
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
    const isWorkflowError = /locked|workflow action|cannot be changed|generated by the system/i.test(error.message);
    res.status(isOrderValidationError(error.message) ? 400 : (isWorkflowError ? 409 : 500)).json({ success: false, message: error.message, error: error.message });
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
    const missingSignedScan = /signed order image must be uploaded/i.test(error.message);
    res.status(missingSignedScan ? 409 : isWorkflowError ? 400 : 500).json({ success: false, message: error.message, error: error.message });
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

export const regenerateOrderDocument = async (req, res) => {
  let generatedPath = '';
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (ORDER_LOCKED_STATUSES.includes(normalizeOrderStatus(order))) {
      return res.status(409).json({ success: false, message: 'Generated documents cannot be replaced on locked orders.' });
    }

    const version = Number(order.generatedDocument?.version || 0) + 1;
    const { buffer, manifest } = await generateOrderDocx({
      ...order,
      generatedBy: req.user?.displayName || req.user?.email || req.user?.id || 'system'
    });
    generatedPath = buildGeneratedOrderDocumentPath({ order, version });
    await storeOrderDocument({ path: generatedPath, buffer, contentType: GENERATED_ORDER_DOCUMENT_MIME });

    const generatedDocument = {
      fileName: `${order.orderNumber || order.id}.docx`,
      fileMimeType: GENERATED_ORDER_DOCUMENT_MIME,
      fileSize: buffer.length,
      storagePath: generatedPath,
      version,
      templateKey: manifest.templateKey,
      templateVersion: manifest.templateVersion,
      generatedAt: manifest.generatedAt,
      generatedBy: manifest.generatedBy
    };
    let updated;
    try {
      updated = await db.attachGeneratedOrderDocument(req.params.id, {
        generatedDocument,
        generationManifest: manifest,
        templateKey: manifest.templateKey,
        templateVersion: manifest.templateVersion
      });
    } catch (error) {
      await removeOrderDocument(generatedPath).catch(() => {});
      throw error;
    }
    if (order.generatedDocument?.storagePath && order.generatedDocument.storagePath !== generatedPath) {
      await removeOrderDocument(order.generatedDocument.storagePath).catch(() => {});
    }
    res.status(201).json({ success: true, message: 'Generated order document created successfully.', data: updated });
  } catch (error) {
    if (generatedPath) await removeOrderDocument(generatedPath).catch(() => {});
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const getGeneratedOrderDocument = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const document = order.generatedDocument;
    if (!document?.storagePath) return res.status(404).json({ success: false, message: 'This order has no generated document.' });
    const downloadName = req.query.download === '1'
      ? `${order.orderNumber || order.id}.docx`
      : undefined;
    const url = await createOrderDocumentUrl(document.storagePath, downloadName);
    res.json({ success: true, data: { ...document, url, expiresIn: 300 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const previewGeneratedOrderDocument = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const document = order.generatedDocument;
    if (!document?.storagePath) return res.status(404).json({ success: false, message: 'This order has no generated document.' });
    const buffer = await downloadOrderDocument(document.storagePath);
    const result = await mammoth.convertToHtml({ buffer });
    res.json({
      success: true,
      data: { fileName: document.fileName, html: result.value, messages: result.messages || [] }
    });
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
    const downloadName = req.query.download === '1'
      ? `${order.orderNumber || order.id}.docx`
      : undefined;
    const url = await createOrderDocumentUrl(order.storagePath, downloadName);
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

export const uploadSignedOrderDocument = async (req, res) => {
  let uploadedPath = '';
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (ORDER_LOCKED_STATUSES.includes(normalizeOrderStatus(order))) {
      return res.status(409).json({ success: false, message: 'Signed scans cannot be replaced on locked orders.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'Select a signed JPEG, PNG, or WEBP scan.' });
    if (!isSignedOrderImage(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'The selected file is not a valid JPEG, PNG, or WEBP image.' });
    }

    const extension = req.file.mimetype === 'image/jpeg' ? 'jpg' : req.file.mimetype.split('/')[1];
    const version = Number(order.signedDocument?.version || 0) + 1;
    uploadedPath = buildSignedOrderDocumentPath({ order, version, extension });
    await storeOrderDocument({ path: uploadedPath, buffer: req.file.buffer, contentType: req.file.mimetype });
    let updated;
    try {
      updated = await db.attachSignedOrderDocument(req.params.id, {
        signedDocument: {
          fileName: req.file.originalname,
          fileMimeType: req.file.mimetype,
          fileSize: req.file.size,
          storagePath: uploadedPath,
          version,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user?.displayName || req.user?.email || req.user?.id || 'system'
        }
      });
    } catch (error) {
      await removeOrderDocument(uploadedPath).catch(() => {});
      throw error;
    }
    if (order.signedDocument?.storagePath && order.signedDocument.storagePath !== uploadedPath) {
      await removeOrderDocument(order.signedDocument.storagePath).catch(() => {});
    }
    res.status(201).json({ success: true, message: 'Signed order scan uploaded successfully.', data: updated });
  } catch (error) {
    if (uploadedPath) await removeOrderDocument(uploadedPath).catch(() => {});
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const getSignedOrderDocument = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const document = order.signedDocument;
    if (!document?.storagePath) return res.status(404).json({ success: false, message: 'This order has no signed scan.' });
    const signedExtension = document.fileMimeType === 'image/jpeg'
      ? 'jpg'
      : document.fileMimeType?.split('/')[1] || 'png';
    const downloadName = req.query.download === '1'
      ? `${order.orderNumber || order.id}-SIGNED.${signedExtension}`
      : undefined;
    const url = await createOrderDocumentUrl(document.storagePath, downloadName);
    res.json({ success: true, data: { ...document, url, expiresIn: 300 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const deleteSignedOrderDocument = async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (ORDER_LOCKED_STATUSES.includes(normalizeOrderStatus(order))) {
      return res.status(409).json({ success: false, message: 'Signed scans cannot be removed from locked orders.' });
    }
    if (order.signedDocument?.storagePath) await removeOrderDocument(order.signedDocument.storagePath);
    const updated = await db.clearSignedOrderDocument(req.params.id);
    res.json({ success: true, message: 'Signed order scan removed.', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};
