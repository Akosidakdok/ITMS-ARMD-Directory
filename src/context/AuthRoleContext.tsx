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
  fetchAssignments,
  createAssignmentApi,
  updateAssignmentApi,
  fetchEducation,
  createEducationApi,
  fetchPromotions,
  createPromotionApi,
  fetchTraining,
  createTrainingApi,
  fetchLeave,
  createLeaveApi,
  updateLeaveApi,
  fetchAwards,
  createAwardApi,
  updateAwardApi,
  bulkCreatePersonnelApi
} from '../services/api';
import type { BackendHealthStatus, BulkPersonnelImportResult } from '../services/api';
import type { PersonnelImportRow } from '../utils/personnelCsv';

interface AuthRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
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
  addPersonnel: (personnel: Personnel) => void;
  bulkImportPersonnel: (
    rows: PersonnelImportRow[],
    onProgress?: (completed: number, total: number) => void
  ) => Promise<BulkPersonnelImportResult>;
  updatePersonnel: (personnel: Personnel) => void;
  deletePersonnel: (id: string) => void;

  addOrder: (order: OrderRecord) => Promise<OrderRecord>;
  updateOrder: (order: OrderRecord) => Promise<OrderRecord>;

  addAssignment: (assignment: AssignmentRecord) => Promise<AssignmentRecord>;
  updateAssignment: (assignment: AssignmentRecord) => Promise<AssignmentRecord>;
  addEducation: (edu: EducationRecord) => void;
  addPromotion: (promotion: PromotionRecord) => void;
  addTraining: (training: TrainingRecord) => void;
  addLeave: (leave: LeaveRecord) => void;
  createAward: (award: Omit<AwardRecord, 'id' | 'status'>) => Promise<AwardRecord>;
  updateAward: (award: AwardRecord) => Promise<AwardRecord>;
  createCalendarLeave: (leave: LeaveRecord) => Promise<LeaveRecord>;
  updateCalendarLeave: (leave: LeaveRecord) => Promise<LeaveRecord>;
}

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

export const AuthRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('admin');
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
    loadDataFromBackend();
    const refreshInterval = window.setInterval(() => {
      loadDataFromBackend();
    }, 10000);
    return () => window.clearInterval(refreshInterval);
  }, []);

  const toggleRole = () => {
    setRole(prev => prev === 'admin' ? 'view_only' : 'admin');
  };

  // Personnel Mutations
  const addPersonnel = async (personnel: Personnel) => {
    setPersonnelList(prev => [personnel, ...prev]);
    if (backendConnected) {
      try {
        await createPersonnelApi(personnel);
      } catch (e) {
        console.error('Failed to sync new personnel with backend:', e);
      }
    }
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
    setPersonnelList(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (backendConnected) {
      try {
        await updatePersonnelApi(updated);
      } catch (e) {
        console.error('Failed to sync updated personnel with backend:', e);
      }
    }
  };

  const deletePersonnel = async (id: string) => {
    setPersonnelList(prev => prev.filter(p => p.id !== id));
    if (backendConnected) {
      try {
        await deletePersonnelApi(id);
      } catch (e) {
        console.error('Failed to delete personnel on backend:', e);
      }
    }
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

  return (
    <AuthRoleContext.Provider
      value={{
        role,
        setRole,
        toggleRole,
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
        addAssignment,
        updateAssignment,
        addEducation,
        addPromotion,
        addTraining,
        addLeave,
        createAward,
        updateAward,
        createCalendarLeave,
        updateCalendarLeave
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
