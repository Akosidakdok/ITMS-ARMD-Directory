import { 
  Personnel, 
  OrderRecord, 
  AssignmentRecord, 
  EducationRecord, 
  PromotionRecord, 
  TrainingRecord, 
  LeaveRecord,
  AwardRecord
} from '../types/pais';
import type {
  PersonnelImportIssue,
  PersonnelImportRow
} from '../utils/personnelCsv';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const BULK_IMPORT_BATCH_SIZE = 250;

export interface BulkPersonnelImportResult {
  created: Personnel[];
  importedCount: number;
  rejectedCount: number;
  errors: PersonnelImportIssue[];
}

export interface BackendHealthStatus {
  status: 'online' | string;
  database?: {
    activeAdapter?: string;
    primary?: string;
    fallback?: string;
    supabase?: {
      isConnected: boolean;
      state: string;
      url?: string;
      tablesReady?: boolean;
      error?: string;
    };
  };
}

/**
 * Health Check helper to test if backend service is live
 */
export const fetchBackendHealth = async (): Promise<BackendHealthStatus | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
};

export const checkBackendHealth = async (): Promise<boolean> => {
  const data = await fetchBackendHealth();
  return data?.status === 'online';
};

// ================= PERSONNEL API =================
export const fetchPersonnel = async (): Promise<Personnel[]> => {
  const res = await fetch(`${API_BASE_URL}/personnel`);
  if (!res.ok) throw new Error('Failed to fetch personnel');
  const json = await res.json();
  return json.data;
};

export const createPersonnelApi = async (personnel: Personnel): Promise<Personnel> => {
  const res = await fetch(`${API_BASE_URL}/personnel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personnel)
  });
  if (!res.ok) throw new Error('Failed to create personnel');
  const json = await res.json();
  return json.data;
};

export const updatePersonnelApi = async (personnel: Personnel): Promise<Personnel> => {
  const res = await fetch(`${API_BASE_URL}/personnel/${personnel.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personnel)
  });
  if (!res.ok) throw new Error('Failed to update personnel');
  const json = await res.json();
  return json.data;
};

export const deletePersonnelApi = async (id: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/personnel/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete personnel');
  return true;
};

