export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  documentType: string;
  category: string;
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  html: string;
}

export const DEFAULT_TEMPLATES: TemplatePreset[] = [
  {
    id: 'blank',
    name: 'Blank Document',
    description: 'Clean blank sheet with standard A4 layout ready for general documentation.',
    documentType: 'Custom Document',
    category: 'General',
    pageSize: 'A4',
    orientation: 'portrait',
    marginTop: 25.4,
    marginBottom: 25.4,
    marginLeft: 25.4,
    marginRight: 25.4,
    html: '<p>Start typing your document here...</p>'
  },
  {
    id: 'admin-order',
    name: 'Administrative Order',
    description: 'Standard PNP-ITMS administrative order format with letterhead, subject, and signature.',
    documentType: 'Administrative Order',
    category: 'Orders',
    pageSize: 'A4',
    orientation: 'portrait',
    marginTop: 22.5,
    marginBottom: 8.8,
    marginLeft: 25.4,
    marginRight: 23.4,
    html: `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: none;">
        <tbody>
          <tr style="border: none;">
            <td style="width: 17%; text-align: center; vertical-align: middle; border: none; padding: 0;">
              <span style="font-size: 10pt; font-weight: bold;">[PNP SEAL]</span>
            </td>
            <td style="width: 66%; text-align: center; vertical-align: middle; border: none; padding: 0;">
              <p style="margin: 0; font-size: 10pt; line-height: 1.15;">Republic of the Philippines</p>
              <p style="margin: 0; font-size: 10pt; line-height: 1.15;">NATIONAL POLICE COMMISSION</p>
              <p style="margin: 0; font-size: 11pt; font-weight: bold; line-height: 1.15;">PHILIPPINE NATIONAL POLICE</p>
              <p style="margin: 0; font-size: 11pt; font-weight: bold; line-height: 1.15;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
              <p style="margin: 0; font-size: 10pt; line-height: 1.15;">Camp BGen Rafael T. Crame, Quezon City</p>
            </td>
            <td style="width: 17%; text-align: center; vertical-align: middle; border: none; padding: 0;">
              <span style="font-size: 10pt; font-weight: bold;">[ITMS SEAL]</span>
            </td>
          </tr>
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: none;">
        <tbody>
          <tr style="border: none;">
            <td style="text-align: left; vertical-align: top; border: none; padding: 0; font-weight: bold; font-size: 12pt;">
              ITMS
            </td>
            <td style="text-align: right; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
              {{order.issued_date}}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-bottom: 14px;">
        <p style="margin: 0; font-weight: bold; font-size: 12pt; text-transform: uppercase;">{{order.order_type}}</p>
        <p style="margin: 0; font-weight: bold; font-size: 12pt;">NUMBER {{order.order_number}}</p>
      </div>

      <div style="margin-bottom: 14px;">
        <p style="margin: 0; font-weight: bold; font-size: 12pt;">SUBJECT&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;{{order.subject}}</p>
      </div>

      <p style="margin: 0 0 12px 0; text-align: justify; text-indent: 36pt; font-size: 12pt; line-height: 1.2;">
        {{order.details}}
      </p>

      <div style="margin-bottom: 16px;">
        <p style="margin: 0; padding-left: 85px; font-size: 12pt; line-height: 1.2;">1. {{personnel.rank}} {{personnel.full_name}} - {{personnel.sub_unit}}</p>
      </div>

      <div style="text-align: center; margin: 18px 0 16px 0;">
        <p style="margin: 0; font-weight: bold; font-size: 12pt;">BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; border: none;">
        <tbody>
          <tr style="border: none;">
            <td style="width: 45%; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
              <p style="margin: 0;">OFFICIAL:</p>
            </td>
            <td style="width: 10%; border: none; padding: 0;"></td>
            <td style="width: 45%; vertical-align: top; border: none; padding: 0; font-size: 12pt;">
              <p style="margin: 0; font-weight: bold; font-style: italic;">{{order.signatory}}</p>
              <p style="margin: 0;">Police Brigadier General</p>
              <p style="margin: 0;">{{order.signatory_title}}</p>
            </td>
          </tr>
          <tr style="border: none;">
            <td style="border: none; padding: 0;"></td>
            <td style="border: none; padding: 0;"></td>
            <td style="vertical-align: top; border: none; padding: 18px 0 0 0; font-size: 12pt;">
              <p style="margin: 0; font-weight: bold; font-style: italic;">VICTORIO M DELA PEÑA, JR</p>
              <p style="margin: 0;">Police Colonel</p>
              <p style="margin: 0;">Chief, Administrative and Resource Management Division</p>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 14px;">
        <p style="margin: 0; font-size: 12pt;">DISTRIBUTION:</p>
        <p style="margin: 0; font-size: 12pt; padding-left: 48px;">&ldquo;C&rdquo;</p>
      </div>
    `
  },
  {
    id: 'general-order',
    name: 'General Order',
    description: 'Official General Order for organizational policies, re-alignments, and service-wide directives.',
    documentType: 'General Order',
    category: 'Orders',
    pageSize: 'A4',
    orientation: 'portrait',
    marginTop: 25.4,
    marginBottom: 25.4,
    marginLeft: 25.4,
    marginRight: 25.4,
    html: `
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 9pt; text-transform: uppercase;">Republic of the Philippines</p>
        <p style="margin: 0; font-size: 9pt; font-weight: bold; text-transform: uppercase;">National Police Commission</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold; text-transform: uppercase;">PHILIPPINE NATIONAL POLICE</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
        <p style="margin: 0; font-size: 8.5pt; color: #475569;">Camp BGen Rafael T Crame, Quezon City</p>
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <h2 style="margin: 0; font-size: 14pt; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase;">GENERAL ORDER</h2>
        <p style="margin: 4px 0 0 0; font-weight: bold;">NUMBER: {{order.order_number}}</p>
        <p style="margin: 2px 0 0 0; font-size: 9pt; color: #64748b;">Date: {{order.issued_date}}</p>
      </div>
      <p style="font-weight: bold; text-transform: uppercase; margin: 24px 0 12px 0;">1. PURPOSE AND AUTHORITY:</p>
      <p style="text-align: justify; text-indent: 36px;">
        In accordance with the administrative authority vested in the Director, ITMS, the following general directives are hereby promulgated for execution:
      </p>
      <p style="text-align: justify; margin: 12px 0;">{{order.details}}</p>
      <p style="font-weight: bold; text-transform: uppercase; margin: 24px 0 12px 0;">2. PERSONNEL COVERED:</p>
      <p style="text-align: justify; text-indent: 36px;">
        Covering {{personnel.rank}} {{personnel.full_name}} (Badge No. {{personnel.serial_number}}), assigned to {{personnel.sub_unit}}.
      </p>
      <p style="font-weight: bold; text-transform: uppercase; margin: 24px 0 12px 0;">3. EFFECTIVITY:</p>
      <p style="text-align: justify; text-indent: 36px;">
        This Order takes effect on {{order.effective_date}} and shall remain in force until revoked or amended.
      </p>
      <div style="margin-top: 50px; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 240px;">
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">{{order.signatory}}</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt;">{{order.signatory_title}}</p>
        </div>
      </div>
    `
  },
  {
    id: 'assignment-order',
    name: 'Assignment Order',
    description: 'Notice of personnel duty reassignment, transfer, or detail with designation particulars.',
    documentType: 'Assignment Order',
    category: 'Assignments',
    pageSize: 'A4',
    orientation: 'portrait',
    marginTop: 25.4,
    marginBottom: 25.4,
    marginLeft: 25.4,
    marginRight: 25.4,
    html: `
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 9pt; text-transform: uppercase;">Republic of the Philippines</p>
        <p style="margin: 0; font-size: 9pt; font-weight: bold; text-transform: uppercase;">National Police Commission</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold; text-transform: uppercase;">PHILIPPINE NATIONAL POLICE</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
        <p style="margin: 0; font-size: 8.5pt; color: #475569;">Camp BGen Rafael T Crame, Quezon City</p>
      </div>
      <div style="text-align: center; margin: 16px 0;">
        <h2 style="margin: 0; font-size: 13pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">SPECIAL ASSIGNMENT ORDER</h2>
        <p style="margin: 4px 0 0 0; font-size: 10pt; font-weight: bold;">NUMBER: {{order.order_number}}</p>
      </div>
      <p style="text-align: justify; text-indent: 36px; margin-top: 24px;">
        The following named personnel of this Service is hereby relieved from current duties and assigned as indicated effective {{assignment.effective_date}}:
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Name:</strong> {{personnel.rank}} {{personnel.full_name}}</p>
        <p style="margin: 4px 0;"><strong>Badge / Serial No.:</strong> {{personnel.serial_number}}</p>
        <p style="margin: 4px 0;"><strong>New Assignment:</strong> {{assignment.position}}</p>
        <p style="margin: 4px 0;"><strong>Unit / Division:</strong> {{assignment.sub_unit}}</p>
        <p style="margin: 4px 0;"><strong>Station:</strong> {{assignment.station}}</p>
      </div>
      <p style="text-align: justify; text-indent: 36px; margin-bottom: 40px;">
        Proper turnover of duties, responsibilities, and issued equipment must be completed prior to reporting to the new designated station.
      </p>
      <div style="margin-top: 50px; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 240px;">
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">{{order.signatory}}</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt;">{{order.signatory_title}}</p>
        </div>
      </div>
    `
  },
  {
    id: 'memorandum',
    name: 'Official Memorandum',
    description: 'Standard PNP administrative memorandum for internal communications and announcements.',
    documentType: 'Memorandum',
    category: 'Correspondence',
    pageSize: 'A4',
    orientation: 'portrait',
    marginTop: 25.4,
    marginBottom: 25.4,
    marginLeft: 25.4,
    marginRight: 25.4,
    html: `
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 9pt; text-transform: uppercase;">Republic of the Philippines</p>
        <p style="margin: 0; font-size: 9pt; font-weight: bold; text-transform: uppercase;">National Police Commission</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold; text-transform: uppercase;">PHILIPPINE NATIONAL POLICE</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
        <p style="margin: 0; font-size: 8.5pt; color: #475569;">Camp BGen Rafael T Crame, Quezon City</p>
      </div>
      <div style="text-align: center; margin: 16px 0 24px 0;">
        <h2 style="margin: 0; font-size: 13pt; font-weight: bold; letter-spacing: 2px;">MEMORANDUM</h2>
      </div>
      <table style="width: 100%; margin-bottom: 24px; font-size: 10pt; border-collapse: collapse;">
        <tr><td style="width: 100px; font-weight: bold; padding: 4px 0;">FOR:</td><td style="padding: 4px 0;">All Division Chiefs and Sub-Unit Heads</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 0;">FROM:</td><td style="padding: 4px 0;">{{order.signatory_title}}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 0;">SUBJECT:</td><td style="font-weight: bold; padding: 4px 0; text-transform: uppercase;">{{order.subject}}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 0;">DATE:</td><td style="padding: 4px 0;">{{system.current_date}}</td></tr>
      </table>
      <hr style="border: 0; border-top: 1.5px solid #0f172a; margin-bottom: 20px;" />
      <p style="text-align: justify; text-indent: 36px; margin-bottom: 16px;">
        1. Reference: PNP Standard Operating Procedures and pertinent ITMS administrative circulars.
      </p>
      <p style="text-align: justify; text-indent: 36px; margin-bottom: 16px;">
        2. In connection with the above reference, this directive informs all concerned personnel regarding {{order.details}}.
      </p>
      <p style="text-align: justify; text-indent: 36px; margin-bottom: 40px;">
        3. For guidance, strict compliance, and immediate implementation.
      </p>
      <div style="margin-top: 48px; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 240px;">
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">{{order.signatory}}</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt;">{{order.signatory_title}}</p>
        </div>
      </div>
    `
  },
  {
    id: 'award-citation',
    name: 'Award Citation',
    description: 'Official commendation and award citation certificate format.',
    documentType: 'Award',
    category: 'Awards',
    pageSize: 'Letter',
    orientation: 'landscape',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 25,
    html: `
      <div style="text-align: center; border: 3px double #0f172a; padding: 40px; background-color: #ffffff;">
        <p style="margin: 0; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px;">Republic of the Philippines</p>
        <p style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">National Police Commission</p>
        <p style="margin: 0; font-size: 12pt; font-weight: bold; text-transform: uppercase;">PHILIPPINE NATIONAL POLICE</p>
        <p style="margin: 4px 0 0 0; font-size: 11pt; font-weight: bold;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
        <div style="margin: 32px 0 20px 0;">
          <p style="font-size: 12pt; font-style: italic; margin-bottom: 8px;">presents this</p>
          <h1 style="font-size: 26pt; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #042f2e; margin: 0;">
            {{award.title}}
          </h1>
          <p style="font-size: 11pt; margin-top: 12px;">to</p>
          <h2 style="font-size: 18pt; font-weight: bold; text-decoration: underline; margin: 8px 0; text-transform: uppercase;">
            {{personnel.rank}} {{personnel.full_name}}
          </h2>
          <p style="font-size: 10pt; color: #475569;">Badge No. {{personnel.serial_number}} · {{personnel.sub_unit}}</p>
        </div>
        <p style="max-width: 680px; margin: 24px auto; font-size: 10.5pt; line-height: 1.8; text-align: justify;">
          {{award.citation}}
        </p>
        <p style="font-size: 9.5pt; margin-top: 24px;">Given this {{system.current_date}} at Camp BGen Rafael T Crame, Quezon City.</p>
        <div style="margin-top: 48px; display: flex; justify-content: flex-end;">
          <div style="text-align: center; min-width: 220px;">
            <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">{{order.signatory}}</p>
            <p style="margin: 2px 0 0 0; font-size: 9pt;">{{order.signatory_title}}</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'personnel-certification',
    name: 'Personnel Certification',
    description: 'Official certification of personnel bona fide status, active assignment, and good standing.',
    documentType: 'Certification',
    category: 'Certifications',
    pageSize: 'A4',
    orientation: 'portrait',
    marginTop: 25.4,
    marginBottom: 25.4,
    marginLeft: 25.4,
    marginRight: 25.4,
    html: `
      <div style="text-align: center; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 9pt; text-transform: uppercase;">Republic of the Philippines</p>
        <p style="margin: 0; font-size: 9pt; font-weight: bold; text-transform: uppercase;">National Police Commission</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold; text-transform: uppercase;">PHILIPPINE NATIONAL POLICE</p>
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</p>
        <p style="margin: 0; font-size: 8.5pt; color: #475569;">Camp BGen Rafael T Crame, Quezon City</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <h2 style="margin: 0; font-size: 14pt; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">C E R T I F I C A T I O N</h2>
      </div>
      <p style="font-weight: bold; margin: 24px 0 16px 0;">TO WHOM IT MAY CONCERN:</p>
      <p style="text-align: justify; text-indent: 36px; margin-bottom: 16px; line-height: 1.8;">
        THIS IS TO CERTIFY that according to records available in this Service, <strong>{{personnel.rank}} {{personnel.full_name}}</strong>, with Badge/Serial Number <strong>{{personnel.serial_number}}</strong>, is a bona fide active member of the Philippine National Police presently assigned to the <strong>{{personnel.sub_unit}}</strong>, ITMS holding the position of <strong>{{personnel.designation}}</strong>.
      </p>
      <p style="text-align: justify; text-indent: 36px; margin-bottom: 16px; line-height: 1.8;">
        This certification is issued upon the request of the above-named personnel for whatever legal purpose it may serve.
      </p>
      <p style="text-align: justify; text-indent: 36px; margin-bottom: 40px; line-height: 1.8;">
        Issued this {{system.current_date}} at Camp BGen Rafael T Crame, Quezon City, Philippines.
      </p>
      <div style="margin-top: 60px; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 240px;">
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">{{order.signatory}}</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt;">{{order.signatory_title}}</p>
        </div>
      </div>
    `
  }
];
