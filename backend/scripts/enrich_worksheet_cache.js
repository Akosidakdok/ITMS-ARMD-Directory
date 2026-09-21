import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { calculateDatedif } from '../services/worksheetDataService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_PATH = path.join(__dirname, '..', 'store', 'cached_worksheet_data.json');
const REFERENCE_PATH = path.join(__dirname, '..', '..', 'src', 'reference', 'disposition September 7, 2026.xlsx');

async function enrichWorksheetCache() {
  console.log('Loading reference workbook...');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(REFERENCE_PATH);

  console.log('Loading cache...');
  const cacheData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));

  for (const sheet of cacheData) {
    const ws = wb.getWorksheet(sheet.name);
    if (!ws) continue;

    console.log(`Processing sheet: "${sheet.name}"...`);

    // 1. Recover all formulas and results from Excel
    for (const [addr, cell] of Object.entries(sheet.cells)) {
      const ec = ws.getCell(addr);

      // Formula recovery
      if (ec.formula) {
        cell.f = ec.formula;
      }

      // Value & Result cleanup
      if (cell.v !== null && typeof cell.v === 'object') {
        if (ec.result !== undefined && !(typeof ec.result === 'object' && ec.result?.error)) {
          cell.v = ec.result;
          cell.res = ec.result;
        } else if (cell.v.result !== undefined && !(typeof cell.v.result === 'object' && cell.v.result?.error)) {
          cell.v = cell.v.result;
          cell.res = cell.v.result;
        } else if (cell.v.error) {
          cell.v = cell.v.error;
          cell.res = cell.v.error;
        } else if (typeof ec.value === 'object' && ec.value?.result !== undefined) {
          cell.v = ec.value.result;
          cell.res = ec.value.result;
        } else {
          cell.v = '';
          cell.res = null;
        }
      }

      // Check again if cell.v is still an object
      if (cell.v !== null && typeof cell.v === 'object') {
        if (cell.v.text) cell.v = String(cell.v.text);
        else if (Array.isArray(cell.v.richText)) cell.v = cell.v.richText.map(t => t.text || '').join('');
        else if (cell.v.result !== undefined) cell.v = cell.v.result;
        else if (cell.v.error) cell.v = String(cell.v.error);
        else cell.v = '';
      }
    }

    // 2. Alpha List: dynamic DATEDIF evaluations for age & service
    if (sheet.name === 'Alpha List') {
      const todayDate = new Date();
      for (let r = 9; r <= sheet.rowCount; r++) {
        const bdayCell = sheet.cells[`J${r}`];
        const ageCell = sheet.cells[`I${r}`];
        if (bdayCell && bdayCell.v && ageCell) {
          const age = calculateDatedif(bdayCell.v, todayDate);
          if (age) {
            ageCell.v = age;
            ageCell.res = age;
            ageCell.f = `DATEDIF(J${r},TODAY(),"y")&" years, "&DATEDIF(J${r},TODAY(),"ym")&" month(s), "&DATEDIF(J${r},TODAY(),"md")&" day(s)"`;
            ageCell.isCalculated = true;
          }
        }

        const desCell = sheet.cells[`L${r}`];
        const servCell = sheet.cells[`K${r}`];
        if (desCell && desCell.v && servCell) {
          const serv = calculateDatedif(desCell.v, todayDate);
          if (serv) {
            servCell.v = serv;
            servCell.res = serv;
            servCell.f = `DATEDIF(L${r},TODAY(),"y")&" years, "&DATEDIF(L${r},TODAY(),"ym")&" month(s), "&DATEDIF(L${r},TODAY(),"md")&" day(s)"`;
            servCell.isCalculated = true;
          }
        }
      }
    }

    // 3. Disposition: full name concatenation
    if (sheet.name === 'Disposition') {
      for (let r = 10; r <= sheet.rowCount; r++) {
        const lastCell = sheet.cells[`E${r}`];
        const firstCell = sheet.cells[`F${r}`];
        const midCell = sheet.cells[`G${r}`];
        const pCell = sheet.cells[`P${r}`];

        if (lastCell?.v && firstCell?.v && pCell) {
          const l = String(lastCell.v).trim();
          const f = String(firstCell.v).trim();
          const m = midCell?.v ? String(midCell.v).trim() : '';
          pCell.v = [l, f, m].filter(Boolean).join(' ');
          pCell.res = pCell.v;
          pCell.f = `CONCATENATE(E${r}," ",F${r}," ",G${r})`;
          pCell.isCalculated = true;
        }
      }
    }

    // 4. ITMS HQ: Variance and Section Subtotals
    if (sheet.name === 'ITMS HQ') {
      for (let r = 10; r <= 45; r++) {
        const cCell = sheet.cells[`C${r}`];
        const dCell = sheet.cells[`D${r}`];
        const eCell = sheet.cells[`E${r}`];

        if (eCell) {
          eCell.f = `D${r}-C${r}`;
          const auth = Number(cCell?.v || 0);
          const act = Number(dCell?.v || 0);
          eCell.v = act - auth;
          eCell.res = eCell.v;
          eCell.isCalculated = true;
        }
      }

      // Recalculate Subtotal rows
      const subtotalRows = [13, 17, 21, 25, 29, 33, 37, 41];
      subtotalRows.forEach(subRow => {
        const startR = subRow - 3;
        const endR = subRow - 1;
        let authSum = 0;
        let actSum = 0;
        for (let r = startR; r <= endR; r++) {
          authSum += Number(sheet.cells[`C${r}`]?.v || 0);
          actSum += Number(sheet.cells[`D${r}`]?.v || 0);
        }
        if (sheet.cells[`C${subRow}`]) {
          sheet.cells[`C${subRow}`].v = authSum;
          sheet.cells[`C${subRow}`].f = `SUM(C${startR}:C${endR})`;
          sheet.cells[`C${subRow}`].res = authSum;
          sheet.cells[`C${subRow}`].isCalculated = true;
        }
        if (sheet.cells[`D${subRow}`]) {
          sheet.cells[`D${subRow}`].v = actSum;
          sheet.cells[`D${subRow}`].f = `SUM(D${startR}:D${endR})`;
          sheet.cells[`D${subRow}`].res = actSum;
          sheet.cells[`D${subRow}`].isCalculated = true;
        }
        if (sheet.cells[`E${subRow}`]) {
          sheet.cells[`E${subRow}`].v = actSum - authSum;
          sheet.cells[`E${subRow}`].f = `D${subRow}-C${subRow}`;
          sheet.cells[`E${subRow}`].res = actSum - authSum;
          sheet.cells[`E${subRow}`].isCalculated = true;
        }
      });

      // Recalculate Category Totals (Rows 42, 43, 44)
      const pcoRows = [10, 14, 18, 22, 26, 30, 34, 38];
      const pncoRows = [11, 15, 19, 23, 27, 31, 35, 39];
      const nupRows = [12, 16, 20, 24, 28, 32, 36, 40];

      const calcCategory = (targetRow, sourceRows) => {
        let auth = 0;
        let act = 0;
        sourceRows.forEach(r => {
          auth += Number(sheet.cells[`C${r}`]?.v || 0);
          act += Number(sheet.cells[`D${r}`]?.v || 0);
        });
        if (sheet.cells[`C${targetRow}`]) {
          sheet.cells[`C${targetRow}`].v = auth;
          sheet.cells[`C${targetRow}`].f = sourceRows.map(r => `C${r}`).join('+');
          sheet.cells[`C${targetRow}`].res = auth;
          sheet.cells[`C${targetRow}`].isCalculated = true;
        }
        if (sheet.cells[`D${targetRow}`]) {
          sheet.cells[`D${targetRow}`].v = act;
          sheet.cells[`D${targetRow}`].f = sourceRows.map(r => `D${r}`).join('+');
          sheet.cells[`D${targetRow}`].res = act;
          sheet.cells[`D${targetRow}`].isCalculated = true;
        }
        if (sheet.cells[`E${targetRow}`]) {
          sheet.cells[`E${targetRow}`].v = act - auth;
          sheet.cells[`E${targetRow}`].f = `D${targetRow}-C${targetRow}`;
          sheet.cells[`E${targetRow}`].res = act - auth;
          sheet.cells[`E${targetRow}`].isCalculated = true;
        }
      };

      calcCategory(42, pcoRows);
      calcCategory(43, pncoRows);
      calcCategory(44, nupRows);

      // Grand Total Row 45
      const grandAuth = Number(sheet.cells['C42']?.v || 0) + Number(sheet.cells['C43']?.v || 0) + Number(sheet.cells['C44']?.v || 0);
      const grandAct = Number(sheet.cells['D42']?.v || 0) + Number(sheet.cells['D43']?.v || 0) + Number(sheet.cells['D44']?.v || 0);
      if (sheet.cells['C45']) {
        sheet.cells['C45'].v = grandAuth;
        sheet.cells['C45'].f = 'SUM(C42:C44)';
        sheet.cells['C45'].res = grandAuth;
        sheet.cells['C45'].isCalculated = true;
      }
      if (sheet.cells['D45']) {
        sheet.cells['D45'].v = grandAct;
        sheet.cells['D45'].f = 'SUM(D42:D44)';
        sheet.cells['D45'].res = grandAct;
        sheet.cells['D45'].isCalculated = true;
      }
      if (sheet.cells['E45']) {
        sheet.cells['E45'].v = grandAct - grandAuth;
        sheet.cells['E45'].f = 'D45-C45';
        sheet.cells['E45'].res = grandAct - grandAuth;
        sheet.cells['E45'].isCalculated = true;
      }
    }

    // 5. Rank Profile with OSSP: Variance and Column Calculations
    if (sheet.name === 'Rank Profile with OSSP') {
      for (let r = 9; r <= 33; r++) {
        const hCell = sheet.cells[`H${r}`];
        const iCell = sheet.cells[`I${r}`];
        const jCell = sheet.cells[`J${r}`];
        const kCell = sheet.cells[`K${r}`];

        if (kCell) {
          kCell.f = `J${r}-I${r}`;
          const actual = Number(jCell?.v || 0);
          const auth = Number(iCell?.v || 0);
          kCell.v = actual - auth;
          kCell.res = kCell.v;
          kCell.isCalculated = true;
        }
      }
    }

    // 6. Updates for ADMO: Totals
    if (sheet.name === 'Updates for ADMO') {
      [10, 11, 12].forEach(r => {
        const iCell = sheet.cells[`I${r}`];
        const nCell = sheet.cells[`N${r}`];
        if (iCell) {
          let sum = 0;
          ['E', 'F', 'G', 'H'].forEach(col => {
            sum += Number(sheet.cells[`${col}${r}`]?.v || 0);
          });
          iCell.v = sum;
          iCell.res = sum;
          iCell.f = `SUM(E${r}:H${r})`;
          iCell.isCalculated = true;
        }
        if (nCell) {
          const c = Number(sheet.cells[`C${r}`]?.v || 0);
          const i = Number(sheet.cells[`I${r}`]?.v || 0);
          const j = Number(sheet.cells[`J${r}`]?.v || 0);
          const l = Number(sheet.cells[`L${r}`]?.v || 0);
          nCell.v = c + i + j + l;
          nCell.res = nCell.v;
          nCell.f = `C${r}+I${r}+J${r}+L${r}`;
          nCell.isCalculated = true;
        }
      });
    }
  }

  // Verify no objects remain in any cell.v across all sheets
  let totalObjectCells = 0;
  for (const sheet of cacheData) {
    for (const [addr, cell] of Object.entries(sheet.cells)) {
      if (cell.v !== null && typeof cell.v === 'object') {
        console.error(`Warning: Still object at ${sheet.name} ${addr}:`, cell.v);
        totalObjectCells++;
      }
    }
  }
  console.log(`Verification: Remaining object cells count across all sheets: ${totalObjectCells}`);

  console.log('Writing updated cache...');
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cacheData), 'utf8');
  console.log('Successfully enriched cached_worksheet_data.json!');
}

enrichWorksheetCache().catch(console.error);
