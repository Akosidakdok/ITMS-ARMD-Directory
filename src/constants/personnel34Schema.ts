/**
 * Centralized Schema Configuration for the 34 Official PNP Personnel Headers
 * PNP-ITMS Personnel and Assignment Information System (PAIS 2.0)
 */

export interface Personnel34FieldConfig {
  index: number;
  header: string;
  dbField: string;
  modelField: string;
  section: 'personal' | 'identification' | 'service' | 'organization';
  label: string;
  type: 'text' | 'date' | 'select' | 'email' | 'phone';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
}

export const OFFICIAL_34_COLUMNS: readonly Personnel34FieldConfig[] = Object.freeze([
  // Section A: Personal Information
  {
    index: 1,
    header: 'Rank',
    dbField: 'rank',
    modelField: 'rank',
    section: 'personal',
    label: 'Rank',
    type: 'select',
    required: true,
    options: [
      'PGEN', 'PLTGEN', 'PMGEN', 'PBGEN',
      'PCOL', 'PLTCOL', 'PMAJ', 'PCPT', 'PLT',
      'PEMS', 'PCMS', 'PSMS', 'PMSg', 'PSSg', 'PCpl', 'Pat',
      'NUP'
    ]
  },
  {
    index: 2,
    header: 'Last Name',
    dbField: 'last_name',
    modelField: 'lastName',
    section: 'personal',
    label: 'Last Name',
    type: 'text',
    required: true
  },
  {
    index: 3,
    header: 'First Name',
    dbField: 'first_name',
    modelField: 'firstName',
    section: 'personal',
    label: 'First Name',
    type: 'text',
    required: true
  },
  {
    index: 4,
    header: 'Middle Name',
    dbField: 'middle_name',
    modelField: 'middleName',
    section: 'personal',
    label: 'Middle Name',
    type: 'text',
    placeholder: 'Middle name or leave blank'
  },
  {
    index: 5,
    header: 'Qual',
    dbField: 'qualification',
    modelField: 'qualification',
    section: 'personal',
    label: 'Qualifier (Qual)',
    type: 'text',
    placeholder: 'e.g. Jr., Sr., III'
  },
  {
    index: 6,
    header: 'BirthDate',
    dbField: 'birthdate',
    modelField: 'birthdate',
    section: 'personal',
    label: 'Birth Date',
    type: 'date',
    placeholder: 'YYYY-MM-DD'
  },
  {
    index: 7,
    header: 'Gender',
    dbField: 'gender',
    modelField: 'gender',
    section: 'personal',
    label: 'Gender',
    type: 'select',
    options: ['Male', 'Female']
  },
  {
    index: 8,
    header: 'Civil Status',
    dbField: 'civil_status',
    modelField: 'civilStatus',
    section: 'personal',
    label: 'Civil Status',
    type: 'select',
    options: ['Single', 'Married', 'Widowed', 'Separated', 'Divorced']
  },
  {
    index: 9,
    header: 'Religion',
    dbField: 'religion',
    modelField: 'religion',
    section: 'personal',
    label: 'Religion',
    type: 'text',
    placeholder: 'e.g. Roman Catholic, Islam, INC'
  },
  {
    index: 10,
    header: 'Address',
    dbField: 'address',
    modelField: 'address',
    section: 'personal',
    label: 'Residential Address',
    type: 'text',
    placeholder: 'Complete address'
  },

  // Section B: Personnel Identification and Contact
  {
    index: 11,
    header: 'Badge Number',
    dbField: 'badge_number',
    modelField: 'badgeNo',
    section: 'identification',
    label: 'Badge Number',
    type: 'text',
    placeholder: 'Badge No. (Uniformed) or NUP SG'
  },
  {
    index: 12,
    header: 'Email',
    dbField: 'email',
    modelField: 'email',
    section: 'identification',
    label: 'Official / Primary Email',
    type: 'email',
    placeholder: 'personnel@pnp.gov.ph'
  },
  {
    index: 13,
    header: 'Phone Number',
    dbField: 'phone_number',
    modelField: 'contactNumber',
    section: 'identification',
    label: 'Phone / Mobile Number',
    type: 'phone',
    placeholder: 'e.g. 09171234567'
  },
  {
    index: 14,
    header: 'TIN',
    dbField: 'tin',
    modelField: 'tin',
    section: 'identification',
    label: 'Tax Identification No. (TIN)',
    type: 'text',
    placeholder: 'e.g. 123-456-789-000'
  },
  {
    index: 15,
    header: 'Gsis Number',
    dbField: 'gsis_number',
    modelField: 'gsisNumber',
    section: 'identification',
    label: 'GSIS Policy / BP Number',
    type: 'text',
    placeholder: 'e.g. 2001234567'
  },
  {
    index: 16,
    header: 'Phil Health No',
    dbField: 'phil_health_no',
    modelField: 'philHealthNo',
    section: 'identification',
    label: 'PhilHealth Identification No.',
    type: 'text',
    placeholder: 'e.g. 12-345678901-2'
  },
  {
    index: 17,
    header: 'Pagibig No',
    dbField: 'pagibig_no',
    modelField: 'pagibigNo',
    section: 'identification',
    label: 'Pag-IBIG / MID Number',
    type: 'text',
    placeholder: 'e.g. 1234-5678-9012'
  },

  // Section C: Service and Career Information
  {
    index: 18,
    header: 'Date Entered Service',
    dbField: 'date_entered_service',
    modelField: 'dateOfEntry',
    section: 'service',
    label: 'Date Entered Service',
    type: 'date',
    placeholder: 'YYYY-MM-DD'
  },
  {
    index: 19,
    header: 'Designation',
    dbField: 'designation',
    modelField: 'designation',
    section: 'service',
    label: 'Official Designation',
    type: 'text',
    placeholder: 'e.g. Chief, Operations Section'
  },
  {
    index: 20,
    header: 'Designation Date',
    dbField: 'designation_date',
    modelField: 'designationDate',
    section: 'service',
    label: 'Designation Effective Date',
    type: 'date',
    placeholder: 'YYYY-MM-DD'
  },
  {
    index: 21,
    header: 'Last Promotion Date',
    dbField: 'last_promotion_date',
    modelField: 'lastPromotionDate',
    section: 'service',
    label: 'Last Promotion Date',
    type: 'date',
    placeholder: 'YYYY-MM-DD'
  },
  {
    index: 22,
    header: 'Source Of Commissionship',
    dbField: 'source_of_commissionship',
    modelField: 'sourceOfCommissionship',
    section: 'service',
    label: 'Source of Commissionship',
    type: 'select',
    options: [
      'PNPA (Philippine National Police Academy)',
      'Lateral Entry (Technical Officers)',
      'Officer Candidate Course (OCC)',
      'Direct Commission',
      'Not Applicable (PNCO/NUP)'
    ]
  },
  {
    index: 23,
    header: 'Date Of Officership Or Commission',
    dbField: 'date_of_officership_or_commission',
    modelField: 'enterInOfficerPositionDate',
    section: 'service',
    label: 'Date of Officership / Commission',
    type: 'date',
    placeholder: 'YYYY-MM-DD'
  },
  {
    index: 24,
    header: 'PStatus',
    dbField: 'pstatus',
    modelField: 'status',
    section: 'service',
    label: 'Personnel Status (PStatus)',
    type: 'select',
    options: ['Active', 'PERM', 'TEMP', 'PROV', 'CASUAL', 'Detailed Out', 'On Leave', 'Suspended']
  },
  {
    index: 25,
    header: 'PStatus Date',
    dbField: 'pstatus_date',
    modelField: 'pstatusDate',
    section: 'service',
    label: 'PStatus Effective Date',
    type: 'date',
    placeholder: 'YYYY-MM-DD'
  },
  {
    index: 26,
    header: 'Rank Status',
    dbField: 'rank_status',
    modelField: 'rankStatus',
    section: 'service',
    label: 'Rank Status',
    type: 'select',
    options: ['Permanent', 'Temporary', 'Acting', 'Probationary']
  },

  // Section D: Organizational Assignment
  {
    index: 27,
    header: 'Unit Code',
    dbField: 'unit_code',
    modelField: 'unitCode',
    section: 'organization',
    label: 'Unit Code',
    type: 'text',
    placeholder: 'e.g. ITMS, NHQ'
  },
  {
    index: 28,
    header: 'Unit',
    dbField: 'unit',
    modelField: 'unit',
    section: 'organization',
    label: 'Unit Name',
    type: 'text',
    placeholder: 'e.g. Information Technology Management Service'
  },
  {
    index: 29,
    header: 'Sub Unit Code',
    dbField: 'sub_unit_code',
    modelField: 'subUnitCode',
    section: 'organization',
    label: 'Sub Unit Code',
    type: 'text',
    placeholder: 'e.g. ARMD, SMD, ITOD'
  },
  {
    index: 30,
    header: 'Sub Unit',
    dbField: 'sub_unit',
    modelField: 'sub_unit',
    section: 'organization',
    label: 'Sub Unit Name',
    type: 'text',
    placeholder: 'e.g. Administrative and Resource Management Division'
  },
  {
    index: 31,
    header: 'Station Code',
    dbField: 'station_code',
    modelField: 'stationCode',
    section: 'organization',
    label: 'Station Code',
    type: 'text',
    placeholder: 'e.g. STN-01'
  },
  {
    index: 32,
    header: 'Station',
    dbField: 'station',
    modelField: 'station',
    section: 'organization',
    label: 'Station Name',
    type: 'text',
    placeholder: 'e.g. Camp BGen Rafael T Crame'
  },
  {
    index: 33,
    header: 'Sub Station Code',
    dbField: 'sub_station_code',
    modelField: 'subStationCode',
    section: 'organization',
    label: 'Sub Station Code',
    type: 'text',
    placeholder: 'e.g. SSTN-01'
  },
  {
    index: 34,
    header: 'Sub Station',
    dbField: 'sub_station',
    modelField: 'subStation',
    section: 'organization',
    label: 'Sub Station Name',
    type: 'text',
    placeholder: 'e.g. Building 103'
  }
]);

