import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { db } from '../store/repository.js';
import {
  getWorksheetSummaries,
  getWorksheetDetail,
  updateWorksheetCell,
  getWorksheetAuditLogs,
  generateExcelExport
} from '../services/worksheetDataService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// List all 13 worksheets
router.get('/', async (req, res) => {
  try {
    const list = getWorksheetSummaries();
    return res.json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load worksheets', error: error.message });
  }
});

// Get worksheet audit logs
router.get('/audit/logs', async (req, res) => {
  try {
    const logs = getWorksheetAuditLogs(150);
    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load audit logs', error: error.message });
  }
});

// Export workbook or sheet as .xlsx
router.get('/export/download', async (req, res) => {
  try {
    const sheetId = req.query.sheetId || null;
    const buffer = await generateExcelExport(sheetId);
    
    const filename = sheetId 
      ? `PAIS_Worksheet_${sheetId}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `PAIS_Full_Disposition_September_7_2026.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Export failed', error: error.message });
  }
});

// Get single worksheet details with live database sync
router.get('/:sheetId', async (req, res) => {
  try {
    const personnel = await db.getPersonnel();
    const sheetData = getWorksheetDetail(req.params.sheetId, personnel);
    return res.json({ success: true, data: sheetData });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
});

// Update a single cell
router.put('/:sheetId/cell', async (req, res) => {
  try {
    const { address, value, oldValue } = req.body;
    if (!address) return res.status(400).json({ success: false, message: 'Cell address is required' });

    const result = await updateWorksheetCell(
      req.params.sheetId,
      { address, value, oldValue },
      req.user,
      db
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Batch update cells (e.g. multi-cell paste, range edits, undo/redo)
router.post('/:sheetId/batch', async (req, res) => {
  try {
    const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
    if (!updates.length) return res.status(400).json({ success: false, message: 'No cell updates provided' });

    const results = [];
    for (const update of updates) {
      const res = await updateWorksheetCell(req.params.sheetId, update, req.user, db);
      results.push(res);
    }

    return res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Smart Import Preview: auto-detects header row (skipping decorative headers)
router.post('/import/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File is required' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);

    const sheet = wb.worksheets[0];
    if (!sheet) return res.status(400).json({ success: false, message: 'Uploaded file has no worksheets' });

    // Intelligent header detection:
    // Look through rows 1 to 15 for header keywords: NO, RANK, LASTNAME, FIRSTNAME, STATUS, BADGE
    let detectedHeaderRow = 1;
    let detectedHeaders = [];

    for (let r = 1; r <= Math.min(15, sheet.rowCount); r++) {
      const rowVals = [];
      sheet.getRow(r).eachCell({ includeEmpty: false }, cell => {
        const txt = String(cell.value || '').trim().toUpperCase();
        if (txt) rowVals.push(txt);
      });

      const joined = rowVals.join(' ');
      if (
        (joined.includes('NO.') || joined.includes('NO')) &&
        (joined.includes('RANK') || joined.includes('LAST') || joined.includes('FIRST') || joined.includes('BADGE'))
      ) {
        detectedHeaderRow = r;
        sheet.getRow(r).eachCell((cell, colNum) => {
          detectedHeaders.push({ col: colNum, text: String(cell.value || '').trim() });
        });
        break;
      }
    }

    // Read sample rows
    let totalRecords = 0;
    let newRecords = 0;
    let updatedRecords = 0;
    let duplicateRecords = 0;
    let invalidRecords = 0;

    const sampleRows = [];
    const existingPersonnel = await db.getPersonnel();
    const existingNames = new Set(existingPersonnel.map(p => `${p.lastName?.toUpperCase()}|${p.firstName?.toUpperCase()}`));

    for (let r = detectedHeaderRow + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      let hasData = false;
      const rowObj = {};

      detectedHeaders.forEach(h => {
        const val = row.getCell(h.col).value;
        if (val !== null && val !== undefined && val !== '') {
          hasData = true;
          rowObj[h.text] = typeof val === 'object' && val.text ? val.text : String(val).trim();
        }
      });

      if (!hasData) continue;
      totalRecords++;

      // Check name / validity
      const lastName = rowObj['LAST NAME'] || rowObj['LASTNAME'] || '';
      const firstName = rowObj['FIRST NAME'] || rowObj['FIRSTNAME'] || '';

      if (!lastName && !firstName) {
        invalidRecords++;
      } else {
        const key = `${lastName.toUpperCase()}|${firstName.toUpperCase()}`;
        if (existingNames.has(key)) {
          updatedRecords++;
        } else {
          newRecords++;
        }
      }

      if (sampleRows.length < 10) {
        sampleRows.push(rowObj);
      }
    }

    return res.json({
      success: true,
      data: {
        sheetName: sheet.name,
        detectedHeaderRow,
        detectedHeaders: detectedHeaders.map(h => h.text),
        totalRecords,
        newRecords,
        updatedRecords,
        duplicateRecords,
        invalidRecords,
        sampleRows
      }
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Failed to inspect Excel file', error: error.message });
  }
});

export default router;
