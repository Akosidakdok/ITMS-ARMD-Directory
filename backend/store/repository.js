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
import { buildOrderNumber, extractOrderSequence, getOrderYear } from '../utils/orderNumber.js';
import { assertOrderStatusTransition, normalizeOrderStatus, ORDER_LOCKED_STATUSES } from '../utils/orderWorkflow.js';

const PCO_RANKS_BACKEND = new Set([
  'PBGEN', 'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT',
  'PMGEN', 'PLTGEN', 'PGEN',
  'P/BGEN', 'P/COL', 'P/LCOL', 'P/LTCOL', 'P/MAJ', 'P/CAPT', 'P/CPT', 'P/LT',
  'P/MGEN', 'P/LTGEN', 'P/GEN',
  'POLICE BRIGADIER GENERAL', 'POLICE COLONEL', 'POLICE LIEUTENANT COLONEL',
  'POLICE MAJOR', 'POLICE CAPTAIN', 'POLICE LIEUTENANT',
  'POLICE MAJOR GENERAL', 'POLICE LIEUTENANT GENERAL', 'POLICE GENERAL'
]);

function getRankCategoryBackend(rank) {
  if (!rank) return 'PNCO';
  const clean = String(rank).trim().toUpperCase();
  if (clean === 'NUP' || clean.includes('NON-UNIFORMED')) return 'NUP';
  if (PCO_RANKS_BACKEND.has(clean)) return 'PCO';
  const noSlash = clean.replace(/[\s/]/g, '');
  if (['PBGEN', 'PCOL', 'PLTCOL', 'PLCOL', 'PMAJ', 'PCPT', 'PCAPT', 'PLT', 'PMGEN', 'PLTGEN', 'PGEN'].includes(noSlash)) {
    return 'PCO';
  }
  if (clean.startsWith('POLICE BRIGADIER') || clean.startsWith('POLICE COLONEL') || clean.startsWith('POLICE LIEUTENANT COLONEL') || clean.startsWith('POLICE MAJOR') || clean.startsWith('POLICE CAPTAIN') || clean.startsWith('POLICE LIEUTENANT') || clean.startsWith('POLICE GENERAL')) {
    return 'PCO';
  }
  return 'PNCO';
}

class PAISRepository {
  constructor() {
    this.inMemoryPersonnel = [...INITIAL_PERSONNEL];
    this.inMemoryAssignments = [...INITIAL_ASSIGNMENTS];
    this.inMemoryEducation = [...INITIAL_EDUCATION];
    this.inMemoryPromotions = [...INITIAL_PROMOTIONS];
    this.inMemoryOrders = [...INITIAL_ORDERS];
    this.inMemoryOrderSequences = new Map();
    this.inMemoryOrderStatusHistory = [];
    this.inMemoryTraining = [...INITIAL_TRAINING];
    this.inMemoryLeave = [...INITIAL_LEAVE];
    this.inMemoryAwards = [...INITIAL_AWARDS];
    this.inMemoryAuthorizedStrengths = [];
  }

  isSupabaseConnected() {
    return isSupabaseAvailable();
  }

  // ================= PERSONNEL CRUD =================
  normalizePersonnelRecord(p) {
    if (!p) return p;
    const sub_unit = p.sub_unit || p.division || '';
    const details = p.details || p.detail || '';
    const station = p.station || '';
    const detectedCategory = getRankCategoryBackend(p.rank);
    const rankCategory = (detectedCategory === 'PCO' || detectedCategory === 'NUP')
      ? detectedCategory
      : (p.rankCategory || detectedCategory);
    const positionCategory = p.positionCategory || 'Main';
    const unitCategory = p.unitCategory || 'ITMS HQ';
    const subUnitCategory = p.subUnitCategory || 'Division';
    return {
      ...p,
      rankCategory,
      positionCategory,
      unitCategory,
      subUnitCategory,
      sub_unit,
      details,
      station,
      division: sub_unit,
      detail: details
    };
  }