export const OFFICIAL_34_HEADER_NAMES = OFFICIAL_34_COLUMNS.map(c => c.header);

/**
 * Normalizes header string for comparison
 */
export const normalizeHeaderString = (header: string): string =>
  String(header || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_\-./()]+/g, '');

/**
 * Canonical dictionary mapping normalized header variations to official config
 */
export const HEADER_TO_CONFIG_MAP = new Map<string, Personnel34FieldConfig>();

for (const col of OFFICIAL_34_COLUMNS) {
  HEADER_TO_CONFIG_MAP.set(normalizeHeaderString(col.header), col);
  HEADER_TO_CONFIG_MAP.set(normalizeHeaderString(col.dbField), col);
  HEADER_TO_CONFIG_MAP.set(normalizeHeaderString(col.modelField), col);
}

// Additional common spreadsheet aliases
HEADER_TO_CONFIG_MAP.set('BADGENO', OFFICIAL_34_COLUMNS[10]);
HEADER_TO_CONFIG_MAP.set('BADGENOSG', OFFICIAL_34_COLUMNS[10]);
HEADER_TO_CONFIG_MAP.set('BIRTHDAY', OFFICIAL_34_COLUMNS[5]);
HEADER_TO_CONFIG_MAP.set('QUALIFIER', OFFICIAL_34_COLUMNS[4]);
HEADER_TO_CONFIG_MAP.set('DESUP', OFFICIAL_34_COLUMNS[17]);
HEADER_TO_CONFIG_MAP.set('DATEOFENTRY', OFFICIAL_34_COLUMNS[17]);
HEADER_TO_CONFIG_MAP.set('DIVISION', OFFICIAL_34_COLUMNS[29]);
HEADER_TO_CONFIG_MAP.set('OFFICEDIVISION', OFFICIAL_34_COLUMNS[29]);
HEADER_TO_CONFIG_MAP.set('STATUS', OFFICIAL_34_COLUMNS[23]);
HEADER_TO_CONFIG_MAP.set('CONTACTNUMBER', OFFICIAL_34_COLUMNS[12]);
HEADER_TO_CONFIG_MAP.set('PHONENO', OFFICIAL_34_COLUMNS[12]);
HEADER_TO_CONFIG_MAP.set('PHILHEALTHNUMBER', OFFICIAL_34_COLUMNS[15]);
HEADER_TO_CONFIG_MAP.set('PAGIBIGNUMBER', OFFICIAL_34_COLUMNS[16]);
HEADER_TO_CONFIG_MAP.set('GSISNO', OFFICIAL_34_COLUMNS[14]);

