/**
 * Phase 1 Excel template registry.
 *
 * This registry is intentionally code-defined. It describes workbook layouts
 * and PAIS mappings without reading the confidential reference workbooks at
 * runtime. Later export/import services can use these definitions to render
 * and validate versioned templates consistently.
 */

const roles = {
  read: ['view_only', 'admin', 'superadmin'],
  manage: ['admin', 'superadmin']
};

const field = (target, headerAliases, options = {}) => ({
  target,
  headerAliases,
  required: Boolean(options.required),
  kind: options.kind || 'text',
  editable: options.editable !== false,
  calculated: Boolean(options.calculated),
  description: options.description || ''
});

const trainingFields = [
  field('personnelId', ['Personnel ID', 'Badge Number', 'Badge No.'], { required: true, description: 'Stable PAIS personnel identity; badge number may be used for lookup.' }),
  field('personnelName', ['Name', 'Personnel Name'], { required: true }),
  field('category', ['Training Type', 'Category'], { required: true }),
  field('courseName', ['Training Title', 'Course Name'], { required: true }),
  field('provider', ['School', 'Provider', 'Issued By'], { required: true }),
  field('location', ['Location']),
  field('startDate', ['Inclusive Start Date', 'Start Date'], { kind: 'date' }),
  field('completionDate', ['Inclusive End Date', 'End Date', 'Completion Date'], { kind: 'date' }),
  field('hours', ['Number of Hours', 'Hours'], { kind: 'number' }),
  field('source', ['Source']),
  field('certificateNo', ['Auth Number', 'Certificate No.', 'Certificate Number']),
  field('authorityDate', ['Auth Date', 'Authority Date'], { kind: 'date' }),
  field('issuedBy', ['Issued By']),
  field('attachment', ['Attachment'])
];

const educationFields = [
  field('personnelId', ['Personnel ID', 'Badge Number', 'Badge No.'], { required: true }),
  field('personnelName', ['Name', 'Personnel Name'], { required: true }),
  field('academicLevel', ['Academic Level'], { required: true }),
  field('institution', ['School', 'Institution'], { required: true }),
  field('degree', ['Course', 'Degree']),
  field('major', ['Major']),
  field('startYear', ['Start Year'], { kind: 'number' }),
  field('yearGraduated', ['End Year', 'Year Graduated'], { kind: 'number' }),
  field('honors', ['Grade', 'Honors']),
  field('highest', ['Highest'], { kind: 'boolean' }),
  field('ranking', ['Ranking'], { kind: 'number' })
];

const personnelReportSheets = [
  { name: 'Rank Profile', headerRow: 10, dataStartRow: 11, source: 'personnel', mode: 'report-only' },
  { name: 'Territorial Strength', headerRow: 9, dataStartRow: 10, source: 'personnel', mode: 'report-only' },
  { name: 'Statistics UP', headerRow: 11, dataStartRow: 12, source: 'personnel', mode: 'report-only' },
  { name: 'Statistics NUP', headerRow: 11, dataStartRow: 12, source: 'personnel', mode: 'report-only' },
  { name: 'HQ ITMS', headerRow: 9, dataStartRow: 10, source: 'personnel', mode: 'report-only' },
  { name: 'CHECKING', headerRow: 2, dataStartRow: 4, source: 'personnel', mode: 'report-only', notes: 'Legacy reference sheet contains formula errors and is not an import target.' }
];

const promotionSheets = [
  { name: 'Seniority', headerRow: 6, dataStartRow: 8, source: 'promotions', mode: 'factor-input', factor: 'seniority' },
  { name: 'IPER', headerRow: 6, dataStartRow: 8, source: 'promotion_evaluations', mode: 'factor-input', factor: 'otherQualifications' },
  { name: 'Awards', headerRow: 3, dataStartRow: 5, source: 'awards', mode: 'factor-input', factor: 'awards' },
  { name: 'Diversity of Assignment', headerRow: 6, dataStartRow: 9, source: 'assignments', mode: 'factor-input', factor: 'diversity' },
  { name: 'Service Reputation', headerRow: 19, dataStartRow: 20, source: 'promotion_evaluations', mode: 'factor-input', factor: 'serviceReputation' },
  { name: 'Interview rating', headerRow: 7, dataStartRow: 11, source: 'promotion_evaluations', mode: 'factor-input', factor: 'interviewRating' },
  { name: 'PCPT-PMAJ', headerRow: 7, dataStartRow: 8, source: 'promotion_evaluations', mode: 'report-only' },
  { name: 'PLT-PCPT', headerRow: 7, dataStartRow: 8, source: 'promotion_evaluations', mode: 'report-only' }
];

