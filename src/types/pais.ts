export type UserRole = 'admin' | 'user' | 'command' | string;

export type RankAbbr = 
  | 'PGEN' | 'PLTGEN' | 'PMGEN' | 'PBGEN' | 'PCOL' | 'PLTCOL' 
  | 'PMAJ' | 'PCPT' | 'PLT' | 'PEMS' | 'PCMS' | 'PSMS' | 'PMSg' 
  | 'PSSg' | 'PCpl' | 'Pat' | 'NUP' | string;

export interface Personnel {
  id: string;
  rank: RankAbbr;
  rankFullName?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  qualifier?: string;
  fullName: string;
  badgeNo: string;
  salaryGrade?: number;
  plantilla?: string;
  division: string;
  detail?: string;
  designation: string;
  address?: string;
  gender?: 'Male' | 'Female' | string;
  contactNumber?: string;
  birthday?: string;
  dateOfEntry?: string;
  enterInOfficerPositionDate?: string;
  lastPromotionDate?: string;
  status: 'Active' | 'On Leave' | 'Detailed Out' | 'Suspended' | string;
  avatarUrl?: string;
}

export interface AssignmentRecord {
  id: string;
  personnelId: string;
  unit: string;
  position: string;
  orderRef: string;
  startDate: string;
  endDate?: string;
  status: 'Current' | 'Completed' | 'Terminated' | string;
  remarks?: string;
}

export interface EducationRecord {
  id: string;
  personnelId: string;
  degree: string;
  institution: string;
  yearGraduated?: number;
  honors?: string;
  certifications?: string[];
}

export interface PromotionRecord {
  id: string;
  personnelId: string;
  rankFrom: RankAbbr;
  rankTo: RankAbbr;
  promotionDate: string;
  orderNumber: string;
  authority?: string;
  timeInGradeAtPromotion?: string;
  remarks?: string;
}

export interface OrderRecord {
  id: string;
  personnelIds?: string[];
  orderNo?: string;
  orderNumber?: string;
  subject: string;
  description?: string;
  issuer?: string;
  issuedDate?: string;
  effectiveDate?: string;
  type?: 'Assignment' | 'Promotion' | 'Commendation' | 'Disciplinary' | 'Leave' | string;
  orderType?: string;
  signatory?: string;
  signatoryTitle?: string;
  affectedPersonnelCount?: number;
  status?: 'Active' | 'Archived' | 'Revoked' | string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AwardOrderType = 'General Order' | 'Special Order' | 'Letter Order';

export interface AwardRecord {
  id: string;
  orderType: AwardOrderType;
  title: string;
  citationDetails: string;
  awardName: string;
  authorityDate: string;
  personnelId: string;
  personnelName: string;
  status: 'Active' | 'Archived' | string;
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentTemplateType =
  | 'Assignment Order'
  | 'Administrative Order'
  | 'Leave Endorsement'
  | 'Award Citation';

export interface DocumentTemplateField {
  key: string;
  label: string;
  value: string;
}

export interface DocumentTemplate {
  id: string;
  type: DocumentTemplateType;
  title: string;
  description: string;
  fields: DocumentTemplateField[];
}

export interface TrainingRecord {
  id: string;
  personnelId: string;
  courseName: string;
  provider: string;
  startDate?: string;
  endDate?: string;
  completionDate?: string;
  hours?: number;
  category?: string;
  certificateRef?: string;
  certificateNo?: string;
}

export interface LeaveRecord {
  id: string;
  personnelId: string;
  leaveType: 'Vacation' | 'Sick' | 'Maternity' | 'Paternity' | 'Special' | string;
  startDate: string;
  endDate: string;
  daysCount?: number;
  days?: number;
  purpose?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