export interface DetectedSection {
  id: number;
  label: string;
  startIndex: number;
  endIndex: number;
  matchedHeaders: number;
}

/**
 * Detects whether an uploaded sheet contains duplicate contiguous 34-column sections
 */
export const detectDuplicate34Sections = (headerRow: string[]): DetectedSection[] => {
  if (!headerRow || headerRow.length < 34) return [];

  const sections: DetectedSection[] = [];
  const normalizedRow = headerRow.map(h => normalizeHeaderString(h));

  // Check chunks of 34 or find repeated occurrences of primary headers like 'RANK' or 'LASTNAME'
  const rankIndices: number[] = [];
  normalizedRow.forEach((norm, idx) => {
    if (norm === 'RANK') rankIndices.push(idx);
  });

  if (rankIndices.length > 1) {
    rankIndices.forEach((startIdx, i) => {
      const nextStart = rankIndices[i + 1] !== undefined ? rankIndices[i + 1] : headerRow.length;
      const endIdx = nextStart - 1;
      let matches = 0;
      for (let j = startIdx; j <= endIdx && j < headerRow.length; j++) {
        if (HEADER_TO_CONFIG_MAP.has(normalizedRow[j])) matches++;
      }
      if (matches >= 10) {
        sections.push({
          id: i + 1,
          label: `Section ${i + 1} (Columns ${startIdx + 1} to ${endIdx + 1})`,
          startIndex: startIdx,
          endIndex: endIdx,
          matchedHeaders: matches
        });
      }
    });
  }

  return sections.length > 1 ? sections : [];
};
