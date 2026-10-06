import type { Personnel } from '../types/pais';

export interface PersonnelRosterColumn {
  header: string;
  field: keyof Personnel | null;
  width: number;
}

/** October alphalist layout: header row 8, personnel rows from row 9. */
export const OCTOBER_PERSONNEL_ROSTER_COLUMNS: readonly PersonnelRosterColumn[] = Object.freeze([
  { header: '', field: null, width: 7.71 },
  { header: 'Link', field: 'sourceLink', width: 7.86 },
  { header: 'Link', field: 'sourceLink', width: 1.14 },
  { header: 'Link', field: 'sourceLink', width: 8.57 },
  { header: 'Account Number', field: 'accountNumber', width: 19.86 },
  { header: 'Rank', field: 'rank', width: 9.86 },
  { header: 'Last Name', field: 'lastName', width: 13.71 },
  { header: 'Last Name', field: 'lastName', width: 10.14 },
  { header: 'First Name', field: 'firstName', width: 26.71 },
  { header: 'Middle Name', field: 'middleName', width: 22 },
  { header: 'Qual', field: 'qualifier', width: 6.57 },
  { header: 'Badge Number', field: 'badgeNo', width: 13.71 },
  { header: 'BirthDate', field: 'birthdate', width: 16.57 },
  { header: 'Date Entered Service', field: 'dateEnteredService', width: 17 },
  { header: 'Designation', field: 'designation', width: 23 },
  { header: 'Designation', field: 'designation', width: 4.43 },
  { header: 'Designation Date', field: 'designationDate', width: 19.14 },
  { header: 'Last Promotion Date', field: 'lastPromotionDate', width: 16.86 },
  { header: 'Source Of Commissionship', field: 'sourceOfCommissionship', width: 32 },
  { header: 'Date Of Officership Or Commission', field: 'dateOfOfficershipOrCommission', width: 22.86 },
  { header: 'PStatus', field: 'pstatus', width: 21.71 },
  { header: 'PStatus Date', field: 'pstatusDate', width: 16.14 },
  { header: 'Rank Status', field: 'rankStatus', width: 13.71 },
  { header: 'Unit Code', field: 'unitCode', width: 11 },
  { header: 'Unit', field: 'unit', width: 15.86 },
  { header: 'Sub Unit Code', field: 'subUnitCode', width: 10.14 },
  { header: 'Sub Unit', field: 'sub_unit', width: 32.86 },
  { header: 'Station Code', field: 'stationCode', width: 9.57 },
  { header: 'Station', field: 'station', width: 23.86 },
  { header: 'Sub Station Code', field: 'subStationCode', width: 12.71 },
  { header: 'Sub Station', field: 'subStation', width: 18.43 },
  { header: 'Gender', field: 'gender', width: 12 },
  { header: 'Civil Status', field: 'civilStatus', width: 14.14 },
  { header: 'Religion', field: 'religion', width: 17.43 },
  { header: 'Email', field: 'email', width: 25.29 },
  { header: 'Phone Number', field: 'contactNumber', width: 15.71 },
  { header: 'TIN', field: 'tin', width: 15.43 },
  { header: 'Gsis Number', field: 'gsisNumber', width: 13.71 },
  { header: 'Phil Health No', field: 'philHealthNo', width: 17 },
  { header: 'Pagibig No', field: 'pagibigNo', width: 13.71 },
  { header: 'Address', field: 'address', width: 84.29 },
  { header: '', field: null, width: 7.57 }
]);

export const OCTOBER_PERSONNEL_HEADER_ROW = 8;