  sanitizePersonnelPayload(data) {
    if (!data) return data;
    const sub_unit = data.sub_unit !== undefined ? data.sub_unit : (data.division || '');
    const details = data.details !== undefined ? data.details : (data.detail || '');
    const station = data.station !== undefined ? data.station : '';
    const detectedCategory = getRankCategoryBackend(data.rank);
    const rankCategory = (detectedCategory === 'PCO' || detectedCategory === 'NUP')
      ? detectedCategory
      : (data.rankCategory || detectedCategory);
    const positionCategory = data.positionCategory || 'Main';
    const unitCategory = data.unitCategory || 'ITMS HQ';
    const subUnitCategory = data.subUnitCategory || 'Division';
    return {
      ...data,
      rankCategory,
      positionCategory,
      unitCategory,
      subUnitCategory,
      sub_unit,
      details,
      station,
      division: sub_unit,
      detail: details
    };
  }

  async getPersonnel(query = {}) {
    const filterSubUnit = query.sub_unit || query.division;
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('personnel').select('*');
        if (filterSubUnit && filterSubUnit !== 'ALL') {
          req = req.or(`sub_unit.eq.${filterSubUnit},division.eq.${filterSubUnit}`);
        }
        if (query.status) {
          req = req.eq('status', query.status);
        }
        if (query.search) {
          req = req.or(`fullName.ilike.%${query.search}%,badgeNo.ilike.%${query.search}%,sub_unit.ilike.%${query.search}%,details.ilike.%${query.search}%,station.ilike.%${query.search}%,division.ilike.%${query.search}%,designation.ilike.%${query.search}%`);
        }
        const { data, error } = await req;
        console.log('--- SUPABASE QUERY RESULT ---', { dataCount: data?.length, error: error?.message });
        if (!error && Array.isArray(data)) return data.map(p => this.normalizePersonnelRecord(p));
      } catch (e) {}
    }

    let result = this.inMemoryPersonnel.map(p => this.normalizePersonnelRecord(p));
    if (filterSubUnit && filterSubUnit !== 'ALL') {
      result = result.filter(p => p.sub_unit === filterSubUnit || p.division === filterSubUnit);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      result = result.filter(p => 
        p.fullName.toLowerCase().includes(q) ||
        p.badgeNo.toLowerCase().includes(q) ||
        (p.sub_unit && p.sub_unit.toLowerCase().includes(q)) ||
        (p.details && p.details.toLowerCase().includes(q)) ||
        (p.station && p.station.toLowerCase().includes(q)) ||
        (p.designation && p.designation.toLowerCase().includes(q))
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
        if (!error && data) return this.normalizePersonnelRecord(data);
      } catch (e) {}
    }
    const found = this.inMemoryPersonnel.find(p => p.id === id);
    return found ? this.normalizePersonnelRecord(found) : null;
  }

  coerceSalaryGradeForLegacyInt(payload) {
    if (!payload || payload.salaryGrade === undefined || payload.salaryGrade === null || payload.salaryGrade === '') {
      return { ...payload, salaryGrade: null };
    }
    const match = String(payload.salaryGrade).match(/\d+/);
    const num = match ? parseInt(match[0], 10) : null;
    return { ...payload, salaryGrade: num };
  }

  stripUnpersistedPersonnelColumns(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const {
      rankCategory,
      positionCategory,
      unitCategory,
      subUnitCategory,
      designationDate,
      effectiveDate,
      ...rest
    } = payload;
    return rest;
  }

  async createPersonnel(data) {
    const payload = this.sanitizePersonnelPayload(data);
    const newRecord = {
      id: payload.id || `pnp-${Date.now()}`,
      ...payload
    };

    if (this.isSupabaseConnected()) {
      let { data: inserted, error } = await supabase.from('personnel').insert([newRecord]).select().single();
      if (error && error.code === '22P02' && typeof newRecord.salaryGrade === 'string') {
        const fallbackRecord = this.coerceSalaryGradeForLegacyInt(newRecord);
        const retry = await supabase.from('personnel').insert([fallbackRecord]).select().single();
        if (!retry.error) {
          inserted = retry.data;
          error = null;
        }
      }
      if (error && (error.code === '42703' || (error.message && /column.*does not exist|schema cache/i.test(error.message)))) {
        // Table hasn't run the PAIS 2.0 column migration yet; insert core columns and restore in-memory
        let safeRecord = this.stripUnpersistedPersonnelColumns(newRecord);
        if (typeof safeRecord.salaryGrade === 'string') {
          safeRecord = this.coerceSalaryGradeForLegacyInt(safeRecord);
        }
        const retry = await supabase.from('personnel').insert([safeRecord]).select().single();
        if (!retry.error) {
          inserted = { ...retry.data, ...newRecord };
          error = null;
        }
      }
      if (error) throw new Error(`Personnel insert failed: ${error.message}`);
      return this.normalizePersonnelRecord({ ...newRecord, ...inserted });
    }
    throw new Error('Supabase is unavailable. Personnel records were not changed.');
  }

  async createPersonnelBulk(records) {
    if (!Array.isArray(records) || records.length === 0) return [];
    const payloads = records.map(r => this.sanitizePersonnelPayload(r));

    if (this.isSupabaseConnected()) {
      let { data: inserted, error } = await supabase
        .from('personnel')
        .insert(payloads)
        .select();

      if (error && error.code === '22P02') {
        // Graceful fallback if Supabase table "salaryGrade" column is still integer
        const fallbackPayloads = payloads.map(p => this.coerceSalaryGradeForLegacyInt(p));
        const retry = await supabase
          .from('personnel')
          .insert(fallbackPayloads)
          .select();
        if (!retry.error) {
          inserted = retry.data;
          error = null;
        }
      }

      if (error && (error.code === '42703' || (error.message && /column.*does not exist|schema cache/i.test(error.message)))) {
        const safePayloads = payloads.map(p => {
          let s = this.stripUnpersistedPersonnelColumns(p);
          if (typeof s.salaryGrade === 'string') s = this.coerceSalaryGradeForLegacyInt(s);
          return s;
        });
        const retry = await supabase.from('personnel').insert(safePayloads).select();
        if (!retry.error) {
          inserted = (retry.data || []).map((row, idx) => ({ ...row, ...payloads[idx] }));
          error = null;
        }
      }

      if (error) {
        throw new Error(`Bulk personnel insert failed: ${error.message}`);
      }
      return (inserted || []).map(p => this.normalizePersonnelRecord(p));
    }

    this.inMemoryPersonnel.unshift(...payloads);
    return payloads.map(p => this.normalizePersonnelRecord(p));
  }

  async updatePersonnel(id, data) {
    const payload = this.sanitizePersonnelPayload(data);
    if (this.isSupabaseConnected()) {
      let { data: updated, error } = await supabase.from('personnel').update(payload).eq('id', id).select().single();
      if (error && error.code === '22P02' && typeof payload.salaryGrade === 'string') {
        const fallbackPayload = this.coerceSalaryGradeForLegacyInt(payload);
        const retry = await supabase.from('personnel').update(fallbackPayload).eq('id', id).select().single();
        if (!retry.error) {
          updated = retry.data;
          error = null;
        }
      }
      if (error && (error.code === '42703' || (error.message && /column.*does not exist|schema cache/i.test(error.message)))) {
        let safePayload = this.stripUnpersistedPersonnelColumns(payload);
        if (typeof safePayload.salaryGrade === 'string') {
          safePayload = this.coerceSalaryGradeForLegacyInt(safePayload);
        }
        const retry = await supabase.from('personnel').update(safePayload).eq('id', id).select().single();
        if (!retry.error) {
          updated = { ...retry.data, ...payload };
          error = null;
        }
      }
      if (error) throw new Error(`Personnel update failed: ${error.message}`);
      return this.normalizePersonnelRecord({ ...payload, ...updated });
    }
    throw new Error('Supabase is unavailable. Personnel records were not changed.');
  }

  async deletePersonnel(id) {
    if (this.isSupabaseConnected()) {
      const { data: deleted, error } = await supabase.from('personnel').delete().eq('id', id).select('id');
      if (error) throw new Error(`Personnel delete failed: ${error.message}`);
      return Array.isArray(deleted) && deleted.length > 0;
    }
    throw new Error('Supabase is unavailable. Personnel records were not changed.');
  }

  // ================= ORDERS CRUD =================
  async nextOrderNumber({ series, purposeCode, issuedDate }) {
    const year = getOrderYear(issuedDate);

    if (this.isSupabaseConnected()) {
      const { data, error } = await supabase.rpc('next_itms_order_sequence', {
        p_year: year,
        p_series: series
      });
      if (error) {
        throw new Error(`Order-number sequence generation failed: ${error.message}`);
      }
      return buildOrderNumber({ series, purposeCode, year, sequence: Number(data) });
    }

    const sequenceKey = `${year}:${series}`;
    const existingMax = this.inMemoryOrders.reduce((max, order) => {
      const parsed = extractOrderSequence(order.orderNumber);
      return parsed && parsed.year === year && parsed.series === series
        ? Math.max(max, parsed.sequence)
        : max;
    }, 0);
    const next = Math.max(this.inMemoryOrderSequences.get(sequenceKey) || 0, existingMax) + 1;
    this.inMemoryOrderSequences.set(sequenceKey, next);
    return buildOrderNumber({ series, purposeCode, year, sequence: next });
  }

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
    const orderNumber = data.series && data.purposeCode && data.issuedDate
      ? await this.nextOrderNumber(data)
      : data.orderNumber;
    if (!orderNumber) {
      throw new Error('Order number could not be generated. Series, purpose code, and issued date are required.');
    }
    const newRecord = {
      id: data.id || `ord-${Date.now()}`,
      ...data,
      orderNumber
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
    const existing = await this.getOrderById(id);
    if (!existing) return null;
    const currentStatus = normalizeOrderStatus(existing);
    if (ORDER_LOCKED_STATUSES.includes(currentStatus)) {
      throw new Error(`Orders in ${currentStatus} status are locked and must be changed through the workflow.`);
    }
    const requestedStatus = data.documentStatus || data.status;
    if (requestedStatus && normalizeOrderStatus(requestedStatus) !== currentStatus) {
      throw new Error('Order status changes must use the workflow action endpoint.');
    }
    const requestedOrderNumber = data.orderNumber || data.orderNo;
    if (existing.orderNumber && requestedOrderNumber && requestedOrderNumber !== existing.orderNumber) {
      throw new Error('Order number is generated by the system and cannot be changed.');
    }
    for (const key of ['series', 'purposeCode', 'issuedDate']) {
      if (existing[key] !== undefined && data[key] !== undefined && data[key] !== existing[key]) {
        throw new Error(`Order ${key} cannot be changed after number allocation.`);
      }
    }
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

  async restoreRevokedOrder(id, { actor = 'system', reason = '' } = {}) {
    const existing = await this.getOrderById(id);
    if (!existing) return null;

    const fromStatus = normalizeOrderStatus(existing);
    if (fromStatus !== 'Revoked') {
      throw new Error('Only revoked orders can be restored.');
    }

    const history = await this.getOrderStatusHistory(id);
    const revokeEvent = history.find(event =>
      event.toStatus === 'Revoked' &&
      ['Draft', 'For Approval', 'Signed', 'Released'].includes(event.fromStatus)
    );
    const targetStatus = revokeEvent?.fromStatus || 'For Approval';
    const changedAt = new Date().toISOString();
    const statusUpdate = {
      documentStatus: targetStatus,
      status: targetStatus,
      updatedAt: changedAt
    };

    if (this.isSupabaseConnected()) {
      const { data, error } = await supabase
        .from('orders')
        .update(statusUpdate)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) throw new Error(`Order restore failed: ${error?.message || 'Order not found'}`);

      const { error: historyError } = await supabase.from('order_status_history').insert([{
        id: `osh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        orderId: id,
        fromStatus,
        toStatus: targetStatus,
        reason: String(reason || '').trim() || 'Restored after revocation correction',
        changedBy: actor,
        changedAt
      }]);
      if (historyError) throw new Error(`Order status history insert failed: ${historyError.message}`);
      return data;
    }

    const index = this.inMemoryOrders.findIndex(order => order.id === id);
    if (index === -1) return null;
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...statusUpdate };
    this.inMemoryOrderStatusHistory.push({
      id: `osh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId: id,
      fromStatus,
      toStatus: targetStatus,
      reason: String(reason || '').trim() || 'Restored after revocation correction',
      changedBy: actor,
      changedAt
    });
    return this.inMemoryOrders[index];
  }

  async attachOrderDocument(id, metadata) {
    const existing = await this.getOrderById(id);
    if (!existing) return null;
    const update = { ...metadata, updatedAt: new Date().toISOString() };
    if (supabase) {
      const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
      if (error || !data) throw new Error(`Order document metadata update failed: ${error?.message || 'Order not found'}`);
      return data;
    }
    const index = this.inMemoryOrders.findIndex(order => order.id === id);
    if (index === -1) return null;
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...update };
    return this.inMemoryOrders[index];
  }

  async attachGeneratedOrderDocument(id, metadata) {
    const existing = await this.getOrderById(id);
    if (!existing) return null;
    const update = {
      generatedDocument: metadata.generatedDocument || null,
      generationManifest: metadata.generationManifest || null,
      templateKey: metadata.templateKey || null,
      templateVersion: metadata.templateVersion || null,
      updatedAt: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
      if (error || !data) throw new Error(`Generated order document metadata update failed: ${error?.message || 'Order not found'}`);
      return data;
    }
    const index = this.inMemoryOrders.findIndex(order => order.id === id);
    if (index === -1) return null;
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...update };
    return this.inMemoryOrders[index];
  }

  async attachSignedOrderDocument(id, metadata) {
    const existing = await this.getOrderById(id);
    if (!existing) return null;
    const update = { signedDocument: metadata.signedDocument || null, updatedAt: new Date().toISOString() };
    if (supabase) {
      const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
      if (error || !data) throw new Error(`Signed order document metadata update failed: ${error?.message || 'Order not found'}`);
      return data;
    }
    const index = this.inMemoryOrders.findIndex(order => order.id === id);
    if (index === -1) return null;
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...update };
    return this.inMemoryOrders[index];
  }

  async clearSignedOrderDocument(id) {
    return this.attachSignedOrderDocument(id, { signedDocument: null });
  }

  async clearOrderDocument(id) {
    const existing = await this.getOrderById(id);
    if (!existing) return null;
    const update = {
      fileName: null,
      fileMimeType: null,
      fileSize: null,
      storagePath: null,
      updatedAt: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
      if (error || !data) throw new Error(`Order document metadata removal failed: ${error?.message || 'Order not found'}`);
      return data;
    }
    const index = this.inMemoryOrders.findIndex(order => order.id === id);
    if (index === -1) return null;
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...update };
    return this.inMemoryOrders[index];
  }

  async getOrderStatusHistory(orderId) {
    if (this.isSupabaseConnected()) {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('orderId', orderId)
        .order('changedAt', { ascending: false });
      if (error) throw new Error(`Order status history lookup failed: ${error.message}`);
      return data || [];
    }
    return this.inMemoryOrderStatusHistory
      .filter(item => item.orderId === orderId)
      .sort((a, b) => String(b.changedAt).localeCompare(String(a.changedAt)));
  }

  async transitionOrderStatus(id, toStatus, { actor = 'system', reason = '' } = {}) {
    const existing = await this.getOrderById(id);
    if (!existing) return null;

    const fromStatus = normalizeOrderStatus(existing);
    assertOrderStatusTransition(fromStatus, toStatus);
    if (toStatus === 'Signed' && !existing.signedDocument?.storagePath) {
      throw new Error('A scanned signed order image must be uploaded before the order can be marked Signed.');
    }
    const changedAt = new Date().toISOString();
    const statusUpdate = {
      documentStatus: toStatus,
      status: toStatus,
      updatedAt: changedAt
    };
    if (toStatus === 'Signed') {
      statusUpdate.signedAt = changedAt;
      statusUpdate.signedBy = actor;
    }
    if (toStatus === 'Released') {
      statusUpdate.releasedAt = changedAt;
      statusUpdate.releasedBy = actor;
    }

    let updated;
    if (this.isSupabaseConnected()) {
      const { data, error } = await supabase
        .from('orders')
        .update(statusUpdate)
        .eq('id', id)
        .select()
        .single();
      if (error || !data) throw new Error(`Order status update failed: ${error?.message || 'Order not found'}`);
      updated = data;

      const { error: historyError } = await supabase.from('order_status_history').insert([{
        id: `osh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        orderId: id,
        fromStatus,
        toStatus,
        reason: String(reason || '').trim() || null,
        changedBy: actor,
        changedAt
      }]);
      if (historyError) throw new Error(`Order status history insert failed: ${historyError.message}`);
      return updated;
    }

    const index = this.inMemoryOrders.findIndex(order => order.id === id);
    if (index === -1) return null;
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...statusUpdate };
    this.inMemoryOrderStatusHistory.push({
      id: `osh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId: id,
      fromStatus,
      toStatus,
      reason: String(reason || '').trim() || null,
      changedBy: actor,
      changedAt
    });
    return this.inMemoryOrders[index];
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
      id: data.id || `edu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      const { data: inserted, error } = await supabase.from('education').insert([newRecord]).select().single();
      if (error) throw new Error(`Education insert failed: ${error.message}`);
      if (inserted) return inserted;
    }

    this.inMemoryEducation.unshift(newRecord);
    return newRecord;
  }

  async updateEducation(id, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() };

    if (this.isSupabaseConnected()) {
      const { data: updated, error } = await supabase
        .from('education')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Education update failed: ${error.message}`);
      if (updated) return updated;
    }

    const index = this.inMemoryEducation.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.inMemoryEducation[index] = { ...this.inMemoryEducation[index], ...updateData, id };
    return this.inMemoryEducation[index];
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

  /**
   * Bulk upsert education records.
   * Match key: personnelId + academicLevel + degree (case-insensitive trim).
   * If match found → update; else → insert.
   */
  async bulkUpsertEducation(records) {
    const results = { added: [], replaced: [], skipped: [] };

    for (const raw of records) {
      if (!raw.personnelId || (!raw.academicLevel && !raw.degree)) {
        results.skipped.push({ ...raw, reason: 'Missing personnelId or academic level' });
        continue;
      }

      const existingAll = await this.getEducation(raw.personnelId);
      const normalizedLevel = String(raw.academicLevel || '').trim().toLowerCase();
      const normalizedDegree = String(raw.degree || '').trim().toLowerCase();
      const match = existingAll.find(
        e => String(e.academicLevel || '').trim().toLowerCase() === normalizedLevel
          && String(e.degree || '').trim().toLowerCase() === normalizedDegree
      );

      if (match) {
        const updated = await this.updateEducation(match.id, raw);
        results.replaced.push(updated);
      } else {
        const created = await this.createEducation(raw);
        results.added.push(created);
      }
    }

    return results;
  }

  // ================= PROMOTIONS CRUD =================
  async syncPersonnelRank(personnelId, baselineRank = null) {
    if (!personnelId) return;

    const promotions = await this.getPromotions(personnelId);
    promotions.sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());

    let targetRank = null;
    let targetDate = null;

    if (promotions.length > 0) {
      targetRank = promotions[0].rankTo;
      targetDate = promotions[0].promotionDate;
    } else if (baselineRank) {
      targetRank = baselineRank;
      targetDate = null;
    }

    if (this.isSupabaseConnected()) {
      try {
        const updateObj = {};
        if (targetRank) updateObj.rank = targetRank;
        updateObj.lastPromotionDate = targetDate;
        await supabase.from('personnel').update(updateObj).eq('id', personnelId);
      } catch (e) {
        console.error('Failed to sync personnel rank in Supabase:', e.message);
      }
    }

    const pIndex = this.inMemoryPersonnel.findIndex(p => p.id === personnelId);
    if (pIndex !== -1) {
      if (targetRank) this.inMemoryPersonnel[pIndex].rank = targetRank;
      this.inMemoryPersonnel[pIndex].lastPromotionDate = targetDate;
    }
  }

  async getPromotions(personnelId = null) {
    if (this.isSupabaseConnected()) {
      try {
        let req = supabase.from('promotions').select('*').order('promotionDate', { ascending: false });
        if (personnelId) req = req.eq('personnelId', personnelId);
        const { data, error } = await req;
        if (!error && Array.isArray(data)) return data;
      } catch (e) {}
    }

    if (personnelId) {
      return this.inMemoryPromotions
        .filter(p => p.personnelId === personnelId)
        .sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());
    }
    return [...this.inMemoryPromotions].sort((a, b) => new Date(b.promotionDate).getTime() - new Date(a.promotionDate).getTime());
  }

  async createPromotion(data) {
    const newRecord = {
      id: data.id || `prm-${Date.now()}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      const { data: inserted, error } = await supabase.from('promotions').insert([newRecord]).select().single();
      if (error) throw error;
      await this.syncPersonnelRank(data.personnelId);
      return inserted;
    }

    this.inMemoryPromotions.unshift(newRecord);
    await this.syncPersonnelRank(data.personnelId);
    return newRecord;
  }

  async deletePromotion(id) {
    let targetRecord = this.inMemoryPromotions.find(p => p.id === id);

    if (this.isSupabaseConnected()) {
      if (!targetRecord) {
        const { data } = await supabase.from('promotions').select('*').eq('id', id).single();
        targetRecord = data;
      }
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
      if (targetRecord) {
        await this.syncPersonnelRank(targetRecord.personnelId, targetRecord.rankFrom);
      }
      return true;
    }

    const index = this.inMemoryPromotions.findIndex(p => p.id === id);
    if (index === -1) return false;
    const deleted = this.inMemoryPromotions.splice(index, 1)[0];
    await this.syncPersonnelRank(deleted.personnelId, deleted.rankFrom);
    return true;
  }

  async updatePromotion(id, data) {
    if (this.isSupabaseConnected()) {
      const { data: updated, error } = await supabase.from('promotions').update(data).eq('id', id).select().single();
      if (error) throw error;
      const personnelId = updated?.personnelId || data.personnelId;
      await this.syncPersonnelRank(personnelId);
      return updated;
    }
    const index = this.inMemoryPromotions.findIndex(item => item.id === id);
    if (index === -1) return null;
    this.inMemoryPromotions[index] = { ...this.inMemoryPromotions[index], ...data, id };
    const personnelId = this.inMemoryPromotions[index].personnelId;
    await this.syncPersonnelRank(personnelId);
    return this.inMemoryPromotions[index];
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
      id: data.id || `trn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...data
    };

    if (this.isSupabaseConnected()) {
      const { data: inserted, error } = await supabase.from('training').insert([newRecord]).select().single();
      if (error) throw new Error(`Training insert failed: ${error.message}`);
      if (inserted) return inserted;
    }

    this.inMemoryTraining.unshift(newRecord);
    return newRecord;
  }

  async updateTraining(id, data) {
    const updateData = { ...data, updatedAt: new Date().toISOString() };

    if (this.isSupabaseConnected()) {
      const { data: updated, error } = await supabase
        .from('training')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`Training update failed: ${error.message}`);
      if (updated) return updated;
    }

    const index = this.inMemoryTraining.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.inMemoryTraining[index] = { ...this.inMemoryTraining[index], ...updateData, id };
    return this.inMemoryTraining[index];
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

  /**
   * Bulk upsert training records.
   * Match key: personnelId + courseName (case-insensitive trim).
   * If match found → update; else → insert.
   */
  async bulkUpsertTraining(records) {
    const results = { added: [], replaced: [], skipped: [] };

    for (const raw of records) {
      if (!raw.personnelId || !raw.courseName) {
        results.skipped.push({ ...raw, reason: 'Missing personnelId or courseName' });
        continue;
      }

      const existingAll = await this.getTraining(raw.personnelId);
      const match = existingAll.find(
        t => t.courseName.trim().toLowerCase() === raw.courseName.trim().toLowerCase()
      );

      if (match) {
        const updated = await this.updateTraining(match.id, raw);
        results.replaced.push(updated);
      } else {
        const created = await this.createTraining(raw);
        results.added.push(created);
      }
    }

    return results;
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

  // ================= DISPOSITION & PROMOTION EVALUATIONS =================
  async getDispositionStats(status = 'Active') {
    const personnel = await this.getPersonnel({ status });
    const byUnit = {};
    const byRank = {};
    const byUnitAndRank = {};
    personnel.forEach(person => {
      const unit = person.unitCategory || person.sub_unit || person.division || 'Unassigned';
      const rank = person.rank || 'Unassigned';
      byUnit[unit] = (byUnit[unit] || 0) + 1;
      byRank[rank] = (byRank[rank] || 0) + 1;
      byUnitAndRank[unit] ||= {};
      byUnitAndRank[unit][rank] = (byUnitAndRank[unit][rank] || 0) + 1;
    });
    return {
      basis: 'Current personnel records filtered by status; assignments are not double-counted.',
      status,
      total: personnel.length,
      byUnit,
      byRank,
      byUnitAndRank
    };
  }

  async getAuthorizedStrengths({ reportType = null, asOfDate = null } = {}) {
    if (this.isSupabaseConnected()) {
      try {
        let query = supabase.from('authorized_strengths').select('*').order('unitKey').order('rankKey');
        if (reportType) query = query.eq('reportType', reportType);
        if (asOfDate) query = query.or(`asOfDate.is.null,asOfDate.lte.${asOfDate}`);
        const { data, error } = await query;
        if (!error && Array.isArray(data)) return data;
      } catch (error) { console.warn('Authorized strength lookup unavailable:', error.message); }
    }
    return this.inMemoryAuthorizedStrengths.filter(item =>
      (!reportType || item.reportType === reportType) && (!asOfDate || !item.asOfDate || item.asOfDate <= asOfDate)
    );
  }

  async upsertAuthorizedStrengths(records = [], actor = null) {
    const normalized = records.map(item => ({
      id: item.id || `authorized-${item.reportType}-${item.unitKey || ''}-${item.rankKey || ''}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
      reportType: String(item.reportType || '').trim(),
      unitKey: String(item.unitKey || '').trim(),
      rankKey: String(item.rankKey || '').trim(),
      authorizedStrength: Math.max(0, Math.trunc(Number(item.authorizedStrength))),
      asOfDate: item.asOfDate || null,
      updatedBy: actor || item.updatedBy || null,
      updatedAt: new Date().toISOString()
    }));
    if (normalized.some(item => !item.reportType || !Number.isFinite(item.authorizedStrength))) throw new Error('Each authorized-strength record requires reportType and a numeric authorizedStrength.');
    if (this.isSupabaseConnected()) {
      const { data, error } = await supabase.from('authorized_strengths').upsert(normalized, { onConflict: 'reportType,unitKey,rankKey' }).select();
      if (error) throw new Error(`Authorized strength update failed: ${error.message}`);
      return data || normalized;
    }
    normalized.forEach(record => {
      const index = this.inMemoryAuthorizedStrengths.findIndex(item => item.reportType === record.reportType && item.unitKey === record.unitKey && item.rankKey === record.rankKey);
      if (index === -1) this.inMemoryAuthorizedStrengths.push(record);
      else this.inMemoryAuthorizedStrengths[index] = { ...this.inMemoryAuthorizedStrengths[index], ...record };
    });
    return normalized;
  }
}

export const db = new PAISRepository();
