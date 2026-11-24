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
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx';
import { getOrderPurposeDefinition } from '../utils/orderCatalog.js';
import { ORDER_CATALOG } from '../utils/orderCatalog.js';
import { formatOfficialOrderNumber } from '../../shared/orderNumber.js';

export const ORDER_TEMPLATE_KEY = 'pnp-itms-letter-orders';
export const ORDER_TEMPLATE_VERSION = '1.11.0';

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
export const formatDocumentOrderNumber = formatOfficialOrderNumber;
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

const getPersonnelName = person => [person.rank, person.fullName].filter(Boolean).join(' ').trim();

const getSinglePersonDetails = person => [
  person.role && person.role !== 'affected' && person.role !== 'driver' ? roleLabel(person.role) : '',
  person.unit
].filter(Boolean).join('; ');

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
  const activity = safeText(data.activity || data.travelPurpose || 'official business');
  return `In addition to their duties and responsibilities, following-named personnel of this Service are authorized to travel to ${destinations} from ${start} to ${end} for the conduct of ${activity}:`;
};

const getNarrative = order => order.purposeCode === 'TR' ? getTravelNarrative(order) : getCommonNarrative(order);

const getPurposeHeading = order => {
  if (order.purposeCode === 'TR') return null;
  const purposeDef = getOrderPurposeDefinition(order.purposeCode);
  if (order.purposeCode === 'AW') {
    return safeText(order.purposeData?.awardTitle || order.subject || 'AWARD').toUpperCase();
  }
  if (order.purposeCode && purposeDef) {
    const raw = purposeDef.label.split('—').pop()?.trim() || order.subject;
    return raw.toUpperCase();
  }
  return safeText(order.subject || 'ADMINISTRATIVE ORDER').toUpperCase();
};

