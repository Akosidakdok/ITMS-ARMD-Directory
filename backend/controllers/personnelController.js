import { db } from '../store/repository.js';
import {
  PERSONNEL_IMPORTABLE_FIELDS,
  PERSONNEL_REQUIRED_IMPORT_FIELDS,
  sanitizePersonnelImportRow
} from '../schemas/personnelImportSchema.js';

const MAX_BULK_BATCH_SIZE = 500;

export const getAllPersonnel = async (req, res) => {
  try {
    const { division, search, status } = req.query;
    const personnel = await db.getPersonnel({ division, search, status });
    res.json({
      success: true,
      count: personnel.length,
      data: personnel
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    res.status(500).json({ success: false, error: error.message });
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
    res.status(500).json({ success: false, error: error.message });
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
    const knownIds = new Set(existingPersonnel.map(person => String(person.id).toLowerCase()));
    const acceptedRows = [];
    const errors = [];

    for (let index = 0; index < submittedRows.length; index += 1) {
      const submitted = submittedRows[index];
      const rowNumber = Number.isInteger(submitted?.rowNumber)
        ? submitted.rowNumber
        : index + 2;
      const { personnel, errors: rowErrors } = sanitizePersonnelImportRow(submitted?.data);
      const normalizedId = personnel.id ? personnel.id.toLowerCase() : '';

      if (normalizedId && knownIds.has(normalizedId)) {
        rowErrors.push(`id "${personnel.id}" already exists`);
      }

      if (rowErrors.length > 0) {
        errors.push({ rowNumber, messages: rowErrors });
        continue;
      }

      if (normalizedId) knownIds.add(normalizedId);
      acceptedRows.push({ rowNumber, personnel });
    }

    let created = [];
    if (acceptedRows.length > 0) {
      created = await db.createPersonnelBulk(acceptedRows.map(row => row.personnel));
    }

    const status = errors.length > 0 ? 207 : 201;
    return res.status(status).json({
      success: errors.length === 0,
      message: `${created.length} personnel record(s) imported`,
      data: {
        created,
        importedCount: created.length,
        rejectedCount: errors.length,
        errors
      }
    });
  } catch (error) {
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
    res.status(500).json({ success: false, error: error.message });
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
    res.status(500).json({ success: false, error: error.message });
  }
};
