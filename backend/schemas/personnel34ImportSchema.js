/**
 * Backend Schema Configuration & Validator for the 34 Official PNP Personnel Headers
 * PNP-ITMS Personnel and Assignment Information System (PAIS 2.0)
 */

export const PERSONNEL_34_FIELD_KEYS = Object.freeze([
  // Section A: Personal Information
  'rank',
  'lastName',
  'firstName',
  'middleName',
  'qualification',
  'birthdate',
  'gender',
  'civilStatus',
  'religion',
  'address',

  // Section B: Personnel Identification and Contact
  'badgeNo',
  'email',
  'contactNumber',
  'tin',
  'gsisNumber',
  'philHealthNo',
  'pagibigNo',

  // Section C: Service and Career Information
  'dateOfEntry',
  'designation',
  'designationDate',
  'lastPromotionDate',
  'sourceOfCommissionship',
  'enterInOfficerPositionDate',
  'status',
  'pstatusDate',
  'rankStatus',

  // Section D: Organizational Assignment
  'unitCode',
  'unit',
  'subUnitCode',
  'sub_unit',
  'stationCode',
  'station',
  'subStationCode',
  'subStation',

  // Database snake_case mirrors
  'first_name',
  'last_name',
  'middle_name',
  'badge_number',
  'phone_number',
  'date_entered_service',
  'designation_date',
  'last_promotion_date',
  'source_of_commissionship',
  'date_of_officership_or_commission',
  'pstatus',
  'pstatus_date',
  'rank_status',
  'civil_status',
  'unit_code',
  'sub_unit_code',
  'station_code',
  'sub_station_code',
  'sub_station',
  'gsis_number',
  'phil_health_no',
  'pagibig_no',

  // Legacy compatibility fields
  'qualifier',
  'birthday',
  'desUp',
  'division',
  'detail',
  'details',
  'salaryGrade',
  'plantilla',
  'rankCategory',
  'positionCategory',
  'unitCategory',
  'subUnitCategory',
  'officeDivision'
]);

export const PERSONNEL_34_REQUIRED_FIELDS = Object.freeze([
  'rank',
  'firstName',
  'lastName'
]);

/**
 * Normalizes header string for comparison
 */
export const normalizeHeader = header =>
  String(header || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_\-./()]+/g, '');

/**
 * Maps raw spreadsheet header to the standard model property
 */
export const SPREADSHEET_TO_MODEL_FIELD = Object.freeze({
  RANK: 'rank',
  LASTNAME: 'lastName',
  FIRSTNAME: 'firstName',
  MIDDLENAME: 'middleName',
  QUAL: 'qualification',
  QUALIFIER: 'qualification',
  BADGENUMBER: 'badgeNo',
  BADGENO: 'badgeNo',
  BADGENOSG: 'badgeNo',
  BIRTHDATE: 'birthdate',
  BIRTHDAY: 'birthdate',
  DATEENTEREDSERVICE: 'dateOfEntry',
  DESUP: 'dateOfEntry',
  DATEOFENTRY: 'dateOfEntry',
  DESIGNATION: 'designation',
  DESIGNATIONDATE: 'designationDate',
  LASTPROMOTIONDATE: 'lastPromotionDate',
  SOURCEOFCOMMISSIONSHIP: 'sourceOfCommissionship',
  DATEOFOFFICERSHIPORCOMMISSION: 'enterInOfficerPositionDate',
  PSTATUS: 'status',
  STATUS: 'status',
  PSTATUSDATE: 'pstatusDate',
  RANKSTATUS: 'rankStatus',
  UNITCODE: 'unitCode',
  UNIT: 'unit',
  SUBUNITCODE: 'subUnitCode',
  SUBUNIT: 'sub_unit',
  DIVISION: 'sub_unit',
  OFFICEDIVISION: 'sub_unit',
  STATIONCODE: 'stationCode',
  STATION: 'station',
  SUBSTATIONCODE: 'subStationCode',
  SUBSTATION: 'subStation',
  GENDER: 'gender',
  CIVILSTATUS: 'civilStatus',
  RELIGION: 'religion',
  EMAIL: 'email',
  PHONENUMBER: 'contactNumber',
  CONTACTNUMBER: 'contactNumber',
  TIN: 'tin',
  GSISNUMBER: 'gsisNumber',
  PHILHEALTHNO: 'philHealthNo',
  PAGIBIGNO: 'pagibigNo',
  ADDRESS: 'address'
});
