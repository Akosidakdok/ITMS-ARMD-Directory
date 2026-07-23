/**
 * Data Repository Abstraction Layer
 * 
 * DESIGN PATTERN: Repository Pattern
 * Current Storage Engine: In-Memory Data Store (Initialized with Seed Data)
 * 
 * FUTURE DATABASE INTEGRATION NOTE:
 * When connecting a persistent database (SQLite, PostgreSQL, MongoDB, Prisma, Drizzle),
 * ONLY swap the inner implementations of these repository methods.
 * Controllers and API routes will remain 100% untouched.
 */

import { 
  INITIAL_PERSONNEL, 
  INITIAL_ASSIGNMENTS, 
  INITIAL_EDUCATION, 
  INITIAL_PROMOTIONS, 
  INITIAL_ORDERS, 
  INITIAL_TRAINING, 
  INITIAL_LEAVE 
} from './initialData.js';

class PAISRepository {
  constructor() {
    this.personnel = [...INITIAL_PERSONNEL];
    this.assignments = [...INITIAL_ASSIGNMENTS];
    this.education = [...INITIAL_EDUCATION];
    this.promotions = [...INITIAL_PROMOTIONS];
    this.orders = [...INITIAL_ORDERS];
    this.training = [...INITIAL_TRAINING];
    this.leave = [...INITIAL_LEAVE];
  }

  // ================= PERSONNEL CRUD =================
  async getPersonnel(query = {}) {
    let result = [...this.personnel];
    if (query.division && query.division !== 'ALL') {
      result = result.filter(p => p.division === query.division);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      result = result.filter(p => 
        p.fullName.toLowerCase().includes(q) ||
        p.badgeNo.toLowerCase().includes(q) ||
        p.division.toLowerCase().includes(q) ||
        p.designation.toLowerCase().includes(q)
      );
    }
    if (query.status) {
      result = result.filter(p => p.status === query.status);
    }
    return result;
  }

  async getPersonnelById(id) {
    return this.personnel.find(p => p.id === id) || null;
  }

  async createPersonnel(data) {
    const newRecord = {
      id: data.id || `pnp-${Date.now()}`,
      ...data
    };
    this.personnel.unshift(newRecord);
    return newRecord;
  }

  async updatePersonnel(id, data) {
    const index = this.personnel.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.personnel[index] = { ...this.personnel[index], ...data };
    return this.personnel[index];
  }

  async deletePersonnel(id) {
    const index = this.personnel.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.personnel.splice(index, 1);
    return true;
  }

  // ================= ORDERS CRUD =================
  async getOrders() {
    return [...this.orders];
  }

  async getOrderById(id) {
    return this.orders.find(o => o.id === id) || null;
  }

  async createOrder(data) {
    const newRecord = {
      id: data.id || `ord-${Date.now()}`,
      ...data
    };
    this.orders.unshift(newRecord);
    return newRecord;
  }

  async updateOrder(id, data) {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return null;
    this.orders[index] = { ...this.orders[index], ...data };
    return this.orders[index];
  }

  async deleteOrder(id) {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return false;
    this.orders.splice(index, 1);
    return true;
  }

  // ================= ASSIGNMENTS CRUD =================
  async getAssignments(personnelId = null) {
    if (personnelId) {
      return this.assignments.filter(a => a.personnelId === personnelId);
    }
    return [...this.assignments];
  }

  async createAssignment(data) {
    const newRecord = {
      id: data.id || `asg-${Date.now()}`,
      ...data
    };
    this.assignments.unshift(newRecord);
    return newRecord;
  }

  async deleteAssignment(id) {
    const index = this.assignments.findIndex(a => a.id === id);
    if (index === -1) return false;
    this.assignments.splice(index, 1);
    return true;
  }

  // ================= EDUCATION CRUD =================
  async getEducation(personnelId = null) {
    if (personnelId) {
      return this.education.filter(e => e.personnelId === personnelId);
    }
    return [...this.education];
  }

  async createEducation(data) {
    const newRecord = {
      id: data.id || `edu-${Date.now()}`,
      ...data
    };
    this.education.unshift(newRecord);
    return newRecord;
  }

  async deleteEducation(id) {
    const index = this.education.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.education.splice(index, 1);
    return true;
  }

  // ================= PROMOTIONS CRUD =================
  async getPromotions(personnelId = null) {
    if (personnelId) {
      return this.promotions.filter(p => p.personnelId === personnelId);
    }
    return [...this.promotions];
  }

  async createPromotion(data) {
    const newRecord = {
      id: data.id || `prm-${Date.now()}`,
      ...data
    };
    this.promotions.unshift(newRecord);

    // Side Effect: update personnel rank & promotion date
    const pIndex = this.personnel.findIndex(p => p.id === data.personnelId);
    if (pIndex !== -1 && data.rankTo) {
      this.personnel[pIndex].rank = data.rankTo;
      if (data.promotionDate) {
        this.personnel[pIndex].lastPromotionDate = data.promotionDate;
      }
    }

    return newRecord;
  }

  async deletePromotion(id) {
    const index = this.promotions.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.promotions.splice(index, 1);
    return true;
  }

  // ================= TRAINING CRUD =================
  async getTraining(personnelId = null) {
    if (personnelId) {
      return this.training.filter(t => t.personnelId === personnelId);
    }
    return [...this.training];
  }

  async createTraining(data) {
    const newRecord = {
      id: data.id || `trn-${Date.now()}`,
      ...data
    };
    this.training.unshift(newRecord);
    return newRecord;
  }

  async deleteTraining(id) {
    const index = this.training.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.training.splice(index, 1);
    return true;
  }

  // ================= LEAVE CRUD =================
  async getLeave(personnelId = null) {
    if (personnelId) {
      return this.leave.filter(l => l.personnelId === personnelId);
    }
    return [...this.leave];
  }

  async createLeave(data) {
    const newRecord = {
      id: data.id || `lve-${Date.now()}`,
      ...data
    };
    this.leave.unshift(newRecord);
    return newRecord;
  }

  async updateLeaveStatus(id, status, approvedBy = null) {
    const index = this.leave.findIndex(l => l.id === id);
    if (index === -1) return null;
    this.leave[index].status = status;
    if (approvedBy) this.leave[index].approvedBy = approvedBy;
    return this.leave[index];
  }

  async deleteLeave(id) {
    const index = this.leave.findIndex(l => l.id === id);
    if (index === -1) return false;
    this.leave.splice(index, 1);
    return true;
  }
}

export const db = new PAISRepository();
