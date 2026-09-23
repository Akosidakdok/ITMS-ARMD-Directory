import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx';
import { getOrderPurposeDefinition } from '../utils/orderCatalog.js';
import { ORDER_CATALOG } from '../utils/orderCatalog.js';

export const ORDER_TEMPLATE_KEY = 'pnp-itms-letter-orders';
export const ORDER_TEMPLATE_VERSION = '1.0.0';

const FONT = 'Arial';
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pnpLogoPath = path.join(rootDirectory, 'src', 'assets', 'pnp-logo-transparent.png');
const itmsLogoPath = path.join(rootDirectory, 'resources', 'ITMS-LOGO.jpg');
const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

const run = (text, options = {}) => new TextRun({ text: String(text ?? ''), font: FONT, size: 24, ...options });
const paragraph = (children = [], options = {}) => new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, ...options, children });
const textParagraph = (text, options = {}) => paragraph([run(text, options.runOptions)], options);
const blankParagraph = () => paragraph([]);

const safeText = value => String(value ?? '').trim();
export const formatDocumentOrderNumber = orderNumber => {
  const value = safeText(orderNumber);
  const parts = value.split('-');
  return parts.length >= 2 ? parts.slice(-2).join('-') : value;
};
const formatDate = value => {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateWithWeekday = value => {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' });
};

const roleLabel = role => ORDER_CATALOG.purposes
  .flatMap(purpose => purpose.personnelRoles)
  .find(item => item.code === role)?.label || role;

const getPersonnel = order => (order.personnelSnapshot || []).slice().sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

const getCommonNarrative = order => {
  const personnel = getPersonnel(order);
  const purpose = getOrderPurposeDefinition(order.purposeCode);
  const names = personnel.filter(person => person.role !== 'driver').map(person => `${person.rank} ${person.fullName}`.trim()).join(', ');
  const subject = safeText(order.subject || purpose?.label || 'administrative action');
  return `The following-named personnel of this Service are hereby covered by this ${subject.toLowerCase()} order: ${names || 'the personnel identified in this order'}.`;
};

const getTravelNarrative = order => {
  const data = order.purposeData || {};
  const destinations = Array.isArray(data.destinations)
    ? data.destinations.filter(Boolean).join(' and ')
    : safeText(data.destinations || data.destination || 'the stated destination');
  const start = formatDateWithWeekday(data.travelStartDate || order.effectiveDate || order.issuedDate);
  const end = formatDateWithWeekday(data.travelEndDate || data.travelStartDate || order.effectiveDate || order.issuedDate);
  const activity = safeText(data.activity || data.travelPurpose || order.description || 'official business');
  return `In addition to their duties and responsibilities, following-named personnel of this Service are authorized to travel to ${destinations} from ${start} to ${end} for the conduct of ${activity}:`;
};

const getNarrative = order => order.purposeCode === 'TR' ? getTravelNarrative(order) : getCommonNarrative(order);

const getPurposeDetails = order => {
  const definition = getOrderPurposeDefinition(order.purposeCode);
  const data = order.purposeData || {};
  if (!definition || order.purposeCode === 'TR') return [];
  return definition.fields
    .map(field => {
      const value = Array.isArray(data[field.key]) ? data[field.key].join(', ') : safeText(data[field.key]);
      return value ? `${field.label}: ${value}` : '';
    })
    .filter(Boolean);
};

const cell = (children, options = {}) => new TableCell({
  borders: NO_BORDERS,
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
  verticalAlign: VerticalAlign.CENTER,
  ...options,
  children: Array.isArray(children) ? children : [children]
});

const imageRun = (data, type, width, height) => new ImageRun({ data, type, transformation: { width, height } });

const buildLetterhead = (pnpLogo, itmsLogo) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: NO_BORDERS,
  columnWidths: [1600, 5944, 1600],
  rows: [new TableRow({
    children: [
      cell(paragraph([imageRun(pnpLogo, 'png', 68, 95)], { alignment: AlignmentType.CENTER })),
      cell([
        textParagraph('Republic of the Philippines', { alignment: AlignmentType.CENTER, runOptions: { size: 20 } }),
        textParagraph('NATIONAL POLICE COMMISSION', { alignment: AlignmentType.CENTER, runOptions: { size: 20 } }),
        textParagraph('PHILIPPINE NATIONAL POLICE', { alignment: AlignmentType.CENTER, runOptions: { size: 22, bold: true } }),
        textParagraph('INFORMATION TECHNOLOGY MANAGEMENT SERVICE', { alignment: AlignmentType.CENTER, runOptions: { size: 22, bold: true } }),
        textParagraph('Camp BGen Rafael T. Crame, Quezon City', { alignment: AlignmentType.CENTER, runOptions: { size: 20 } })
      ]),
      cell(paragraph([imageRun(itmsLogo, 'jpg', 74, 72)], { alignment: AlignmentType.CENTER }))
    ]
  })]
});

