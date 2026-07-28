import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserRole, 
  Personnel, 
  AssignmentRecord, 
  EducationRecord, 
  PromotionRecord, 
  OrderRecord, 
  TrainingRecord, 
  LeaveRecord 
} from '../types/pais';
import { 
  INITIAL_PERSONNEL, 
  INITIAL_ASSIGNMENTS, 
  INITIAL_EDUCATION, 
  INITIAL_PROMOTIONS, 
  INITIAL_ORDERS, 
  INITIAL_TRAINING, 
  INITIAL_LEAVE 
} from '../data/mockData';
import {
  checkBackendHealth,
  fetchPersonnel,
  createPersonnelApi,
  updatePersonnelApi,
  deletePersonnelApi,
  fetchOrders,
  createOrderApi,
  updateOrderApi,
  fetchAssignments,
  createAssignmentApi,
  fetchEducation,
  createEducationApi,
  fetchPromotions,
  createPromotionApi,
  fetchTraining,
  createTrainingApi,
  fetchLeave,
  createLeaveApi
} from '../services/api';

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
  refreshData: () => Promise<void>;
  
  // Data state & handlers
  personnelList: Personnel[];
  assignmentsList: AssignmentRecord[];
  educationList: EducationRecord[];
  promotionsList: PromotionRecord[];
  ordersList: OrderRecord[];
  trainingList: TrainingRecord[];
  leaveList: LeaveRecord[];

  // Action helpers
  addPersonnel: (personnel: Personnel) => void;
  updatePersonnel: (personnel: Personnel) => void;
  deletePersonnel: (id: string) => void;

  addOrder: (order: OrderRecord) => void;
  updateOrder: (order: OrderRecord) => void;

  addAssignment: (assignment: AssignmentRecord) => void;
  addEducation: (edu: EducationRecord) => void;
  addPromotion: (promotion: PromotionRecord) => void;
  addTraining: (training: TrainingRecord) => void;
  addLeave: (leave: LeaveRecord) => void;
}

const AuthRoleContext = createContext<AuthRoleContextType | undefined>(undefined);

export const AuthRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('admin');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('pnp-001');
  const [backendConnected, setBackendConnected] = useState(false);

  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentRecord[]>([]);
  const [educationList, setEducationList] = useState<EducationRecord[]>([]);
  const [promotionsList, setPromotionsList] = useState<PromotionRecord[]>([]);
  const [ordersList, setOrdersList] = useState<OrderRecord[]>([]);
  const [trainingList, setTrainingList] = useState<TrainingRecord[]>([]);
  const [leaveList, setLeaveList] = useState<LeaveRecord[]>([]);

  // Initialize and load backend data if server is online
  const loadDataFromBackend = async () => {
    const isOnline = await checkBackendHealth();
    setBackendConnected(isOnline);

    if (isOnline) {
      try {
        const [pData, oData, aData, eData, prData, tData, lData] = await Promise.all([
          fetchPersonnel(),
          fetchOrders(),
          fetchAssignments(),
          fetchEducation(),
          fetchPromotions(),
          fetchTraining(),
          fetchLeave()
        ]);
        setPersonnelList(pData);
        setOrdersList(oData);
        setAssignmentsList(aData);
        setEducationList(eData);
        setPromotionsList(prData);
        setTrainingList(tData);
        setLeaveList(lData);
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
    }
  };

  useEffect(() => {
    loadDataFromBackend();
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
    setOrdersList(prev => [order, ...prev]);
    if (backendConnected) {
      try {
        await createOrderApi(order);
      } catch (e) {
        console.error('Failed to sync new order with backend:', e);
      }
    }
  };

  const updateOrder = async (order: OrderRecord) => {
    setOrdersList(prev => prev.map(o => o.id === order.id ? order : o));
    if (backendConnected) {
      try {
        await updateOrderApi(order);
      } catch (e) {
        console.error('Failed to sync updated order with backend:', e);
      }
    }
  };

  // Assignment Mutations
  const addAssignment = async (assignment: AssignmentRecord) => {
    setAssignmentsList(prev => [assignment, ...prev]);
    if (backendConnected) {
      try {
        await createAssignmentApi(assignment);
      } catch (e) {
        console.error('Failed to sync assignment with backend:', e);
      }
    }
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
        refreshData: loadDataFromBackend,
        personnelList,
        assignmentsList,
        educationList,
        promotionsList,
        ordersList,
        trainingList,
        leaveList,
        addPersonnel,
        updatePersonnel,
        deletePersonnel,
        addOrder,
        updateOrder,
        addAssignment,
        addEducation,
        addPromotion,
        addTraining,
        addLeave
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
