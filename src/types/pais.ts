export type RankAbbr = 
  | 'PGen' | 'PLTGEN' | 'PMGEN' | 'PBGEN' | 'PCOL' | 'PLTCOL' 
  | 'PMAJ' | 'PCPT' | 'PLT' | 'PEMS' | 'PCMS' | 'PSMS' | 'MSMS' 
  | 'SMS' | 'CPL' | 'PCPL' | 'Pat';

export interface Personnel {
  id: string;
  rank: RankAbbr;
  rankFullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  qualifier?: string;
  fullName: string;
  badgeNo: string;
  salaryGrade: number; // e.g. 26
  plantilla: string; // e.g. ITMS-ARMD-2024-001
  division: string; // e.g. ARMD, OMD, SDD, NDCMD, CSD
  detail: string; // e.g. Camp Crame, RITMO 4A
  designation: string; // e.g. Division Chief, Software Architect
  address: string;
  gender: 'Male' | 'Female';
  contactNumber: string;
  birthday: string; // YYYY-MM-DD
  dateOfEntry: string; // YYYY-MM-DD
  enterInOfficerPositionDate: string; // YYYY-MM-DD
  lastPromotionDate: string; // YYYY-MM-DD
  status: 'Active' | 'On Leave' | 'Detailed Out' | 'Suspended';
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
  status: 'Current' | 'Completed' | 'Terminated';
  remarks?: string;
}

export interface EducationRecord {
  id: string;
  personnelId: string;
  degree: string;
  institution: string;
  yearGraduated: number;
  honors?: string;
  certifications: string[];
}

export interface PromotionRecord {
  id: string;
  personnelId: string;
  rankFrom: RankAbbr;
  rankTo: RankAbbr;
  promotionDate: string;
  orderNumber: string;
  timeInGradeAtPromotion?: string;
  remarks?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  orderType: 'Assignment Order' | 'Movement Order' | 'Special Order' | 'Commendation Order' | 'Relief Order';
  subject: string;
  issuedDate: string;
  effectiveDate: string;
  signatory: string;
  signatoryTitle: string;
  status: 'Active' | 'Pending' | 'Revoked';
  affectedPersonnelCount: number;
  description?: string;
}

export interface TrainingRecord {
  id: string;
  personnelId: string;
  courseName: string;
  category: 'Career Course' | 'Specialized IT' | 'Cyber Security' | 'Database Admin' | 'Network & Telecom';
  provider: string;
  startDate: string;
  completionDate: string;
  hours: number;
  certificateNo: string;
}

export interface LeaveRecord {
  id: string;
  personnelId: string;
  leaveType: 'Vacation' | 'Sick' | 'Mandatory' | 'Study' | 'Special Privilege' | 'Emergency';
  startDate: string;
  endDate: string;
  days: number;
  status: 'Approved' | 'Pending' | 'Completed' | 'Rejected';
  approvedBy: string;
  purpose?: string;
}

export type UserRole = 'admin' | 'view_only';
