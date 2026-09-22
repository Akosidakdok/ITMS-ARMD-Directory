import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  UserRole, 
  Personnel, 
  AssignmentRecord, 
  EducationRecord, 
  PromotionRecord, 
  OrderRecord, 
  TrainingRecord, 
  LeaveRecord,
  AwardRecord
} from '../types/pais';
import { 
  INITIAL_PERSONNEL, 
  INITIAL_ASSIGNMENTS, 
  INITIAL_EDUCATION, 
  INITIAL_PROMOTIONS, 
  INITIAL_ORDERS, 
  INITIAL_TRAINING, 
  INITIAL_LEAVE,
  INITIAL_AWARDS
} from '../data/mockData';
import { getRankFullName } from '../constants/ranks';
import {
  fetchBackendHealth,
  fetchPersonnel,
  createPersonnelApi,
  updatePersonnelApi,
  deletePersonnelApi,
  fetchOrders,
  createOrderApi,
  updateOrderApi,
  deleteOrderApi,
  transitionOrderStatusApi,
  restoreOrderStatusApi,
  fetchOrderStatusHistoryApi,
  uploadOrderDocumentApi,
  getOrderDocumentApi,
  previewOrderDocumentApi,
  deleteOrderDocumentApi,
  generateOrderDocumentApi,
  getGeneratedOrderDocumentApi,
  previewGeneratedOrderDocumentApi,
  uploadSignedOrderDocumentApi,
  getSignedOrderDocumentApi,
  deleteSignedOrderDocumentApi,
  fetchAssignments,
  createAssignmentApi,
  updateAssignmentApi,
  deleteAssignmentApi,
  fetchEducation,
  createEducationApi,
  updateEducationApi,
  deleteEducationApi,
  bulkUpsertEducationApi,
  fetchPromotions,
  createPromotionApi,
  updatePromotionApi,
  deletePromotionApi,
  fetchTraining,
  createTrainingApi,
  updateTrainingApi,
  deleteTrainingApi,
  bulkUpsertTrainingApi,
  fetchLeave,
  createLeaveApi,
  updateLeaveApi,
  deleteLeaveApi,
  fetchAwards,
  createAwardApi,
  updateAwardApi,
  deleteAwardApi,
  bulkCreatePersonnelApi,
  loginApi,
  verifySessionApi,
  clearAuthSession
} from '../services/api';
import type { AuthenticatedUser, BackendHealthStatus, BulkPersonnelImportResult, BulkUpsertResult, OrderDocumentLink, OrderDocumentPreview, OrderStatusHistoryRecord, SignedOrderDocumentLink } from '../services/api';
import type { OrderDocumentStatus } from '../constants/orders';
import type { PersonnelImportRow } from '../utils/personnelCsv';

interface AuthRoleContextType {
  authReady: boolean;
  initialDataReady: boolean;
  authUser: AuthenticatedUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  role: UserRole;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  selectedPersonnelId: string;
  setSelectedPersonnelId: (id: string) => void;

  // Backend status indicator
  backendConnected: boolean;
  backendHealth: BackendHealthStatus | null;
  refreshData: () => Promise<void>;
  
  // Data state & handlers
  personnelList: Personnel[];
  assignmentsList: AssignmentRecord[];
  educationList: EducationRecord[];
  promotionsList: PromotionRecord[];
  ordersList: OrderRecord[];
  trainingList: TrainingRecord[];
  leaveList: LeaveRecord[];
  awardsList: AwardRecord[];

  // Action helpers
  addPersonnel: (personnel: Personnel) => Promise<Personnel>;
  bulkImportPersonnel: (
    rows: PersonnelImportRow[],
    onProgress?: (completed: number, total: number) => void
  ) => Promise<BulkPersonnelImportResult>;
  updatePersonnel: (personnel: Personnel) => Promise<Personnel>;
  deletePersonnel: (id: string) => Promise<void>;

