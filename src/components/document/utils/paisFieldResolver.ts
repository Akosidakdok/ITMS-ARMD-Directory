export interface PaisFieldDefinition {
  key: string;
  label: string;
  category: 'personnel' | 'assignment' | 'order' | 'award' | 'leave' | 'promotion' | 'education' | 'training' | 'system';
  description?: string;
  example?: string;
}

export const PAIS_FIELD_CATEGORIES: { id: PaisFieldDefinition['category']; label: string }[] = [
  { id: 'personnel', label: 'Personnel' },
  { id: 'assignment', label: 'Assignment' },
  { id: 'order', label: 'Order' },
  { id: 'award', label: 'Award' },
  { id: 'leave', label: 'Leave' },
  { id: 'promotion', label: 'Promotion' },
  { id: 'education', label: 'Education' },
  { id: 'training', label: 'Training' },
  { id: 'system', label: 'System / Date' }
];

export const PAIS_FIELDS: PaisFieldDefinition[] = [
  // Personnel
  { key: 'personnel.full_name', label: 'Full Name', category: 'personnel', example: 'Juan Dela Cruz' },
  { key: 'personnel.rank', label: 'Rank', category: 'personnel', example: 'Patrolman / PCPT' },
  { key: 'personnel.serial_number', label: 'Badge / Serial No.', category: 'personnel', example: '123456' },
  { key: 'personnel.designation', label: 'Designation / Position', category: 'personnel', example: 'Database Administrator' },
  { key: 'personnel.designation_date', label: 'Designation Date', category: 'personnel', example: 'January 15, 2026' },
  { key: 'personnel.sub_unit', label: 'Sub-Unit / Division', category: 'personnel', example: 'ISD / ARMD' },
  { key: 'personnel.station', label: 'Station / Office', category: 'personnel', example: 'Camp Crame' },
  { key: 'personnel.status', label: 'Duty Status', category: 'personnel', example: 'Active' },
  { key: 'personnel.details', label: 'Personnel Details', category: 'personnel', example: 'Regular Staff' },
  { key: 'personnel.email', label: 'Email', category: 'personnel', example: 'jdelacruz@pnp.gov.ph' },
  { key: 'personnel.contact_number', label: 'Contact Number', category: 'personnel', example: '09171234567' },

  // Assignment
  { key: 'assignment.assignment_type', label: 'Assignment Type', category: 'assignment', example: 'Designation' },
  { key: 'assignment.position', label: 'Position', category: 'assignment', example: 'Chief, Operations' },
  { key: 'assignment.effective_date', label: 'Effective Date', category: 'assignment', example: 'February 1, 2026' },
  { key: 'assignment.sub_unit', label: 'Sub-Unit', category: 'assignment', example: 'Network Operations Division' },
  { key: 'assignment.station', label: 'Station', category: 'assignment', example: 'Camp Crame' },
  { key: 'assignment.details', label: 'Assignment Details', category: 'assignment', example: 'Temporary reassignment' },

  // Order
  { key: 'order.order_number', label: 'Order Number', category: 'order', example: 'ITMS-SO-DES-2026-0042' },
  { key: 'order.order_type', label: 'Order Type', category: 'order', example: 'Special Order' },
  { key: 'order.series', label: 'Order Series', category: 'order', example: 'SO' },
  { key: 'order.purpose', label: 'Purpose Label', category: 'order', example: 'Designation of Personnel' },
  { key: 'order.subject', label: 'Subject / Title', category: 'order', example: 'DESIGNATION OF PERSONNEL' },
  { key: 'order.details', label: 'Directives / Particulars', category: 'order', example: 'The following named personnel...' },
  { key: 'order.authority', label: 'Authority', category: 'order', example: 'By Command of PBGEN BENJAMIN H ACORDA' },
  { key: 'order.issued_date', label: 'Issued Date', category: 'order', example: 'March 10, 2026' },
  { key: 'order.effective_date', label: 'Effective Date', category: 'order', example: 'March 15, 2026' },
  { key: 'order.signatory', label: 'Signatory', category: 'order', example: 'PBGEN BENJAMIN H ACORDA' },
  { key: 'order.signatory_title', label: 'Signatory Title', category: 'order', example: 'Director, ITMS' },

  // Award
  { key: 'award.title', label: 'Award Title', category: 'award', example: 'Medalya ng Kagalingan' },
  { key: 'award.date', label: 'Award Date', category: 'award', example: 'April 5, 2026' },
  { key: 'award.citation', label: 'Award Citation', category: 'award', example: 'For meritorious service and dedication...' },
  { key: 'award.authority', label: 'Award Authority', category: 'award', example: 'PNP General Orders No. 12' },

  // Leave
  { key: 'leave.type', label: 'Leave Type', category: 'leave', example: 'Vacation Leave' },
  { key: 'leave.start_date', label: 'Start Date', category: 'leave', example: 'May 1, 2026' },
  { key: 'leave.end_date', label: 'End Date', category: 'leave', example: 'May 10, 2026' },
  { key: 'leave.days', label: 'Number of Days', category: 'leave', example: '7' },
  { key: 'leave.reason', label: 'Reason', category: 'leave', example: 'Personal affairs' },

  // Promotion
  { key: 'promotion.previous_rank', label: 'Previous Rank', category: 'promotion', example: 'Police Lieutenant' },
  { key: 'promotion.new_rank', label: 'New Rank', category: 'promotion', example: 'Police Captain' },
  { key: 'promotion.date', label: 'Promotion Date', category: 'promotion', example: 'June 1, 2026' },
  { key: 'promotion.order_number', label: 'Promotion Order No.', category: 'promotion', example: 'PRO-2026-08' },

  // Education
  { key: 'education.degree', label: 'Degree / Course', category: 'education', example: 'BS in Computer Science' },
  { key: 'education.school', label: 'School / University', category: 'education', example: 'University of the Philippines' },
  { key: 'education.year', label: 'Year Graduated', category: 'education', example: '2018' },

  // Training
  { key: 'training.title', label: 'Training Course', category: 'training', example: 'Cybersecurity Incident Response' },
  { key: 'training.institution', label: 'Institution', category: 'training', example: 'PNP Training Institute' },
  { key: 'training.date', label: 'Completion Date', category: 'training', example: 'July 20, 2025' },

  // System
  { key: 'system.current_date', label: 'Current Date', category: 'system', example: new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) },
  { key: 'system.current_year', label: 'Current Year', category: 'system', example: String(new Date().getFullYear()) }
];

