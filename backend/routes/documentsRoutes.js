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
  const seriesHeading = order.seriesHeading || (order.series === 'GO' ? 'GENERAL ORDERS' : order.series === 'LO' ? 'LETTER ORDERS' : 'ADMINISTRATIVE ORDERS');
  const subject = escapeHtml(order.subject || getOrderPurposeLabel(order.purposeCode) || 'ADMINISTRATIVE ORDER');
  const description = escapeHtml(order.description || order.details || 'The following-named personnel of this Service are hereby covered by this administrative order:');
  const signatory = escapeHtml(order.signatory || 'PBGEN BENJAMIN H ACORDA');
  const signatoryTitle = escapeHtml(order.signatoryTitle || 'Director, ITMS');
  const authorityText = escapeHtml(order.authorityText || 'BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:');
  const certifyingName = escapeHtml(order.certifyingOfficial || 'VICTORIO M DELA PEÑA, JR');
  const certifyingRank = escapeHtml(order.certifyingOfficialRank || 'Police Colonel');
  const certifyingPosition = escapeHtml(order.certifyingOfficialPosition || 'Chief, Administrative and Resource Management Division');
  const distribution = escapeHtml(order.distribution || 'C');

  const personnelList = (order.personnelSnapshot || []).length > 0
    ? order.personnelSnapshot
    : (order.personnelIds || []).map((id, index) => ({
        fullName: `Personnel #${index + 1}`,
        rank: 'PCO/PNCO',
        badgeNo: '',
        designation: '',
        unit: ''
      }));

  const nonDrivers = personnelList.filter(p => p.role !== 'driver');
  const drivers = personnelList.filter(p => p.role === 'driver');

  const personnelItems = nonDrivers.map((p, idx) => {
    const seq = nonDrivers.length > 1 ? `${idx + 1}. ` : '';
    const unitStr = p.unit ? ` - ${escapeHtml(p.unit)}` : '';
    const rankName = `${p.rank ? `${escapeHtml(p.rank)} ` : ''}${escapeHtml(p.fullName || '')}`.trim();
    return `<p style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">${seq}${rankName}${unitStr}</p>`;
  }).join('\n');

  const driverItems = drivers.map(p => {
    const rankName = `${p.rank ? `${escapeHtml(p.rank)} ` : ''}${escapeHtml(p.fullName || '')}`.trim();
    return `<p style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">Driver: ${rankName}</p>`;
  }).join('\n');

  return `
    <div class="pais-order-document-root" style="font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.15; color: #000000; box-sizing: border-box;">
      <div style="text-align: center; margin-bottom: 18px;">
        <p style="margin: 0; font-size: 10pt; line-height: 1.15;">Republic of the Philippines</p>
        <p style="margin: 0; font-size: 10pt; line-height: 1.15;">NATIONAL POLICE COMMISSION</p>
        <p style="margin: 0; font-size: 11pt; font-weight: bold; line-height: 1.15;">PHILIPPINE NATIONAL POLICE</p>
        <p style="margin: 0; font-size: 11pt; font-weight: bold; line-height: 1.15;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
        <p style="margin: 0; font-size: 10pt; line-height: 1.15;">Camp BGen Rafael T. Crame, Quezon City</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: none;">
        <tbody>
          <tr style="border: none;">
            <td style="text-align: left; vertical-align: top; border: none; padding: 0; font-weight: bold; font-size: 12pt;">
              ITMS
            </td>
            <td style="text-align: right; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
              ${escapeHtml(issuedDate)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-bottom: 14px;">
        <p style="margin: 0; font-weight: bold; font-size: 12pt; text-transform: uppercase;">${escapeHtml(seriesHeading)}</p>
        <p style="margin: 0; font-weight: bold; font-size: 12pt;">NUMBER ${escapeHtml(formattedOrderNum)}</p>
      </div>

      <div style="margin-bottom: 14px;">
        <p style="margin: 0; font-weight: bold; font-size: 12pt;">SUBJECT&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;${subject}</p>
      </div>

      <p style="margin: 0 0 12px 0; text-align: justify; text-indent: 36pt; font-size: 12pt; line-height: 1.2;">
        ${description}
      </p>

      <div style="margin-bottom: 16px;">
        ${personnelItems}
        ${driverItems}
      </div>

      <div style="text-align: center; margin: 18px 0 16px 0;">
        <p style="margin: 0; font-weight: bold; font-size: 12pt;">${authorityText}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: none;">
        <tbody>
          <tr style="border: none;">
            <td style="width: 45%; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
              <p style="margin: 0;">OFFICIAL:</p>
            </td>
            <td style="width: 10%; border: none; padding: 0;"></td>
            <td style="width: 45%; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
              <p style="margin: 0; font-weight: bold; font-style: italic;">${signatory}</p>
              <p style="margin: 0;">Police Brigadier General</p>
              <p style="margin: 0;">${signatoryTitle}</p>
            </td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; padding: 0;"></td>
            <td style="border: none; padding: 0;"></td>
            <td style="vertical-align: top; border: none; padding: 18px 0 0 0; font-size: 12pt;">
              <p style="margin: 0; font-weight: bold; font-style: italic;">${certifyingName}</p>
              <p style="margin: 0;">${certifyingRank}</p>
              <p style="margin: 0;">${certifyingPosition}</p>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 14px;">
        <p style="margin: 0; font-size: 12pt;">DISTRIBUTION:</p>
        <p style="margin: 0; font-size: 12pt; padding-left: 48px;">&ldquo;${distribution}&rdquo;</p>
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