  addOrder: (order: OrderRecord) => Promise<OrderRecord>;
  updateOrder: (order: OrderRecord) => Promise<OrderRecord>;
  deleteOrder: (id: string) => Promise<void>;
  transitionOrderStatus: (id: string, status: OrderDocumentStatus, reason?: string) => Promise<OrderRecord>;
  restoreOrderStatus: (id: string, reason?: string) => Promise<OrderRecord>;
  fetchOrderStatusHistory: (id: string) => Promise<OrderStatusHistoryRecord[]>;
  uploadOrderDocument: (id: string, file: File) => Promise<OrderRecord>;
  getOrderDocument: (id: string, download?: boolean) => Promise<OrderDocumentLink>;
  previewOrderDocument: (id: string) => Promise<OrderDocumentPreview>;
  deleteOrderDocument: (id: string) => Promise<OrderRecord>;
  generateOrderDocument: (id: string) => Promise<OrderRecord>;
  getGeneratedOrderDocument: (id: string, download?: boolean) => Promise<OrderDocumentLink>;
  previewGeneratedOrderDocument: (id: string) => Promise<OrderDocumentPreview>;
  uploadSignedOrderDocument: (id: string, file: File) => Promise<OrderRecord>;
  getSignedOrderDocument: (id: string, download?: boolean) => Promise<SignedOrderDocumentLink>;
  deleteSignedOrderDocument: (id: string) => Promise<OrderRecord>;

  addAssignment: (assignment: AssignmentRecord) => Promise<AssignmentRecord>;
  updateAssignment: (assignment: AssignmentRecord) => Promise<AssignmentRecord>;
  deleteAssignment: (id: string) => Promise<void>;
  addEducation: (edu: EducationRecord) => Promise<EducationRecord>;
  updateEducation: (edu: EducationRecord) => Promise<EducationRecord>;
  deleteEducation: (id: string) => Promise<void>;
  bulkUpsertEducation: (records: Partial<EducationRecord>[]) => Promise<BulkUpsertResult>;
  addPromotion: (promotion: PromotionRecord) => void;
  updatePromotion: (promotion: PromotionRecord) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  addTraining: (training: TrainingRecord) => Promise<TrainingRecord>;
  updateTraining: (training: TrainingRecord) => Promise<TrainingRecord>;
  deleteTraining: (id: string) => Promise<void>;
  bulkUpsertTraining: (records: Partial<TrainingRecord>[]) => Promise<BulkUpsertResult>;
  addLeave: (leave: LeaveRecord) => void;
  createAward: (award: Omit<AwardRecord, 'id' | 'status'>) => Promise<AwardRecord>;
  updateAward: (award: AwardRecord) => Promise<AwardRecord>;
  deleteAward: (id: string) => Promise<void>;
  createCalendarLeave: (leave: LeaveRecord) => Promise<LeaveRecord>;
  updateCalendarLeave: (leave: LeaveRecord) => Promise<LeaveRecord>;
  deleteCalendarLeave: (id: string) => Promise<void>;
}

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

const DATA_REFRESH_INTERVAL_MS = 30_000;
const MAX_REFRESH_BACKOFF_MS = 5 * 60_000;

