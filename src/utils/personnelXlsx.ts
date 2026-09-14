import { strFromU8, unzipSync } from 'fflate';
import { findPersonnelHeaderRowIndex, getPersonnelImportField } from './personnelCsv';

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_XLSX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_EXTRACTED_XML_BYTES = 100 * 1024 * 1024;

const parseXml = (xml: string, fileName: string): XMLDocument => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error(`The Excel workbook contains invalid XML in ${fileName}.`);
  }
  return document;
};

const elementsByLocalName = (root: Document | Element, localName: string): Element[] => (
  Array.from(root.getElementsByTagNameNS('*', localName))
);

const normalizeArchivePath = (path: string): string => {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
};

const readWorkbookBytes = async (file: File): Promise<Uint8Array> => {
  if (file.type && file.type !== XLSX_MIME_TYPE && !file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('The selected file is not an Excel .xlsx workbook.');
  }
  if (file.size > MAX_XLSX_FILE_BYTES) {
    throw new Error('The Excel workbook is larger than the 50 MB safety limit.');
  }
  return new Uint8Array(await file.arrayBuffer());
};

const unzipSelectedFiles = (
  archiveBytes: Uint8Array,
  shouldExtract: (path: string) => boolean,
  maximumExtractedBytes: number
): Record<string, Uint8Array> => {
  let extractedBytes = 0;
  try {
    return unzipSync(archiveBytes, {
      filter(entry) {
        const path = entry.name.replace(/\\/g, '/');
        if (!shouldExtract(path)) return false;
        extractedBytes += entry.originalSize;
        if (extractedBytes > maximumExtractedBytes) {
          throw new Error('The Excel workbook expands beyond the import safety limit.');
        }
        return true;
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown workbook error';
    throw new Error(`The Excel workbook could not be opened: ${message}`);
  }
};

const textFile = (files: Record<string, Uint8Array>, path: string): string | undefined => {
  const bytes = files[path];
  return bytes ? strFromU8(bytes) : undefined;
};

const resolveFirstWorksheetPath = (
  files: Record<string, Uint8Array>,
  workbook: XMLDocument
): string => {
  const firstSheet = elementsByLocalName(workbook, 'sheet')[0];
  const relationshipId = firstSheet?.getAttributeNS(
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'id'
  ) || firstSheet?.getAttribute('r:id');
  const relationshipsXml = textFile(files, 'xl/_rels/workbook.xml.rels');

  if (relationshipId && relationshipsXml) {
    const relationships = parseXml(relationshipsXml, 'workbook relationships');
    const relationship = elementsByLocalName(relationships, 'Relationship')
      .find(item => item.getAttribute('Id') === relationshipId);
    const target = relationship?.getAttribute('Target');
    if (target) {
      return normalizeArchivePath(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
    }
  }

  throw new Error('The first worksheet is missing from the workbook relationships.');
};

const createSharedStringResolver = (xml?: string) => {
  if (!xml) return (_index: number) => '';
  const document = parseXml(xml, 'shared strings');
  const items = elementsByLocalName(document, 'si');
  return (index: number): string => {
    const item = items[index];
    return item
      ? elementsByLocalName(item, 't').map(node => node.textContent || '').join('')
      : '';
  };
};

const builtInDateFormatIds = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58
]);

const createDateStyleResolver = (xml?: string) => {
  if (!xml) return (_styleIndex: number) => false;
  const document = parseXml(xml, 'styles');
  const customFormats = new Map<number, string>();
  for (const format of elementsByLocalName(document, 'numFmt')) {
    customFormats.set(
      Number(format.getAttribute('numFmtId')),
      format.getAttribute('formatCode') || ''
    );
  }
  const cellFormats = elementsByLocalName(document, 'cellXfs')[0];
  const styleFormatIds = cellFormats
    ? Array.from(cellFormats.children)
      .filter(node => node.localName === 'xf')
      .map(node => Number(node.getAttribute('numFmtId') || 0))
    : [];

  return (styleIndex: number): boolean => {
    const formatId = styleFormatIds[styleIndex] || 0;
    if (builtInDateFormatIds.has(formatId)) return true;
    const customFormat = (customFormats.get(formatId) || '')
      .replace(/"[^"]*"/g, '')
      .replace(/\[[^\]]*\]/g, '');
    return /(^|[^\\])[ymdhis]/i.test(customFormat);
  };
};

const excelDateToIso = (serial: number, uses1904Epoch: boolean): string => {
  const epoch = uses1904Epoch
    ? Date.UTC(1904, 0, 1)
    : Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.round(serial * 86_400_000)).toISOString().slice(0, 10);
};

const cellColumnIndex = (cell: Element): number => {
  const reference = cell.getAttribute('r') || '';
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return -1;
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index - 1;
};

