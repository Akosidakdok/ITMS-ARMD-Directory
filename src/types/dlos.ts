export type DlosClassification = 'grave' | 'less_grave';
export type DlosCaseView = DlosClassification | 'all';
export type DlosRole = 'viewer' | 'encoder' | 'reviewer';
export type DlosStatus = string;
export type DlosConfirmation = 'not_applicable' | 'pending' | 'confirmed' | 'not_confirmed';

export interface DlosPerson {
  id?: string;
  personnelId?: string | null;
  role: 'involved' | 'complainant' | 'respondent' | 'witness';
  rank: string;
  firstName: string;
  middleName: string;
  lastName: string;
  nameSnapshot: string;
  unit: string;
  status: string;
  position?: number;
}

export interface DlosCaseDraft {
  classification: DlosClassification;
  caseDate: string;
  docketNumber: string;
  didmNsuDocketNumber: string;
  didmReferenceNumber: string;
  summaryHearingDocketNumber: string;
  presidentialConfirmation: DlosConfirmation;
  unitOfficeCaseFrom: string;
  caseSource: string;
  complaintDate: string | null;
  forwardedToDlodDate: string | null;
  shoName: string;
  receivedByShoDate: string | null;
  resolvedByShoDate: string | null;
  decisionIssuedDate: string | null;
  signedByDaDate: string | null;
  dlodDocketNumber: string;
  complaintSource: string;
  initialComplaint: string;
  occurrenceAt: string | null;
  occurrencePlace: string;
  complaintDetails: string;
  sourceSystem: string;
  sourceRecordId: string;
  people: DlosPerson[];
}

export interface DlosCase extends DlosCaseDraft {
  id: string;
  caseStatus: DlosStatus;
  encoderName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  aging: { asOfDate: string; forShoDays: number | null; forReviewDays: number | null };
}

export interface DlosCaseEvent {
  id: string;
  eventType: string;
  changedFields: string[];
  fromStatus: string | null;
  toStatus: string | null;
  actorName: string;
  reason: string;
  createdAt: string;
}

export interface DlosCaseUpdate {
  id: string;
  updateDate: string;
  note: string;
  actorName: string;
  createdAt: string;
}

export interface DlosCaseDocument {
  id: string;
  caseId: string;
  kind: 'transmittal' | 'pce' | 'workflow' | 'sho_memorandum';
  stepKey: string;
  fileRole: string;
  respondentKey: string;
  documentDate: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploaderName: string;
  uploadedAt: string;
}

export interface DlosWorkflowRecord {
  id: string;
  caseId: string;
  stepKey: string;
  respondentKey: string;
  fields: Record<string, string>;
  noDocument: boolean;
  actorName: string;
  updatedAt: string;
}

export interface DlosPeriod { year: number; month: number; count: number }

export interface DlosPenaltyEntry {
  id: string;
  category: 'suspension' | 'demotion' | 'dismissal' | 'exonerated';
  name: string;
  caseId: string;
  docketNumber: string;
  effectivityDate: string;
  duration: string;
}

export interface DlosCasePage {
  items: DlosCase[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DlosAccount {
  id: string;
  email: string;
  displayName: string;
  role: string;
  dlosRole: DlosRole | null;
  createdAt?: string;
}
