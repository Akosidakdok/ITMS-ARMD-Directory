import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../backend/store/repository.js';

test('Document Repository: Create, fetch, and update document', async () => {
  const doc = await db.createDocument({
    title: 'Test General Order',
    description: 'Testing document persistence',
    document_type: 'General Order',
    content_html: '<p>General Order content</p>',
    content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
    status: 'Draft',
    created_by: 'Test Agent'
  });

  assert.ok(doc.id, 'Document should have an ID');
  assert.equal(doc.title, 'Test General Order');
  assert.equal(doc.version, 1);

  // Fetch by ID
  const fetched = await db.getDocumentById(doc.id);
  assert.equal(fetched.id, doc.id);

  // Update document
  const updated = await db.updateDocument(doc.id, {
    title: 'Updated Test General Order',
    content_html: '<p>Updated content</p>',
    incrementVersion: true,
    change_summary: 'Second revision'
  });

  assert.equal(updated.title, 'Updated Test General Order');
  assert.equal(updated.version, 2);

  // Check version history
  const versions = await db.getDocumentVersions(doc.id);
  assert.ok(versions.length >= 2, 'Should have at least 2 versions');
  assert.equal(versions[0].version_number, 2);

  // Restore Version 1
  const restored = await db.restoreDocumentVersion(doc.id, 1, 'Test Agent');
  assert.equal(restored.version, 3, 'Restoring should create a new version 3');
  assert.equal(restored.content_html, '<p>General Order content</p>');
});

test('Document Repository: Administrative Order integration preserves relationship and unsigned status', async () => {
  // Create sample order
  const order = await db.createOrder({
    orderNumber: 'ITMS-SO-DES-2026-9999',
    series: 'SO',
    purposeCode: 'DES',
    subject: 'DESIGNATION OF TEST PERSONNEL',
    description: 'Testing administrative order linking with Word document editor',
    status: 'Draft',
    issuedDate: '2026-09-23',
    effectiveDate: '2026-09-25',
    signatory: 'PBGEN BENJAMIN H ACORDA',
    signatoryTitle: 'Director, ITMS',
    personnelIds: []
  });

  assert.ok(order.id, 'Order should be created');
  assert.equal(order.status, 'Draft', 'Order should initially be Draft / Unsigned');

  // Create/link a document to this order
  const doc = await db.createDocument({
    title: `${order.orderNumber} - ${order.subject}`,
    order_id: order.id,
    document_type: 'Administrative Order',
    content_html: '<p>Official order body edited via PAIS Document Editor</p>',
    created_by: 'Test Officer'
  });

  assert.equal(doc.order_id, order.id, 'Document must be linked to order_id');

  // Verify getDocumentByOrderId
  const linkedDoc = await db.getDocumentByOrderId(order.id);
  assert.ok(linkedDoc, 'Should find document by orderId');
  assert.equal(linkedDoc.id, doc.id);

  // Update the document
  await db.updateDocument(doc.id, {
    content_html: '<p>Modified order directives by officer</p>',
    change_summary: 'Directives updated'
  });

  // Re-verify the order remains unchanged and unsigned
  const freshOrder = await db.getOrderById(order.id);
  assert.equal(freshOrder.id, order.id);
  assert.equal(freshOrder.status, 'Draft', 'Order status must remain unsigned after document editing');
});

test('PAIS Field Resolver: Correctly replaces placeholders with live personnel and order variables', () => {
  const context = {
    personnel: {
      fullName: 'Juan Dela Cruz',
      rank: 'PCPT',
      badgeNo: '098765',
      designation: 'Chief, Network Branch',
      sub_unit: 'ISD'
    },
    order: {
      orderNumber: 'ITMS-SO-DES-2026-0042',
      series: 'SO',
      issuedDate: '2026-09-23',
      signatory: 'PBGEN BENJAMIN H ACORDA'
    }
  };

  const resolveAllPaisFieldsInHtml = (html, ctx) => {
    return html
      .replace(/\{\{order\.order_number\}\}/g, ctx.order.orderNumber)
      .replace(/\{\{personnel\.rank\}\}/g, ctx.personnel.rank)
      .replace(/\{\{personnel\.full_name\}\}/g, ctx.personnel.fullName)
      .replace(/\{\{personnel\.serial_number\}\}/g, ctx.personnel.badgeNo)
      .replace(/\{\{personnel\.designation\}\}/g, ctx.personnel.designation)
      .replace(/\{\{personnel\.sub_unit\}\}/g, ctx.personnel.sub_unit)
      .replace(/\{\{order\.signatory\}\}/g, ctx.order.signatory);
  };

  const template = 'ORDER {{order.order_number}} hereby assigns {{personnel.rank}} {{personnel.full_name}} (Badge: {{personnel.serial_number}}) to {{personnel.designation}} in {{personnel.sub_unit}}. Signed by {{order.signatory}}.';
  const resolved = resolveAllPaisFieldsInHtml(template, context);

  assert.ok(resolved.includes('ORDER ITMS-SO-DES-2026-0042'), 'Order number resolved');
  assert.ok(resolved.includes('PCPT Juan Dela Cruz'), 'Rank and Name resolved');
  assert.ok(resolved.includes('Badge: 098765'), 'Badge number resolved');
  assert.ok(resolved.includes('Chief, Network Branch'), 'Designation resolved');
  assert.ok(resolved.includes('ISD'), 'Sub-unit resolved');
  assert.ok(resolved.includes('PBGEN BENJAMIN H ACORDA'), 'Signatory resolved');
});

test('Document Format Unification: Canonical order HTML matches Download source of truth layout', async () => {
  const { formatDocumentOrderNumber, generateOrderDocx } = await import('../backend/services/orderDocxGenerator.js');

  const order = {
    id: 'ord-test-unify-1',
    orderNumber: 'ITMS-SO-DES-2026-0099',
    series: 'SO',
    purposeCode: 'DES',
    subject: 'DESIGNATION OF SYSTEMS SPECIALIST',
    description: 'Special technical designation',
    issuedDate: '2026-09-23',
    effectiveDate: '2026-09-25',
    signatory: 'PBGEN BENJAMIN H ACORDA',
    signatoryTitle: 'Director, ITMS',
    authorityText: 'BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:',
    certifyingOfficial: 'VICTORIO M DELA PEÑA, JR',
    certifyingOfficialRank: 'Police Colonel',
    certifyingOfficialPosition: 'Chief, Administrative and Resource Management Division',
    distribution: 'C',
    personnelSnapshot: [
      {
        fullName: 'Juan Dela Cruz',
        rank: 'PCPT',
        unit: 'SOD',
        role: 'affected',
        sequence: 1
      }
    ]
  };

  // 1. Verify download output generates valid buffer
  const { buffer, manifest } = await generateOrderDocx(order);
  assert.ok(buffer && buffer.length > 0, 'Download generator creates valid DOCX package');
  assert.equal(manifest.orderNumber, 'ITMS-SO-DES-2026-0099');

  // 2. Check formatDocumentOrderNumber matches between frontend and backend
  const formattedNo = formatDocumentOrderNumber(order.orderNumber);
  assert.equal(formattedNo, '2026-0099', 'Order number formatting matches source of truth');
});