const buildOrderBodyElements = order => {
  const personnel = getPersonnel(order);
  const data = order.purposeData || {};
  const effective = formatDate(order.effectiveDate || order.issuedDate);
  const elements = [];

  // 1. Designation (DES)
  if (order.purposeCode === 'DES') {
    const designation = safeText(data.designation || 'designated personnel');
    const assignedUnit = safeText(data.assignedUnit || 'Information Technology Program Management Division');

    if (personnel.length === 1) {
      const person = personnel[0];
      const rank = person.rank ? `${person.rank} ` : '';
      const name = person.fullName || '';
      const badge = person.badgeNo ? ` ${person.badgeNo}` : '';
      const sentence = `${rank}${name}${badge} is designated as ${designation} under ${assignedUnit}, ITMS, Philippine National Police effective ${effective}.`.replace(/\s+/g, ' ').trim();
      elements.push(paragraph([run(sentence)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
    } else {
      const lead = `Following-named personnel of this Service are designated as ${designation} to Office/Unit indicated opposite their names under ${assignedUnit}, ITMS, Philippine National Police effective ${effective}:`.replace(/\s+/g, ' ').trim();
      elements.push(paragraph([run(lead)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
      elements.push(blankParagraph());
      elements.push(new Table({
        layout: TableLayoutType.FIXED,
        width: { size: 9141, type: WidthType.DXA },
        borders: NO_BORDERS,
        columnWidths: [4570, 4571],
        rows: [
          new TableRow({
            children: [
              cell(textParagraph('Rank/Name', { runOptions: { bold: true } }), { width: { size: 4570, type: WidthType.DXA } }),
              cell(textParagraph('Office/Unit', { runOptions: { bold: true } }), { width: { size: 4571, type: WidthType.DXA } })
            ]
          }),
          ...personnel.map(p => new TableRow({
            children: [
              cell(textParagraph(`${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim()), { width: { size: 4570, type: WidthType.DXA } }),
              cell(textParagraph(safeText(p.unit || assignedUnit)), { width: { size: 4571, type: WidthType.DXA } })
            ]
          }))
        ]
      }));
    }
  }
  // 2. Sub-unit Reassignment (RA)
  else if (order.purposeCode === 'RA') {
    const fromUnit = safeText(data.fromSubUnit || 'Information Technology Program Management Division');
    const toUnit = safeText(data.toSubUnit || 'Information Technology Support Division');
    const lead = `Following-named personnel of this Service are relieved from ${fromUnit} and reassigned to ${toUnit} effective ${effective}.`.replace(/\s+/g, ' ').trim();
    elements.push(paragraph([run(lead)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
    elements.push(blankParagraph());
    personnel.forEach(p => {
      elements.push(textParagraph(`${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim(), { indent: { left: 1701 } }));
    });
  }
  // 3. Unit Reassignment (UA)
  else if (order.purposeCode === 'UA') {
    const fromUnit = safeText(data.fromUnit || 'current unit');
    const toUnit = safeText(data.toUnit || 'new unit');
    const lead = `Following-named personnel of this Service are relieved from ${fromUnit} and reassigned to ${toUnit} effective ${effective}.`.replace(/\s+/g, ' ').trim();
    elements.push(paragraph([run(lead)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
    elements.push(blankParagraph());
    personnel.forEach(p => {
      elements.push(textParagraph(`${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim(), { indent: { left: 1701 } }));
    });
  }
  // 4. Termination of Designation (TDS)
  else if (order.purposeCode === 'TDS') {
    const reason = safeText(data.reason || 'administrative relief');
    const lead = `Following-named personnel of this Service are relieved from their designation effective ${effective} due to ${reason}.`.replace(/\s+/g, ' ').trim();
    elements.push(paragraph([run(lead)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
    elements.push(blankParagraph());
    personnel.forEach(p => {
      elements.push(textParagraph(`${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim(), { indent: { left: 1701 } }));
    });
  }
  // 5. Travel (TR)
  else if (order.purposeCode === 'TR') {
    const destinations = Array.isArray(data.destinations)
      ? data.destinations.filter(Boolean).join(' and ')
      : safeText(data.destinations || data.destination || 'the stated destination');
    const start = formatDateWithWeekday(data.travelStartDate || order.effectiveDate || order.issuedDate);
    const end = formatDateWithWeekday(data.travelEndDate || data.travelStartDate || order.effectiveDate || order.issuedDate);
    const activity = safeText(data.activity || data.travelPurpose || 'official business');

    if (personnel.length === 1) {
      const person = personnel[0];
      const name = getPersonnelName(person);
      const details = getSinglePersonDetails(person);
      const leadRuns = [run(name, { bold: true })];
      if (details) leadRuns.push(run(` (${details})`));
      leadRuns.push(run(person.role === 'driver'
        ? ` will serve as driver for travel to ${destinations} from ${start} to ${end} for the conduct of ${activity}.`
        : ` is authorized to travel to ${destinations} from ${start} to ${end} for the conduct of ${activity}.`));
      elements.push(paragraph(leadRuns, { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
    } else {
      const narrative = `In addition to their duties and responsibilities, following-named personnel of this Service are authorized to travel to ${destinations} from ${start} to ${end} for the conduct of ${activity}:`;
      elements.push(paragraph([run(narrative)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
      elements.push(blankParagraph());
      personnel.filter(p => p.role !== 'driver').forEach((person, idx) => {
        const seq = personnel.length > 1 ? `${idx + 1}. ` : '';
        const roleStr = person.role && person.role !== 'affected' ? ` (${roleLabel(person.role)})` : '';
        const unitStr = person.unit ? ` - ${person.unit}` : '';
        elements.push(textParagraph(`${seq}${person.rank || ''} ${person.fullName || ''}${unitStr}${roleStr}`.trim(), { indent: { left: 1701 } }));
      });
      personnel.filter(p => p.role === 'driver').forEach(person => {
        elements.push(textParagraph(`Driver: ${person.rank || ''} ${person.fullName || ''}`.trim(), { indent: { left: 1701 } }));
      });
    }
  }
  // 6. Award (AW)
  else if (order.purposeCode === 'AW') {
    const awardTitle = safeText(data.awardTitle || order.subject || 'Award');
    const citation = safeText(data.citation || '');
    if (personnel.length === 1) {
      const person = personnel[0];
      const name = getPersonnelName(person);
      const details = getSinglePersonDetails(person);
      const leadRuns = [run(name, { bold: true })];
      if (details) leadRuns.push(run(` (${details})`));
      leadRuns.push(run(` is hereby conferred the ${awardTitle} effective ${effective}.`));
      elements.push(paragraph(leadRuns, { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
    } else {
      elements.push(paragraph([run(`The following-named personnel of this Service are hereby conferred the ${awardTitle} effective ${effective}:`)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
      elements.push(blankParagraph());
      personnel.forEach((p, idx) => {
        elements.push(textParagraph(`${idx + 1}. ${p.rank || ''} ${p.fullName || ''}`.trim(), { indent: { left: 1701 } }));
      });
    }
    if (citation) {
      elements.push(blankParagraph());
      elements.push(textParagraph(`Citation: ${citation}`, { indent: { left: 720 } }));
    }
  }
  // 7. General / Other fallback
  else {
    const subject = safeText(order.subject || 'administrative action');
    if (personnel.length === 1) {
      const person = personnel[0];
      const name = getPersonnelName(person);
      const details = getSinglePersonDetails(person);
      const leadRuns = [run(name, { bold: true })];
      if (details) leadRuns.push(run(` (${details})`));
      leadRuns.push(run(` is hereby covered by this ${subject.toLowerCase()} order.`));
      elements.push(paragraph(leadRuns, { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
    } else {
      const lead = `The following-named personnel of this Service are hereby covered by this ${subject.toLowerCase()} order:`;
      elements.push(paragraph([run(lead)], { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 720 } }));
      elements.push(blankParagraph());
      personnel.forEach((p, idx) => {
        elements.push(textParagraph(`${idx + 1}. ${p.rank || ''} ${p.fullName || ''}`.trim(), { indent: { left: 1701 } }));
      });
    }
    getPurposeDetails(order).forEach(detail => {
      elements.push(textParagraph(detail, { indent: { left: 720 } }));
    });
  }

  // Any extra multi-paragraph description (e.g. Test Order 5 or special directives)
  if (order.description) {
    elements.push(blankParagraph());
    order.description.split(/\r?\n/).forEach(line => {
      elements.push(line ? textParagraph(line, { alignment: AlignmentType.JUSTIFIED }) : blankParagraph());
    });
  }

  return elements;
};

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
  layout: TableLayoutType.FIXED,
  width: { size: 9141, type: WidthType.DXA },
  borders: NO_BORDERS,
  columnWidths: [1600, 5941, 1600],
  rows: [new TableRow({
    children: [
      cell(paragraph([imageRun(pnpLogo, 'png', 68, 95)], { alignment: AlignmentType.CENTER }), {
        width: { size: 1600, type: WidthType.DXA }
      }),
      cell([
        textParagraph('Republic of the Philippines', { alignment: AlignmentType.CENTER, runOptions: { size: 20 } }),
        textParagraph('NATIONAL POLICE COMMISSION', { alignment: AlignmentType.CENTER, runOptions: { size: 20 } }),
        textParagraph('PHILIPPINE NATIONAL POLICE', { alignment: AlignmentType.CENTER, runOptions: { size: 22, bold: true } }),
        textParagraph('INFORMATION TECHNOLOGY MANAGEMENT SERVICE', { alignment: AlignmentType.CENTER, runOptions: { size: 22, bold: true } }),
        textParagraph('Camp BGen Rafael T. Crame, Quezon City', { alignment: AlignmentType.CENTER, runOptions: { size: 20 } })
      ], {
        width: { size: 5941, type: WidthType.DXA }
      }),
      cell(paragraph([imageRun(itmsLogo, 'jpg', 74, 72)], { alignment: AlignmentType.CENTER }), {
        width: { size: 1600, type: WidthType.DXA }
      })
    ]
  })]
});

const SIGNATURE_COL_WIDTHS = [4113, 915, 4113];

const buildSignatureTable = order => {
  const authority = safeText(order.authorityText || 'BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:');
  const certifyingName = safeText(order.certifyingOfficial || 'ROSE ANNE R SUCGANG');
  const certifyingRank = safeText(order.certifyingOfficialRank || 'Police Lieutenant Colonel');
  const certifyingPosition = safeText(order.certifyingOfficialPosition || 'OIC, Administrative and Resource Management Division');
  const signatory = safeText(order.signatory || 'RANDI M PATIÑO');
  const signatoryRank = safeText(order.signatoryRank || 'Police Colonel');
  const signatoryTitle = safeText(order.signatoryTitle || 'Chief of Staff');
  const distribution = safeText(order.distribution || 'B');

  return [
    textParagraph(authority, { alignment: AlignmentType.CENTER, runOptions: { bold: true } }),
    ...Array.from({ length: 4 }, () => blankParagraph()),
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 9141, type: WidthType.DXA },
      borders: NO_BORDERS,
      columnWidths: SIGNATURE_COL_WIDTHS,
      rows: [new TableRow({ children: [
        cell(textParagraph('OFFICIAL:', { alignment: AlignmentType.LEFT }), {
          width: { size: SIGNATURE_COL_WIDTHS[0], type: WidthType.DXA }
        }),
        cell(blankParagraph(), {
          width: { size: SIGNATURE_COL_WIDTHS[1], type: WidthType.DXA }
        }),
        cell([
          textParagraph(signatory, { runOptions: { bold: true, italics: true } }),
          textParagraph(signatoryRank),
          textParagraph(signatoryTitle)
        ], {
          width: { size: SIGNATURE_COL_WIDTHS[2], type: WidthType.DXA }
        })
      ] })]
    }),
    ...Array.from({ length: 2 }, () => blankParagraph()),
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 9141, type: WidthType.DXA },
      borders: NO_BORDERS,
      columnWidths: SIGNATURE_COL_WIDTHS,
      rows: [new TableRow({ children: [
        cell([
          textParagraph(certifyingName, { indent: { left: 720 }, runOptions: { bold: true, italics: true } }),
          textParagraph(certifyingRank, { indent: { left: 720 } }),
          textParagraph(certifyingPosition, { indent: { left: 720 } })
        ], {
          width: { size: SIGNATURE_COL_WIDTHS[0], type: WidthType.DXA }
        }),
        cell(blankParagraph(), {
          width: { size: SIGNATURE_COL_WIDTHS[1], type: WidthType.DXA }
        }),
        cell(blankParagraph(), {
          width: { size: SIGNATURE_COL_WIDTHS[2], type: WidthType.DXA }
        })
      ] })]
    }),
    blankParagraph(),
    blankParagraph(),
    textParagraph('DISTRIBUTION:'),
    textParagraph(`"${distribution}"`, { indent: { left: 720 } })
  ];
};

export const computeOrderSourceHash = order => {
  const canonical = {
    orderNumber: order.orderNumber || order.orderNo || 'NUMBER PENDING',
    series: order.series || '',
    purposeCode: order.purposeCode || '',
    subject: safeText(order.subject),
    authorityText: safeText(order.authorityText),
    signatory: safeText(order.signatory),
    signatoryRank: safeText(order.signatoryRank),
    signatoryTitle: safeText(order.signatoryTitle),
    certifyingOfficial: safeText(order.certifyingOfficial),
    certifyingOfficialRank: safeText(order.certifyingOfficialRank),
    certifyingOfficialPosition: safeText(order.certifyingOfficialPosition),
    distribution: safeText(order.distribution),
    issuedDate: order.issuedDate || '',
    effectiveDate: order.effectiveDate || '',
    personnelSnapshot: getPersonnel(order).map(p => ({
      personnelId: p.personnelId,
      role: p.role,
      sequence: p.sequence,
      rank: p.rank,
      fullName: p.fullName
    })),
    purposeData: order.purposeData || {},
    description: safeText(order.description)
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
};

export const buildOrderGenerationManifest = order => ({
  templateKey: ORDER_TEMPLATE_KEY,
  templateVersion: ORDER_TEMPLATE_VERSION,
  generatedAt: new Date().toISOString(),
  generatedBy: order.generatedBy || order.updatedBy || order.createdBy || 'system',
  orderNumber: order.orderNumber || order.orderNo || 'NUMBER PENDING',
  personnelSnapshot: getPersonnel(order),
  personnelCount: getPersonnel(order).length,
  sourceDataHash: computeOrderSourceHash(order)
});

export const generateOrderDocx = async order => {
  if (!(order.orderNumber || order.orderNo)) {
    throw new Error('A generated order document requires an officially issued order number.');
  }
  const pnpLogo = fs.readFileSync(pnpLogoPath);
  const itmsLogo = fs.readFileSync(itmsLogoPath);
  const series = ORDER_CATALOG.series.find(option => option.value === order.series);
  const purpose = getOrderPurposeDefinition(order.purposeCode);
  const heading = series?.heading || 'ADMINISTRATIVE ORDERS';
  const subject = safeText(order.subject || purpose?.label || 'Administrative Order');
  const purposeHeading = getPurposeHeading(order);
  const bodyChildren = [
    buildLetterhead(pnpLogo, itmsLogo),
    blankParagraph(),
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 9141, type: WidthType.DXA },
      borders: NO_BORDERS,
      columnWidths: [4570, 4571],
      rows: [new TableRow({ children: [
        cell(textParagraph('ITMS', { runOptions: { bold: true } }), {
          width: { size: 4570, type: WidthType.DXA }
        }),
        cell(textParagraph(formatDate(order.issuedDate), { alignment: AlignmentType.RIGHT }), {
          width: { size: 4571, type: WidthType.DXA }
        })
      ] })]
    }),
    blankParagraph(),
    textParagraph(heading, { runOptions: { bold: true } }),
    textParagraph(`NUMBER ${formatDocumentOrderNumber(order.orderNumber || order.orderNo)}`, { runOptions: { bold: true } }),
    blankParagraph(),
    ...(purposeHeading ? [
      textParagraph(purposeHeading, { alignment: AlignmentType.CENTER, runOptions: { bold: true } }),
      blankParagraph()
    ] : [
      textParagraph(`SUBJECT    :  ${subject}`, { runOptions: { bold: true } }),
      blankParagraph()
    ]),
    ...buildOrderBodyElements(order),
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
