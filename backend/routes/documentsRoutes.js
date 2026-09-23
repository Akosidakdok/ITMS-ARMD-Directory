import express from 'express';
import { db } from '../store/repository.js';
import { formatDocumentOrderNumber } from '../services/orderDocxGenerator.js';
import { getOrderPurposeLabel } from '../utils/orderCatalog.js';

const router = express.Router();

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[c] || c));

const formatDate = value => {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Generate default HTML for an administrative order
const generateAdministrativeOrderHtml = order => {
  const orderNum = order.orderNumber || order.orderNo || `ITMS-${order.series || 'SO'}-${order.purposeCode || 'GEN'}-${new Date().getFullYear()}-0001`;
  const formattedOrderNum = formatDocumentOrderNumber(orderNum);
  const issuedDate = formatDate(order.issuedDate || order.date || new Date().toISOString().slice(0, 10));
  const effectiveDate = formatDate(order.effectiveDate || order.issuedDate);
  const subject = escapeHtml(order.subject || getOrderPurposeLabel(order.purposeCode) || 'ADMINISTRATIVE ORDER');
  const description = escapeHtml(order.description || order.details || 'The personnel listed herein are covered by this administrative order in accordance with standard service directives.');
  const signatory = escapeHtml(order.signatory || 'PBGEN BENJAMIN H ACORDA');
  const signatoryTitle = escapeHtml(order.signatoryTitle || 'Director, ITMS');

  const personnelList = (order.personnelSnapshot || []).length > 0
    ? order.personnelSnapshot
    : (order.personnelIds || []).map((id, index) => ({
        fullName: `Personnel #${index + 1}`,
        rank: 'PCO/PNCO',
        badgeNo: '',
        designation: '',
        unit: ''
      }));

  let personnelTableRows = '';
  if (personnelList.length > 0) {
    personnelTableRows = personnelList.map((p, idx) => `
      <tr>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px;">${escapeHtml(p.rank || '')} ${escapeHtml(p.fullName || '')}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px; text-align: center;">${escapeHtml(p.badgeNo || '')}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px;">${escapeHtml(p.designation || p.details || '')}</td>
        <td style="border: 1px solid #94a3b8; padding: 6px 10px;">${escapeHtml(p.unit || p.sub_unit || '')}</td>
      </tr>
    `).join('');
  }

  return `
    <div style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 9pt; text-transform: uppercase;">Republic of the Philippines</p>
        <p style="margin: 0; font-size: 9pt; font-weight: bold; text-transform: uppercase;">National Police Commission</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold; text-transform: uppercase;">PHILIPPINE NATIONAL POLICE</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
        <p style="margin: 0; font-size: 8pt; color: #475569;">Camp BGen Rafael T Crame, Quezon City</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 10pt;">
        <div>
          <p style="margin: 0; font-weight: bold;">ORDER NUMBER: ${escapeHtml(formattedOrderNum)}</p>
          <p style="margin: 0; font-size: 9pt; color: #475569;">Series: ${escapeHtml(order.series || 'SO')}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0;">Date: ${escapeHtml(issuedDate)}</p>
          <p style="margin: 0; font-size: 9pt; color: #475569;">Effective: ${escapeHtml(effectiveDate)}</p>
        </div>
      </div>

      <div style="text-align: center; margin: 24px 0 16px 0;">
        <h2 style="margin: 0; font-size: 13pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
          ${order.orderType ? escapeHtml(order.orderType).toUpperCase() : 'ADMINISTRATIVE ORDER'}
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #1e293b;">
          SUBJECT: ${subject}
        </p>
      </div>

      <p style="text-align: justify; text-indent: 36px; margin-bottom: 16px;">
        Pursuant to the provisions of PNP rules and existing administrative regulations, the following official actions and designations are hereby announced and directed for compliance:
      </p>

      <p style="text-align: justify; margin-bottom: 16px;">
        ${description}
      </p>

      ${personnelList.length > 0 ? `
        <div style="margin: 20px 0;">
          <p style="font-weight: bold; margin-bottom: 8px;">AFFECTED PERSONNEL:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1px solid #94a3b8; padding: 6px; width: 40px; text-align: center;">#</th>
                <th style="border: 1px solid #94a3b8; padding: 6px; text-align: left;">Rank & Name</th>
                <th style="border: 1px solid #94a3b8; padding: 6px; width: 90px; text-align: center;">Badge No.</th>
                <th style="border: 1px solid #94a3b8; padding: 6px; text-align: left;">Designation / Details</th>
                <th style="border: 1px solid #94a3b8; padding: 6px; text-align: left;">Unit / Office</th>
              </tr>
            </thead>
            <tbody>
              ${personnelTableRows}
            </tbody>
          </table>
        </div>
      ` : ''}

      <p style="text-align: justify; text-indent: 36px; margin-top: 20px; margin-bottom: 40px;">
        All concerned personnel shall report to their designated units or comply with the stipulated directives immediately upon the effectivity of this Order. Official records shall be updated accordingly.
      </p>

      <div style="margin-top: 48px; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 240px;">
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">${signatory}</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt;">${signatoryTitle}</p>
        </div>
      </div>
    </div>
  `;
};

// GET /api/documents - List documents
router.get('/', async (req, res) => {
  try {
    const { type, status, orderId, search, archived } = req.query;
    const documents = await db.getAllDocuments({
      type: type ? String(type) : undefined,
      status: status ? String(status) : undefined,
      orderId: orderId ? String(orderId) : undefined,
      search: search ? String(search) : undefined,
      archived: archived === 'true'
    });
    return res.json({ success: true, data: documents });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to list documents', error: error.message });
  }
});

// GET /api/documents/templates - List templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await db.getAllDocumentTemplates();
    return res.json({ success: true, data: templates });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to list templates', error: error.message });
  }
});