export const bulkCreatePersonnelApi = async (
  rows: PersonnelImportRow[],
  onProgress?: (completed: number, total: number) => void
): Promise<BulkPersonnelImportResult> => {
  const result: BulkPersonnelImportResult = {
    created: [],
    importedCount: 0,
    rejectedCount: 0,
    errors: []
  };

  for (let start = 0; start < rows.length; start += BULK_IMPORT_BATCH_SIZE) {
    const batch = rows.slice(start, start + BULK_IMPORT_BATCH_SIZE);
    const res = await fetch(`${API_BASE_URL}/personnel/import/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: batch })
    });
    const json = await res.json().catch(() => null);

    if (!res.ok && res.status !== 207) {
      throw new Error(json?.message || json?.error || 'Bulk personnel import failed');
    }

    const batchResult = json?.data;
    result.created.push(...(batchResult?.created || []));
    result.importedCount += Number(batchResult?.importedCount || 0);
    result.rejectedCount += Number(batchResult?.rejectedCount || 0);
    result.errors.push(...(batchResult?.errors || []));
    onProgress?.(Math.min(start + batch.length, rows.length), rows.length);
  }

  return result;
};

// ================= ORDERS API =================
export const fetchOrders = async (): Promise<OrderRecord[]> => {
  const res = await fetch(`${API_BASE_URL}/orders`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  const json = await res.json();
  return json.data;
};

export const createOrderApi = async (order: OrderRecord): Promise<OrderRecord> => {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to create order');
  return json.data;
};

export const updateOrderApi = async (order: OrderRecord): Promise<OrderRecord> => {
  const res = await fetch(`${API_BASE_URL}/orders/${order.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  if (!res.ok) throw new Error('Failed to update order');
  const json = await res.json();
  return json.data;
};

// ================= AWARDS API =================
export const fetchAwards = async (): Promise<AwardRecord[]> => {
  const res = await fetch(`${API_BASE_URL}/awards`);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || 'Failed to fetch awards');
  return json.data;
};

export const createAwardApi = async (
  award: Omit<AwardRecord, 'id' | 'status'>
): Promise<AwardRecord> => {
  const res = await fetch(`${API_BASE_URL}/awards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(award)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const details = json?.error && json?.message && !json.message.includes(json.error)
      ? `${json.message} (${json.error})`
      : json?.message || json?.error;
    throw new Error(details || 'Failed to save award');
  }
  return json.data;
};

export const updateAwardApi = async (award: AwardRecord): Promise<AwardRecord> => {
  const res = await fetch(`${API_BASE_URL}/awards/${award.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(award)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to update award');
  return json.data;
};

// ================= ASSIGNMENTS API =================
export const fetchAssignments = async (): Promise<AssignmentRecord[]> => {
  const res = await fetch(`${API_BASE_URL}/assignments`);
  if (!res.ok) throw new Error('Failed to fetch assignments');
  const json = await res.json();
  return json.data;
};

export const createAssignmentApi = async (assignment: AssignmentRecord): Promise<AssignmentRecord> => {
  const res = await fetch(`${API_BASE_URL}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment)
  });
  const json = await res.json();
  return json.data;
};

// ================= EDUCATION API =================
export const fetchEducation = async (): Promise<EducationRecord[]> => {
  const res = await fetch(`${API_BASE_URL}/education`);
  if (!res.ok) throw new Error('Failed to fetch education records');
  const json = await res.json();
  return json.data;
};

export const createEducationApi = async (edu: EducationRecord): Promise<EducationRecord> => {
  const res = await fetch(`${API_BASE_URL}/education`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edu)
  });
  if (!res.ok) throw new Error('Failed to create education record');
  const json = await res.json();
  return json.data;
};

export const updateEducationApi = async (edu: EducationRecord): Promise<EducationRecord> => {
  const res = await fetch(`${API_BASE_URL}/education/${edu.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edu)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to update education record');
  return json.data;
};

export const deleteEducationApi = async (id: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/education/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete education record');
  return true;
};

export interface BulkUpsertResult {
  addedCount: number;
  replacedCount: number;
  skippedCount: number;
  added: unknown[];
  replaced: unknown[];
  skipped: Array<Record<string, unknown> & { reason: string }>;
}

export const bulkUpsertEducationApi = async (records: Partial<EducationRecord>[]): Promise<BulkUpsertResult> => {
  const res = await fetch(`${API_BASE_URL}/education/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok && res.status !== 207) throw new Error(json?.message || json?.error || 'Bulk education upsert failed');
  return json.data;
};

// ================= PROMOTIONS API =================
export const fetchPromotions = async (): Promise<PromotionRecord[]> => {
  const res = await fetch(`${API_BASE_URL}/promotions`);
  if (!res.ok) throw new Error('Failed to fetch promotions');
  const json = await res.json();
  return json.data;
};

export const createPromotionApi = async (promotion: PromotionRecord): Promise<PromotionRecord> => {
  const res = await fetch(`${API_BASE_URL}/promotions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promotion)
  });
  if (!res.ok) throw new Error('Failed to create promotion');
  const json = await res.json();
  return json.data;
};

// ================= TRAINING API =================
export const fetchTraining = async (): Promise<TrainingRecord[]> => {
  const res = await fetch(`${API_BASE_URL}/training`);
  if (!res.ok) throw new Error('Failed to fetch training records');
  const json = await res.json();
  return json.data;
};

export const createTrainingApi = async (training: TrainingRecord): Promise<TrainingRecord> => {
  const res = await fetch(`${API_BASE_URL}/training`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(training)
  });
  if (!res.ok) throw new Error('Failed to create training');
  const json = await res.json();
  return json.data;
};

export const updateTrainingApi = async (training: TrainingRecord): Promise<TrainingRecord> => {
  const res = await fetch(`${API_BASE_URL}/training/${training.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(training)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to update training record');
  return json.data;
};

export const deleteTrainingApi = async (id: string): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/training/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete training record');
  return true;
};

export const bulkUpsertTrainingApi = async (records: Partial<TrainingRecord>[]): Promise<BulkUpsertResult> => {
  const res = await fetch(`${API_BASE_URL}/training/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok && res.status !== 207) throw new Error(json?.message || json?.error || 'Bulk training upsert failed');
  return json.data;
};

// ================= LEAVE API =================
export const fetchLeave = async (): Promise<LeaveRecord[]> => {
  const res = await fetch(`${API_BASE_URL}/leave`);
  if (!res.ok) throw new Error('Failed to fetch leave records');
  const json = await res.json();
  return json.data;
};

export const createLeaveApi = async (leave: LeaveRecord): Promise<LeaveRecord> => {
  const res = await fetch(`${API_BASE_URL}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leave)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to file leave');
  return json.data;
};

export const updateAssignmentApi = async (assignment: AssignmentRecord): Promise<AssignmentRecord> => {
  const res = await fetch(`${API_BASE_URL}/assignments/${assignment.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to update assignment');
  return json.data;
};

export const updateLeaveApi = async (leave: LeaveRecord): Promise<LeaveRecord> => {
  const res = await fetch(`${API_BASE_URL}/leave/${leave.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leave)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || json?.error || 'Failed to update leave record');
  return json.data;
};
