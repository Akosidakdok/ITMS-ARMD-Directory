import { 
  Personnel, 
  OrderRecord, 
  AssignmentRecord, 
  EducationRecord, 
  PromotionRecord, 
  TrainingRecord, 
  LeaveRecord 
} from '../types/pais';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Health Check helper to test if backend service is live
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'online';
  } catch (err) {
    return false;
  }
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
  if (!res.ok) throw new Error('Failed to create order');
  const json = await res.json();
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
  if (!res.ok) throw new Error('Failed to create assignment');
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
  if (!res.ok) throw new Error('Failed to file leave');
  const json = await res.json();
  return json.data;
};
