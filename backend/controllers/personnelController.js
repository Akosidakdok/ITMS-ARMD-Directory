import { db } from '../store/repository.js';
import {
  PERSONNEL_IMPORTABLE_FIELDS,
  PERSONNEL_REQUIRED_IMPORT_FIELDS,
  sanitizePersonnelImportRow
} from '../schemas/personnelImportSchema.js';

const MAX_BULK_BATCH_SIZE = 500;

export const getAllPersonnel = async (req, res) => {
  try {
    const { sub_unit, division, search, status } = req.query;
    const personnel = await db.getPersonnel({ sub_unit, division, search, status });
    res.json({
      success: true,
      count: personnel.length,
      data: personnel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const getPersonnelById = async (req, res) => {
  try {
    const person = await db.getPersonnelById(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: 'Personnel not found' });
    }
    res.json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const createPersonnel = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName and lastName are required'
      });
    }

    const created = await db.createPersonnel(req.body);
    res.status(201).json({
      success: true,
      message: 'Personnel registered successfully',
      data: created
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const getPersonnelImportSchema = (req, res) => {
  res.json({
    success: true,
    data: {
      fields: PERSONNEL_IMPORTABLE_FIELDS,
      requiredFields: PERSONNEL_REQUIRED_IMPORT_FIELDS,
      maxBatchSize: MAX_BULK_BATCH_SIZE
    }
  });
};

export const createPersonnelBulk = async (req, res) => {
  try {
    const submittedRows = req.body?.records;
    const duplicateMode = req.body?.duplicateMode || req.body?.mode || 'skip'; // 'skip' | 'update' | 'flag'

    if (!Array.isArray(submittedRows) || submittedRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'records must be a non-empty array'
      });
    }
    if (submittedRows.length > MAX_BULK_BATCH_SIZE) {
      return res.status(413).json({
        success: false,
        message: `A bulk request may contain at most ${MAX_BULK_BATCH_SIZE} rows`
      });
    }

    const existingPersonnel = await db.getPersonnel();
    const existingById = new Map();
    const existingByBadge = new Map();
    const existingByNameAndBday = new Map();

    for (const p of existingPersonnel) {
      if (p.id) existingById.set(String(p.id).toLowerCase(), p);
      if (p.badgeNo && String(p.badgeNo).trim()) {
        existingByBadge.set(String(p.badgeNo).trim().toUpperCase(), p);
      }
      const bday = p.birthdate || p.birthday || '';
      if (p.lastName && p.firstName) {
        const key = `${p.lastName}__${p.firstName}__${bday}`.toUpperCase().trim();
        existingByNameAndBday.set(key, p);
      }
    }

    const rowsToCreate = [];
    const rowsToUpdate = [];
    const skippedRecords = [];
    const duplicateRecords = [];
    const errors = [];

    // Track identifiers inside this batch to catch in-file duplicates
    const batchSeenBadges = new Set();
    const batchSeenNames = new Set();

    for (let index = 0; index < submittedRows.length; index += 1) {
      const submitted = submittedRows[index];
      const rowNumber = Number.isInteger(submitted?.rowNumber)
        ? submitted.rowNumber
        : index + 2;
      const { personnel, errors: rowErrors } = sanitizePersonnelImportRow(submitted?.data);

      if (!personnel && rowErrors.length === 0) {
        // Ignored footer summary row
        continue;
      }

      if (rowErrors.length > 0) {
        errors.push({ rowNumber, messages: rowErrors });
        continue;
      }

      const normalizedBadge = personnel.badgeNo ? String(personnel.badgeNo).trim().toUpperCase() : '';
      const bday = personnel.birthdate || personnel.birthday || '';
      const nameKey = `${personnel.lastName}__${personnel.firstName}__${bday}`.toUpperCase().trim();

      // Check in-batch collision
      if (normalizedBadge && batchSeenBadges.has(normalizedBadge)) {
        errors.push({
          rowNumber,
          messages: [`Badge number "${personnel.badgeNo}" is duplicated within this import file`]
        });
        continue;
      }
      if (batchSeenNames.has(nameKey)) {
        errors.push({
          rowNumber,
          messages: [`Personnel "${personnel.fullName}" is duplicated within this import file`]
        });
        continue;
      }

      if (normalizedBadge) batchSeenBadges.add(normalizedBadge);
      batchSeenNames.add(nameKey);

      // Check existing database records
      let matchedExisting = null;
      if (personnel.id && existingById.has(String(personnel.id).toLowerCase())) {
        matchedExisting = existingById.get(String(personnel.id).toLowerCase());
      } else if (normalizedBadge && existingByBadge.has(normalizedBadge)) {
        matchedExisting = existingByBadge.get(normalizedBadge);
      } else if (existingByNameAndBday.has(nameKey)) {
        matchedExisting = existingByNameAndBday.get(nameKey);
      }

      if (matchedExisting) {
        if (duplicateMode === 'skip') {
          skippedRecords.push({ rowNumber, existingId: matchedExisting.id, personnel });
        } else if (duplicateMode === 'update') {
          rowsToUpdate.push({ rowNumber, id: matchedExisting.id, data: personnel });
        } else {
          // 'flag'
          duplicateRecords.push({ rowNumber, existingId: matchedExisting.id, personnel });
          errors.push({
            rowNumber,
            messages: [`Duplicate detected: matches existing personnel ${matchedExisting.rank} ${matchedExisting.fullName} (ID: ${matchedExisting.id})`]
          });
        }
        continue;
      }

      rowsToCreate.push({ rowNumber, personnel });
    }

    let created = [];
    if (rowsToCreate.length > 0) {
      created = await db.createPersonnelBulk(rowsToCreate.map(r => r.personnel));
    }

    let updated = [];
    if (rowsToUpdate.length > 0) {
      for (const item of rowsToUpdate) {
        const resUpdated = await db.updatePersonnel(item.id, item.data);
        if (resUpdated) updated.push(resUpdated);
      }
    }

    const totalProcessed = created.length + updated.length;
    const status = errors.length > 0 ? 207 : 201;

    return res.status(status).json({
      success: errors.length === 0,
      message: `${created.length} imported, ${updated.length} updated, ${skippedRecords.length} skipped`,
      data: {
        created,
        updated,
        totalRows: submittedRows.length,
        importedCount: created.length,
        updatedCount: updated.length,
        skippedCount: skippedRecords.length,
        duplicateCount: duplicateRecords.length,
        rejectedCount: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('Bulk personnel import error:', error);
    return res.status(500).json({
      success: false,
      message: 'Bulk personnel import failed',
      error: error.message
    });
  }
};

export const updatePersonnel = async (req, res) => {
  try {
    const updated = await db.updatePersonnel(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Personnel not found' });
    }
    res.json({
      success: true,
      message: 'Personnel record updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const deletePersonnel = async (req, res) => {
  try {
    const success = await db.deletePersonnel(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Personnel not found' });
    }
    res.json({
      success: true,
      message: 'Personnel record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};
