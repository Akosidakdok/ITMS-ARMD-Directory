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

export const formatDocumentOrderNumber = (orderNumber?: string) => {
  const value = safeText(orderNumber);
  const parts = value.split('-');
  return parts.length >= 2 ? parts.slice(-2).join('-') : value;
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

/**
 * Generates canonical document HTML matching orderDocxGenerator.js identically.
 * This is the SINGLE SOURCE OF TRUTH for:
 * 1. Document Editor initial content
 * 2. Document Preview (View modal)
 * 3. Client-side DOCX / PDF Download
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

  const orderNumStr = formatDocumentOrderNumber(order.orderNumber || order.orderNo || order.id || 'UNNUMBERED');
  const issuedDateStr = formatOrderDate(order.issuedDate || order.date || new Date().toISOString().slice(0, 10));

  const purposeDef = getOrderPurposeDef(order.purposeCode);
  const subject = safeText(order.subject || purposeDef?.label || 'Administrative Order');

  const personnel = extractPersonnelList(order, options.personnelMap);
  const nonDrivers = personnel.filter(p => p.role !== 'driver');
  const drivers = personnel.filter(p => p.role === 'driver');

  // Build Narrative (Opening Paragraph)
  let narrative = '';
  if (order.purposeCode === 'TR') {
    const data = order.purposeData || {};
    const destinations = Array.isArray(data.destinations)
      ? data.destinations.filter(Boolean).join(' and ')
      : safeText(data.destinations || data.destination || 'the stated destination');
    const start = formatOrderDateWithWeekday(data.travelStartDate || order.effectiveDate || order.issuedDate);
    const end = formatOrderDateWithWeekday(data.travelEndDate || data.travelStartDate || order.effectiveDate || order.issuedDate);
    const activity = safeText(data.activity || data.travelPurpose || order.description || 'official business');
    narrative = `In addition to their duties and responsibilities, following-named personnel of this Service are authorized to travel to ${destinations} from ${start} to ${end} for the conduct of ${activity}:`;
  } else {
    const names = nonDrivers
      .map(p => `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim())
      .filter(Boolean)
      .join(', ');
    narrative = `The following-named personnel of this Service are hereby covered by this ${subject.toLowerCase()} order: ${names || 'the personnel identified in this order'}.`;
  }

  // Purpose Details
  const purposeDetails: string[] = [];
  if (purposeDef && order.purposeCode !== 'TR') {
    const data = order.purposeData || {};
    purposeDef.fields.forEach(field => {
      const val = Array.isArray(data[field.key]) ? data[field.key].join(', ') : safeText(data[field.key]);
      if (val) {
        purposeDetails.push(`${field.label}: ${val}`);
      }
    });
  }

  // Personnel List Items
  const personnelItems = nonDrivers.map((p, idx) => {
    const seq = nonDrivers.length > 1 ? `${idx + 1}. ` : '';
    const roleStr = p.role && p.role !== 'affected' ? ` (${getRoleLabel(purposeDef, p.role)})` : '';
    const unitStr = p.unit ? ` - ${p.unit}` : '';
    const rankName = `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim();
    return `<p class="pais-personnel-item" style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">${seq}${rankName}${unitStr}${roleStr}</p>`;
  }).join('\n');

  const driverItems = drivers.map(p => {
    const rankName = `${p.rank ? `${p.rank} ` : ''}${p.fullName || ''}`.trim();
    return `<p class="pais-personnel-item" style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">Driver: ${rankName}</p>`;
  }).join('\n');

  // Signatory Variables
  const authorityText = safeText(order.authorityText || 'BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:');
  const signatory = safeText(order.signatory || 'PBGEN BENJAMIN H ACORDA');
  const signatoryRank = safeText(order.signatoryRank || 'Police Brigadier General');
  const signatoryTitle = safeText(order.signatoryTitle || 'Director, ITMS');
  const certifyingOfficial = safeText(order.certifyingOfficial || 'VICTORIO M DELA PEÑA, JR');
  const certifyingOfficialRank = safeText(order.certifyingOfficialRank || 'Police Colonel');
  const certifyingOfficialPosition = safeText(order.certifyingOfficialPosition || 'Chief, Administrative and Resource Management Division');
  const distribution = safeText(order.distribution || 'C');

  return `
<div class="pais-order-document-root" style="font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.15; color: #000000; box-sizing: border-box;">

  <!-- LETTERHEAD TABLE -->
  <table class="pais-borderless-table pais-letterhead-table" style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: none;">
    <tbody>
      <tr style="border: none;">
        <td class="pais-borderless-cell pais-logo-cell" style="width: 17%; text-align: center; vertical-align: middle; border: none; padding: 0;">
          <img class="pais-logo-img" src="${PNP_LOGO_BASE64}" alt="PNP Logo" width="90" height="126" style="width: 90px; height: 126px; object-fit: contain; display: inline-block;" />
        </td>
        <td class="pais-borderless-cell" style="width: 66%; text-align: center; vertical-align: middle; border: none; padding: 0;">
          <p class="pais-compact-p" style="margin: 0; font-size: 10pt; line-height: 1.15; color: #000000;">Republic of the Philippines</p>
          <p class="pais-compact-p" style="margin: 0; font-size: 10pt; line-height: 1.15; color: #000000;">NATIONAL POLICE COMMISSION</p>
          <p class="pais-compact-p" style="margin: 0; font-size: 11pt; font-weight: bold; line-height: 1.15; color: #000000;">PHILIPPINE NATIONAL POLICE</p>
          <p class="pais-compact-p" style="margin: 0; font-size: 11pt; font-weight: bold; line-height: 1.15; color: #000000;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
          <p class="pais-compact-p" style="margin: 0; font-size: 10pt; line-height: 1.15; color: #000000;">Camp BGen Rafael T. Crame, Quezon City</p>
        </td>
        <td class="pais-borderless-cell pais-logo-cell" style="width: 17%; text-align: center; vertical-align: middle; border: none; padding: 0;">
          <img class="pais-logo-img" src="${ITMS_LOGO_BASE64}" alt="ITMS Logo" width="98" height="96" style="width: 98px; height: 96px; object-fit: contain; display: inline-block;" />
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

  <!-- SUBJECT -->
  <div class="pais-subject-container" style="margin-bottom: 14px;">
    <p class="pais-subject-p" style="margin: 0; font-weight: bold; font-size: 12pt;">SUBJECT&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;${subject}</p>
  </div>

  <!-- NARRATIVE PARAGRAPH -->
  <p class="pais-narrative-p" style="margin: 0 0 12px 0; text-align: justify; text-indent: 36pt; font-size: 12pt; line-height: 1.2;">
    ${narrative}
  </p>

  ${purposeDetails.length > 0 ? `
  <div class="pais-details-container" style="margin-bottom: 12px;">
    ${purposeDetails.map(d => `<p class="pais-detail-p" style="margin: 0; padding-left: 36pt; font-size: 12pt; line-height: 1.2;">${d}</p>`).join('\n')}
  </div>
  ` : ''}

  <!-- PERSONNEL LIST -->
  <div class="pais-personnel-container" style="margin-bottom: 16px;">
    ${personnelItems}
    ${driverItems}
  </div>

  <!-- AUTHORITY LINE -->
  <div class="pais-authority-container" style="text-align: center; margin: 18px 0 16px 0;">
    <p class="pais-authority-p" style="margin: 0; font-weight: bold; font-size: 12pt;">${authorityText}</p>
  </div>

  <!-- TWO-TIER SIGNATURE TABLE -->
  <table class="pais-borderless-table pais-signatory-table" style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: none;">
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
      <tr style="border: none;">
        <td class="pais-borderless-cell" style="border: none; padding: 0;"></td>
        <td class="pais-borderless-cell" style="border: none; padding: 0;"></td>
        <td class="pais-borderless-cell" style="vertical-align: top; border: none; padding: 18px 0 0 0; font-size: 12pt;">
          <p class="pais-compact-p" style="margin: 0; font-weight: bold; font-style: italic;">${certifyingOfficial}</p>
          <p class="pais-compact-p" style="margin: 0;">${certifyingOfficialRank}</p>
          <p class="pais-compact-p" style="margin: 0;">${certifyingOfficialPosition}</p>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- DISTRIBUTION -->
  <div class="pais-distribution-container" style="margin-top: 14px;">
    <p class="pais-compact-p" style="margin: 0; font-size: 12pt;">DISTRIBUTION:</p>
    <p class="pais-distribution-p" style="margin: 0; font-size: 12pt; padding-left: 48px;">&ldquo;${distribution}&rdquo;</p>
  </div>

</div>
`.trim();
};
