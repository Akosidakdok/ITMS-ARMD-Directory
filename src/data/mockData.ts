import { 
  Personnel, 
  AssignmentRecord, 
  EducationRecord, 
  PromotionRecord, 
  OrderRecord, 
  TrainingRecord, 
  LeaveRecord 
} from '../types/pais';

// Clear mock arrays - Clean database mode (Only Admin imported data or live DB records will display)
export const INITIAL_PERSONNEL: Personnel[] = [];
export const INITIAL_ASSIGNMENTS: AssignmentRecord[] = [];
export const INITIAL_EDUCATION: EducationRecord[] = [];
export const INITIAL_PROMOTIONS: PromotionRecord[] = [];
export const INITIAL_ORDERS: OrderRecord[] = [];
export const INITIAL_TRAINING: TrainingRecord[] = [];
export const INITIAL_LEAVE: LeaveRecord[] = [];
