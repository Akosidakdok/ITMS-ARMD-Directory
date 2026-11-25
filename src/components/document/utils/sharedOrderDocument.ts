import { PNP_LOGO_BASE64, ITMS_LOGO_BASE64 } from './pnpLogos';
import {
  ORDER_SERIES_HEADINGS,
  ORDER_PURPOSE_DEFINITIONS,
  OrderPurposeDefinition,
  OrderSeries
} from '../../../constants/orders';

export const CANONICAL_DOCUMENT_CONFIG = {
  pageSize: 'A4' as const,
  orientation: 'portrait' as const,
  widthMm: 210,
  heightMm: 297,
  marginTop: 22.5, // 1276 twips ~ 22.5mm
  marginRight: 23.4, // 1325 twips ~ 23.4mm
  marginBottom: 8.8, // 500 twips ~ 8.8mm
  marginLeft: 25.4, // 1440 twips = 1 inch = 25.4mm
  headerMargin: 6.0, // 340 twips ~ 6.0mm
  footerMargin: 3.2, // 184 twips ~ 3.2mm
  headerText: 'R E S T R I C T E D',
  footerText: 'R E S T R I C T E D',
  fontFamily: 'Arial, Helvetica, sans-serif',
  bodyFontSize: '12pt',
  lineHeight: 1.15
};

const safeText = (val: any) => String(val ?? '').trim();
const escapeHtml = (val: any) => String(val ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character] || character));

export const formatDocumentOrderNumber = (orderNumber?: string) => {
  return safeText(orderNumber);
};

export const formatOrderDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const formatOrderDateWithWeekday = (value?: string) => {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return formatOrderDate(value);
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' });
};

const getOrderPurposeDef = (code?: string): OrderPurposeDefinition | undefined => {
  if (!code) return undefined;
  return ORDER_PURPOSE_DEFINITIONS.find(p => p.value === code);
};

const getRoleLabel = (purposeDef: OrderPurposeDefinition | undefined, roleCode: string) => {
  if (!purposeDef) return roleCode;
  const role = purposeDef.personnelRoles.find(r => r.code === roleCode);
  return role?.label || roleCode;
};

const getPersonnelName = (person: OrderPersonnelEntry) =>
  [person.rank, person.fullName].filter(Boolean).join(' ').trim();

const getSinglePersonDetails = (person: OrderPersonnelEntry, purposeDef?: OrderPurposeDefinition) => [
  person.role && person.role !== 'affected' && person.role !== 'driver' ? getRoleLabel(purposeDef, person.role) : '',
  person.unit
].filter(Boolean).join('; ');

export interface OrderPersonnelEntry {
  personnelId?: string;
  fullName?: string;
  rank?: string;
  badgeNo?: string;
  designation?: string;
  unit?: string;
  role?: string;
  sequence?: number;
}

export const extractPersonnelList = (
  order: any,
  personnelMap?: Map<string, string>
): OrderPersonnelEntry[] => {
  if (Array.isArray(order.personnelSnapshot) && order.personnelSnapshot.length > 0) {
    return (order.personnelSnapshot as OrderPersonnelEntry[])
      .slice()
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }

  if (Array.isArray(order.personnelInvolvement) && order.personnelInvolvement.length > 0) {
    return order.personnelInvolvement.map((inv: any, idx: number) => ({
      personnelId: inv.personnelId,
      fullName: personnelMap?.get(inv.personnelId) || inv.fullName || `Personnel #${idx + 1}`,
      rank: inv.rank || '',
      badgeNo: inv.badgeNo || '',
      designation: inv.designation || '',
      unit: inv.unit || '',
      role: inv.role || 'affected',
      sequence: idx + 1
    }));
  }

  if (Array.isArray(order.personnelIds) && order.personnelIds.length > 0) {
    return order.personnelIds.map((id: string, idx: number) => ({
      personnelId: id,
      fullName: personnelMap?.get(id) || `Personnel #${idx + 1}`,
      rank: '',
      badgeNo: '',
      designation: '',
      unit: '',
      role: 'affected',
      sequence: idx + 1
    }));
  }

  return [];
};

/** Builds the initial HTML for a browser-local order draft in Document Editor.
 * Issued generated orders are previewed and downloaded from the stored server DOCX.
 */
