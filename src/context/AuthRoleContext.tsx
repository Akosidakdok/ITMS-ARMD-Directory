import React, { createContext, useContext, useState } from 'react';
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

interface AuthRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  selectedPersonnelId: string;
  setSelectedPersonnelId: (id: string) => void;
  
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
  const [role, setRole] = useState<UserRole>('admin'); // Default to Admin/Editor for full interactive evaluation
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('pnp-001');

  const [personnelList, setPersonnelList] = useState<Personnel[]>(INITIAL_PERSONNEL);
  const [assignmentsList, setAssignmentsList] = useState<AssignmentRecord[]>(INITIAL_ASSIGNMENTS);
  const [educationList, setEducationList] = useState<EducationRecord[]>(INITIAL_EDUCATION);
  const [promotionsList, setPromotionsList] = useState<PromotionRecord[]>(INITIAL_PROMOTIONS);
  const [ordersList, setOrdersList] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [trainingList, setTrainingList] = useState<TrainingRecord[]>(INITIAL_TRAINING);
  const [leaveList, setLeaveList] = useState<LeaveRecord[]>(INITIAL_LEAVE);

  const toggleRole = () => {
    setRole(prev => prev === 'admin' ? 'view_only' : 'admin');
  };

  const addPersonnel = (personnel: Personnel) => {
    setPersonnelList(prev => [personnel, ...prev]);
  };

  const updatePersonnel = (updated: Personnel) => {
    setPersonnelList(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const deletePersonnel = (id: string) => {
    setPersonnelList(prev => prev.filter(p => p.id !== id));
  };

  const addOrder = (order: OrderRecord) => {
    setOrdersList(prev => [order, ...prev]);
  };

  const updateOrder = (order: OrderRecord) => {
    setOrdersList(prev => prev.map(o => o.id === order.id ? order : o));
  };

  const addAssignment = (assignment: AssignmentRecord) => {
    setAssignmentsList(prev => [assignment, ...prev]);
  };

  const addEducation = (edu: EducationRecord) => {
    setEducationList(prev => [edu, ...prev]);
  };

  const addPromotion = (promotion: PromotionRecord) => {
    setPromotionsList(prev => [promotion, ...prev]);
    // Also update the personnel's lastPromotionDate and rank!
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
  };

  const addTraining = (training: TrainingRecord) => {
    setTrainingList(prev => [training, ...prev]);
  };

  const addLeave = (leave: LeaveRecord) => {
    setLeaveList(prev => [leave, ...prev]);
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