const buildSignatureTable = order => {
  const authority = safeText(order.authorityText || 'BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:');
  const certifyingName = safeText(order.certifyingOfficial || 'VICTORIO M DELA PEÑA, JR');
  const certifyingRank = safeText(order.certifyingOfficialRank || 'Police Colonel');
  const certifyingPosition = safeText(order.certifyingOfficialPosition || 'Chief, Administrative and Resource Management Division');
  const signatory = safeText(order.signatory || 'PBGEN BENJAMIN H ACORDA');
  const signatoryTitle = safeText(order.signatoryTitle || 'Director, ITMS');
  const distribution = safeText(order.distribution || 'C');

  return [
    textParagraph(authority, { alignment: AlignmentType.CENTER, runOptions: { bold: true } }),
    blankParagraph(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      columnWidths: [3456, 672, 3456],
      rows: [new TableRow({ children: [
        cell(textParagraph('OFFICIAL:')),
        cell(blankParagraph()),
        cell([
          textParagraph(signatory, { runOptions: { bold: true, italics: true } }),
          textParagraph('Police Brigadier General'),
          textParagraph(signatoryTitle)
        ])
      ] }), new TableRow({ children: [
        cell(blankParagraph()),
        cell(blankParagraph()),
        cell([
          blankParagraph(),
          textParagraph(certifyingName, { runOptions: { bold: true, italics: true } }),
          textParagraph(certifyingRank),
          textParagraph(certifyingPosition)
        ])
      ] })]
    }),
    blankParagraph(),
    textParagraph('DISTRIBUTION:'),
    textParagraph(`        "${distribution}"`)
  ];
};

export const computeOrderSourceHash = order => {
  const canonical = {
    orderNumber: order.orderNumber || order.orderNo || order.id || '',
    series: order.series || '',
    purposeCode: order.purposeCode || '',
    subject: safeText(order.subject),
    signatory: safeText(order.signatory),
    issuedDate: order.issuedDate || '',
    effectiveDate: order.effectiveDate || '',
    personnelSnapshot: getPersonnel(order).map(p => ({
      personnelId: p.personnelId,
      role: p.role,
      sequence: p.sequence,
      rank: p.rank,
      fullName: p.fullName
    })),
    purposeData: order.purposeData || {}
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
};

export const buildOrderGenerationManifest = order => ({
  templateKey: ORDER_TEMPLATE_KEY,
  templateVersion: ORDER_TEMPLATE_VERSION,
  generatedAt: new Date().toISOString(),
  generatedBy: order.generatedBy || order.updatedBy || order.createdBy || 'system',
  orderNumber: order.orderNumber || order.orderNo || order.id,
  personnelSnapshot: getPersonnel(order),
  personnelCount: getPersonnel(order).length,
  sourceDataHash: computeOrderSourceHash(order)
});

export const generateOrderDocx = async order => {
  const pnpLogo = fs.readFileSync(pnpLogoPath);
  const itmsLogo = fs.readFileSync(itmsLogoPath);
  const series = ORDER_CATALOG.series.find(option => option.value === order.series);
  const purpose = getOrderPurposeDefinition(order.purposeCode);
  const heading = series?.heading || 'ADMINISTRATIVE ORDERS';
  const subject = safeText(order.subject || purpose?.label || 'Administrative Order');
  const personnel = getPersonnel(order);
  const bodyChildren = [
    buildLetterhead(pnpLogo, itmsLogo),
    blankParagraph(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      columnWidths: [3000, 6624],
      rows: [new TableRow({ children: [
        cell(textParagraph('ITMS', { runOptions: { bold: true } })),
        cell(textParagraph(formatDate(order.issuedDate), { alignment: AlignmentType.RIGHT }))
      ] })]
    }),
    blankParagraph(),
    textParagraph(heading, { runOptions: { bold: true } }),
    textParagraph(`NUMBER ${formatDocumentOrderNumber(order.orderNumber || order.orderNo || order.id)}`, { runOptions: { bold: true } }),
    blankParagraph(),
    textParagraph(`SUBJECT    :  ${subject}`, { runOptions: { bold: true } }),
    blankParagraph(),
    textParagraph(getNarrative(order), { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }),
    ...getPurposeDetails(order).flatMap(detail => [textParagraph(detail, { indent: { left: 720 } })]),
    blankParagraph(),
    ...personnel.filter(p => p.role !== 'driver').map((person, idx) => {
      const seq = personnel.length > 1 ? `${idx + 1}. ` : '';
      const roleStr = person.role && person.role !== 'affected' ? ` (${roleLabel(person.role)})` : '';
      const unitStr = person.unit ? ` - ${person.unit}` : '';
      return textParagraph(`${seq}${person.rank || ''} ${person.fullName || ''}${unitStr}${roleStr}`.trim(), { indent: { left: 1701 } });
    }),
    ...personnel.filter(person => person.role === 'driver').map(person => textParagraph(`Driver: ${person.rank || ''} ${person.fullName || ''}`.trim(), { indent: { left: 1701 } })),
    blankParagraph(),
    ...buildSignatureTable(order)
  ];

  const restricted = paragraph([run('R E S T R I C T E D', { size: 20, underline: { type: 'single' } })], { alignment: AlignmentType.CENTER });
  const document = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1276, right: 1325, bottom: 500, left: 1440, header: 340, footer: 184 }
        }
      },
      headers: { default: new Header({ children: [restricted] }) },
      footers: { default: new Footer({ children: [restricted] }) },
      children: bodyChildren
    }]
  });

  return {
    buffer: await Packer.toBuffer(document),
    manifest: buildOrderGenerationManifest(order)
  };
};