export const buildCanonicalOrderDocumentHtml = (
  order: any,
  options: {
    personnelMap?: Map<string, string>;
    includeRunningHeaderFooter?: boolean;
  } = {}
): string => {
  const seriesHeading =
    (order.series && ORDER_SERIES_HEADINGS[order.series as OrderSeries]) ||
    order.seriesHeading ||
    'ADMINISTRATIVE ORDERS';

  const orderNumStr = formatDocumentOrderNumber(order.orderNumber || order.orderNo || 'NUMBER PENDING');
  const issuedDateStr = formatOrderDate(order.issuedDate || order.date || new Date().toISOString().slice(0, 10));

  const purposeDef = getOrderPurposeDef(order.purposeCode);
  const subject = safeText(order.subject || purposeDef?.label || 'Administrative Order');
  const description = safeText(order.description);

  const personnel = extractPersonnelList(order, options.personnelMap);
  const nonDrivers = personnel.filter(p => p.role !== 'driver');
  const drivers = personnel.filter(p => p.role === 'driver');
  const singlePerson = personnel.length === 1 && getPersonnelName(personnel[0]) ? personnel[0] : undefined;

  // Build Narrative & Content Elements
  const data = order.purposeData || {};
  const effectiveDateStr = formatOrderDate(order.effectiveDate || order.issuedDate);
  const isTravel = order.purposeCode === 'TR';
  let purposeHeading = '';
  if (!isTravel) {
    if (order.purposeCode === 'AW') {
      purposeHeading = safeText(data.awardTitle || order.subject || 'AWARD').toUpperCase();
    } else if (order.purposeCode && purposeDef) {
      purposeHeading = (purposeDef.label.split('—').pop()?.trim() || order.subject || 'ADMINISTRATIVE ORDER').toUpperCase();
    } else {
      purposeHeading = safeText(order.subject || 'ADMINISTRATIVE ORDER').toUpperCase();
    }
  }

  let narrative = '';
  let personnelTableHtml = '';
  let customPersonnelListHtml = '';

  if (order.purposeCode === 'DES') {
    const designation = safeText(data.designation || 'IT PNCO');
    const assignedUnit = safeText(data.assignedUnit || 'Information Technology Program Management Division');
    if (singlePerson && getPersonnelName(singlePerson)) {
      const p = singlePerson;
      const rank = p.rank ? `${p.rank} ` : '';
      const name = `<strong>${escapeHtml(p.fullName || '')}</strong>`;
      const badge = p.badgeNo ? ` ${escapeHtml(p.badgeNo)}` : '';
      narrative = `${rank}${name}${badge} is designated as ${escapeHtml(designation)} under ${escapeHtml(assignedUnit)}, ITMS, Philippine National Police effective ${escapeHtml(effectiveDateStr)}.`.replace(/\s+/g, ' ').trim();
    } else {
      narrative = `Following-named personnel of this Service are designated as ${escapeHtml(designation)} to Office/Unit indicated opposite their names under ${escapeHtml(assignedUnit)}, ITMS, Philippine National Police effective ${escapeHtml(effectiveDateStr)}:`.replace(/\s+/g, ' ').trim();
      personnelTableHtml = `
      <table class="pais-borderless-table pais-personnel-table" style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: none;">
        <thead>
          <tr style="border: none;">
            <th style="width: 50%; text-align: left; border: none; padding: 4px 0; font-size: 12pt; font-weight: bold;">Rank/Name</th>
            <th style="width: 50%; text-align: left; border: none; padding: 4px 0; font-size: 12pt; font-weight: bold;">Office/Unit</th>
          </tr>
        </thead>
        <tbody>
          ${personnel.map(p => `
            <tr style="border: none;">
              <td style="width: 50%; text-align: left; border: none; padding: 2px 0; font-size: 12pt;">${escapeHtml(`${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim())}</td>
              <td style="width: 50%; text-align: left; border: none; padding: 2px 0; font-size: 12pt;">${escapeHtml(safeText(p.unit || assignedUnit))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    }
  } else if (order.purposeCode === 'RA') {
    const fromUnit = safeText(data.fromSubUnit || 'Information Technology Program Management Division');
    const toUnit = safeText(data.toSubUnit || 'Information Technology Support Division');
    narrative = `Following-named personnel of this Service are relieved from ${escapeHtml(fromUnit)} and reassigned to ${escapeHtml(toUnit)} effective ${escapeHtml(effectiveDateStr)}.`.replace(/\s+/g, ' ').trim();
    customPersonnelListHtml = personnel.map(p => {
      const rankName = `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim();
      return `<p class="pais-personnel-item" style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">${escapeHtml(rankName)}</p>`;
    }).join('\n');
  } else if (order.purposeCode === 'UA') {
    const fromUnit = safeText(data.fromUnit || 'current unit');
    const toUnit = safeText(data.toUnit || 'new unit');
    narrative = `Following-named personnel of this Service are relieved from ${escapeHtml(fromUnit)} and reassigned to ${escapeHtml(toUnit)} effective ${escapeHtml(effectiveDateStr)}.`.replace(/\s+/g, ' ').trim();
    customPersonnelListHtml = personnel.map(p => {
      const rankName = `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim();
      return `<p class="pais-personnel-item" style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">${escapeHtml(rankName)}</p>`;
    }).join('\n');
  } else if (order.purposeCode === 'TDS') {
    const reason = safeText(data.reason || 'administrative relief');
    narrative = `Following-named personnel of this Service are relieved from their designation effective ${escapeHtml(effectiveDateStr)} due to ${escapeHtml(reason)}.`.replace(/\s+/g, ' ').trim();
    customPersonnelListHtml = personnel.map(p => {
      const rankName = `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim();
      return `<p class="pais-personnel-item" style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">${escapeHtml(rankName)}</p>`;
    }).join('\n');
  } else if (isTravel) {
    const destinations = Array.isArray(data.destinations)
      ? data.destinations.filter(Boolean).join(' and ')
      : safeText(data.destinations || data.destination || 'the stated destination');
    const start = formatOrderDateWithWeekday(data.travelStartDate || order.effectiveDate || order.issuedDate);
    const end = formatOrderDateWithWeekday(data.travelEndDate || data.travelStartDate || order.effectiveDate || order.issuedDate);
    const activity = safeText(data.activity || data.travelPurpose || 'official business');

    if (singlePerson && getPersonnelName(singlePerson)) {
      const name = `<strong>${escapeHtml(getPersonnelName(singlePerson))}</strong>`;
      const details = getSinglePersonDetails(singlePerson, purposeDef);
      const lead = `${name}${details ? ` (${escapeHtml(details)})` : ''}`;
      narrative = singlePerson.role === 'driver'
        ? `${lead} will serve as driver for travel to ${escapeHtml(destinations)} from ${escapeHtml(start)} to ${escapeHtml(end)} for the conduct of ${escapeHtml(activity)}.`
        : `${lead} is authorized to travel to ${escapeHtml(destinations)} from ${escapeHtml(start)} to ${escapeHtml(end)} for the conduct of ${escapeHtml(activity)}.`;
    } else {
      narrative = `In addition to their duties and responsibilities, following-named personnel of this Service are authorized to travel to ${escapeHtml(destinations)} from ${escapeHtml(start)} to ${escapeHtml(end)} for the conduct of ${escapeHtml(activity)}:`;
    }
  } else {
    if (singlePerson && getPersonnelName(singlePerson)) {
      const name = `<strong>${escapeHtml(getPersonnelName(singlePerson))}</strong>`;
      const details = getSinglePersonDetails(singlePerson, purposeDef);
      const lead = `${name}${details ? ` (${escapeHtml(details)})` : ''}`;
      narrative = `${lead} is hereby covered by this ${escapeHtml(subject.toLowerCase())} order.`;
    } else {
      const names = nonDrivers
        .map(p => `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim())
        .filter(Boolean)
        .join(', ');
      narrative = `The following-named personnel of this Service are hereby covered by this ${escapeHtml(subject.toLowerCase())} order: ${escapeHtml(names || 'the personnel identified in this order')}.`;
    }
  }

  // Purpose Details (for generic orders)
  const purposeDetails: string[] = [];
  if (purposeDef && !['TR', 'DES', 'RA', 'UA', 'TDS'].includes(order.purposeCode)) {
    purposeDef.fields.forEach(field => {
      const val = Array.isArray(data[field.key]) ? data[field.key].join(', ') : safeText(data[field.key]);
      if (val) {
        purposeDetails.push(`${field.label}: ${val}`);
      }
    });
  }

  // Standard Personnel List Items (used when not replaced by table or custom list)
  const isCustomHandled = ['DES', 'RA', 'UA', 'TDS'].includes(order.purposeCode);
  const personnelItems = (!isCustomHandled && !singlePerson ? nonDrivers : []).map((p, idx) => {
    const seq = nonDrivers.length > 1 ? `${idx + 1}. ` : '';
    const roleStr = p.role && p.role !== 'affected' ? ` (${getRoleLabel(purposeDef, p.role)})` : '';
    const unitStr = p.unit ? ` - ${p.unit}` : '';
    const rankName = `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim();
    return `<p class="pais-personnel-item" style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">${seq}${rankName}${unitStr}${roleStr}</p>`;
  }).join('\n');

  const driverItems = (!singlePerson ? drivers : []).map(p => {
    const rankName = `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim();
    return `<p class="pais-personnel-item" style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">Driver: ${rankName}</p>`;
  }).join('\n');

  // Signatory Variables
  const authorityText = safeText(order.authorityText || 'BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:');
  const signatory = safeText(order.signatory || 'RANDI M PATIÑO');
  const signatoryRank = safeText(order.signatoryRank || 'Police Colonel');
  const signatoryTitle = safeText(order.signatoryTitle || 'Chief of Staff');
  const certifyingOfficial = safeText(order.certifyingOfficial || 'ROSE ANNE R SUCGANG');
  const certifyingOfficialRank = safeText(order.certifyingOfficialRank || 'Police Lieutenant Colonel');
  const certifyingOfficialPosition = safeText(order.certifyingOfficialPosition || 'OIC, Administrative and Resource Management Division');
  const distribution = safeText(order.distribution || 'B');

  return `
<div class="pais-order-document-root" style="font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.15; color: #000000; box-sizing: border-box;">

  <!-- LETTERHEAD TABLE -->
  <table class="pais-borderless-table pais-letterhead-table" style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: none;">
    <tbody>
      <tr style="border: none;">
        <td class="pais-borderless-cell pais-logo-cell" style="width: 17%; text-align: center; vertical-align: middle; border: none; padding: 0;">
          <img class="pais-logo-img" src="${PNP_LOGO_BASE64}" alt="PNP Logo" width="77" height="98" style="width: 76.8px; height: 97.92px; object-fit: fill; display: inline-block;" />
        </td>
        <td class="pais-borderless-cell" style="width: 66%; text-align: center; vertical-align: middle; border: none; padding: 0;">
          <p class="pais-compact-p" style="margin: 0; font-size: 10pt; line-height: 1.15; color: #000000;">Republic of the Philippines</p>
          <p class="pais-compact-p" style="margin: 0; font-size: 10pt; line-height: 1.15; color: #000000;">NATIONAL POLICE COMMISSION</p>
          <p class="pais-compact-p" style="margin: 0; font-size: 11pt; font-weight: bold; line-height: 1.15; color: #000000;">PHILIPPINE NATIONAL POLICE</p>
          <p class="pais-compact-p" style="margin: 0; font-size: 11pt; font-weight: bold; line-height: 1.15; color: #000000;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
          <p class="pais-compact-p" style="margin: 0; font-size: 10pt; line-height: 1.15; color: #000000;">Camp BGen Rafael T. Crame, Quezon City</p>
        </td>
        <td class="pais-borderless-cell pais-logo-cell" style="width: 17%; text-align: center; vertical-align: middle; border: none; padding: 0;">
          <img class="pais-logo-img" src="${ITMS_LOGO_BASE64}" alt="ITMS Logo" width="96" height="96" style="width: 96px; height: 96px; object-fit: fill; display: inline-block;" />
        </td>
      </tr>
    </tbody>
  </table>

  <!-- OFFICE & DATE LINE -->
  <table class="pais-borderless-table pais-officedate-table" style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: none;">
    <tbody>
      <tr style="border: none;">
        <td class="pais-borderless-cell" style="text-align: left; vertical-align: top; border: none; padding: 0; font-weight: bold; font-size: 12pt;">
          ITMS
        </td>
        <td class="pais-borderless-cell" style="text-align: right; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
          ${issuedDateStr}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- HEADING & NUMBER -->
  <div class="pais-heading-container" style="margin-bottom: 14px;">
    <p class="pais-heading-p" style="margin: 0; font-weight: bold; font-size: 12pt; text-transform: uppercase;">${seriesHeading}</p>
    <p class="pais-heading-p" style="margin: 0; font-weight: bold; font-size: 12pt;">NUMBER ${orderNumStr}</p>
  </div>

  <!-- SUBJECT OR PURPOSE HEADING -->
  ${purposeHeading ? `
  <div class="pais-subject-container" style="margin-bottom: 14px; text-align: center;">
    <p class="pais-subject-p" style="margin: 0; font-weight: bold; font-size: 12pt; text-align: center; text-transform: uppercase;">${purposeHeading}</p>
  </div>
  ` : `
  <div class="pais-subject-container" style="margin-bottom: 14px;">
    <p class="pais-subject-p" style="margin: 0; font-weight: bold; font-size: 12pt;">SUBJECT&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;${subject}</p>
  </div>
  `}

  <!-- NARRATIVE PARAGRAPH -->
  <p class="pais-narrative-p" style="margin: 0 0 12px 0; text-align: justify; text-indent: 36pt; font-size: 12pt; line-height: 1.2;">
    ${narrative}
  </p>

  ${personnelTableHtml ? personnelTableHtml : ''}
  ${customPersonnelListHtml ? `<div class="pais-custom-personnel-container" style="margin-bottom: 12px;">${customPersonnelListHtml}</div>` : ''}

  ${purposeDetails.length > 0 ? `
  <div class="pais-details-container" style="margin-bottom: 12px;">
    ${purposeDetails.map(d => `<p class="pais-detail-p" style="margin: 0; padding-left: 36pt; font-size: 12pt; line-height: 1.2;">${d}</p>`).join('\n')}
  </div>
  ` : ''}

  ${description ? `<p class="pais-description-p" style="margin: 0 0 12px 0; text-align: justify; white-space: pre-wrap; font-size: 12pt; line-height: 1.2;">${escapeHtml(description)}</p>` : ''}

  <!-- PERSONNEL LIST -->
  ${personnelItems || driverItems ? `
  <div class="pais-personnel-container" style="margin-bottom: 0;">
    ${personnelItems}
    ${driverItems}
  </div>` : ''}

  <!-- AUTHORITY LINE -->
  <div class="pais-authority-container" style="text-align: center; margin: 16px 0 0 0;">
    <p class="pais-authority-p" style="margin: 0; width: 100%; text-align: center; font-weight: bold; font-size: 12pt;">${authorityText}</p>
  </div>

  <!-- FOUR BLANK LINES AFTER THE COMMAND BLOCK -->
  <div class="pais-command-spacing" aria-hidden="true">
    <p style="margin: 0; font-size: 12pt; line-height: 1.15;">&nbsp;</p>
    <p style="margin: 0; font-size: 12pt; line-height: 1.15;">&nbsp;</p>
    <p style="margin: 0; font-size: 12pt; line-height: 1.15;">&nbsp;</p>
    <p style="margin: 0; font-size: 12pt; line-height: 1.15;">&nbsp;</p>
  </div>

  <!-- OFFICIAL LABEL AND FIRST OFFICER SIDE BY SIDE -->
  <table class="pais-borderless-table pais-first-officer-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0; border: none;">
    <tbody>
      <tr style="border: none;">
        <td class="pais-borderless-cell" style="width: 45%; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
          <p class="pais-compact-p" style="margin: 0;">OFFICIAL:</p>
        </td>
        <td class="pais-borderless-cell" style="width: 10%; border: none; padding: 0;"></td>
        <td class="pais-borderless-cell" style="width: 45%; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
          <p class="pais-compact-p" style="margin: 0; font-weight: bold; font-style: italic;">${signatory}</p>
          <p class="pais-compact-p" style="margin: 0;">${signatoryRank}</p>
          <p class="pais-compact-p" style="margin: 0;">${signatoryTitle}</p>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- TWO BLANK LINES BEFORE THE CERTIFYING OFFICER -->
  <div class="pais-official-spacing" aria-hidden="true">
    <p style="margin: 0; font-size: 12pt; line-height: 1.15;">&nbsp;</p>
    <p style="margin: 0; font-size: 12pt; line-height: 1.15;">&nbsp;</p>
  </div>

  <!-- CERTIFYING OFFICER ON THE LEFT -->
  <table class="pais-borderless-table pais-signatory-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0; border: none;">
    <tbody>
      <tr style="border: none;">
        <td class="pais-borderless-cell" style="width: 45%; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
          <p class="pais-compact-p" style="margin: 0 0 0 48px !important; font-weight: bold; font-style: italic;">${certifyingOfficial}</p>
          <p class="pais-compact-p" style="margin: 0 0 0 48px !important;">${certifyingOfficialRank}</p>
          <p class="pais-compact-p" style="margin: 0 0 0 48px !important;">${certifyingOfficialPosition}</p>
        </td>
        <td class="pais-borderless-cell" style="width: 10%; border: none; padding: 0;"></td>
        <td class="pais-borderless-cell" style="width: 45%; border: none; padding: 0;"></td>
      </tr>
    </tbody>
  </table>

  <!-- TWO BLANK LINES BEFORE DISTRIBUTION -->
  <div class="pais-distribution-spacing" aria-hidden="true">
    <p style="margin: 0; font-size: 12pt; line-height: 1.15;">&nbsp;</p>
    <p style="margin: 0; font-size: 12pt; line-height: 1.15;">&nbsp;</p>
  </div>

  <!-- DISTRIBUTION -->
  <div class="pais-distribution-container" style="margin-top: 0;">
    <p class="pais-compact-p" style="margin: 0; font-size: 12pt;">DISTRIBUTION:</p>
    <p class="pais-distribution-p" style="margin: 0; font-size: 12pt; padding-left: 48px;">&ldquo;${distribution}&rdquo;</p>
  </div>

</div>
`.trim();
};
