import { getExcelTemplate, listExcelTemplates } from '../services/excelTemplateRegistry.js';
import { generateExcelExport, generateExcelPreview } from '../services/excelExport.js';

export const getExcelTemplates = (req, res) => {
  res.json({ success: true, count: listExcelTemplates().length, data: listExcelTemplates() });
};

export const getExcelTemplateById = (req, res) => {
  const template = getExcelTemplate(req.params.templateId);
  if (!template) return res.status(404).json({ success: false, message: 'Excel template definition not found.' });
  return res.json({ success: true, data: template });
};

export const exportExcelTemplate = async (req, res) => {
  try {
    const { buffer, filename } = await generateExcelExport({
      templateId: req.params.templateId,
      asOfDate: req.query.asOfDate,
      status: req.query.status || 'Active'
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to generate Excel export.' });
  }
};

export const previewExcelTemplate = async (req, res) => {
  try {
    const data = await generateExcelPreview({ templateId: req.params.templateId, asOfDate: req.query.asOfDate, status: req.query.status || 'Active' });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to preview Excel workbook.' });
  }
};