export const resolvePaisFieldValue = (
  fieldKey: string,
  context: {
    personnel?: any;
    order?: any;
    assignment?: any;
    award?: any;
    leave?: any;
    promotion?: any;
    education?: any;
    training?: any;
  }
): string => {
  const [category, prop] = fieldKey.split('.');
  const p = context.personnel;
  const o = context.order;
  const a = context.assignment;
  const aw = context.award;
  const l = context.leave;
  const pr = context.promotion;
  const ed = context.education;
  const tr = context.training;

  switch (category) {
    case 'personnel':
      if (!p) return `[${fieldKey}]`;
      if (prop === 'full_name') return p.fullName || `${p.firstName || ''} ${p.middleName || ''} ${p.lastName || ''}`.trim() || 'Juan Dela Cruz';
      if (prop === 'rank') return p.rank || 'PNCO';
      if (prop === 'serial_number' || prop === 'badge_no') return p.badgeNo || p.itemNumber || '';
      if (prop === 'designation') return p.designation || '';
      if (prop === 'designation_date') return p.designationDate || '';
      if (prop === 'sub_unit') return p.sub_unit || p.division || '';
      if (prop === 'station') return p.station || '';
      if (prop === 'status') return p.status || 'Active';
      if (prop === 'details') return p.details || '';
      if (prop === 'email') return p.email || '';
      if (prop === 'contact_number') return p.contactNumber || '';
      return p[prop] || `[${fieldKey}]`;

    case 'order':
      if (!o) return `[${fieldKey}]`;
      if (prop === 'order_number') return o.orderNumber || o.orderNo || '';
      if (prop === 'order_type') return o.orderType || o.type || 'Administrative Order';
      if (prop === 'series') return o.series || 'SO';
      if (prop === 'purpose') return o.purposeLabel || o.purposeCode || '';
      if (prop === 'subject') return o.subject || '';
      if (prop === 'details') return o.description || o.details || '';
      if (prop === 'authority') return o.authority || 'By Command of Director, ITMS';
      if (prop === 'issued_date') return o.issuedDate || o.date || '';
      if (prop === 'effective_date') return o.effectiveDate || o.issuedDate || '';
      if (prop === 'signatory') return o.signatory || 'PBGEN BENJAMIN H ACORDA';
      if (prop === 'signatory_title') return o.signatoryTitle || 'Director, ITMS';
      return o[prop] || `[${fieldKey}]`;

    case 'assignment':
      if (!a) return `[${fieldKey}]`;
      if (prop === 'assignment_type') return a.assignmentType || 'Designation';
      if (prop === 'position') return a.position || a.designation || '';
      if (prop === 'effective_date') return a.effectiveDate || '';
      if (prop === 'sub_unit') return a.sub_unit || a.division || '';
      if (prop === 'station') return a.station || '';
      if (prop === 'details') return a.details || '';
      return a[prop] || `[${fieldKey}]`;

    case 'award':
      if (!aw) return `[${fieldKey}]`;
      if (prop === 'title') return aw.title || aw.awardName || '';
      if (prop === 'date') return aw.date || aw.awardDate || '';
      if (prop === 'citation') return aw.citation || '';
      if (prop === 'authority') return aw.authority || '';
      return aw[prop] || `[${fieldKey}]`;

    case 'leave':
      if (!l) return `[${fieldKey}]`;
      if (prop === 'type') return l.leaveType || '';
      if (prop === 'start_date') return l.startDate || '';
      if (prop === 'end_date') return l.endDate || '';
      if (prop === 'days') return String(l.days || l.workingDays || '');
      if (prop === 'reason') return l.reason || '';
      return l[prop] || `[${fieldKey}]`;

    case 'promotion':
      if (!pr) return `[${fieldKey}]`;
      if (prop === 'previous_rank') return pr.previousRank || '';
      if (prop === 'new_rank') return pr.rank || pr.newRank || '';
      if (prop === 'date') return pr.promotionDate || pr.date || '';
      if (prop === 'order_number') return pr.orderNumber || '';
      return pr[prop] || `[${fieldKey}]`;

    case 'education':
      if (!ed) return `[${fieldKey}]`;
      if (prop === 'degree') return ed.degree || ed.course || '';
      if (prop === 'school') return ed.school || ed.institution || '';
      if (prop === 'year') return ed.yearGraduated || '';
      return ed[prop] || `[${fieldKey}]`;

    case 'training':
      if (!tr) return `[${fieldKey}]`;
      if (prop === 'title') return tr.title || tr.courseTitle || '';
      if (prop === 'institution') return tr.institution || '';
      if (prop === 'date') return tr.date || tr.completionDate || '';
      return tr[prop] || `[${fieldKey}]`;

    case 'system':
      if (prop === 'current_date') {
        return new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
      }
      if (prop === 'current_year') {
        return String(new Date().getFullYear());
      }
      return `[${fieldKey}]`;

    default:
      return `[${fieldKey}]`;
  }
};

/**
 * Replaces all occurrences of {{category.field}} in an HTML or text string with the resolved value.
 */
export const resolveAllPaisFieldsInHtml = (html: string, context: Parameters<typeof resolvePaisFieldValue>[1]): string => {
  if (!html) return '';
  return html.replace(/\{\{([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\}\}/g, (match, fieldKey) => {
    const val = resolvePaisFieldValue(fieldKey, context);
    return val !== `[${fieldKey}]` ? val : match;
  });
};
