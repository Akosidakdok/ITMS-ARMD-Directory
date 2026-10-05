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

const POSTING_ORDER_CODES = new Set(['DES', 'TDS', 'DO', 'DOX', 'RA', 'UA', 'AO']);
const ASSIGNMENT_UNIT_CATEGORIES = new Set(['ITMS HQ', 'Command Group', 'P-Staff', 'DIPO/APC', 'D-Staff', 'NOSU', 'NASU', 'PRO']);

function manilaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function previousDate(date) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

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
    this.inMemoryDocuments = [];
    this.inMemoryDocumentTemplates = [];
    this.inMemoryDocumentVersions = [];
  }

  isSupabaseConnected() {
    return isSupabaseAvailable();
  }

  // ================= PERSONNEL CRUD =================
  normalizePersonnelRecord(p) {
    if (!p) return p;
    const sub_unit = p.sub_unit || p.officeDivision || p.division || '';
    const details = p.details || p.detail || '';
    const station = p.station || '';
    const detectedCategory = getRankCategoryBackend(p.rank);
    const rankCategory = (detectedCategory === 'PCO' || detectedCategory === 'NUP')
      ? detectedCategory
      : (p.rankCategory || detectedCategory);
    const positionCategory = p.positionCategory || 'Main';
    const unitCategory = p.unitCategory || p.unit || 'ITMS HQ';
    const subUnitCategory = p.subUnitCategory || 'Division';
    const birthdate = p.birthdate || p.birthday || '';
    const qualification = p.qualification || p.qualifier || '';
    const desUp = p.desUp || p.dateOfEntry || p.dateEnteredService || p.date_entered_service || '';
    const badgeNo = p.badgeNo || p.badge_number || '';
    const status = p.status || p.pstatus || 'Active';
    const contactNumber = p.contactNumber || p.phone_number || '';
    const firstName = p.firstName || p.first_name || '';
    const lastName = p.lastName || p.last_name || '';
    const middleName = p.middleName || p.middle_name || '';
    const designationDate = p.designationDate || p.designation_date || '';
    const lastPromotionDate = p.lastPromotionDate || p.last_promotion_date || '';
    const enterInOfficerPositionDate = p.enterInOfficerPositionDate || p.dateOfOfficershipOrCommission || p.date_of_officership_or_commission || '';
    const unit = p.unit || unitCategory;
    const fullName = p.fullName || [firstName, middleName, lastName].filter(Boolean).join(' ') || `${firstName} ${lastName}`.trim();

    return {
      ...p,
      fullName,
      firstName,
      first_name: firstName,
      lastName,
      last_name: lastName,
      middleName,
      middle_name: middleName,
      badgeNo,
      badge_number: badgeNo,
      rankCategory,
      positionCategory,
      unitCategory,
      subUnitCategory,
      unit,
      unitCode: p.unitCode || p.unit_code || '',
      unit_code: p.unit_code || p.unitCode || '',
      sub_unit,
      subUnitCode: p.subUnitCode || p.sub_unit_code || '',
      sub_unit_code: p.sub_unit_code || p.subUnitCode || '',
      stationCode: p.stationCode || p.station_code || '',
      station_code: p.station_code || p.stationCode || '',
      subStationCode: p.subStationCode || p.sub_station_code || '',
      sub_station_code: p.sub_station_code || p.subStationCode || '',
      subStation: p.subStation || p.sub_station || '',
      sub_station: p.sub_station || p.subStation || '',
      details,
      station,
      division: sub_unit,
      officeDivision: sub_unit,
      detail: details,
      birthdate,
      birthday: birthdate,
      qualification,
      qualifier: qualification,
      desUp,
      dateOfEntry: desUp,
      dateEnteredService: desUp,
      date_entered_service: desUp,
      designationDate,
      designation_date: designationDate,
      lastPromotionDate,
      last_promotion_date: lastPromotionDate,
      enterInOfficerPositionDate,
      dateOfOfficershipOrCommission: enterInOfficerPositionDate,
      date_of_officership_or_commission: enterInOfficerPositionDate,
      status,
      pstatus: status,
      pstatusDate: p.pstatusDate || p.pstatus_date || '',
      pstatus_date: p.pstatus_date || p.pstatusDate || '',
      rankStatus: p.rankStatus || p.rank_status || '',
      rank_status: p.rank_status || p.rankStatus || '',
      sourceOfCommissionship: p.sourceOfCommissionship || p.source_of_commissionship || '',
      source_of_commissionship: p.source_of_commissionship || p.sourceOfCommissionship || '',
      civilStatus: p.civilStatus || p.civil_status || '',
      civil_status: p.civil_status || p.civilStatus || '',
      religion: p.religion || '',
      email: p.email || '',
      contactNumber,
      phone_number: contactNumber,
      tin: p.tin || '',
      gsisNumber: p.gsisNumber || p.gsis_number || '',
      gsis_number: p.gsis_number || p.gsisNumber || '',
      philHealthNo: p.philHealthNo || p.phil_health_no || '',
      phil_health_no: p.phil_health_no || p.philHealthNo || '',
      pagibigNo: p.pagibigNo || p.pagibig_no || '',
      pagibig_no: p.pagibig_no || p.pagibigNo || ''
    };
  }

  sanitizePersonnelPayload(data) {
    if (!data) return data;
    const sub_unit = data.sub_unit !== undefined ? data.sub_unit : (data.officeDivision || data.division || '');
    const details = data.details !== undefined ? data.details : (data.detail || '');
    const station = data.station !== undefined ? data.station : '';
    const detectedCategory = getRankCategoryBackend(data.rank);
    const rankCategory = (detectedCategory === 'PCO' || detectedCategory === 'NUP')
      ? detectedCategory
      : (data.rankCategory || detectedCategory);
    const positionCategory = data.positionCategory || 'Main';
    const unitCategory = data.unitCategory || data.unit || 'ITMS HQ';
    const subUnitCategory = data.subUnitCategory || 'Division';
    const birthdate = data.birthdate !== undefined ? data.birthdate : (data.birthday || '');
    const qualification = data.qualification !== undefined ? data.qualification : (data.qualifier || '');
    const desUp = data.desUp !== undefined ? data.desUp : (data.dateOfEntry || data.dateEnteredService || data.date_entered_service || '');
    const badgeNo = data.badgeNo !== undefined ? data.badgeNo : (data.badge_number || '');
    const status = data.status !== undefined ? data.status : (data.pstatus || 'Active');
    const contactNumber = data.contactNumber !== undefined ? data.contactNumber : (data.phone_number || '');
    const firstName = data.firstName !== undefined ? data.firstName : (data.first_name || '');
    const lastName = data.lastName !== undefined ? data.lastName : (data.last_name || '');
    const middleName = data.middleName !== undefined ? data.middleName : (data.middle_name || '');
    const designationDate = data.designationDate !== undefined ? data.designationDate : (data.designation_date || '');
    const lastPromotionDate = data.lastPromotionDate !== undefined ? data.lastPromotionDate : (data.last_promotion_date || '');
    const enterInOfficerPositionDate = data.enterInOfficerPositionDate !== undefined ? data.enterInOfficerPositionDate : (data.dateOfOfficershipOrCommission || data.date_of_officership_or_commission || '');
    const unit = data.unit !== undefined ? data.unit : unitCategory;
    const fullName = data.fullName || [firstName, middleName, lastName].filter(Boolean).join(' ') || `${firstName} ${lastName}`.trim();

    return {
      ...data,
      fullName,
      firstName,
      first_name: firstName,
      lastName,
      last_name: lastName,
      middleName,
      middle_name: middleName,
      badgeNo,
      badge_number: badgeNo,
      rankCategory,
      positionCategory,
      unitCategory,
      subUnitCategory,
      unit,
      unitCode: data.unitCode || data.unit_code || '',
      unit_code: data.unit_code || data.unitCode || '',
      sub_unit,
      subUnitCode: data.subUnitCode || data.sub_unit_code || '',
      sub_unit_code: data.sub_unit_code || data.subUnitCode || '',
      stationCode: data.stationCode || data.station_code || '',
      station_code: data.station_code || data.stationCode || '',
      subStationCode: data.subStationCode || data.sub_station_code || '',
      sub_station_code: data.sub_station_code || data.subStationCode || '',
      subStation: data.subStation || data.sub_station || '',
      sub_station: data.sub_station || data.subStation || '',
      details,
      station,
      division: sub_unit,
      officeDivision: sub_unit,
      detail: details,
      birthdate,
      birthday: birthdate,
      qualification,
      qualifier: qualification,
      desUp,
      dateOfEntry: desUp,
      dateEnteredService: desUp,
      date_entered_service: desUp,
      designationDate,
      designation_date: designationDate,
      lastPromotionDate,
      last_promotion_date: lastPromotionDate,
      enterInOfficerPositionDate,
      dateOfOfficershipOrCommission: enterInOfficerPositionDate,
      date_of_officership_or_commission: enterInOfficerPositionDate,
      status,
      pstatus: status,
      pstatusDate: data.pstatusDate || data.pstatus_date || '',
      pstatus_date: data.pstatus_date || data.pstatusDate || '',
      rankStatus: data.rankStatus || data.rank_status || '',
      rank_status: data.rank_status || data.rankStatus || '',
      sourceOfCommissionship: data.sourceOfCommissionship || data.source_of_commissionship || '',
      source_of_commissionship: data.source_of_commissionship || data.sourceOfCommissionship || '',
      civilStatus: data.civilStatus || data.civil_status || '',
      civil_status: data.civil_status || data.civilStatus || '',
      religion: data.religion || '',
      email: data.email || '',
      contactNumber,
      phone_number: contactNumber,
      tin: data.tin || '',
      gsisNumber: data.gsisNumber || data.gsis_number || '',
      gsis_number: data.gsis_number || data.gsisNumber || '',
      philHealthNo: data.philHealthNo || data.phil_health_no || '',
      phil_health_no: data.phil_health_no || data.philHealthNo || '',
      pagibigNo: data.pagibigNo || data.pagibig_no || '',
      pagibig_no: data.pagibig_no || data.pagibigNo || ''
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

  toSupabasePersonnelPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const allowedColumns = new Set([
      'id',
      'firstName', 'first_name',
      'middleName', 'middle_name',
      'lastName', 'last_name',
      'fullName',
      'qualifier', 'qualification',
      'address', 'gender',
      'contactNumber', 'phone_number',
      'email',
      'birthday', 'birthdate', 'ageToDate',
      'dateOfEntry', 'desUp', 'date_entered_service', 'ageOfServiceToDate',
      'enterInOfficerPositionDate', 'date_of_officership_or_commission',
      'source_of_commissionship',
      'status', 'pstatus', 'pstatus_date',
      'rank', 'rankFullName', 'rankCategory', 'rank_status',
      'badgeNo', 'badge_number',
      'salaryGrade', 'plantilla',
      'positionCategory',
      'unit', 'unit_code', 'unitCategory',
      'officeDivision',
      'sub_unit', 'division', 'sub_unit_code', 'subUnitCategory',
      'station', 'station_code',
      'sub_station', 'sub_station_code',
      'details', 'detail',
      'designation', 'designationDate', 'designation_date',
      'effectiveDate',
      'lastPromotionDate', 'last_promotion_date',
      'civil_status', 'religion',
      'tin', 'gsis_number', 'phil_health_no', 'pagibig_no',
      'pnco', 'nup',
      'createdAt', 'updatedAt'
    ]);

    const result = {};
    for (const [key, value] of Object.entries(payload)) {
      if (allowedColumns.has(key) && value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  async createPersonnel(data) {
    const payload = this.coerceSalaryGradeForLegacyInt(this.sanitizePersonnelPayload(data));
    const newRecord = {
      id: payload.id || `pnp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...payload
    };

    if (this.isSupabaseConnected()) {
      const dbRecord = this.toSupabasePersonnelPayload(newRecord);
      let { data: inserted, error } = await supabase.from('personnel').insert([dbRecord]).select().single();
      if (error && error.code === '22P02') {
        const fallbackRecord = this.coerceSalaryGradeForLegacyInt(dbRecord);
        const retry = await supabase.from('personnel').insert([fallbackRecord]).select().single();
        if (!retry.error) {
          inserted = retry.data;
          error = null;
        }
      }
      if (error) throw new Error(`Personnel insert failed: ${error.message}`);
      return this.normalizePersonnelRecord({ ...newRecord, ...inserted });
    }
    this.inMemoryPersonnel.unshift(newRecord);
    return this.normalizePersonnelRecord(newRecord);
  }

  async createPersonnelBulk(records) {
    if (!Array.isArray(records) || records.length === 0) return [];
    const payloads = records.map((r, index) => {
      const sanitized = this.sanitizePersonnelPayload(r);
      const withId = {
        id: r.id || sanitized.id || `pnp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`,
        ...sanitized
      };
      return this.coerceSalaryGradeForLegacyInt(withId);
    });

    if (this.isSupabaseConnected()) {
      const dbPayloads = payloads.map(p => this.toSupabasePersonnelPayload(p));
      let { data: inserted, error } = await supabase
        .from('personnel')
        .insert(dbPayloads)
        .select();

      if (error && error.code === '22P02') {
        const fallbackPayloads = dbPayloads.map(p => this.coerceSalaryGradeForLegacyInt(p));
        const retry = await supabase
          .from('personnel')
          .insert(fallbackPayloads)
          .select();
        if (!retry.error) {
          inserted = retry.data;
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
    const payload = this.coerceSalaryGradeForLegacyInt(this.sanitizePersonnelPayload(data));
    if (this.isSupabaseConnected()) {
      const dbPayload = this.toSupabasePersonnelPayload(payload);
      delete dbPayload.id;
      let { data: updated, error } = await supabase.from('personnel').update(dbPayload).eq('id', id).select().single();
      if (error && error.code === '22P02') {
        const fallbackPayload = this.coerceSalaryGradeForLegacyInt(dbPayload);
        const retry = await supabase.from('personnel').update(fallbackPayload).eq('id', id).select().single();
        if (!retry.error) {
          updated = retry.data;
          error = null;
        }
      }
      if (error) throw new Error(`Personnel update failed: ${error.message}`);
      return this.normalizePersonnelRecord({ ...payload, ...updated });
    }
    const index = this.inMemoryPersonnel.findIndex(p => p.id === id);
    if (index !== -1) {
      this.inMemoryPersonnel[index] = { ...this.inMemoryPersonnel[index], ...payload };
      return this.normalizePersonnelRecord(this.inMemoryPersonnel[index]);
    }
    return null;
  }

  async deletePersonnel(id) {
    if (this.isSupabaseConnected()) {
      const { data: deleted, error } = await supabase.from('personnel').delete().eq('id', id).select('id');
      if (error) throw new Error(`Personnel delete failed: ${error.message}`);
      return Array.isArray(deleted) && deleted.length > 0;
    }
    const index = this.inMemoryPersonnel.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.inMemoryPersonnel.splice(index, 1);
    return true;
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
        if (!error && Array.isArray(data)) return data.filter(o => !o.isDeleted);
      } catch (e) {}
    }
    return this.inMemoryOrders.filter(o => !o.isDeleted);
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
      id: data.id || `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    const existing = await this.getOrderById(id);
    if (!existing) return false;
    const deletedAt = new Date().toISOString();
    const update = { isDeleted: true, deletedAt };

    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
        if (!error && data) return true;
      } catch (e) {}

      // Fallback: If soft-delete columns (isDeleted/deletedAt) are not present in Supabase,
      // perform a hard delete and remove associated order status history
      try {
        const { error: delError } = await supabase.from('orders').delete().eq('id', id);
        if (!delError) {
          try {
            await supabase.from('order_status_history').delete().eq('orderId', id);
          } catch (ignored) {}
          return true;
        }
      } catch (e) {}
    }

    const index = this.inMemoryOrders.findIndex(o => o.id === id);
    if (index === -1) return false;
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...update };
    return true;
  }

  async restoreRevokedOrder(id, { actor = 'system', reason = '' } = {}) {
    const existing = await this.getOrderById(id);
    if (!existing) return null;

    const isSoftDeleted = Boolean(existing.isDeleted);
    const fromStatus = normalizeOrderStatus(existing);
    if (!isSoftDeleted && fromStatus !== 'Revoked') {
      throw new Error('Only revoked or deleted orders can be restored.');
    }

    const history = await this.getOrderStatusHistory(id);
    const revokeEvent = history.find(event =>
      event.toStatus === 'Revoked' &&
      ['Draft', 'For Approval', 'Signed', 'Released'].includes(event.fromStatus)
    );
    const targetStatus = revokeEvent?.fromStatus || (fromStatus === 'Revoked' ? 'For Approval' : fromStatus);
    const changedAt = new Date().toISOString();
    const statusUpdate = {
      documentStatus: targetStatus,
      status: targetStatus,
      updatedAt: changedAt
    };
    if (existing.isDeleted !== undefined) {
      statusUpdate.isDeleted = false;
      statusUpdate.deletedAt = null;
    }

    if (this.isSupabaseConnected()) {
      let { data, error } = await supabase
        .from('orders')
        .update(statusUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error && error.code === 'PGRST204' && (statusUpdate.isDeleted !== undefined || statusUpdate.deletedAt !== undefined)) {
        const retryUpdate = {
          documentStatus: targetStatus,
          status: targetStatus,
          updatedAt: changedAt
        };
        const retryResult = await supabase
          .from('orders')
          .update(retryUpdate)
          .eq('id', id)
          .select()
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }
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
      return targetStatus === 'Released' ? this.applyReleasedOrderEffects(data, actor) : data;
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
    return targetStatus === 'Released'
      ? this.applyReleasedOrderEffects(this.inMemoryOrders[index], actor)
      : this.inMemoryOrders[index];
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
    const retryingPostingEffects = fromStatus === toStatus && ['Released', 'Revoked'].includes(toStatus);
    if (fromStatus === toStatus && !retryingPostingEffects) return existing;
    if (!retryingPostingEffects && fromStatus !== toStatus) assertOrderStatusTransition(fromStatus, toStatus);
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
    if (retryingPostingEffects) {
      updated = existing;
    } else if (this.isSupabaseConnected()) {
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
    } else {
      const index = this.inMemoryOrders.findIndex(order => order.id === id);
      if (index === -1) return null;
      this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...statusUpdate };
      updated = this.inMemoryOrders[index];
      this.inMemoryOrderStatusHistory.push({
        id: `osh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        orderId: id,
        fromStatus,
        toStatus,
        reason: String(reason || '').trim() || null,
        changedBy: actor,
        changedAt
      });
    }

    if (toStatus === 'Released') {
      return this.applyReleasedOrderEffects(updated, actor);
    }
    if (toStatus === 'Revoked') {
      return this.reverseOrderAssignmentEffects(updated, actor);
    }
    return updated;
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
  async readAssignmentsRaw(personnelId = null) {
    if (this.isSupabaseConnected()) {
      let query = supabase.from('assignments').select('*');
      if (personnelId) query = query.eq('personnelId', personnelId);
      const { data, error } = await query;
      if (error) throw new Error(`Assignment lookup failed: ${error.message}`);
      return data || [];
    }
    return personnelId
      ? this.inMemoryAssignments.filter(assignment => assignment.personnelId === personnelId)
      : [...this.inMemoryAssignments];
  }

  async persistAssignmentPatch(id, patch) {
    const update = { ...patch, updatedAt: new Date().toISOString() };
    if (this.isSupabaseConnected()) {
      const { data, error } = await supabase.from('assignments').update(update).eq('id', id).select().single();
      if (error || !data) throw new Error(`Assignment update failed: ${error?.message || 'Assignment not found'}`);
      return data;
    }
    const index = this.inMemoryAssignments.findIndex(assignment => assignment.id === id);
    if (index === -1) return null;
    this.inMemoryAssignments[index] = { ...this.inMemoryAssignments[index], ...update };
    return this.inMemoryAssignments[index];
  }

  async setOrderAssignmentEffectStatus(order, status, message = '') {
    const statusPatch = {
      assignmentEffectStatus: status,
      assignmentEffectMessage: message || null,
      assignmentEffectsAppliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (this.isSupabaseConnected()) {
      const { data, error } = await supabase.from('orders').update(statusPatch).eq('id', order.id).select().single();
      if (error || !data) throw new Error(`Order assignment-effect status update failed: ${error?.message || 'Order not found'}`);
      return data;
    }
    const index = this.inMemoryOrders.findIndex(item => item.id === order.id);
    if (index === -1) return { ...order, ...statusPatch };
    this.inMemoryOrders[index] = { ...this.inMemoryOrders[index], ...statusPatch };
    return this.inMemoryOrders[index];
  }

  orderEffectEvent(assignment, event) {
    const history = Array.isArray(assignment.orderEffectHistory) ? assignment.orderEffectHistory : [];
    return [...history, { ...event, changedAt: new Date().toISOString() }];
  }

  async activateOrderDrivenAssignment(assignment, order, effectiveDate) {
    if (!assignment || (assignment.positionCategory && assignment.positionCategory !== 'Main')) {
      return assignment;
    }
    const priorRows = await this.readAssignmentsRaw(assignment.personnelId);
    for (const prior of priorRows.filter(row => row.id !== assignment.id && row.status === 'Current' && (!row.positionCategory || row.positionCategory === 'Main'))) {
      const endDate = previousDate(effectiveDate);
      await this.persistAssignmentPatch(prior.id, {
        status: 'Completed', endDate, endedByOrderId: order.id,
        orderEffectHistory: this.orderEffectEvent(prior, {
          orderId: order.id, action: 'superseded', effectiveDate,
          before: { status: prior.status, endDate: prior.endDate || null, endedByOrderId: prior.endedByOrderId || null },
          after: { status: 'Completed', endDate, endedByOrderId: order.id }
        })
      });
    }
    const current = await this.persistAssignmentPatch(assignment.id, { status: 'Current' });
    if (current) await this.syncPersonnelFromAssignment(current);
    return current;
  }

  async getAssignments(personnelId = null) {
    const all = await this.readAssignmentsRaw();
    const rows = await this.reconcileAssignmentDates(all);
    return personnelId ? rows.filter(assignment => assignment.personnelId === personnelId) : rows;
  }

  async createOrderDrivenAssignment(order, person, data, effectType) {
    const effectiveDate = String(data.startDate || order.effectiveDate || order.issuedDate || manilaDate()).slice(0, 10);
    const status = effectiveDate > manilaDate() ? 'Scheduled' : 'Current';
    const isMain = (data.positionCategory || 'Main') === 'Main';
    const assignmentId = `asg-order-${encodeURIComponent(order.id)}-${encodeURIComponent(person.id)}`;
    const existing = (await this.readAssignmentsRaw(person.id)).find(row => row.id === assignmentId || row.orderId === order.id);
    if (existing) {
      if (existing.revokedByOrderId === order.id) {
        const revokeEvents = (existing.orderEffectHistory || []).filter(event => event.orderId === order.id && event.action === 'revoked');
        const revokeEvent = revokeEvents[revokeEvents.length - 1];
        const before = revokeEvent?.before || {};
        const currentRows = await this.readAssignmentsRaw(person.id);
        const previouslySuperseded = row => (row.orderEffectHistory || []).some(event => event.orderId === order.id && event.action === 'superseded');
        const rowDate = row => String(row.effectiveDate || row.startDate || '').slice(0, 10);
        const laterCurrent = currentRows.some(row => row.id !== existing.id && row.status === 'Current' && (!row.positionCategory || row.positionCategory === 'Main') && !previouslySuperseded(row) && rowDate(row) > effectiveDate);
        const priorCurrent = currentRows.filter(row => row.id !== existing.id && row.status === 'Current' && (!row.positionCategory || row.positionCategory === 'Main') && (previouslySuperseded(row) || !rowDate(row) || rowDate(row) <= effectiveDate));
        let restoredStatus = before.status;
        if (['Current', 'Scheduled'].includes(before.status)) {
          restoredStatus = effectiveDate > manilaDate() ? 'Scheduled' : (laterCurrent ? 'Completed' : 'Current');
        }
        if (restoredStatus === 'Current') {
          for (const prior of priorCurrent) {
            await this.persistAssignmentPatch(prior.id, {
              status: 'Completed', endDate: previousDate(effectiveDate), endedByOrderId: order.id,
              orderEffectHistory: this.orderEffectEvent(prior, {
                orderId: order.id, action: 'superseded', effectiveDate,
                before: { status: prior.status, endDate: prior.endDate || null, endedByOrderId: prior.endedByOrderId || null },
                after: { status: 'Completed', endDate: previousDate(effectiveDate), endedByOrderId: order.id }
              })
            });
          }
        }
        const restored = await this.persistAssignmentPatch(existing.id, {
          status: restoredStatus || existing.status,
          endDate: before.endDate || data.endDate || null,
          revokedByOrderId: null,
          orderEffectHistory: this.orderEffectEvent(existing, {
            orderId: order.id, action: 'reapplied', effectiveDate,
            before: { status: existing.status }, after: { status: restoredStatus }, effectType
          })
        });
        if (restored?.status === 'Current') await this.syncPersonnelFromAssignment(restored);
        return restored;
      }
      if (isMain && status === 'Current' && ['Current', 'Scheduled'].includes(existing.status)) {
        return this.activateOrderDrivenAssignment(existing, order, effectiveDate);
      }
      return existing;
    }

    const assignment = {
      id: assignmentId,
      personnelId: person.id,
      positionCategory: data.positionCategory || 'Main',
      unitCategory: data.unitCategory || person.unitCategory || 'ITMS HQ',
      subUnitCategory: data.subUnitCategory || person.subUnitCategory || 'Division',
      sub_unit: data.sub_unit ?? person.sub_unit ?? person.division ?? '',
      details: data.details || '',
      station: data.station || person.station || '',
      region: data.region || '',
      unit: data.unit || data.unitCategory || person.unitCategory || 'ITMS HQ',
      position: data.position || 'Assignment',
      orderRef: order.orderNumber || order.orderNo || order.id,
      orderId: order.id,
      relatedOrderIds: [order.id],
      designationDate: order.issuedDate || '',
      effectiveDate,
      startDate: effectiveDate,
      endDate: data.endDate || undefined,
      // Stage a due main posting so the prior current posting is closed before
      // this one becomes Current. A retry can safely finish activation.
      status: status === 'Current' && isMain ? 'Scheduled' : status,
      remarks: data.remarks || '',
      orderEffectHistory: [{
        orderId: order.id, action: 'created', effectType, effectiveDate,
        before: null, after: { status, startDate: effectiveDate }, changedAt: new Date().toISOString()
      }]
    };
    if (this.isSupabaseConnected()) {
      const { data: inserted, error } = await supabase.from('assignments').insert([assignment]).select().single();
      if (error || !inserted) {
        const raced = (await this.readAssignmentsRaw(person.id)).find(row => row.id === assignmentId || row.orderId === order.id);
        if (raced) return raced;
        throw new Error(`Order assignment creation failed: ${error?.message || 'No assignment returned'}`);
      }
      if (status === 'Current' && isMain) return this.activateOrderDrivenAssignment(inserted, order, effectiveDate);
      if (status === 'Current') await this.syncPersonnelFromAssignment(inserted);
      return inserted;
    }
    this.inMemoryAssignments.unshift(assignment);
    if (status === 'Current' && isMain) return this.activateOrderDrivenAssignment(assignment, order, effectiveDate);
    if (status === 'Current') await this.syncPersonnelFromAssignment(assignment);
    return assignment;
  }

  async reconcileAssignmentDates(assignments) {
    const today = manilaDate();
    const changedPeople = new Set();
    let rows = assignments;
    const dueAssignments = rows
      .filter(row => row.status === 'Scheduled' && (row.effectiveDate || row.startDate) <= today)
      .sort((a, b) => String(a.effectiveDate || a.startDate).localeCompare(String(b.effectiveDate || b.startDate)) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    for (const scheduled of dueAssignments) {
      const effectiveDate = scheduled.effectiveDate || scheduled.startDate;
      if (!scheduled.positionCategory || scheduled.positionCategory === 'Main') {
        const priorRows = rows.filter(row => row.personnelId === scheduled.personnelId && row.id !== scheduled.id && row.status === 'Current' && (!row.positionCategory || row.positionCategory === 'Main'));
        for (const prior of priorRows) {
          const endDate = previousDate(effectiveDate);
          await this.persistAssignmentPatch(prior.id, {
            status: 'Completed', endDate, endedByOrderId: scheduled.orderId || null,
            ...(scheduled.orderId ? { orderEffectHistory: this.orderEffectEvent(prior, {
              orderId: scheduled.orderId, action: 'superseded', effectiveDate,
              before: { status: prior.status, endDate: prior.endDate || null, endedByOrderId: prior.endedByOrderId || null },
              after: { status: 'Completed', endDate, endedByOrderId: scheduled.orderId }
            }) } : {})
          });
        }
      }
      await this.persistAssignmentPatch(scheduled.id, { status: 'Current' });
      if (!scheduled.positionCategory || scheduled.positionCategory === 'Main') changedPeople.add(scheduled.personnelId);
      rows = await this.readAssignmentsRaw();
    }
    for (const expired of rows.filter(row => row.status === 'Current' && row.endDate && row.endDate < today)) {
      await this.persistAssignmentPatch(expired.id, { status: expired.terminationOrderId ? 'Terminated' : 'Completed' });
      if (!expired.positionCategory || expired.positionCategory === 'Main') changedPeople.add(expired.personnelId);
    }
    for (const personnelId of changedPeople) {
      const current = (await this.readAssignmentsRaw(personnelId)).find(row => row.status === 'Current' && (!row.positionCategory || row.positionCategory === 'Main'));
      if (current) await this.syncPersonnelFromAssignment(current);
    }
    return changedPeople.size ? this.readAssignmentsRaw() : assignments;
  }

  async applyReleasedOrderEffects(order, actor = 'system') {
    const code = String(order.purposeCode || '').trim().toUpperCase();
    if (!POSTING_ORDER_CODES.has(code)) {
      return this.setOrderAssignmentEffectStatus(order, 'Not applicable', 'This order purpose does not change assignment postings.');
    }

    const involvement = Array.isArray(order.personnelInvolvement) && order.personnelInvolvement.length
      ? order.personnelInvolvement.filter(item => item.role === 'affected')
      : (order.personnelIds || []).map(personnelId => ({ personnelId, role: 'affected' }));
    const personnelIds = [...new Set(involvement.map(item => item.personnelId).filter(Boolean))];
    if (!personnelIds.length) {
      return this.setOrderAssignmentEffectStatus(order, 'Needs review', 'No affected personnel are linked to this posting order.');
    }

    const today = manilaDate();
    const effectiveDate = String(order.effectiveDate || order.issuedDate || today).slice(0, 10);
    const purpose = order.purposeData || {};
    const reviewItems = [];
    for (const personnelId of personnelIds) {
      const person = await this.getPersonnelById(personnelId);
      if (!person) { reviewItems.push(`Personnel ${personnelId} was not found`); continue; }
      const records = await this.readAssignmentsRaw(personnelId);
      const currentMain = records.find(row => row.status === 'Current' && (!row.positionCategory || row.positionCategory === 'Main'));

      if (code === 'TDS') {
        const priorTermination = records.find(row => row.terminationOrderId === order.id ||
          (Array.isArray(row.orderEffectHistory) && row.orderEffectHistory.some(event => event.orderId === order.id && ['termination', 'termination-reversed'].includes(event.action))));
        const priorTerminationEvents = priorTermination?.orderEffectHistory?.filter(event => event.orderId === order.id && ['termination', 'termination-reversed'].includes(event.action)) || [];
        const latestTerminationEvent = priorTerminationEvents[priorTerminationEvents.length - 1];
        if (latestTerminationEvent?.action === 'termination' && priorTermination?.terminationOrderId === order.id) continue;
        const target = priorTermination || currentMain;
        if (!target || target.status !== 'Current' || (priorTermination && currentMain?.id !== priorTermination.id)) {
          reviewItems.push(`${person.fullName || personnelId}: no unchanged current main posting to terminate`);
          continue;
        }
        const terminationDate = effectiveDate;
        const terminatedNow = terminationDate <= today;
        await this.persistAssignmentPatch(target.id, {
          endDate: terminationDate,
          terminationOrderId: order.id,
          endedByOrderId: order.id,
          relatedOrderIds: [...new Set([...(target.relatedOrderIds || []), order.id])],
          ...(terminatedNow ? { status: 'Terminated' } : {}),
          orderEffectHistory: this.orderEffectEvent(target, {
            orderId: order.id, action: 'termination', effectiveDate: terminationDate,
            before: { status: target.status, endDate: target.endDate || null, terminationOrderId: target.terminationOrderId || null, endedByOrderId: target.endedByOrderId || null },
            after: { status: terminatedNow ? 'Terminated' : 'Current', endDate: terminationDate, terminationOrderId: order.id }
          })
        });
        if (terminatedNow) await this.syncPersonnelFromAssignment({ ...target, status: 'Terminated' });
        continue;
      }

      if (code === 'DOX') {
        const originalRef = String(purpose.originalDetailOrder || '').trim().toLowerCase();
        const originalOrders = (await this.getOrders()).filter(item =>
          String(item.id || '').trim().toLowerCase() === originalRef ||
          String(item.orderNumber || item.orderNo || '').trim().toLowerCase() === originalRef
        );
        if (originalOrders.length !== 1) { reviewItems.push(`${person.fullName || personnelId}: original detail order is unmatched or ambiguous`); continue; }
        const candidates = records.filter(row => row.orderId === originalOrders[0].id || String(row.orderRef || '').trim().toLowerCase() === originalRef);
        if (candidates.length !== 1) { reviewItems.push(`${person.fullName || personnelId}: original detail assignment is unmatched or ambiguous`); continue; }
        const target = candidates[0];
        const extensionEndDate = String(purpose.extensionEndDate || '').slice(0, 10);
        if (!extensionEndDate) { reviewItems.push(`${person.fullName || personnelId}: extension end date is missing`); continue; }
        const targetEvents = (target.orderEffectHistory || []).filter(event => event.orderId === order.id && ['extension', 'extension-reversed'].includes(event.action));
        const latestTargetEvent = targetEvents[targetEvents.length - 1];
        if (latestTargetEvent?.action === 'extension') {
          if (target.endDate === latestTargetEvent.after?.endDate) continue;
          reviewItems.push(`${person.fullName || personnelId}: the detail end date changed after this extension`);
          continue;
        }
        await this.persistAssignmentPatch(target.id, {
          endDate: extensionEndDate,
          relatedOrderIds: [...new Set([...(target.relatedOrderIds || []), order.id])],
          orderEffectHistory: this.orderEffectEvent(target, {
            orderId: order.id, action: 'extension', effectiveDate,
            before: { endDate: target.endDate || null }, after: { endDate: extensionEndDate }
          })
        });
        continue;
      }

      if (records.filter(row => row.orderId === order.id).length > 1) {
        reviewItems.push(`${person.fullName || personnelId}: multiple assignments are already linked to this order`);
        continue;
      }

      const rawTarget = String(purpose.assignedUnit || purpose.toUnit || purpose.toSubUnit || purpose.detailLocation || '').trim();
      const targetIsUnitCategory = ASSIGNMENT_UNIT_CATEGORIES.has(rawTarget);
      let assignmentData;
      if (code === 'DO') {
        assignmentData = {
          positionCategory: 'In Addition/Concurrent',
          unitCategory: person.unitCategory || 'ITMS HQ',
          subUnitCategory: person.subUnitCategory || 'Division',
          sub_unit: person.sub_unit || person.division || '',
          unit: person.unit || person.unitCategory || 'ITMS HQ',
          position: 'Detail', details: rawTarget,
          startDate: String(purpose.detailStartDate || effectiveDate).slice(0, 10),
          endDate: purpose.detailEndDate ? String(purpose.detailEndDate).slice(0, 10) : undefined
        };
      } else if (code === 'RA') {
        if (!currentMain) { reviewItems.push(`${person.fullName || personnelId}: no current main posting to reassign`); continue; }
        const toSubUnit = String(purpose.toSubUnit || '').trim();
        assignmentData = {
          ...currentMain, id: undefined, status: undefined,
          sub_unit: toSubUnit,
          unit: [currentMain.unitCategory || person.unitCategory || 'ITMS HQ', toSubUnit].filter(Boolean).join(' - '),
          startDate: effectiveDate
        };
      } else if (code === 'UA') {
        if (!currentMain) { reviewItems.push(`${person.fullName || personnelId}: no current main posting to reassign`); continue; }
        const toUnit = String(purpose.toUnit || '').trim();
        assignmentData = { ...currentMain, id: undefined, status: undefined, unitCategory: toUnit || currentMain.unitCategory, unit: toUnit || currentMain.unit, startDate: effectiveDate };
      } else {
        const isDesignation = code === 'DES';
        const assignedUnit = String(purpose.assignedUnit || '').trim();
        assignmentData = {
          positionCategory: 'Main',
          unitCategory: targetIsUnitCategory ? rawTarget : (person.unitCategory || 'ITMS HQ'),
          subUnitCategory: person.subUnitCategory || 'Division',
          sub_unit: assignedUnit && !targetIsUnitCategory ? assignedUnit : (person.sub_unit || person.division || ''),
          unit: assignedUnit || person.unit || person.unitCategory || 'ITMS HQ',
          position: String(isDesignation ? purpose.designation || '' : purpose.position || '').trim(),
          details: person.details || '', station: person.station || '', startDate: effectiveDate
        };
      }
      const linkedAssignment = await this.createOrderDrivenAssignment(order, person, assignmentData, code);
      const expectedStatus = String(assignmentData.startDate || effectiveDate).slice(0, 10) > today ? 'Scheduled' : 'Current';
      if (linkedAssignment?.status !== expectedStatus) {
        reviewItems.push(`${person.fullName || personnelId}: a later posting already changed this assignment`);
      }
    }

    const status = reviewItems.length ? 'Needs review' : 'Applied';
    const message = reviewItems.length
      ? `${reviewItems.length} posting effect${reviewItems.length === 1 ? '' : 's'} need review: ${reviewItems.join('; ')}`
      : `Posting effects applied for ${personnelIds.length} affected personnel by ${actor}.`;
    return this.setOrderAssignmentEffectStatus(order, status, message);
  }

  async reverseOrderAssignmentEffects(order, actor = 'system') {
    if (!POSTING_ORDER_CODES.has(String(order.purposeCode || '').trim().toUpperCase())) {
      return this.setOrderAssignmentEffectStatus(order, 'Not applicable', 'This order purpose does not change assignment postings.');
    }
    const rows = await this.readAssignmentsRaw();
    const today = manilaDate();
    const changedPeople = new Set();
    const eventsFor = row => (Array.isArray(row.orderEffectHistory) ? row.orderEffectHistory : []).filter(event => event.orderId === order.id);

    for (const row of rows.filter(item => item.orderId === order.id)) {
      const nextStatus = ['Current', 'Scheduled'].includes(row.status) ? 'Terminated' : row.status;
      await this.persistAssignmentPatch(row.id, {
        status: nextStatus,
        ...(nextStatus === 'Terminated' ? { endDate: today } : {}),
        revokedByOrderId: order.id,
        orderEffectHistory: this.orderEffectEvent(row, { orderId: order.id, action: 'revoked', before: { status: row.status, endDate: row.endDate || null }, after: { status: nextStatus, endDate: nextStatus === 'Terminated' ? today : row.endDate || null }, actor })
      });
      if (!row.positionCategory || row.positionCategory === 'Main') changedPeople.add(row.personnelId);
    }

    for (const row of rows) {
      if (row.orderId === order.id) continue;
      const history = eventsFor(row);
      if (!history.length) continue;
      const lastEvent = history[history.length - 1];
      if (lastEvent.action === 'termination' && row.terminationOrderId === order.id) {
        const laterCurrent = rows.some(item => item.personnelId === row.personnelId && item.id !== row.id && item.status === 'Current' && (!item.positionCategory || item.positionCategory === 'Main'));
        if (!laterCurrent) {
          const before = lastEvent.before || {};
          await this.persistAssignmentPatch(row.id, {
            status: before.status === 'Terminated' ? 'Current' : (before.status || 'Current'),
            endDate: before.endDate || null,
            terminationOrderId: before.terminationOrderId || null,
            endedByOrderId: before.endedByOrderId || null,
            revokedByOrderId: order.id,
            orderEffectHistory: this.orderEffectEvent(row, { orderId: order.id, action: 'termination-reversed', before: { status: row.status }, after: before, actor })
          });
          changedPeople.add(row.personnelId);
        }
      } else if (lastEvent.action === 'extension' && row.endDate === lastEvent.after?.endDate) {
        await this.persistAssignmentPatch(row.id, {
          endDate: lastEvent.before?.endDate || null,
          relatedOrderIds: (row.relatedOrderIds || []).filter(id => id !== order.id),
          revokedByOrderId: order.id,
          orderEffectHistory: this.orderEffectEvent(row, { orderId: order.id, action: 'extension-reversed', before: { endDate: row.endDate }, after: { endDate: lastEvent.before?.endDate || null }, actor })
        });
      }
    }

    let freshRows = await this.readAssignmentsRaw();
    for (const row of freshRows.filter(item => item.endedByOrderId === order.id)) {
      const laterCurrent = freshRows.some(item => item.personnelId === row.personnelId && item.id !== row.id && item.status === 'Current' && (!item.positionCategory || item.positionCategory === 'Main'));
      if (laterCurrent) continue;
      const event = eventsFor(row).find(item => item.action === 'superseded');
      const before = event?.before || {};
      await this.persistAssignmentPatch(row.id, {
        status: before.status || 'Current', endDate: before.endDate || null,
        endedByOrderId: before.endedByOrderId || null, revokedByOrderId: order.id,
        orderEffectHistory: this.orderEffectEvent(row, { orderId: order.id, action: 'superseded-reversed', before: { status: row.status, endDate: row.endDate || null }, after: before, actor })
      });
      changedPeople.add(row.personnelId);
      freshRows = await this.readAssignmentsRaw();
    }
    for (const personnelId of changedPeople) {
      const current = (await this.readAssignmentsRaw(personnelId)).find(item => item.status === 'Current' && (!item.positionCategory || item.positionCategory === 'Main'));
      if (current) await this.syncPersonnelFromAssignment(current);
    }
    return this.setOrderAssignmentEffectStatus(order, 'Reversed', 'Revocation recorded against linked assignment history.');
  }

  async getAssignmentById(id) {
    if (this.isSupabaseConnected()) {
      const { data, error } = await supabase.from('assignments').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Assignment lookup failed: ${error.message}`);
      return data || null;
    }
    return this.inMemoryAssignments.find(a => a.id === id) || null;
  }

  async syncPersonnelFromAssignment(assignment, isDeleted = false) {
    if (!assignment?.personnelId) return;
    if (assignment.positionCategory === 'In Addition/Concurrent') return;
    const personnelId = assignment.personnelId;

    if (isDeleted || assignment.status !== 'Current') {
      const all = await this.readAssignmentsRaw(personnelId);
      const remainingCurrent = all.find(a => a.id !== assignment.id && a.status === 'Current' && (!a.positionCategory || a.positionCategory === 'Main'));
      if (remainingCurrent) {
        await this.syncPersonnelFromAssignment(remainingCurrent, false);
      } else {
        const mostRecent = all
          .filter(a => a.id !== assignment.id && !['Scheduled', 'Terminated'].includes(a.status) && (!a.positionCategory || a.positionCategory === 'Main'))
          .sort((a, b) => (b.effectiveDate || b.startDate || '').localeCompare(a.effectiveDate || a.startDate || ''))[0];
        if (mostRecent) {
          const updates = {
            positionCategory: mostRecent.positionCategory || 'Main',
            unitCategory: mostRecent.unitCategory || 'ITMS HQ',
            subUnitCategory: mostRecent.subUnitCategory || 'Division',
            sub_unit: mostRecent.sub_unit || '',
            division: mostRecent.sub_unit || '',
            station: mostRecent.station || '',
            details: mostRecent.details || '',
            detail: mostRecent.details || '',
            designation: mostRecent.position || '',
            designationDate: mostRecent.designationDate || '',
            effectiveDate: mostRecent.effectiveDate || mostRecent.startDate || ''
          };
          await this.updatePersonnel(personnelId, updates).catch(() => {});
        }
      }
      return;
    }

    const updates = {
      positionCategory: assignment.positionCategory || 'Main',
      unitCategory: assignment.unitCategory || 'ITMS HQ',
      subUnitCategory: assignment.subUnitCategory || 'Division',
      sub_unit: assignment.sub_unit || '',
      division: assignment.sub_unit || '',
      station: assignment.station || '',
      details: assignment.details || '',
      detail: assignment.details || '',
      designation: assignment.position || '',
      designationDate: assignment.designationDate || '',
      effectiveDate: assignment.effectiveDate || assignment.startDate || ''
    };
    await this.updatePersonnel(personnelId, updates).catch(() => {});
  }

  async createAssignment(data) {
    const effectiveDate = String(data.effectiveDate || data.startDate || '').slice(0, 10);
    if ((data.status || 'Current') === 'Current' && effectiveDate && effectiveDate > manilaDate()) {
      data = { ...data, status: 'Scheduled' };
    }
    const isCurrent = (data.status || 'Current') === 'Current';
    const isMain = !data.positionCategory || data.positionCategory === 'Main';
    const stagedMainPosting = isCurrent && isMain && Boolean(data.personnelId);
    const newRecord = {
      id: data.id || `asg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      positionCategory: data.positionCategory || 'Main',
      unitCategory: data.unitCategory || 'ITMS HQ',
      subUnitCategory: data.subUnitCategory || 'Division',
      ...data,
      status: stagedMainPosting ? 'Scheduled' : (data.status || 'Current')
    };

    let inserted;
    if (this.isSupabaseConnected()) {
      const { data: saved, error } = await supabase.from('assignments').insert([newRecord]).select().single();
      if (error || !saved) throw new Error(`Assignment creation failed: ${error?.message || 'No assignment returned'}`);
      inserted = saved;
    } else {
      this.inMemoryAssignments.unshift(newRecord);
      inserted = newRecord;
    }

    if (stagedMainPosting) {
      const priorAssignments = await this.readAssignmentsRaw(data.personnelId);
      for (const prior of priorAssignments.filter(row => row.id !== inserted.id && row.status === 'Current' && (!row.positionCategory || row.positionCategory === 'Main'))) {
        const endDate = prior.endDate || previousDate(effectiveDate || manilaDate());
        await this.persistAssignmentPatch(prior.id, {
          status: 'Completed', endDate,
          ...(inserted.orderId ? {
            endedByOrderId: inserted.orderId,
            orderEffectHistory: this.orderEffectEvent(prior, {
              orderId: inserted.orderId, action: 'superseded', effectiveDate: effectiveDate || manilaDate(),
              before: { status: prior.status, endDate: prior.endDate || null, endedByOrderId: prior.endedByOrderId || null },
              after: { status: 'Completed', endDate, endedByOrderId: inserted.orderId }
            })
          } : {})
        });
      }
      inserted = await this.persistAssignmentPatch(inserted.id, { status: 'Current' });
    }

    if (inserted?.status === 'Current') {
      await this.syncPersonnelFromAssignment(inserted);
    }
    return inserted;
  }

  async updateAssignment(id, data, shouldSync = true) {
    const existing = await this.getAssignmentById(id);
    const effectiveDate = String(data.effectiveDate || data.startDate || existing?.effectiveDate || existing?.startDate || '').slice(0, 10);
    if ((data.status || existing?.status) === 'Current' && effectiveDate && effectiveDate > manilaDate()) {
      data = { ...data, status: 'Scheduled' };
    }
    const personnelId = data.personnelId || existing?.personnelId;
    const isCurrent = (data.status || existing?.status) === 'Current';
    const isMain = (data.positionCategory || existing?.positionCategory || 'Main') === 'Main';
    const stagedMainPosting = shouldSync && isCurrent && isMain && Boolean(personnelId);
    const updatePayload = stagedMainPosting ? { ...data, status: 'Scheduled' } : data;
    let updated;
    if (this.isSupabaseConnected()) {
      const { data: saved, error } = await supabase.from('assignments').update(updatePayload).eq('id', id).select().single();
      if (error || !saved) throw new Error(`Assignment update failed: ${error?.message || 'Assignment not found'}`);
      updated = saved;
    } else {
      const index = this.inMemoryAssignments.findIndex(a => a.id === id);
      if (index === -1) return null;
      this.inMemoryAssignments[index] = { ...this.inMemoryAssignments[index], ...updatePayload, id };
      updated = this.inMemoryAssignments[index];
    }

    if (stagedMainPosting) {
      const priorAssignments = await this.readAssignmentsRaw(personnelId);
      const activeUpdated = { ...updated, ...data };
      const effectiveStart = String(data.effectiveDate || data.startDate || existing?.effectiveDate || existing?.startDate || manilaDate()).slice(0, 10);
      for (const prior of priorAssignments.filter(row => row.id !== id && row.status === 'Current' && (!row.positionCategory || row.positionCategory === 'Main'))) {
        const endDate = prior.endDate || previousDate(effectiveStart);
        await this.persistAssignmentPatch(prior.id, {
          status: 'Completed', endDate,
          ...(activeUpdated.orderId ? {
            endedByOrderId: activeUpdated.orderId,
            orderEffectHistory: this.orderEffectEvent(prior, {
              orderId: activeUpdated.orderId, action: 'superseded', effectiveDate: effectiveStart,
              before: { status: prior.status, endDate: prior.endDate || null, endedByOrderId: prior.endedByOrderId || null },
              after: { status: 'Completed', endDate, endedByOrderId: activeUpdated.orderId }
            })
          } : {})
        });
      }
      updated = await this.persistAssignmentPatch(id, { ...data, status: 'Current' });
    }

    if (shouldSync && updated) {
      await this.syncPersonnelFromAssignment(updated);
    }
    return updated;
  }

  async deleteAssignment(id) {
    const existing = await this.getAssignmentById(id);
    if (existing && (existing.orderId || existing.endedByOrderId || existing.terminationOrderId || existing.relatedOrderIds?.length)) {
      throw new Error('Order-linked assignment history is retained and cannot be deleted. Revoke or correct the linked order instead.');
    }
    let deleted = false;
    if (this.isSupabaseConnected()) {
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      if (error) throw new Error(`Assignment deletion failed: ${error.message}`);
      deleted = Boolean(existing);
    } else {
      const index = this.inMemoryAssignments.findIndex(a => a.id === id);
      if (index !== -1) {
        this.inMemoryAssignments.splice(index, 1);
        deleted = true;
      }
    }

    if (deleted && existing) {
      await this.syncPersonnelFromAssignment(existing, true);
    }
    return deleted;
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
      id: data.id || `prm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

  // ================= DOCUMENT MODULE CRUD =================
  async getAllDocuments(filters = {}) {
    const { type, status, orderId, search, archived = false } = filters;
    if (this.isSupabaseConnected()) {
      try {
        let query = supabase.from('documents').select('*');
        if (archived) query = query.not('archived_at', 'is', null);
        else query = query.is('archived_at', null);
        if (type) query = query.eq('document_type', type);
        if (status) query = query.eq('status', status);
        if (orderId) query = query.eq('order_id', orderId);
        query = query.order('updated_at', { ascending: false });
        const { data, error } = await query;
        if (!error && Array.isArray(data)) return data;
      } catch (error) {
        console.warn('Supabase documents lookup fallback to in-memory:', error.message);
      }
    }
    return this.inMemoryDocuments.filter(doc => {
      if (archived && !doc.archived_at) return false;
      if (!archived && doc.archived_at) return false;
      if (type && doc.document_type !== type) return false;
      if (status && doc.status !== status) return false;
      if (orderId && doc.order_id !== orderId) return false;
      if (search) {
        const s = search.toLowerCase();
        const matchTitle = (doc.title || '').toLowerCase().includes(s);
        const matchDesc = (doc.description || '').toLowerCase().includes(s);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
  }

  async getDocumentById(id) {
    if (!id) return null;
    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
        if (!error && data) return data;
      } catch (error) {
        console.warn('Supabase document by id lookup fallback:', error.message);
      }
    }
    return this.inMemoryDocuments.find(d => d.id === id) || null;
  }

  async getDocumentByOrderId(orderId) {
    if (!orderId) return null;
    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('documents').select('*').eq('order_id', orderId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (!error && data) return data;
      } catch (error) {
        console.warn('Supabase document by orderId lookup fallback:', error.message);
      }
    }
    return this.inMemoryDocuments.find(d => d.order_id === orderId) || null;
  }

  async createDocument(docData) {
    const id = docData.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newDoc = {
      id,
      title: docData.title || 'Untitled Document',
      description: docData.description || '',
      document_type: docData.document_type || 'Administrative Order',
      content_json: docData.content_json || {},
      content_html: docData.content_html || '',
      template_id: docData.template_id || null,
      owner_id: docData.owner_id || null,
      status: docData.status || 'Draft',
      version: 1,
      page_size: docData.page_size || 'A4',
      orientation: docData.orientation || 'portrait',
      margin_top: docData.margin_top ?? 25.4,
      margin_bottom: docData.margin_bottom ?? 25.4,
      margin_left: docData.margin_left ?? 25.4,
      margin_right: docData.margin_right ?? 25.4,
      order_id: docData.order_id || null,
      personnel_ids: Array.isArray(docData.personnel_ids) ? docData.personnel_ids : [],
      created_by: docData.created_by || 'System User',
      updated_by: docData.updated_by || 'System User',
      created_at: now,
      updated_at: now,
      archived_at: null
    };

    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('documents').insert([newDoc]).select().single();
        if (!error && data) {
          await this.createDocumentVersion(id, {
            version_number: 1,
            content_json: newDoc.content_json,
            content_html: newDoc.content_html,
            created_by: newDoc.created_by,
            change_summary: 'Initial document creation'
          });
          return data;
        }
      } catch (error) {
        console.warn('Supabase insert document failed, fallback to memory:', error.message);
      }
    }

    this.inMemoryDocuments.push(newDoc);
    await this.createDocumentVersion(id, {
      version_number: 1,
      content_json: newDoc.content_json,
      content_html: newDoc.content_html,
      created_by: newDoc.created_by,
      change_summary: 'Initial document creation'
    });
    return newDoc;
  }

  async updateDocument(id, updates = {}) {
    const existing = await this.getDocumentById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const newVersion = (existing.version || 1) + (updates.incrementVersion ? 1 : 0);
    const docUpdate = {
      ...updates,
      version: newVersion,
      updated_at: now
    };
    delete docUpdate.incrementVersion;
    delete docUpdate.change_summary;

    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('documents').update(docUpdate).eq('id', id).select().single();
        if (!error && data) {
          if (updates.incrementVersion || updates.change_summary) {
            await this.createDocumentVersion(id, {
              version_number: newVersion,
              content_json: data.content_json,
              content_html: data.content_html,
              created_by: data.updated_by,
              change_summary: updates.change_summary || `Version ${newVersion}`
            });
          }
          return data;
        }
      } catch (error) {
        console.warn('Supabase update document fallback:', error.message);
      }
    }

    const index = this.inMemoryDocuments.findIndex(d => d.id === id);
    if (index === -1) return null;
    this.inMemoryDocuments[index] = { ...this.inMemoryDocuments[index], ...docUpdate };
    if (updates.incrementVersion || updates.change_summary) {
      await this.createDocumentVersion(id, {
        version_number: newVersion,
        content_json: this.inMemoryDocuments[index].content_json,
        content_html: this.inMemoryDocuments[index].content_html,
        created_by: this.inMemoryDocuments[index].updated_by,
        change_summary: updates.change_summary || `Version ${newVersion}`
      });
    }
    return this.inMemoryDocuments[index];
  }

  async deleteDocument(id, hard = false) {
    if (hard) {
      if (this.isSupabaseConnected()) {
        try {
          await supabase.from('document_versions').delete().eq('document_id', id);
          await supabase.from('documents').delete().eq('id', id);
          return true;
        } catch (e) {
          console.warn('Hard delete document fallback:', e.message);
        }
      }
      this.inMemoryDocuments = this.inMemoryDocuments.filter(d => d.id !== id);
      this.inMemoryDocumentVersions = this.inMemoryDocumentVersions.filter(v => v.document_id !== id);
      return true;
    }
    return this.updateDocument(id, { archived_at: new Date().toISOString(), status: 'Archived' });
  }

  async getDocumentVersions(documentId) {
    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('document_versions').select('*').eq('document_id', documentId).order('version_number', { ascending: false });
        if (!error && Array.isArray(data)) return data;
      } catch (error) {
        console.warn('Supabase getDocumentVersions fallback:', error.message);
      }
    }
    return this.inMemoryDocumentVersions
      .filter(v => v.document_id === documentId)
      .sort((a, b) => b.version_number - a.version_number);
  }

  async createDocumentVersion(documentId, versionData) {
    const id = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newVersion = {
      id,
      document_id: documentId,
      version_number: versionData.version_number || 1,
      content_json: versionData.content_json || {},
      content_html: versionData.content_html || '',
      created_by: versionData.created_by || 'System',
      created_at: new Date().toISOString(),
      change_summary: versionData.change_summary || ''
    };
    if (this.isSupabaseConnected()) {
      try {
        await supabase.from('document_versions').insert([newVersion]);
        return newVersion;
      } catch (e) {
        console.warn('Supabase createDocumentVersion fallback:', e.message);
      }
    }
    this.inMemoryDocumentVersions.push(newVersion);
    return newVersion;
  }

  async restoreDocumentVersion(documentId, versionNumber, actor = 'System') {
    const versions = await this.getDocumentVersions(documentId);
    const target = versions.find(v => v.version_number === Number(versionNumber));
    if (!target) throw new Error(`Version ${versionNumber} not found.`);
    return this.updateDocument(documentId, {
      content_json: target.content_json,
      content_html: target.content_html,
      updated_by: actor,
      incrementVersion: true,
      change_summary: `Restored from Version ${versionNumber}`
    });
  }

  // ================= DOCUMENT TEMPLATES =================
  async getAllDocumentTemplates() {
    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('document_templates').select('*').eq('is_active', true).order('name');
        if (!error && Array.isArray(data) && data.length > 0) return data;
      } catch (error) {
        console.warn('Supabase templates fallback:', error.message);
      }
    }
    return this.inMemoryDocumentTemplates.filter(t => t.is_active);
  }

  async saveDocumentTemplate(templateData) {
    const id = templateData.id || `tmpl-${Date.now()}`;
    const now = new Date().toISOString();
    const record = {
      id,
      name: templateData.name,
      description: templateData.description || '',
      document_type: templateData.document_type || 'Administrative Order',
      content_json: templateData.content_json || {},
      content_html: templateData.content_html || '',
      is_active: templateData.is_active ?? true,
      page_size: templateData.page_size || 'A4',
      orientation: templateData.orientation || 'portrait',
      margin_top: templateData.margin_top ?? 25.4,
      margin_bottom: templateData.margin_bottom ?? 25.4,
      margin_left: templateData.margin_left ?? 25.4,
      margin_right: templateData.margin_right ?? 25.4,
      created_by: templateData.created_by || 'System',
      created_at: now,
      updated_at: now
    };
    if (this.isSupabaseConnected()) {
      try {
        const { data, error } = await supabase.from('document_templates').upsert([record]).select().single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase save template fallback:', e.message);
      }
    }
    const idx = this.inMemoryDocumentTemplates.findIndex(t => t.id === id);
    if (idx === -1) this.inMemoryDocumentTemplates.push(record);
    else this.inMemoryDocumentTemplates[idx] = { ...this.inMemoryDocumentTemplates[idx], ...record };
    return record;
  }
}

export const db = new PAISRepository();
