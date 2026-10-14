/**
 * PAIS 2.0 Reports Excel Export Service
 * Produces authentic Excel (.xlsx) workbooks with native dynamic formulas,
 * exact calculation parity with PAIS system logic, professional styling,
 * dynamic range summary rows, and error handling.
 */

export interface ExportColumnDef {
  key: string;
  label: string;
}

export async function buildReportXlsxBuffer(
  reportTitle: string,
  data: any[],
  columns: ExportColumnDef[],
  reportType?: string
): Promise<any> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PNP-ITMS PAIS 2.0';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const sanitizedSheetName = reportTitle.slice(0, 31).replace(/[\\/?*\[\]:]/g, ' ') || 'Report';
  const worksheet = workbook.addWorksheet(sanitizedSheetName, {
    views: [{ state: 'frozen', ySplit: 2, showGridLines: true }]
  });

  // 1. Report Title Banner (Row 1)
  const titleRow = worksheet.getRow(1);
  const lastColLetter = String.fromCharCode(64 + Math.max(columns.length, 1));
  worksheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = reportTitle.toUpperCase();
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A243A' } }; // ITMS Navy
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleRow.height = 30;

  // 2. Table Column Headers (Row 2)
  const headerRow = worksheet.getRow(2);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.label;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // PNP Blue
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
  headerRow.height = 26;

  // 3. Data Rows (Starting at Row 3)
  const startRow = 3;
  const numRows = data.length;
  const endRow = startRow + numRows - 1;

  data.forEach((row, rowIndex) => {
    const currentR = startRow + rowIndex;
    const dataRow = worksheet.getRow(currentR);
    dataRow.height = 20;

    columns.forEach((col, colIndex) => {
      const cell = dataRow.getCell(colIndex + 1);
      const rawVal = row[col.key];

      // Format parity & formula insertion depending on report type
      if (reportType === 'strength_counting' && col.key === 'total') {
        // Total Strength formula: SUM(E:G) = PCO + PNCO + NUP
        const pcoCol = 'E';
        const nupCol = 'G';
        const expectedTotal = Number(rawVal || 0);
        cell.value = {
          formula: `SUM(${pcoCol}${currentR}:${nupCol}${currentR})`,
          result: expectedTotal
        };
        cell.font = { name: 'Calibri', size: 9, bold: true };
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (reportType === 'strength_counting' && ['pcoCount', 'pncoCount', 'nupCount', 'maleCount', 'femaleCount'].includes(col.key)) {
        cell.value = Number(rawVal || 0);
        cell.font = { name: 'Calibri', size: 9 };
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (reportType === 'promotion' && col.key === 'timeInGrade') {
        // Computed TIG formula referencing Column E (lastPromotionDate)
        const dateCol = 'E';
        const expectedTig = String(rawVal || 'N/A');
        cell.value = {
          formula: `IF(OR(ISBLANK(${dateCol}${currentR}),${dateCol}${currentR}=""),"N/A",DATEDIF(${dateCol}${currentR},TODAY(),"y")&" yrs, "&DATEDIF(${dateCol}${currentR},TODAY(),"ym")&" mos, "&DATEDIF(${dateCol}${currentR},TODAY(),"md")&" days")`,
          result: expectedTig
        };
        cell.font = { name: 'Calibri', size: 9 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (reportType === 'promotion' && col.key === 'eligible') {
        // Board Status formula: PCO requires 3 yrs, PNCO requires 2 yrs
        const rankCol = 'A';
        const dateCol = 'E';
        const expectedStatus = String(rawVal || 'N/A');
        cell.value = {
          formula: `IF(OR(ISBLANK(${dateCol}${currentR}),${dateCol}${currentR}=""),"N/A",IF(DATEDIF(${dateCol}${currentR},TODAY(),"y")>=IF(OR(${rankCol}${currentR}="Pat",${rankCol}${currentR}="PCpl",${rankCol}${currentR}="PSSg",${rankCol}${currentR}="PMSg",${rankCol}${currentR}="PSMS",${rankCol}${currentR}="PCMS",${rankCol}${currentR}="PEMS"),2,3),"ELIGIBLE","Accruing"))`,
          result: expectedStatus
        };
        cell.font = {
          name: 'Calibri',
          size: 9,
          bold: true,
          color: expectedStatus === 'ELIGIBLE' ? { argb: 'FF15803D' } : { argb: 'FF1D4ED8' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (reportType === 'leave' && col.key === 'days') {
        const startCol = 'F';
        const endCol = 'G';
        const expectedDays = Number(rawVal || 1);
        cell.value = {
          formula: `IF(AND(ISNUMBER(DATEVALUE(TEXT(${startCol}${currentR},"yyyy-mm-dd"))),ISNUMBER(DATEVALUE(TEXT(${endCol}${currentR},"yyyy-mm-dd")))),DATEVALUE(TEXT(${endCol}${currentR},"yyyy-mm-dd"))-DATEVALUE(TEXT(${startCol}${currentR},"yyyy-mm-dd"))+1,${expectedDays})`,
          result: expectedDays
        };
        cell.font = { name: 'Calibri', size: 9, bold: true };
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (reportType === 'training' && col.key === 'hours') {
        cell.value = Number(rawVal || 0);
        cell.font = { name: 'Calibri', size: 9 };
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.value = rawVal ?? '';
        cell.font = { name: 'Calibri', size: 9 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: typeof rawVal === 'number' ? 'right' : 'left',
          wrapText: true
        };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (rowIndex % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  // 4. Totals and Summary Rows (Step 6 of prompt)
  if (numRows > 0) {
    const summaryRowNumber = endRow + 1;
    const summaryRow = worksheet.getRow(summaryRowNumber);
    summaryRow.height = 24;

    const applySummaryStyle = (cell: any) => {
      cell.font = { name: 'Calibri', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    };

    if (reportType === 'strength_counting') {
      // Columns: A: UnitCat, B: SubUnitCat, C: SubUnit, D: Station, E: PCO, F: PNCO, G: NUP, H: Male, I: Female, J: Total
      for (let c = 1; c <= columns.length; c++) {
        const cell = summaryRow.getCell(c);
        applySummaryStyle(cell);
        if (c === 3) {
          cell.value = 'TOTAL / GRAND SUMMARY';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else if (c >= 5 && c <= 10) {
          const colLetter = String.fromCharCode(64 + c);
          let sumVal = 0;
          data.forEach(r => {
            if (c === 5) sumVal += Number(r.pcoCount || 0);
            else if (c === 6) sumVal += Number(r.pncoCount || 0);
            else if (c === 7) sumVal += Number(r.nupCount || 0);
            else if (c === 8) sumVal += Number(r.maleCount || 0);
            else if (c === 9) sumVal += Number(r.femaleCount || 0);
            else if (c === 10) sumVal += Number(r.total || 0);
          });
          cell.value = {
            formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})`,
            result: sumVal
          };
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.value = '';
        }
      }
    } else if (reportType === 'promotion') {
      // Summary Row 1: Total Evaluated
      for (let c = 1; c <= columns.length; c++) {
        const cell = summaryRow.getCell(c);
        applySummaryStyle(cell);
        if (c === 4) {
          cell.value = 'TOTAL EVALUATED PERSONNEL:';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 5) {
          cell.value = {
            formula: `COUNTA(B${startRow}:B${endRow})`,
            result: numRows
          };
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.value = '';
        }
      }

      // Summary Row 2: Eligible & Accruing counts
      const subSummaryRow = worksheet.getRow(summaryRowNumber + 1);
      subSummaryRow.height = 22;
      for (let c = 1; c <= columns.length; c++) {
        const cell = subSummaryRow.getCell(c);
        applySummaryStyle(cell);
        if (c === 4) {
          cell.value = 'ELIGIBLE COUNT:';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 5) {
          cell.value = {
            formula: `COUNTIF(G${startRow}:G${endRow},"ELIGIBLE")`,
            result: data.filter(d => d.eligible === 'ELIGIBLE').length
          };
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (c === 6) {
          cell.value = 'ACCRUING COUNT:';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 7) {
          cell.value = {
            formula: `COUNTIF(G${startRow}:G${endRow},"Accruing")`,
            result: data.filter(d => d.eligible === 'Accruing').length
          };
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.value = '';
        }
      }
    } else if (reportType === 'leave') {
      for (let c = 1; c <= columns.length; c++) {
        const cell = summaryRow.getCell(c);
        applySummaryStyle(cell);
        if (c === 7) {
          cell.value = 'TOTAL LEAVE DAYS:';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 8) {
          const totalDays = data.reduce((acc, l) => acc + Number(l.days || 0), 0);
          cell.value = {
            formula: `SUM(H${startRow}:H${endRow})`,
            result: totalDays
          };
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.value = '';
        }
      }
    } else if (reportType === 'training') {
      for (let c = 1; c <= columns.length; c++) {
        const cell = summaryRow.getCell(c);
        applySummaryStyle(cell);
        if (c === 4) {
          cell.value = 'TOTAL HOURS / RECORDS:';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 5) {
          const totalHours = data.reduce((acc, t) => acc + Number(t.hours || 0), 0);
          cell.value = {
            formula: `SUM(E${startRow}:E${endRow})`,
            result: totalHours
          };
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 6) {
          cell.value = {
            formula: `COUNTA(A${startRow}:A${endRow})`,
            result: numRows
          };
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.value = '';
        }
      }
    } else {
      // Generic Record Count Row
      for (let c = 1; c <= columns.length; c++) {
        const cell = summaryRow.getCell(c);
        applySummaryStyle(cell);
        if (c === 1) {
          cell.value = 'TOTAL RECORDS:';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else if (c === 2) {
          cell.value = {
            formula: `COUNTA(A${startRow}:A${endRow})`,
            result: numRows
          };
          cell.numFmt = '#,##0';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.value = '';
        }
      }
    }
  }

  // Auto-fit column widths
  columns.forEach((col, idx) => {
    let maxLen = Math.max(col.label.length, 12);
    data.forEach(r => {
      const v = r[col.key];
      if (v !== null && v !== undefined) {
        const len = String(v).length;
        if (len > maxLen) maxLen = Math.min(len, 45);
      }
    });
    worksheet.getColumn(idx + 1).width = maxLen + 4;
  });

  return workbook.xlsx.writeBuffer();
}

export async function exportReportXlsx(
  reportTitle: string,
  data: any[],
  columns: ExportColumnDef[],
  reportType?: string,
  filename?: string
): Promise<void> {
  const buffer = await buildReportXlsxBuffer(reportTitle, data, columns, reportType);
  const blob = new Blob([buffer as any], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = filename || `${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
