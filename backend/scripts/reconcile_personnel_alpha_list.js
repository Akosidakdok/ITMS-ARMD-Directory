import fs from 'fs';
import path from 'path';
import ExcelJS from 'file:///c:/Users/CJ%20Baldonado/Documents/GitHub/New%20folder/ITMS-ARMD-Directory/node_modules/exceljs/dist/es5/index.js';
import { supabaseAdmin, supabase } from 'file:///c:/Users/CJ%20Baldonado/Documents/GitHub/New%20folder/ITMS-ARMD-Directory/backend/config/supabase.js';

const client = supabaseAdmin || supabase;

const formatDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
};

const formatText = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val.result !== undefined) {
    val = val.result;
  }
  return String(val).trim();
};

async function reconcile(dryRun = true) {
  console.log(`Starting Personnel Reconciliation from Alpha List (Dry Run: ${dryRun})...`);

  // Load existing personnel from Supabase
  const { data: dbPersonnel, error: fetchErr } = await client
    .from('personnel')
    .select('*');

  if (fetchErr) {
    console.error('Failed to fetch personnel from Supabase:', fetchErr);
    return;
  }
  console.log(`Fetched ${dbPersonnel.length} personnel from Supabase.`);

  // Create lookup maps
  const dbByName = new Map();
  for (const p of dbPersonnel) {
    const key = `${p.lastName || ''}__${p.firstName || ''}`.toUpperCase().trim();
    dbByName.set(key, p);
  }

  // Load official Alpha List from workbook
  const wb = new ExcelJS.Workbook();
  const filePath = 'c:/Users/CJ Baldonado/Documents/GitHub/New folder/ITMS-ARMD-Directory/backend/store/disposition September 7, 2026.xlsx';
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('Alpha List');
  console.log(`Reading worksheet "Alpha List" (${ws.rowCount} rows)...`);

  let matched = 0;
  let unmatched = 0;
  const updates = [];

  for (let r = 9; r <= ws.rowCount; r++) {
    const rowVals = ws.getRow(r).values;
    if (!rowVals || !rowVals[2]) continue; // no rank
    const cols = rowVals.slice(1);

    const rank = formatText(cols[1]);
    const status = formatText(cols[2]) || 'Active';
    const badgeOrSg = formatText(cols[3]);
    const lastName = formatText(cols[4]);
    const firstName = formatText(cols[5]);
    let middleName = formatText(cols[6]);
    if (/^\(no middle name\)$/i.test(middleName) || middleName === 'N/A') {
      middleName = '';
    }
    const qualifier = formatText(cols[7]);
    const ageToDate = formatText(cols[8]);
    const birthdate = formatDate(cols[9]);
    const ageOfServiceToDate = formatText(cols[10]);
    const desUp = formatDate(cols[11]);
    const pnco = formatDate(cols[12]);
    const nup = formatDate(cols[13]);
    const officeDivision = formatText(cols[14]);
    const designation = formatText(cols[15]);

    const calcYears = (startDateStr) => {
      if (!startDateStr) return null;
      const start = new Date(startDateStr);
      if (isNaN(start.getTime())) return null;
      const now = new Date();
      let years = now.getFullYear() - start.getFullYear();
      const m = now.getMonth() - start.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < start.getDate())) {
        years--;
      }
      return years >= 0 ? String(years) : null;
    };

    const calculatedAge = calcYears(birthdate) || (ageToDate && ageToDate !== 'Invalid Date' ? ageToDate : null);
    const earliestServiceDate = pnco || desUp || nup;
    const calculatedService = calcYears(earliestServiceDate) || (ageOfServiceToDate && ageOfServiceToDate !== 'Invalid Date' ? ageOfServiceToDate : null);

    const isNup = rank.toUpperCase() === 'NUP';
    const badgeNo = isNup ? '' : badgeOrSg;
    let salaryGrade = null;
    if (isNup && badgeOrSg) {
      const numMatch = String(badgeOrSg).match(/\d+/);
      salaryGrade = numMatch ? parseInt(numMatch[0], 10) : null;
    }

    const key = `${lastName}__${firstName}`.toUpperCase().trim();
    const existing = dbByName.get(key);

    if (existing) {
      matched++;
      const payload = {
        id: existing.id,
        rank: rank || existing.rank,
        status: status || existing.status,
        badgeNo: badgeNo || existing.badgeNo || '',
        salaryGrade: salaryGrade,
        lastName: lastName || existing.lastName,
        firstName: firstName || existing.firstName,
        middleName: middleName !== undefined ? middleName : existing.middleName,
        qualifier: qualifier || existing.qualifier || '',
        qualification: qualifier || existing.qualification || '',
        fullName: `${rank} ${firstName} ${middleName ? middleName[0] + '.' : ''} ${lastName} ${qualifier}`.replace(/\s+/g, ' ').trim(),
        birthdate: birthdate || existing.birthdate || existing.birthday,
        birthday: birthdate || existing.birthday || existing.birthdate,
        ageToDate: calculatedAge,
        ageOfServiceToDate: calculatedService,
        desUp: desUp || existing.desUp || existing.dateOfEntry,
        dateOfEntry: desUp || existing.dateOfEntry || existing.desUp,
        pnco: pnco || existing.pnco,
        nup: nup || existing.nup,
        officeDivision: officeDivision || existing.officeDivision || existing.sub_unit,
        sub_unit: officeDivision || existing.sub_unit || existing.officeDivision,
        division: officeDivision || existing.division || existing.sub_unit,
        designation: designation || existing.designation,
        rankCategory: isNup ? 'NUP' : (['PBGEN', 'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT'].includes(rank) ? 'PCO' : 'PNCO')
      };
      updates.push(payload);
    } else {
      unmatched++;
      console.log(`Unmatched row ${r}: ${lastName}, ${firstName}`);
    }
  }

  console.log(`Reconciliation summary: Matched: ${matched}, Unmatched: ${unmatched}, Total Updates Prepared: ${updates.length}`);

  if (updates.length > 0) {
    console.log('Sample update record #0:');
    console.log(JSON.stringify(updates[0], null, 2));
    console.log('Sample update record #1:');
    console.log(JSON.stringify(updates[1], null, 2));
  }

  if (!dryRun) {
    console.log('Applying updates in batches of 50...');
    for (let i = 0; i < updates.length; i += 50) {
      const chunk = updates.slice(i, i + 50);
      const { error: upsertErr } = await client
        .from('personnel')
        .upsert(chunk);
      if (upsertErr) {
        console.error(`Error upserting chunk ${i}-${i + chunk.length}:`, upsertErr.message);
      } else {
        console.log(`Upserted ${i + chunk.length} / ${updates.length}`);
      }
    }
    console.log('Reconciliation committed successfully.');
  }
}

const isLive = process.argv.includes('--apply');
reconcile(!isLive).catch(console.error);