const readCellValue = (
  cell: Element,
  sharedString: (index: number) => string,
  isDateStyle: (styleIndex: number) => boolean,
  uses1904Epoch: boolean
): string => {
  const type = cell.getAttribute('t');
  if (type === 'inlineStr') {
    return elementsByLocalName(cell, 't').map(node => node.textContent || '').join('');
  }

  const rawValue = elementsByLocalName(cell, 'v')[0]?.textContent || '';
  if (type === 's') return sharedString(Number(rawValue));
  if (type === 'b') return rawValue === '1' ? 'TRUE' : 'FALSE';
  if (type === 'str') return rawValue;

  const numericValue = Number(rawValue);
  const styleIndex = Number(cell.getAttribute('s') || 0);
  if (rawValue && Number.isFinite(numericValue) && isDateStyle(styleIndex)) {
    return excelDateToIso(numericValue, uses1904Epoch);
  }
  return rawValue;
};

/**
 * Reads the first worksheet and retains cell values only for recognized
 * personnel-schema columns. Values from all other columns are not resolved.
 */
export const readPersonnelXlsx = async (file: File): Promise<unknown[][]> => {
  const archiveBytes = await readWorkbookBytes(file);
  const metadataFiles = unzipSelectedFiles(
    archiveBytes,
    path => path === 'xl/workbook.xml' || path === 'xl/_rels/workbook.xml.rels',
    5 * 1024 * 1024
  );
  const workbookXml = textFile(metadataFiles, 'xl/workbook.xml');
  if (!workbookXml) throw new Error('The Excel workbook is missing workbook metadata.');

  const workbook = parseXml(workbookXml, 'workbook');
  const worksheetPath = resolveFirstWorksheetPath(metadataFiles, workbook);
  const files = unzipSelectedFiles(
    archiveBytes,
    path => (
      path === worksheetPath ||
      path === 'xl/sharedStrings.xml' ||
      path === 'xl/styles.xml'
    ),
    MAX_EXTRACTED_XML_BYTES
  );
  const worksheetXml = textFile(files, worksheetPath);
  if (!worksheetXml) throw new Error('The first Excel worksheet could not be read.');

  const worksheet = parseXml(worksheetXml, 'first worksheet');
  const rows = elementsByLocalName(worksheet, 'row');
  if (rows.length === 0) return [];

  const sharedString = createSharedStringResolver(textFile(files, 'xl/sharedStrings.xml'));
  const isDateStyle = createDateStyleResolver(textFile(files, 'xl/styles.xml'));
  const uses1904Epoch = elementsByLocalName(workbook, 'workbookPr')[0]
    ?.getAttribute('date1904') === '1';

  const getRowNumber = (rowEl: Element, fallbackIndex: number): number => {
    const r = Number(rowEl.getAttribute('r'));
    return Number.isFinite(r) && r >= 1 ? r : fallbackIndex + 1;
  };

  const maxCandidateScan = Math.min(rows.length, 30);
  const candidateRows: unknown[][] = [];

  for (let i = 0; i < maxCandidateScan; i += 1) {
    const rowEl = rows[i];
    const rowCells: unknown[] = [];
    for (const cell of elementsByLocalName(rowEl, 'c')) {
      const colIdx = cellColumnIndex(cell);
      if (colIdx < 0) continue;
      rowCells[colIdx] = readCellValue(
        cell,
        sharedString,
        isDateStyle,
        uses1904Epoch
      );
    }
    candidateRows.push(rowCells);
  }

  const headerCandidateIndex = findPersonnelHeaderRowIndex(candidateRows);
  if (headerCandidateIndex < 0) {
    throw new Error('Unable to detect the personnel table header. Please check the Excel file.');
  }

  const headerRowElement = rows[headerCandidateIndex];
  const headerExcelRowNum = getRowNumber(headerRowElement, headerCandidateIndex);
  const headerRowIndex = headerExcelRowNum - 1;
  const headerCells = candidateRows[headerCandidateIndex];

  const selectedColumns = new Set<number>();
  for (let colIdx = 0; colIdx < headerCells.length; colIdx += 1) {
    const value = headerCells[colIdx];
    if (value !== null && value !== undefined && String(value).trim()) {
      if (getPersonnelImportField(String(value))) {
        selectedColumns.add(colIdx);
      }
    }
  }

  const projectedRows: unknown[][] = [];
  for (let i = 0; i < headerRowIndex; i += 1) {
    projectedRows[i] = [];
  }
  projectedRows[headerRowIndex] = headerCells;

  for (let rowIndex = headerCandidateIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const rowEl = rows[rowIndex];
    const excelRowNum = getRowNumber(rowEl, rowIndex);
    const targetIdx = excelRowNum - 1;
    const projectedRow: unknown[] = [];
    for (const cell of elementsByLocalName(rowEl, 'c')) {
      const columnIndex = cellColumnIndex(cell);
      if (!selectedColumns.has(columnIndex)) continue;
      projectedRow[columnIndex] = readCellValue(
        cell,
        sharedString,
        isDateStyle,
        uses1904Epoch
      );
    }
    projectedRows[targetIdx] = projectedRow;
  }

  return projectedRows;
};
