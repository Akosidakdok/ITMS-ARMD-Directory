import React, { createContext, useContext, useState, useEffect } from 'react';
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
import type { AuthenticatedUser, BackendHealthStatus, BulkPersonnelImportResult, BulkUpsertResult } from '../services/api';
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

  addAssignment: (assignment: AssignmentRecord) => Promise<AssignmentRecord>;
  updateAssignment: (assignment: AssignmentRecord) => Promise<AssignmentRecord>;
  deleteAssignment: (id: string) => Promise<void>;
  addEducation: (edu: EducationRecord) => void;
  updateEducation: (edu: EducationRecord) => Promise<EducationRecord>;
  deleteEducation: (id: string) => Promise<void>;
  bulkUpsertEducation: (records: Partial<EducationRecord>[]) => Promise<BulkUpsertResult>;
  addPromotion: (promotion: PromotionRecord) => void;
  updatePromotion: (promotion: PromotionRecord) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  addTraining: (training: TrainingRecord) => void;
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

export const AuthRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('admin');
  const [authReady, setAuthReady] = useState(false);
  const [initialDataReady, setInitialDataReady] = useState(false);
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('pnp-001');
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendHealth, setBackendHealth] = useState<BackendHealthStatus | null>(null);

  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentRecord[]>([]);
  const [educationList, setEducationList] = useState<EducationRecord[]>([]);
  const [promotionsList, setPromotionsList] = useState<PromotionRecord[]>([]);
  const [ordersList, setOrdersList] = useState<OrderRecord[]>([]);
  const [trainingList, setTrainingList] = useState<TrainingRecord[]>([]);
  const [leaveList, setLeaveList] = useState<LeaveRecord[]>([]);
  const [awardsList, setAwardsList] = useState<AwardRecord[]>([]);

  // Initialize and load backend data if server is online
  const loadDataFromBackend = async () => {
    const health = await fetchBackendHealth();
    const isOnline = health?.status === 'online';
    setBackendHealth(health);
    setBackendConnected(isOnline);

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
      } catch (err) {
        console.warn('Backend reachable but error fetching data:', err);
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
    setInitialDataReady(false);
    loadDataFromBackend().finally(() => {
      if (!cancelled) setInitialDataReady(true);
    });
    const refreshInterval = window.setInterval(() => {
      loadDataFromBackend();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
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
    setEducationList(prev => [edu, ...prev]);
    if (backendConnected) {
      try {
        await createEducationApi(edu);
      } catch (e) {
        console.error('Failed to sync education with backend:', e);
      }
    }
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
    setPromotionsList(prev => [promotion, ...prev]);
    setPersonnelList(prev => prev.map(p => {
      if (p.id === promotion.personnelId) {
        return {
          ...p,
          rank: promotion.rankTo,
          lastPromotionDate: promotion.promotionDate
        };
      }
      return p;
    }));

    if (backendConnected) {
      try {
        await createPromotionApi(promotion);
      } catch (e) {
        console.error('Failed to sync promotion with backend:', e);
      }
    }
  };

  // Training Mutations
  const addTraining = async (training: TrainingRecord) => {
    setTrainingList(prev => [training, ...prev]);
    if (backendConnected) {
      try {
        await createTrainingApi(training);
      } catch (e) {
        console.error('Failed to sync training with backend:', e);
      }
    }
  };

  const deletePromotion = async (id: string) => {
    if (backendConnected) await deletePromotionApi(id);
    setPromotionsList(prev => prev.filter(item => item.id !== id));
  };

  const updatePromotion = async (promotion: PromotionRecord) => {
    const updated = backendConnected ? await updatePromotionApi(promotion) : promotion;
    setPromotionsList(prev => prev.map(item => item.id === updated.id ? updated : item));
    setPersonnelList(prev => prev.map(person => person.id === updated.personnelId ? { ...person, rank: updated.rankTo, lastPromotionDate: updated.promotionDate } : person));
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
        refreshData: loadDataFromBackend,
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
