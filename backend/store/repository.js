/**
 * Data Repository Abstraction Layer
 * 
 * DESIGN PATTERN: Repository Pattern
 * Primary Storage Engine: Supabase (PostgreSQL Cloud via HTTPS Port 443)
 * Fallback Engine: In-Memory Data Store
 */

import { supabase, isSupabaseAvailable } from '../config/supabase.js';
import { 
  INITIAL_PERSONNEL, 
  INITIAL_ASSIGNMENTS, 
  INITIAL_EDUCATION, 
  INITIAL_PROMOTIONS, 
  INITIAL_ORDERS, 
  INITIAL_TRAINING, 
  INITIAL_LEAVE,
  INITIAL_AWARDS
} from './initialData.js';

class PAISRepository {
  constructor() {
    this.inMemoryPersonnel = [...INITIAL_PERSONNEL];
    this.inMemoryAssignments = [...INITIAL_ASSIGNMENTS];
    this.inMemoryEducation = [...INITIAL_EDUCATION];
    this.inMemoryPromotions = [...INITIAL_PROMOTIONS];
    this.inMemoryOrders = [...INITIAL_ORDERS];
    this.inMemoryTraining = [...INITIAL_TRAINING];
    this.inMemoryLeave = [...INITIAL_LEAVE];
    this.inMemoryAwards = [...INITIAL_AWARDS];
  }

  isSupabaseConnected() {
    return isSupabaseAvailable();
  }

  // ================= PERSONNEL CRUD =================
  async getPersonnel(query = {}) {
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('personnel').select('*');
        if (query.division && query.division !== 'ALL') {
          req = req.eq('division', query.division);
        }
        if (query.status) {
          req = req.eq('status', query.status);
        }
        if (query.search) {
          req = req.or(`fullName.ilike.%${query.search}%,badgeNo.ilike.%${query.search}%,division.ilike.%${query.search}%,designation.ilike.%${query.search}%`);
        }
        const { data, error } = await req;
        console.log('--- SUPABASE QUERY RESULT ---', { dataCount: data?.length, error: error?.message });
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }

