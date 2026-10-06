import { OFFICIAL_34_HEADER_NAMES } from '../constants/personnel34Schema';

export const OFFICIAL_IMPORT_HEADERS = OFFICIAL_34_HEADER_NAMES;

export const SAMPLE_TEMPLATE_ROWS = [
  [
    'PBGEN',
    'PALGUE',
    'ROMY',
    'INWAY',
    '',
    'O-08161',
    '1975-10-29',
    '1995-06-01',
    'Director',
    '2026-01-30',
    '2026-01-30',
    'PNPA',
    '1997-04-25',
    'ON DUTY/ACTIVE',
    '2000-05-01',
    'PERMANENT',
    'C02',
    'ITMS',
    'C021',
    'OFFICE OF THE DIRECTOR',
    '',
    'Camp Crame',
    '',
    'Main Building',
    'Male',
    'Married',
    'Protestant',
    'palgueri@gmail.com',
    '09175304121',
    '900-744-527',
    '2003688586',
    '190001162962',
    '108000536498',
    'PUROK 2A, LIBERTAD, BUTUAN CITY'
  ],
  [
    'PCpl',
    'SANTOS',
    'MARIA',
    'PUNGUTAN',
    '',
    '311622',
    '1987-10-24',
    '2017-09-16',
    'IT Project PNCO',
    '2021-01-13',
    '2021-12-01',
    'Not Applicable (PNCO/NUP)',
    '',
    'ON DUTY/ACTIVE',
    '2017-09-16',
    'PERMANENT',
    'C02',
    'ITMS',
    'C0224',
    'Information Technology Program Management Division',
    '',
    'Camp Crame',
    '',
    'Building 103',
    'Female',
    'Single',
    'Roman Catholic',
    'santos.maria@gmail.com',
    '09164309513',
    '441-295-516',
    '2006147824',
    '030254865423',
    '121104678604',
    'SAN JOSE, ANTIPOLO CITY, RIZAL'
  ],
  [
    'NUP',
    'REYES',
    'JOSE',
    'PALARCA',
    'JR.',
    'SG-14',
    '1974-10-11',
    '2017-04-10',
    'Information Systems Analyst (SG14)',
    '2017-04-10',
    '2021-08-01',
    'Not Applicable (PNCO/NUP)',
    '',
    'ON DUTY/ACTIVE',
    '2017-04-10',
    'PERMANENT',
    'C02',
    'ITMS',
    'C0216',
    'Administrative and Resource Management Division',
    '',
    'Camp Crame',
    '',
    'ITMS HQ',
    'Male',
    'Married',
    'Roman Catholic',
    'jose.reyes@gmail.com',
    '09391181635',
    '107-918-611',
    '2000466775',
    '190004776139',
    '108000431201',
    '30 L WOOD ST BALARA, QUEZON CITY'
  ]
];

/**
 * Generates and downloads the official PAIS 2.0 Excel (.xlsx) template with all 34 headers.
 */
export const downloadOfficialExcelTemplate = async (fileName = 'PAIS_2.0_Official_34_Columns_Import_Template.xlsx') => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PNP-ITMS PAIS 2.0';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Personnel Import', {
    views: [{ showGridLines: true }]
  });

  // Header row
  const headerRow = worksheet.addRow([...OFFICIAL_IMPORT_HEADERS]);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Dark blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });

  // Sample data rows
  SAMPLE_TEMPLATE_ROWS.forEach((rowValues) => {
    const dataRow = worksheet.addRow(rowValues);
    dataRow.height = 22;
    dataRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Column widths
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads the official PAIS 2.0 CSV template with all 34 headers.
 */
export const downloadOfficialCsvTemplate = (fileName = 'PAIS_2.0_Official_34_Columns_Import_Template.csv') => {
  const headerLine = OFFICIAL_IMPORT_HEADERS.join(',');
  const sampleLines = SAMPLE_TEMPLATE_ROWS.map(row =>
    row.map(cell => {
      const str = String(cell || '');
      if (str.includes(',') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );

  const csvContent = [headerLine, ...sampleLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