export const AuthRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('admin');
  const [authReady, setAuthReady] = useState(false);
  const [initialDataReady, setInitialDataReady] = useState(false);
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('pnp-001');
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus | null>(null);
  const backendConnectedRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentRecord[]>([]);
  const [educationList, setEducationList] = useState<EducationRecord[]>([]);
  const [promotionsList, setPromotionsList] = useState<PromotionRecord[]>([]);
  const [ordersList, setOrdersList] = useState<OrderRecord[]>([]);
  const [trainingList, setTrainingList] = useState<TrainingRecord[]>([]);
  const [leaveList, setLeaveList] = useState<LeaveRecord[]>([]);
  const [awardsList, setAwardsList] = useState<AwardRecord[]>([]);

  // Initialize and load backend data if server is online. Health checks are
  // intentionally optional so normal refreshes do not trigger an extra
  // Supabase query before loading the actual data.
  const loadDataFromBackend = async (checkHealth = true): Promise<boolean> => {
    let isOnline = backendConnectedRef.current;

    if (checkHealth || !isOnline) {
      const health = await fetchBackendHealth();
      isOnline = health?.status === 'online';
      setBackendHealth(health);
      backendConnectedRef.current = isOnline;
      setBackendConnected(isOnline);
    }

    if (isOnline) {
      try {
        const [pData, oData, aData, eData, prData, tData, lData, awData] = await Promise.all([
          fetchPersonnel(),
          fetchOrders(),
          fetchAssignments(),
          fetchEducation(),
          fetchPromotions(),
          fetchTraining(),
          fetchLeave(),
          fetchAwards()
        ]);
        setPersonnelList(pData);
        setOrdersList(oData);
        setAssignmentsList(aData);
        setEducationList(eData);
        setPromotionsList(prData);
        setTrainingList(tData);
        setLeaveList(lData);
        setAwardsList(awData);
        backendConnectedRef.current = true;
        setBackendConnected(true);
        return true;
      } catch (err) {
        console.warn('Backend reachable but error fetching data:', err);
        backendConnectedRef.current = false;
        setBackendConnected(false);
        return false;
      }
    } else {
      // Offline fallback only when backend server is not running at all
      setPersonnelList(INITIAL_PERSONNEL);
      setAssignmentsList(INITIAL_ASSIGNMENTS);
      setEducationList(INITIAL_EDUCATION);
      setPromotionsList(INITIAL_PROMOTIONS);
      setOrdersList(INITIAL_ORDERS);
      setTrainingList(INITIAL_TRAINING);
      setLeaveList(INITIAL_LEAVE);
      setAwardsList(INITIAL_AWARDS);
      return false;
    }
  };

  useEffect(() => {
    verifySessionApi()
      .then(user => {
        setAuthUser(user);
        if (user) {
          setRole(user.role);
          setInitialDataReady(false);
        } else {
          setInitialDataReady(true);
        }
      })
      .catch(() => setInitialDataReady(true))
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    let refreshTimer: number | undefined;
    let failureCount = 0;

    const runRefresh = async (checkHealth = false) => {
      if (cancelled || refreshInFlightRef.current) return false;
      refreshInFlightRef.current = true;
      try {
        return await loadDataFromBackend(checkHealth);
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    const scheduleRefresh = (delay: number) => {
      if (cancelled || document.visibilityState === 'hidden') return;
      refreshTimer = window.setTimeout(async () => {
        if (cancelled || document.visibilityState === 'hidden') return;
        const succeeded = await runRefresh(!backendConnectedRef.current);
        failureCount = succeeded ? 0 : failureCount + 1;
        const nextDelay = succeeded
          ? DATA_REFRESH_INTERVAL_MS
          : Math.min(DATA_REFRESH_INTERVAL_MS * (2 ** failureCount), MAX_REFRESH_BACKOFF_MS);
        scheduleRefresh(nextDelay);
      }, delay);
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
        refreshTimer = undefined;
        return;
      }

      if (!cancelled) {
        const succeeded = await runRefresh(!backendConnectedRef.current);
        failureCount = succeeded ? 0 : failureCount + 1;
        scheduleRefresh(succeeded
          ? DATA_REFRESH_INTERVAL_MS
          : Math.min(DATA_REFRESH_INTERVAL_MS * (2 ** failureCount), MAX_REFRESH_BACKOFF_MS));
      }
    };

    setInitialDataReady(false);
    runRefresh(true).then(succeeded => {
      if (!cancelled) setInitialDataReady(true);
      failureCount = succeeded ? 0 : 1;
      scheduleRefresh(succeeded
        ? DATA_REFRESH_INTERVAL_MS
        : Math.min(DATA_REFRESH_INTERVAL_MS * 2, MAX_REFRESH_BACKOFF_MS));
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authUser]);

  const login = async (username: string, password: string) => {
    const user = await loginApi(username, password);
    setInitialDataReady(false);
    setAuthUser(user);
    setRole(user.role);
  };

  const logout = () => {
    clearAuthSession();
    setAuthUser(null);
    backendConnectedRef.current = false;
    setInitialDataReady(true);
    setPersonnelList([]);
    setAssignmentsList([]);
    setEducationList([]);
    setPromotionsList([]);
    setOrdersList([]);
    setTrainingList([]);
    setLeaveList([]);
    setAwardsList([]);
  };

  const refreshData = async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      await loadDataFromBackend(true);
    } finally {
      refreshInFlightRef.current = false;
    }
  };

  // Personnel Mutations
  const addPersonnel = async (personnel: Personnel) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Personnel changes require a Supabase connection.');
    }
    const created = await createPersonnelApi(personnel);
    setPersonnelList(prev => [created, ...prev]);
    return created;
  };

  const bulkImportPersonnel = async (
    rows: PersonnelImportRow[],
    onProgress?: (completed: number, total: number) => void
  ) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Start the server before importing personnel records.');
    }

    const result = await bulkCreatePersonnelApi(rows, onProgress);
    if (result.created.length > 0) {
      setPersonnelList(prev => [...result.created, ...prev]);
    }
    return result;
  };

  const updatePersonnel = async (updated: Personnel) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Personnel changes require a Supabase connection.');
    }
    const saved = await updatePersonnelApi(updated);
    setPersonnelList(prev => prev.map(p => p.id === saved.id ? saved : p));
    return saved;
  };

  const deletePersonnel = async (id: string) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Personnel changes require a Supabase connection.');
    }
    await deletePersonnelApi(id);
    setPersonnelList(prev => prev.filter(p => p.id !== id));
  };

  // Order Mutations
  const addOrder = async (order: OrderRecord) => {
    if (backendConnected) {
      const created = await createOrderApi(order);
      setOrdersList(prev => [created, ...prev]);
      return created;
    }
    setOrdersList(prev => [order, ...prev]);
    return order;
  };

  const updateOrder = async (order: OrderRecord) => {
    if (backendConnected) {
      const updated = await updateOrderApi(order);
      setOrdersList(prev => prev.map(o => o.id === updated.id ? updated : o));
      return updated;
    }
    setOrdersList(prev => prev.map(o => o.id === order.id ? order : o));
    return order;
  };

  const deleteOrder = async (id: string) => {
    if (backendConnected) await deleteOrderApi(id);
    setOrdersList(prev => prev.filter(item => item.id !== id));
  };

  const transitionOrderStatus = async (id: string, nextStatus: OrderDocumentStatus, reason = '') => {
    if (backendConnected) {
      const updated = await transitionOrderStatusApi(id, nextStatus, reason);
      setOrdersList(prev => prev.map(order => order.id === updated.id ? updated : order));
      return updated;
    }
    const existing = ordersList.find(order => order.id === id);
    if (!existing) throw new Error('Order not found.');
    const updated = { ...existing, documentStatus: nextStatus, status: nextStatus };
    setOrdersList(prev => prev.map(order => order.id === id ? updated : order));
    return updated;
  };

  const restoreOrderStatus = async (id: string, reason = '') => {
    if (backendConnected) {
      const updated = await restoreOrderStatusApi(id, reason);
      setOrdersList(prev => prev.map(order => order.id === updated.id ? updated : order));
      return updated;
    }
    const existing = ordersList.find(order => order.id === id);
    if (!existing) throw new Error('Order not found.');
    if ((existing.documentStatus || existing.status) !== 'Revoked') throw new Error('Only revoked orders can be restored.');
    const updated = { ...existing, documentStatus: 'For Approval' as const, status: 'For Approval' };
    setOrdersList(prev => prev.map(order => order.id === id ? updated : order));
    return updated;
  };

  const fetchOrderStatusHistory = async (id: string) => {
    if (backendConnected) return fetchOrderStatusHistoryApi(id);
    return [];
  };

  const uploadOrderDocument = async (id: string, file: File) => {
    if (!backendConnected) throw new Error('The backend is offline. Document upload requires an active server connection.');
    const updated = await uploadOrderDocumentApi(id, file);
    setOrdersList(prev => prev.map(order => order.id === updated.id ? updated : order));
    return updated;
  };

  const getOrderDocument = async (id: string, download = false) => {
    if (!backendConnected) throw new Error('The backend is offline. Document retrieval requires an active server connection.');
    return getOrderDocumentApi(id, download);
  };

  const previewOrderDocument = async (id: string) => {
    if (!backendConnected) throw new Error('The backend is offline. Document preview requires an active server connection.');
    return previewOrderDocumentApi(id);
  };

  const deleteOrderDocument = async (id: string) => {
    if (!backendConnected) throw new Error('The backend is offline. Document removal requires an active server connection.');
    const updated = await deleteOrderDocumentApi(id);
    setOrdersList(prev => prev.map(order => order.id === updated.id ? updated : order));
    return updated;
  };

  const generateOrderDocument = async (id: string) => {
    if (!backendConnected) throw new Error('The backend is offline. Order document generation requires an active server connection.');
    const updated = await generateOrderDocumentApi(id);
    setOrdersList(prev => prev.map(order => order.id === updated.id ? updated : order));
    return updated;
  };

  const getGeneratedOrderDocument = async (id: string, download = false) => {
    if (!backendConnected) throw new Error('The backend is offline. Generated document retrieval requires an active server connection.');
    return getGeneratedOrderDocumentApi(id, download);
  };

  const previewGeneratedOrderDocument = async (id: string) => {
    if (!backendConnected) throw new Error('The backend is offline. Generated document preview requires an active server connection.');
    return previewGeneratedOrderDocumentApi(id);
  };

  const uploadSignedOrderDocument = async (id: string, file: File) => {
    if (!backendConnected) throw new Error('The backend is offline. Signed scan upload requires an active server connection.');
    const updated = await uploadSignedOrderDocumentApi(id, file);
    setOrdersList(prev => prev.map(order => order.id === updated.id ? updated : order));
    return updated;
  };

  const getSignedOrderDocument = async (id: string, download = false) => {
    if (!backendConnected) throw new Error('The backend is offline. Signed scan retrieval requires an active server connection.');
    return getSignedOrderDocumentApi(id, download);
  };

  const deleteSignedOrderDocument = async (id: string) => {
    if (!backendConnected) throw new Error('The backend is offline. Signed scan removal requires an active server connection.');
    const updated = await deleteSignedOrderDocumentApi(id);
    setOrdersList(prev => prev.map(order => order.id === updated.id ? updated : order));
    return updated;
  };

  // Assignment Mutations
  const addAssignment = async (assignment: AssignmentRecord) => {
    if (backendConnected) {
      const created = await createAssignmentApi(assignment);
      setAssignmentsList(prev => [created, ...prev]);
      return created;
    }
    setAssignmentsList(prev => [assignment, ...prev]);
    return assignment;
  };

  const updateAssignment = async (assignment: AssignmentRecord) => {
    if (backendConnected) {
      const updated = await updateAssignmentApi(assignment);
      setAssignmentsList(prev => prev.map(item => item.id === updated.id ? updated : item));
      return updated;
    }
    setAssignmentsList(prev => prev.map(item => item.id === assignment.id ? assignment : item));
    return assignment;
  };

  const deleteAssignment = async (id: string) => {
    if (backendConnected) await deleteAssignmentApi(id);
    setAssignmentsList(prev => prev.filter(item => item.id !== id));
  };

  // Education Mutations
  const addEducation = async (edu: EducationRecord) => {
    if (backendConnected) {
      const created = await createEducationApi(edu);
      setEducationList(prev => [created, ...prev]);
      return created;
    }
    setEducationList(prev => [edu, ...prev]);
    return edu;
  };

  const updateEducation = async (edu: EducationRecord) => {
    setEducationList(prev => prev.map(e => e.id === edu.id ? edu : e));
    if (backendConnected) {
      const updated = await updateEducationApi(edu);
      setEducationList(prev => prev.map(e => e.id === updated.id ? updated : e));
      return updated;
    }
    return edu;
  };

  const deleteEducation = async (id: string) => {
    setEducationList(prev => prev.filter(e => e.id !== id));
    if (backendConnected) {
      try {
        await deleteEducationApi(id);
      } catch (e) {
        console.error('Failed to delete education on backend:', e);
      }
    }
  };

  const bulkUpsertEducation = async (records: Partial<EducationRecord>[]) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Start the server before running a bulk upload.');
    }
    const result = await bulkUpsertEducationApi(records);
    // Refresh full education list after bulk operation
    try {
      const fresh = await fetchEducation();
      setEducationList(fresh);
    } catch (e) {
      console.error('Failed to refresh education list after bulk upsert:', e);
    }
    return result;
  };

  // Promotion Mutations
  const addPromotion = async (promotion: PromotionRecord) => {
    const prevPromotions = [...promotionsList];
    const prevPersonnel = [...personnelList];

    setPromotionsList(prev => [promotion, ...prev]);
    setPersonnelList(prev => prev.map(p => {
      if (p.id === promotion.personnelId) {
        const isLatest = !p.lastPromotionDate || new Date(promotion.promotionDate).getTime() >= new Date(p.lastPromotionDate).getTime();
        if (isLatest) {
          return {
            ...p,
            rank: promotion.rankTo,
            rankFullName: getRankFullName(promotion.rankTo),
            lastPromotionDate: promotion.promotionDate
          };
        }
      }
      return p;
    }));

    if (backendConnected) {
      try {
        await createPromotionApi(promotion);
      } catch (e) {
        console.error('Failed to sync promotion with backend:', e);
        setPromotionsList(prevPromotions);
        setPersonnelList(prevPersonnel);
        throw e;
      }
    }
  };

  // Training Mutations
  const addTraining = async (training: TrainingRecord) => {
    if (backendConnected) {
      const created = await createTrainingApi(training);
      setTrainingList(prev => [created, ...prev]);
      return created;
    }
    setTrainingList(prev => [training, ...prev]);
    return training;
  };

  const deletePromotion = async (id: string) => {
    const prevPromotions = [...promotionsList];
    const prevPersonnel = [...personnelList];

    const target = promotionsList.find(item => item.id === id);
    if (!target) return;

    if (backendConnected) {
      try {
        await deletePromotionApi(id);
      } catch (e) {
        console.error('Failed to delete promotion on backend:', e);
        setPromotionsList(prevPromotions);
        setPersonnelList(prevPersonnel);
        throw e;
      }
    }

    const nextPromotions = promotionsList.filter(item => item.id !== id);
    setPromotionsList(nextPromotions);

    // Roll back or sync personnel rank
    const remaining = nextPromotions.filter(item => item.personnelId === target.personnelId);
    remaining.sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());

    setPersonnelList(prev => prev.map(p => {
      if (p.id === target.personnelId) {
        if (remaining.length > 0) {
          return {
            ...p,
            rank: remaining[0].rankTo,
            rankFullName: getRankFullName(remaining[0].rankTo),
            lastPromotionDate: remaining[0].promotionDate
          };
        } else {
          // If no promotions remain, roll back to original baseline (target.rankFrom)
          return {
            ...p,
            rank: target.rankFrom,
            rankFullName: getRankFullName(target.rankFrom),
            lastPromotionDate: undefined
          };
        }
      }
      return p;
    }));
  };

  const updatePromotion = async (promotion: PromotionRecord) => {
    const prevPromotions = [...promotionsList];
    const prevPersonnel = [...personnelList];

    try {
      const updated = backendConnected ? await updatePromotionApi(promotion) : promotion;
      const nextPromotions = promotionsList.map(item => item.id === updated.id ? updated : item);
      setPromotionsList(nextPromotions);

      const pPromotions = nextPromotions.filter(p => p.personnelId === updated.personnelId);
      pPromotions.sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());

      if (pPromotions.length > 0) {
        const latest = pPromotions[0];
        setPersonnelList(prev => prev.map(person => person.id === updated.personnelId ? {
          ...person,
          rank: latest.rankTo,
          rankFullName: getRankFullName(latest.rankTo),
          lastPromotionDate: latest.promotionDate
        } : person));
      }
    } catch (e) {
      console.error('Failed to update promotion:', e);
      setPromotionsList(prevPromotions);
      setPersonnelList(prevPersonnel);
      throw e;
    }
  };

  const updateTraining = async (training: TrainingRecord) => {
    setTrainingList(prev => prev.map(t => t.id === training.id ? training : t));
    if (backendConnected) {
      const updated = await updateTrainingApi(training);
      setTrainingList(prev => prev.map(t => t.id === updated.id ? updated : t));
      return updated;
    }
    return training;
  };

  const deleteTraining = async (id: string) => {
    setTrainingList(prev => prev.filter(t => t.id !== id));
    if (backendConnected) {
      try {
        await deleteTrainingApi(id);
      } catch (e) {
        console.error('Failed to delete training on backend:', e);
      }
    }
  };

  const bulkUpsertTraining = async (records: Partial<TrainingRecord>[]) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Start the server before running a bulk upload.');
    }
    const result = await bulkUpsertTrainingApi(records);
    // Refresh full training list after bulk operation
    try {
      const fresh = await fetchTraining();
      setTrainingList(fresh);
    } catch (e) {
      console.error('Failed to refresh training list after bulk upsert:', e);
    }
    return result;
  };

  // Leave Mutations
  const addLeave = async (leave: LeaveRecord) => {
    setLeaveList(prev => [leave, ...prev]);
    if (backendConnected) {
      try {
        await createLeaveApi(leave);
      } catch (e) {
        console.error('Failed to sync leave with backend:', e);
      }
    }
  };

  const createAward = async (award: Omit<AwardRecord, 'id' | 'status'>) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Start the server before saving an award.');
    }
    const created = await createAwardApi(award);
    setAwardsList(prev => [created, ...prev]);
    return created;
  };

  const updateAward = async (award: AwardRecord) => {
    if (!backendConnected) {
      setAwardsList(prev => prev.map(item => item.id === award.id ? award : item));
      return award;
    }
    const updated = await updateAwardApi(award);
    setAwardsList(prev => prev.map(item => item.id === updated.id ? updated : item));
    return updated;
  };

  const deleteAward = async (id: string) => {
    if (backendConnected) await deleteAwardApi(id);
    setAwardsList(prev => prev.filter(item => item.id !== id));
  };

  const createCalendarLeave = async (leave: LeaveRecord) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Start the server before saving leave.');
    }
    const created = await createLeaveApi(leave);
    setLeaveList(prev => [created, ...prev]);
    return created;
  };

  const updateCalendarLeave = async (leave: LeaveRecord) => {
    if (!backendConnected) {
      throw new Error('The backend is offline. Start the server before updating leave.');
    }
    const updated = await updateLeaveApi(leave);
    setLeaveList(prev => prev.map(item => item.id === updated.id ? updated : item));
    return updated;
  };

  const deleteCalendarLeave = async (id: string) => {
    if (backendConnected) await deleteLeaveApi(id);
    setLeaveList(prev => prev.filter(item => item.id !== id));
  };

  return (
    <AuthRoleContext.Provider
      value={{
        authReady,
        initialDataReady,
        authUser,
        login,
        logout,
        role,
        globalSearchQuery,
        setGlobalSearchQuery,
        selectedPersonnelId,
        setSelectedPersonnelId,
        backendConnected,
        backendHealth,
        refreshData,
        personnelList,
        assignmentsList,
        educationList,
        promotionsList,
        ordersList,
        trainingList,
        leaveList,
        awardsList,
        addPersonnel,
        bulkImportPersonnel,
        updatePersonnel,
        deletePersonnel,
        addOrder,
        updateOrder,
        deleteOrder,
        transitionOrderStatus,
        restoreOrderStatus,
        fetchOrderStatusHistory,
        uploadOrderDocument,
        getOrderDocument,
        previewOrderDocument,
        deleteOrderDocument,
        generateOrderDocument,
        getGeneratedOrderDocument,
        previewGeneratedOrderDocument,
        uploadSignedOrderDocument,
        getSignedOrderDocument,
        deleteSignedOrderDocument,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        addEducation,
        updateEducation,
        deleteEducation,
        bulkUpsertEducation,
        addPromotion,
        updatePromotion,
        deletePromotion,
        addTraining,
        updateTraining,
        deleteTraining,
        bulkUpsertTraining,
        addLeave,
        createAward,
        updateAward,
        deleteAward,
        createCalendarLeave,
        updateCalendarLeave,
        deleteCalendarLeave
      }}
    >
      {children}
    </AuthRoleContext.Provider>
  );
};

export const useAuthRole = () => {
  const context = useContext(AuthRoleContext);
  if (!context) {
    throw new Error('useAuthRole must be used within an AuthRoleProvider');
  }
  return context;
};