    let result = [...this.inMemoryPersonnel];
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
    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('personnel').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (e) {}
    }
    return this.inMemoryPersonnel.find(p => p.id === id) || null;
  }

  async createPersonnel(data) {
    const newRecord = {
      id: data.id || `pnp-${Date.now()}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      try {
        const { data: inserted, error } = await supabase.from('personnel').insert([newRecord]).select().single();
        if (!error && inserted) return inserted;
      } catch (e) {}
    }

    this.inMemoryPersonnel.unshift(newRecord);
    return newRecord;
  }

  async createPersonnelBulk(records) {
    if (!Array.isArray(records) || records.length === 0) return [];

    if (this.isSupabaseConnected()) {
      const { data: inserted, error } = await supabase
        .from('personnel')
        .insert(records)
        .select();

      if (error) {
        throw new Error(`Bulk personnel insert failed: ${error.message}`);
      }
      return inserted || [];
    }

    this.inMemoryPersonnel.unshift(...records);
    return records;
  }

  async updatePersonnel(id, data) {
    if (this.isSupabaseConnected()) {
      try {
        const { data: updated, error } = await supabase.from('personnel').update(data).eq('id', id).select().single();
        if (!error && updated) return updated;
      } catch (e) {}
    }

    const index = this.inMemoryPersonnel.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.inMemoryPersonnel[index] = { ...this.inMemoryPersonnel[index], ...data };
    return this.inMemoryPersonnel[index];
  }

  async deletePersonnel(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { error } = await supabase.from('personnel').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }

    const index = this.inMemoryPersonnel.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.inMemoryPersonnel.splice(index, 1);
    return true;
  }

  // ================= ORDERS CRUD =================
  async getOrders() {
    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('orders').select('*');
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }
    return [...this.inMemoryOrders];
  }

  async getOrderById(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (e) {}
    }
    return this.inMemoryOrders.find(o => o.id === id) || null;
  }

  async createOrder(data) {
    const newRecord = {
      id: data.id || `ord-${Date.now()}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      try {
        const { data: inserted, error } = await supabase.from('orders').insert([newRecord]).select().single();
        if (!error && inserted) return inserted;
      } catch (e) {}
    }

    this.inMemoryOrders.unshift(newRecord);
    return newRecord;
  }

  async updateOrder(id, data) {
    if (this.isSupabaseConnected()) {
      try {
        const { data: updated, error } = await supabase.from('orders').update(data).eq('id', id).select().single();
        if (!error && updated) return updated;
      } catch (e) {}
    }

    const index = this.inMemoryOrders.findIndex(o => o.id === id);
    if (index === -1) return null;
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...data };
    return this.inMemoryOrders[index];
  }

  async deleteOrder(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }

    const index = this.inMemoryOrders.findIndex(o => o.id === id);
    if (index === -1) return false;
    this.inMemoryOrders.splice(index, 1);
    return true;
  }

  // ================= AWARDS CRUD =================
  async getAwards(personnelId = null) {
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('awards').select('*').order('authorityDate', { ascending: false });
        if (personnelId) req = req.eq('personnelId', personnelId);
        const { data, error } = await req;
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }

    const awards = [...this.inMemoryAwards];
    return personnelId
      ? awards.filter(award => award.personnelId === personnelId)
      : awards;
  }

  async createAward(data) {
    const newRecord = {
      ...data,
      id: data.id || `awd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    };

    if (this.isSupabaseConnected()) {
      const { data: inserted, error } = await supabase
        .from('awards')
        .insert([newRecord])
        .select()
        .single();
      if (error) {
        const insertError = new Error(`Award insert failed: ${error.message}`);
        insertError.code = error.code;
        throw insertError;
      }
      return inserted;
    }

    this.inMemoryAwards.unshift(newRecord);
    return newRecord;
  }

  async updateAward(id, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() };

    if (this.isSupabaseConnected()) {
      const { data: updated, error } = await supabase
        .from('awards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Award update failed: ${error.message}`);
      return updated;
    }

    const index = this.inMemoryAwards.findIndex(award => award.id === id);
    if (index === -1) return null;
    this.inMemoryAwards[index] = { ...this.inMemoryAwards[index], ...updateData, id };
    return this.inMemoryAwards[index];
  }

  async deleteAward(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { error } = await supabase.from('awards').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }

    const index = this.inMemoryAwards.findIndex(award => award.id === id);
    if (index === -1) return false;
    this.inMemoryAwards.splice(index, 1);
    return true;
  }

  // ================= ASSIGNMENTS CRUD =================
  async getAssignments(personnelId = null) {
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('assignments').select('*');
        if (personnelId) req = req.eq('personnelId', personnelId);
        const { data, error } = await req;
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }

    if (personnelId) {
      return this.inMemoryAssignments.filter(a => a.personnelId === personnelId);
    }
    return [...this.inMemoryAssignments];
  }

  async createAssignment(data) {
    const newRecord = {
      id: data.id || `asg-${Date.now()}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      try {
        const { data: inserted, error } = await supabase.from('assignments').insert([newRecord]).select().single();
        if (!error && inserted) return inserted;
      } catch (e) {}
    }

    this.inMemoryAssignments.unshift(newRecord);
    return newRecord;
  }

  async updateAssignment(id, data) {
    if (this.isSupabaseConnected()) {
      try {
        const { data: updated, error } = await supabase
          .from('assignments')
          .update(data)
          .eq('id', id)
          .select()
          .single();
        if (!error && updated) return updated;
      } catch (e) {}
    }

    const index = this.inMemoryAssignments.findIndex(a => a.id === id);
    if (index === -1) return null;
    this.inMemoryAssignments[index] = { ...this.inMemoryAssignments[index], ...data, id };
    return this.inMemoryAssignments[index];
  }

  async deleteAssignment(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { error } = await supabase.from('assignments').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }

    const index = this.inMemoryAssignments.findIndex(a => a.id === id);
    if (index === -1) return false;
    this.inMemoryAssignments.splice(index, 1);
    return true;
  }

  // ================= EDUCATION CRUD =================
  async getEducation(personnelId = null) {
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('education').select('*');
        if (personnelId) req = req.eq('personnelId', personnelId);
        const { data, error } = await req;
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }

    if (personnelId) {
      return this.inMemoryEducation.filter(e => e.personnelId === personnelId);
    }
    return [...this.inMemoryEducation];
  }

  async createEducation(data) {
    const newRecord = {
      id: data.id || `edu-${Date.now()}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      try {
        const { data: inserted, error } = await supabase.from('education').insert([newRecord]).select().single();
        if (!error && inserted) return inserted;
      } catch (e) {}
    }

    this.inMemoryEducation.unshift(newRecord);
    return newRecord;
  }

  async deleteEducation(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { error } = await supabase.from('education').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }

    const index = this.inMemoryEducation.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.inMemoryEducation.splice(index, 1);
    return true;
  }

  // ================= PROMOTIONS CRUD =================
  async getPromotions(personnelId = null) {
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('promotions').select('*');
        if (personnelId) req = req.eq('personnelId', personnelId);
        const { data, error } = await req;
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }

    if (personnelId) {
      return this.inMemoryPromotions.filter(p => p.personnelId === personnelId);
    }
    return [...this.inMemoryPromotions];
  }

  async createPromotion(data) {
    const newRecord = {
      id: data.id || `prm-${Date.now()}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      try {
        const { data: inserted, error } = await supabase.from('promotions').insert([newRecord]).select().single();
        if (!error && inserted) {
          if (data.rankTo) {
            const updateObj = { rank: data.rankTo };
            if (data.promotionDate) updateObj.lastPromotionDate = data.promotionDate;
            await supabase.from('personnel').update(updateObj).eq('id', data.personnelId);
          }
          return inserted;
        }
      } catch (e) {}
    }

    this.inMemoryPromotions.unshift(newRecord);
    const pIndex = this.inMemoryPersonnel.findIndex(p => p.id === data.personnelId);
    if (pIndex !== -1 && data.rankTo) {
      this.inMemoryPersonnel[pIndex].rank = data.rankTo;
      if (data.promotionDate) {
        this.inMemoryPersonnel[pIndex].lastPromotionDate = data.promotionDate;
      }
    }
    return newRecord;
  }

  async deletePromotion(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { error } = await supabase.from('promotions').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }

    const index = this.inMemoryPromotions.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.inMemoryPromotions.splice(index, 1);
    return true;
  }

  // ================= TRAINING CRUD =================
  async getTraining(personnelId = null) {
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('training').select('*');
        if (personnelId) req = req.eq('personnelId', personnelId);
        const { data, error } = await req;
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }

    if (personnelId) {
      return this.inMemoryTraining.filter(t => t.personnelId === personnelId);
    }
    return [...this.inMemoryTraining];
  }

  async createTraining(data) {
    const newRecord = {
      id: data.id || `trn-${Date.now()}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      try {
        const { data: inserted, error } = await supabase.from('training').insert([newRecord]).select().single();
        if (!error && inserted) return inserted;
      } catch (e) {}
    }

    this.inMemoryTraining.unshift(newRecord);
    return newRecord;
  }

  async deleteTraining(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { error } = await supabase.from('training').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }

    const index = this.inMemoryTraining.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.inMemoryTraining.splice(index, 1);
    return true;
  }

  // ================= LEAVE CRUD =================
  async getLeave(personnelId = null) {
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('leaves').select('*');
        if (personnelId) req = req.eq('personnelId', personnelId);
        const { data, error } = await req;
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }

    if (personnelId) {
      return this.inMemoryLeave.filter(l => l.personnelId === personnelId);
    }
    return [...this.inMemoryLeave];
  }

  async createLeave(data) {
    const newRecord = {
      ...data,
      id: data.id || `lve-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    };

    if (this.isSupabaseConnected()) {
      const { data: inserted, error } = await supabase
        .from('leaves')
        .insert([newRecord])
        .select()
        .single();
      if (error) throw new Error(`Leave insert failed: ${error.message}`);
      return inserted;
    }

    this.inMemoryLeave.unshift(newRecord);
    return newRecord;
  }

  async updateLeaveStatus(id, status, approvedBy = null) {
    if (this.isSupabaseConnected()) {
      try {
        const updateData = { status };
        if (approvedBy) updateData.approvedBy = approvedBy;
        const { data: updated, error } = await supabase.from('leaves').update(updateData).eq('id', id).select().single();
        if (!error && updated) return updated;
      } catch (e) {}
    }

    const index = this.inMemoryLeave.findIndex(l => l.id === id);
    if (index === -1) return null;
    this.inMemoryLeave[index].status = status;
    if (approvedBy) this.inMemoryLeave[index].approvedBy = approvedBy;
    return this.inMemoryLeave[index];
  }

  async updateLeave(id, data) {
    if (this.isSupabaseConnected()) {
      const { data: updated, error } = await supabase
        .from('leaves')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Leave update failed: ${error.message}`);
      return updated;
    }

    const index = this.inMemoryLeave.findIndex(leave => leave.id === id);
    if (index === -1) return null;
    this.inMemoryLeave[index] = { ...this.inMemoryLeave[index], ...data, id };
    return this.inMemoryLeave[index];
  }

  async deleteLeave(id) {
    if (this.isSupabaseConnected()) {
      try {
        const { error } = await supabase.from('leaves').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {}
    }

    const index = this.inMemoryLeave.findIndex(l => l.id === id);
    if (index === -1) return false;
    this.inMemoryLeave.splice(index, 1);
    return true;
  }
}

export const db = new PAISRepository();