// POST /api/documents/templates - Save template
router.post('/templates', async (req, res) => {
  try {
    const template = await db.saveDocumentTemplate(req.body);
    return res.json({ success: true, data: template });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to save template', error: error.message });
  }
});

// GET /api/documents/order/:orderId - Retrieve or initialize document for an order
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Administrative Order not found' });
    }

    // Check if an existing document is linked to this order
    let document = await db.getDocumentByOrderId(orderId);
    if (document) {
      return res.json({ success: true, data: { document, order } });
    }

    // Initialize document from order data
    const title = `${order.orderNumber || order.orderNo || 'Order'} - ${order.subject || 'Administrative Action'}`;
    const initialHtml = generateAdministrativeOrderHtml(order);

    document = await db.createDocument({
      title,
      description: order.subject || order.description || 'Administrative Order Document',
      document_type: order.orderType || 'Administrative Order',
      content_json: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'center' },
            content: [{ type: 'text', text: 'PHILIPPINE NATIONAL POLICE' }]
          }
        ]
      },
      content_html: initialHtml,
      status: 'Draft',
      order_id: orderId,
      personnel_ids: order.personnelIds || [],
      created_by: req.user?.displayName || req.user?.email || 'System'
    });

    return res.json({ success: true, data: { document, order, created: true } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load order document', error: error.message });
  }
});

// POST /api/documents/order/:orderId/save - Save edited document for an administrative order
router.post('/order/:orderId/save', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Administrative Order not found' });
    }

    const { content_json, content_html, title, change_summary } = req.body;
    let document = await db.getDocumentByOrderId(orderId);

    if (document) {
      document = await db.updateDocument(document.id, {
        content_json,
        content_html,
        title: title || document.title,
        updated_by: req.user?.displayName || req.user?.email || 'System',
        incrementVersion: true,
        change_summary: change_summary || 'Updated via Document Editor'
      });
    } else {
      document = await db.createDocument({
        title: title || `${order.orderNumber || order.orderNo || 'Order'} - ${order.subject || 'Document'}`,
        document_type: order.orderType || 'Administrative Order',
        content_json,
        content_html,
        order_id: orderId,
        personnel_ids: order.personnelIds || [],
        created_by: req.user?.displayName || req.user?.email || 'System'
      });
    }

    return res.json({
      success: true,
      message: 'Document saved successfully while preserving order unsigned status.',
      data: { document, order }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to save order document', error: error.message });
  }
});

// GET /api/documents/:id - Get document by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load document', error: error.message });
  }
});

// POST /api/documents - Create new document
router.post('/', async (req, res) => {
  try {
    const doc = await db.createDocument({
      ...req.body,
      created_by: req.user?.displayName || req.user?.email || req.body.created_by || 'System'
    });
    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create document', error: error.message });
  }
});

// PUT /api/documents/:id - Update document
router.put('/:id', async (req, res) => {
  try {
    const updated = await db.updateDocument(req.params.id, {
      ...req.body,
      updated_by: req.user?.displayName || req.user?.email || req.body.updated_by || 'System'
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Document not found' });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update document', error: error.message });
  }
});

// DELETE /api/documents/:id - Archive or delete document
router.delete('/:id', async (req, res) => {
  try {
    const hard = req.query.hard === 'true';
    await db.deleteDocument(req.params.id, hard);
    return res.json({ success: true, message: hard ? 'Document permanently deleted' : 'Document archived' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete document', error: error.message });
  }
});

// GET /api/documents/:id/versions - List versions
router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await db.getDocumentVersions(req.params.id);
    return res.json({ success: true, data: versions });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to list versions', error: error.message });
  }
});

// POST /api/documents/:id/versions/:versionNumber/restore - Restore version
router.post('/:id/versions/:versionNumber/restore', async (req, res) => {
  try {
    const actor = req.user?.displayName || req.user?.email || 'System';
    const restored = await db.restoreDocumentVersion(req.params.id, req.params.versionNumber, actor);
    return res.json({ success: true, message: `Restored to version ${req.params.versionNumber}`, data: restored });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