const registry = [
  {
    id: 'training-import',
    version: '1.0.0',
    name: 'Training records import',
    referenceFile: 'INITIAL DATA - TRAINING AND EDUC.xlsx',
    purpose: 'Import validated training records into PAIS.',
    permissions: roles,
    sheets: [{ name: 'TRAINING', headerRow: 1, dataStartRow: 2, source: 'training', mode: 'import' }],
    editPolicy: { editableFields: ['category', 'courseName', 'provider', 'location', 'startDate', 'completionDate', 'hours', 'source', 'certificateNo', 'authorityDate', 'issuedBy', 'attachment'], lockedFields: ['personnelId', 'personnelName'] },
    fieldMappings: trainingFields,
    validation: ['personnelId or badge number must resolve to one PAIS personnel record', 'courseName is required', 'end date cannot precede start date', 'duplicate personnel/course/date records require review']
  },
  {
    id: 'education-import',
    version: '1.0.0',
    name: 'Education records import',
    referenceFile: 'INITIAL DATA - TRAINING AND EDUC.xlsx',
    purpose: 'Import validated academic and certification records into PAIS.',
    permissions: roles,
    sheets: [{ name: 'EDUCATION', headerRow: 1, dataStartRow: 2, source: 'education', mode: 'import' }],
    editPolicy: { editableFields: ['academicLevel', 'institution', 'degree', 'major', 'startYear', 'yearGraduated', 'honors', 'highest', 'ranking'], lockedFields: ['personnelId', 'personnelName'] },
    fieldMappings: educationFields,
    validation: ['personnelId or badge number must resolve to one PAIS personnel record', 'academic level and institution are required', 'years must be valid four-digit years', 'duplicate personnel/level/degree records require review']
  },
  {
    id: 'personnel-disposition-reports',
    version: '1.0.0',
    name: 'Personnel disposition and strength reports',
    referenceFile: 'INITIAL DATA - FORMS.xlsx',
    purpose: 'Generate controlled, read-only disposition and strength reports from PAIS personnel data.',
    permissions: { read: roles.read, manage: roles.manage },
    sheets: personnelReportSheets,
    editPolicy: { editableFields: ['authorizedStrength'], lockedFields: ['unitCategory', 'rank', 'actualStrength', 'variance', 'asOfDate'] },
    fieldMappings: [
      field('unitCategory', ['OFFICE', 'OFFICE/UNIT', 'UNIT/OFFICE'], { calculated: true, editable: false }),
      field('rank', ['RANK', 'PCO', 'PNCO', 'NUP'], { calculated: true, editable: false }),
      field('actualStrength', ['ACTUAL STRENGTH', 'POPULATION', 'TOTAL', 'GRAND TOTAL'], { kind: 'number', calculated: true, editable: false }),
      field('authorizedStrength', ['AUTHORIZED STRENGTH'], { kind: 'number', description: 'Controlled administrative input; never replaces actual PAIS count.' }),
      field('variance', ['VARIANCE'], { kind: 'number', calculated: true, editable: false }),
      field('asOfDate', ['AS OF', 'AS OF DATE'], { kind: 'date', calculated: true, editable: false })
    ],
    validation: ['actual strength is calculated from PAIS records', 'authorized strength is optional and separately controlled', 'formula-error legacy sheets are report-only']
  },
  {
    id: 'statistics-by-rank',
    version: '1.0.0',
    name: 'Statistics by rank',
    referenceFile: 'STATISTICS_BY RANK - UP.xlsx',
    purpose: 'Generate rank-by-office population statistics from PAIS records.',
    permissions: { read: roles.read, manage: roles.manage },
    sheets: [{ name: 'Sheet1', headerRow: 5, dataStartRow: 6, source: 'personnel', mode: 'report-only' }],
    editPolicy: { editableFields: [], lockedFields: ['unitCategory', 'population', 'rankCounts', 'grandTotal'] },
    fieldMappings: [
      field('unitCategory', ['OFFICE'], { calculated: true, editable: false }),
      field('population', ['POPULATION'], { kind: 'number', calculated: true, editable: false }),
      ...['PBGEN', 'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT', 'PEMS', 'PCMS', 'PSMS', 'PMSg', 'PSSg', 'PCpl', 'Pat'].map(rank => field(`rankCounts.${rank}`, [rank], { kind: 'number', calculated: true, editable: false })),
      field('grandTotal', ['GRAND TOTAL'], { kind: 'number', calculated: true, editable: false })
    ],
    validation: ['all totals are calculated from current PAIS personnel records', 'report date must be recorded in the generated workbook']
  },
  {
    id: 'promotion-evaluation-pco',
    version: '1.0.0',
    name: 'PCO promotion evaluation workbook',
    referenceFile: 'PCO Worksheet Promotion CY 2026 - FINAL -for programming.xlsx',
    purpose: 'Generate and later validate PCO promotion factor worksheets and evaluation snapshots.',
    permissions: { read: roles.read, manage: roles.manage },
    promotionTrack: 'PCO',
    sheets: promotionSheets,
    editPolicy: { editableFields: ['iperPoints', 'awardsPoints', 'serviceReputationPoints', 'interviewPoints'], lockedFields: ['personnelId', 'rank', 'evaluationDate', 'seniorityPoints', 'diversityPoints', 'totalScore', 'ranking'] },
    fieldMappings: [
      field('personnelId', ['Personnel ID', 'Badge Number'], { required: true }),
      field('rank', ['Rank'], { required: true, calculated: true, editable: false }),
      field('evaluationDate', ['Evaluation Date', 'As of Date'], { required: true, kind: 'date' }),
      field('seniorityPoints', ['Seniority (25 pts)', 'Point Allocation (25 pts)'], { kind: 'number', calculated: true }),
      field('iperPoints', ['IPER (5 pts)', 'POINT ALLOCATION (5 PTS)'], { kind: 'number' }),
      field('awardsPoints', ['Awards and Recognition (10 pts)'], { kind: 'number' }),
      field('diversityPoints', ['Diversity of Assignment (25 pts)'], { kind: 'number', calculated: true }),
      field('serviceReputationPoints', ['Service Reputation (25 pts)'], { kind: 'number' }),
      field('interviewPoints', ['Interview (10 pts)', 'Final Rating (10%)'], { kind: 'number' }),
      field('totalScore', ['Total Score'], { kind: 'number', calculated: true, editable: false }),
      field('ranking', ['Ranking'], { kind: 'number', calculated: true, editable: false })
    ],
    validation: ['personnel identity must resolve by stable ID or badge number', 'point maxima follow the PCO reference worksheet', 'formula/source mappings require approved promotion policy before automatic scoring']
  },
  {
    id: 'promotion-evaluation-pnco',
    version: '1.0.0',
    name: 'PNCO promotion evaluation workbook',
    referenceFile: 'PCO Worksheet Promotion CY 2026 - FINAL -for programming.xlsx',
    purpose: 'Generate and later validate PNCO promotion evaluation worksheets and evaluation snapshots.',
    permissions: { read: roles.read, manage: roles.manage },
    promotionTrack: 'PNCO',
    sheets: [{ name: 'Pat-PCpl V2', headerRow: 3, dataStartRow: 4, source: 'promotion_evaluations', mode: 'report-only' }, ...promotionSheets.filter(sheet => ['Seniority', 'IPER', 'Awards', 'Diversity of Assignment', 'Service Reputation', 'Interview rating'].includes(sheet.name))],
    editPolicy: { editableFields: ['ratingPoints', 'awardsPoints', 'serviceReputationPoints', 'interviewPoints'], lockedFields: ['personnelId', 'rank', 'totalScore', 'ranking'] },
    fieldMappings: [
      field('personnelId', ['Personnel ID', 'Badge Number'], { required: true }),
      field('rank', ['Rank'], { required: true, calculated: true, editable: false }),
      field('seniorityPoints', ['Seniority (30 pts)'], { kind: 'number', calculated: true }),
      field('ratingPoints', ['1st Rating Period (2025)', '2nd Rating Period (2024)'], { kind: 'number' }),
      field('awardsPoints', ['Awards and Recognition (10 pts)'], { kind: 'number' }),
      field('diversityPoints', ['Diversity of Assignment (20 pts)'], { kind: 'number', calculated: true }),
      field('serviceReputationPoints', ['Service Reputation (20 pts)'], { kind: 'number' }),
      field('interviewPoints', ['Interview (15 pts)'], { kind: 'number' }),
      field('totalScore', ['Total Score'], { kind: 'number', calculated: true, editable: false }),
      field('ranking', ['Ranking'], { kind: 'number', calculated: true, editable: false })
    ],
    validation: ['personnel identity must resolve by stable ID or badge number', 'point maxima follow the PNCO reference worksheet', 'formula/source mappings require approved promotion policy before automatic scoring']
  }
];

export const listExcelTemplates = () => registry.map(template => ({
  id: template.id,
  version: template.version,
  name: template.name,
  referenceFile: template.referenceFile,
  purpose: template.purpose,
  promotionTrack: template.promotionTrack || null,
  permissions: template.permissions
}));

export const getExcelTemplate = templateId => registry.find(template => template.id === templateId) || null;

export default registry;
