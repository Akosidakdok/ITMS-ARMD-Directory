import React, { useState, useMemo } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Personnel } from '../types/pais';
import { BulkImportModal } from '../components/personnel/BulkImportModal';
import { PersonnelSummaryCard } from '../components/personnel/PersonnelSummaryCard';
import { PersonnelInfoTab } from '../components/personnel/PersonnelInfoTab';
import { PageHeader } from '../components/common/SystemUI';
import { exportPersonnelCsv, exportPersonnelPdf, exportPersonnelXlsx } from '../utils/personnelExport';
import { hasManagementAccess } from '../utils/accessControl';
import { 
  getRankFullName, 
  isUniformedRank, 
  RANK_CATEGORIES, 
  UNIT_CATEGORIES, 
  POSITION_CATEGORIES, 
  SUB_UNIT_CATEGORIES, 
  OFFICE_DIVISION_OPTIONS,
  getPcoRanks, 
  getPncoRanks, 
  getRankCategory,
  normalizeRankCode,
  PCO_DISPLAY_RANKS,
  PNCO_DISPLAY_RANKS,
  NUP_DISPLAY_RANKS,
  isRankInCategory,
  getRanksByCategory
} from '../constants/ranks';

const UNIFORMED_RANKS_ORDER = [
  'Pat', 'PCpl', 'PSSg', 'PMSg', 'PSMS', 'PCMS', 'PEMS',
  'PLT', 'PCPT', 'PMAJ', 'PLTCOL', 'PCOL', 'PBGEN', 'PMGEN', 'PLTGEN', 'PGEN'
];

type PersonnelSortField = 'name' | 'birthdate' | 'rank' | 'badge' | 'officeDivision' | 'status' | 'designation' | 'entryDate';

const PERSONNEL_SORT_OPTIONS: Array<{ value: PersonnelSortField; label: string }> = [
  { value: 'name', label: 'Name' },
  { value: 'birthdate', label: 'Date of birth' },
  { value: 'rank', label: 'Rank' },
  { value: 'badge', label: 'Badge number / salary grade' },
  { value: 'officeDivision', label: 'Office / division' },
  { value: 'status', label: 'Duty status' },
  { value: 'designation', label: 'Designation' },
  { value: 'entryDate', label: 'Service / entry date' }
];

const BIRTH_MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
].map((label, index) => ({ value: String(index + 1), label }));
const UNRECORDED_GENDER_FILTER = '__unrecorded_gender__';

const parseDateParts = (value?: string): { year: number; month: number; day: number } | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const yearFirst = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const monthFirst = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  let year: number;
  let month: number;
  let day: number;

  if (yearFirst) {
    year = Number(yearFirst[1]);
    month = Number(yearFirst[2]);
    day = Number(yearFirst[3]);
  } else if (monthFirst) {
    month = Number(monthFirst[1]);
    day = Number(monthFirst[2]);
    year = Number(monthFirst[3]);
  } else {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
  return { year, month, day };
};

const getPersonnelBirthDate = (person: Personnel) => person.birthdate || person.birthday || '';
const datePartsSortKey = (parts: { year: number; month: number; day: number } | null) =>
  parts ? `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}` : '';

import { 
  Users, 
  User,
  Search, 
  RotateCcw, 
  Upload, 
  UserPlus, 
  Eye, 
  Edit3, 
  Trash2, 
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Check,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Calendar,
  IdCard,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award
} from 'lucide-react';
import { calculateYearsBetween } from '../utils/personnelCsv';

// ─── Export Modal Component ───────────────────────────────────────────────────

type ExportFormat = 'csv' | 'pdf' | 'xlsx';

const PersonnelExportModal: React.FC<{
  records: Personnel[];
  onClose: () => void;
}> = ({ records, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const now = new Date().toISOString().slice(0, 10);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'csv') {
        exportPersonnelCsv(records, `personnel_${now}.csv`);
      } else if (format === 'xlsx') {
        await exportPersonnelXlsx(records, `personnel_${now}.xlsx`);
      } else {
        await exportPersonnelPdf(records, `personnel_${now}.pdf`);
      }
      setDone(true);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-extrabold text-slate-800">Export Personnel</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Count badge */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <CheckSquare className="w-4 h-4 text-blue-700 flex-shrink-0" />
            <p className="text-xs font-bold text-blue-700">
              Exporting <span className="font-extrabold text-blue-900">{records.length} personnel</span> records
            </p>
          </div>

          {/* Format */}
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">File Format</p>
            <div className="grid grid-cols-3 gap-2">
              {([['pdf', 'PDF Document', 'Formatted, printable'], ['xlsx', 'Excel Roster', 'October workbook format'], ['csv', 'CSV Spreadsheet', 'Raw data for Excel']] as const).map(([key, label, desc]) => (
                <button
                  key={key}
                  onClick={() => setFormat(key as ExportFormat)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    format === key ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {key === 'pdf'
                      ? <FileText className={`w-4 h-4 ${format === key ? 'text-red-500' : 'text-slate-400'}`} />
                      : <FileSpreadsheet className={`w-4 h-4 ${format === key ? 'text-green-600' : 'text-slate-400'}`} />
                    }
                    <span className={`text-xs font-extrabold ${format === key ? 'text-blue-700' : 'text-slate-700'}`}>{label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {done && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Check className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold text-emerald-700">File downloaded successfully!</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors">Close</button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-5 py-2 text-xs rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {exporting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
              : <><Download className="w-3.5 h-3.5" /> Export {format.toUpperCase()}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const PersonnelPage: React.FC = () => {
  const { 
    role,
    personnelList, 
    addPersonnel, 
    bulkImportPersonnel,
    deletePersonnel, 
    selectedPersonnelId, 
    setSelectedPersonnelId,
    globalSearchQuery,
    setGlobalSearchQuery,
    backendConnected
  } = useAuthRole();
  const canManage = hasManagementAccess(role);

  // Search Inputs State (Real-Time Reactive & Filterable)
  const [searchAccountNo, setSearchAccountNo] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchMiddleName, setSearchMiddleName] = useState('');
  const [searchBadgeNo, setSearchBadgeNo] = useState('');
  const [searchRank, setSearchRank] = useState('Please select');
  const [searchRankCategory, setSearchRankCategory] = useState('Please select');
  const [searchOfficeDivision, setSearchOfficeDivision] = useState('Please select');
  const [searchUnit, setSearchUnit] = useState('');
  const [searchSubUnit, setSearchSubUnit] = useState('');
  const [searchStation, setSearchStation] = useState('');
  const [searchPStatus, setSearchPStatus] = useState('Please select');
  const [searchGender, setSearchGender] = useState('');
  const [searchBirthMonth, setSearchBirthMonth] = useState('');
  const [searchBirthYear, setSearchBirthYear] = useState('');

  // Modals & Action Menus
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectActiveTab, setInspectActiveTab] = useState<'personnel' | 'summary'>('summary');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false); };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting state
  const [sortField, setSortField] = useState<PersonnelSortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: PersonnelSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleSortFieldChange = (field: PersonnelSortField) => {
    setSortField(field);
    setSortDirection('asc');
    setCurrentPage(1);
  };

  const sortDirectionHelp = sortField === 'birthdate'
    ? 'For birth dates, earliest first means oldest first.'
    : sortField === 'entryDate'
      ? 'For service dates, earliest first means longest-serving first.'
      : sortField === 'rank'
        ? 'Ascending follows junior-to-senior rank order; NUP follows uniformed ranks.'
        : 'Click a sortable column heading to change the sort.';

  // Personnel Type state for registration form
  const [personnelType, setPersonnelType] = useState<'Uniformed Personnel' | 'Non-Uniformed Personnel'>('Uniformed Personnel');
  const [addFormError, setAddFormError] = useState<string | null>(null);

  // New Personnel Form State — all 34 fields organized by A. Personal Info, B. ID & Contact, C. Career, D. Assignment
  const [newPersonnelForm, setNewPersonnelForm] = useState<Partial<Personnel>>({
    rankCategory: undefined,
    rank: '',
    rankFullName: '',
    firstName: '',
    middleName: '',
    lastName: '',
    qualifier: '',
    qualification: '',
    badgeNo: '',
    salaryGrade: undefined,
    plantilla: '',
    positionCategory: 'Main',
    unitCategory: 'ITMS HQ',
    subUnitCategory: 'Division',
    officeDivision: '',
    sub_unit: '',
    details: '',
    station: '',
    division: '',
    detail: '',
    designation: '',
    address: '',
    gender: 'Male',
    civilStatus: 'Single',
    religion: '',
    email: '',
    phoneNumber: '',
    contactNumber: '',
    tin: '',
    gsisNumber: '',
    philHealthNo: '',
    pagibigNo: '',
    birthday: '',
    birthdate: '',
    ageToDate: undefined,
    dateOfEntry: '',
    desUp: '',
    dateEnteredService: '',
    ageOfServiceToDate: undefined,
    sourceOfCommissionship: '',
    dateOfOfficershipOrCommission: '',
    enterInOfficerPositionDate: '',
    designationDate: '',
    effectiveDate: '',
    lastPromotionDate: '',
    pstatus: 'Active',
    pstatusDate: '',
    rankStatus: 'PERM',
    unitCode: 'C02',
    unit: 'ITMS',
    subUnitCode: '',
    subUnit: '',
    stationCode: '',
    subStationCode: '',
    subStation: '',
    status: 'Active'
  });

  const handleRankCategoryChange = (category: 'PCO' | 'PNCO' | 'NUP' | '') => {
    setAddFormError(null);
    if (!category) {
      setNewPersonnelForm(prev => ({
        ...prev,
        rankCategory: undefined,
        rank: '',
        rankFullName: ''
      }));
      return;
    }

    // Check if previously selected rank is valid in the new category
    const currentRank = newPersonnelForm.rank;
    const isCompatible = Boolean(currentRank && isRankInCategory(currentRank, category));

    if (category === 'PCO') {
      setPersonnelType('Uniformed Personnel');
      const nextRank = isCompatible ? currentRank! : '';
      setNewPersonnelForm(prev => ({
        ...prev,
        rankCategory: 'PCO',
        rank: nextRank,
        rankFullName: nextRank ? getRankFullName(nextRank) : '',
        plantilla: '',
        salaryGrade: undefined
      }));
    } else if (category === 'PNCO') {
      setPersonnelType('Uniformed Personnel');
      const nextRank = isCompatible ? currentRank! : '';
      setNewPersonnelForm(prev => ({
        ...prev,
        rankCategory: 'PNCO',
        rank: nextRank,
        rankFullName: nextRank ? getRankFullName(nextRank) : '',
        plantilla: '',
        salaryGrade: undefined
      }));
    } else if (category === 'NUP') {
      setPersonnelType('Non-Uniformed Personnel');
      setNewPersonnelForm(prev => ({
        ...prev,
        rankCategory: 'NUP',
        rank: 'NUP',
        rankFullName: 'Non-Uniformed Personnel',
        badgeNo: '',
        salaryGrade: prev.salaryGrade || '14'
      }));
    }
  };

  const handleRankChange = (selectedRank: string) => {
    setAddFormError(null);
    if (!selectedRank) {
      setNewPersonnelForm(prev => ({
        ...prev,
        rank: '',
        rankFullName: ''
      }));
      return;
    }
    setNewPersonnelForm(prev => ({
      ...prev,
      rank: selectedRank,
      rankFullName: getRankFullName(selectedRank)
    }));
  };

  const handlePersonnelTypeChange = (type: 'Uniformed Personnel' | 'Non-Uniformed Personnel') => {
    setPersonnelType(type);
    if (type === 'Uniformed Personnel') {
      handleRankCategoryChange(newPersonnelForm.rankCategory === 'PCO' ? 'PCO' : 'PNCO');
    } else {
      handleRankCategoryChange('NUP');
    }
  };

  // Memoized choices for Office / Division filter (Standard options + any distinct values from records)
  const officeDivisionChoices = useMemo(() => {
    const knownValues = new Set(OFFICE_DIVISION_OPTIONS.map(o => o.value.toUpperCase()));
    const knownLabels = new Set(OFFICE_DIVISION_OPTIONS.map(o => o.label.toUpperCase()));
    const knownNames = new Set(OFFICE_DIVISION_OPTIONS.map(o => o.name?.toUpperCase() || ''));
    const extra: { value: string; label: string }[] = [];

    personnelList.forEach(p => {
      const val = (p.officeDivision || p.division || '').trim();
      if (
        val &&
        val !== '—' &&
        val !== '-' &&
        !knownValues.has(val.toUpperCase()) &&
        !knownLabels.has(val.toUpperCase()) &&
        !knownNames.has(val.toUpperCase())
      ) {
        knownValues.add(val.toUpperCase());
        extra.push({ value: val, label: val });
      }
    });

    extra.sort((a, b) => a.label.localeCompare(b.label));
    return [...OFFICE_DIVISION_OPTIONS, ...extra];
  }, [personnelList]);

  const birthYearChoices = useMemo(() => Array.from(new Set(
    personnelList
      .map(person => parseDateParts(getPersonnelBirthDate(person))?.year)
      .filter((year): year is number => Number.isInteger(year))
  )).sort((a, b) => b - a), [personnelList]);

  const genderFilterOptions = useMemo(() => {
    const uniqueGenders = new Map<string, string>();
    personnelList.forEach(person => {
      const gender = String(person.gender || '').trim();
      const normalizedGender = gender.toLocaleLowerCase();
      if (normalizedGender && !uniqueGenders.has(normalizedGender)) {
        uniqueGenders.set(normalizedGender, gender);
      }
    });
    return Array.from(uniqueGenders.values()).sort((a, b) => a.localeCompare(b));
  }, [personnelList]);

  // Handle Search Reset
  const handleReset = () => {
    setSearchAccountNo('');
    setSearchLastName('');
    setSearchFirstName('');
    setSearchMiddleName('');
    setSearchBadgeNo('');
    setSearchRank('Please select');
    setSearchRankCategory('Please select');
    setSearchOfficeDivision('Please select');
    setSearchUnit('');
    setSearchSubUnit('');
    setSearchStation('');
    setSearchPStatus('Please select');
    setSearchGender('');
    setSearchBirthMonth('');
    setSearchBirthYear('');
    setGlobalSearchQuery('');
    setCurrentPage(1);
    clearSelection();
  };

  // REAL-TIME REACTIVE FILTER LOGIC
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter(p => {
      const birthDateParts = parseDateParts(getPersonnelBirthDate(p));

      if (globalSearchQuery && globalSearchQuery.trim().length > 0) {
        const q = globalSearchQuery.toLowerCase().trim();
        const su = (p.sub_unit || p.division || p.subUnit || '').toLowerCase();
        const dt = (p.details || p.detail || '').toLowerCase();
        const st = (p.station || '').toLowerCase();
        const od = (p.officeDivision || p.unit || '').toLowerCase();
        const qual = (p.qualification || p.qualifier || '').toLowerCase();
        const sg = (p.salaryGrade ? String(p.salaryGrade) : '').toLowerCase();
        const des = (p.desUp || p.dateOfEntry || p.dateEnteredService || '').toLowerCase();
        const dob = (p.birthdate || p.birthday || '').toLowerCase();
        const tin = (p.tin || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const phone = (p.phoneNumber || p.contactNumber || '').toLowerCase();
        const gsis = (p.gsisNumber || '').toLowerCase();
        const philhealth = (p.philHealthNo || '').toLowerCase();
        const pagibig = (p.pagibigNo || '').toLowerCase();
        const badge = (p.badgeNo || '').toLowerCase();
        const unitCode = (p.unitCode || '').toLowerCase();
        const subUnitCode = (p.subUnitCode || '').toLowerCase();
        const stationCode = (p.stationCode || '').toLowerCase();
        const subStation = (p.subStation || p.subStationCode || '').toLowerCase();
        const matchesGlobal = (
          (p.fullName && p.fullName.toLowerCase().includes(q)) ||
          badge.includes(q) ||
          sg.includes(q) ||
          (p.rank && p.rank.toLowerCase().includes(q)) ||
          od.includes(q) ||
          su.includes(q) ||
          dt.includes(q) ||
          st.includes(q) ||
          qual.includes(q) ||
          des.includes(q) ||
          dob.includes(q) ||
          tin.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          gsis.includes(q) ||
          philhealth.includes(q) ||
          pagibig.includes(q) ||
          unitCode.includes(q) ||
          subUnitCode.includes(q) ||
          stationCode.includes(q) ||
          subStation.includes(q) ||
          (p.designation && p.designation.toLowerCase().includes(q))
        );
        if (!matchesGlobal) return false;
      }

      if (searchAccountNo && searchAccountNo.trim().length > 0) {
        const acc = searchAccountNo.toLowerCase().trim();
        const matchesAcc = String(p.accountNumber || '').toLowerCase().includes(acc) ||
          p.id.toLowerCase().includes(acc) ||
          p.badgeNo.toLowerCase().includes(acc);
        if (!matchesAcc) return false;
      }

      if (searchLastName && searchLastName.trim().length > 0) {
        const ln = searchLastName.toLowerCase().trim();
        if (!p.lastName || !p.lastName.toLowerCase().includes(ln)) return false;
      }

      if (searchFirstName && searchFirstName.trim().length > 0) {
        const fn = searchFirstName.toLowerCase().trim();
        if (!p.firstName || !p.firstName.toLowerCase().includes(fn)) return false;
      }

      if (searchMiddleName && searchMiddleName.trim().length > 0) {
        const mn = searchMiddleName.toLowerCase().trim();
        if (!p.middleName || !p.middleName.toLowerCase().includes(mn)) return false;
      }

      if (searchBadgeNo && searchBadgeNo.trim().length > 0) {
        const bn = searchBadgeNo.toLowerCase().trim();
        if (!p.badgeNo || !p.badgeNo.toLowerCase().includes(bn)) return false;
      }

      if (searchRank && searchRank !== 'Please select') {
        const normSelected = normalizeRankCode(searchRank);
        const normPerson = normalizeRankCode(p.rank);
        if (p.rank !== searchRank && normPerson !== normSelected) return false;
      }

      if (searchRankCategory && searchRankCategory !== 'Please select') {
        const cat = (p.rank && getRankCategory(p.rank)) || p.rankCategory || 'PNCO';
        if (cat.toUpperCase() !== searchRankCategory.toUpperCase()) return false;
      }

      if (searchOfficeDivision && searchOfficeDivision !== 'Please select') {
        const selected = searchOfficeDivision.toLowerCase().trim();
        const personOD = (p.officeDivision || p.sub_unit || p.division || p.unit || '').toLowerCase().trim();
        if (!personOD) return false;

        const opt = OFFICE_DIVISION_OPTIONS.find(o => o.value.toLowerCase() === selected);
        const optName = opt?.name?.toLowerCase() || '';

        const tokens = personOD.split(/[\s/,()\-–—.]+/).map(t => t.trim()).filter(Boolean);
        const matchesToken = tokens.includes(selected);
        const matchesName = optName ? (personOD.includes(optName) || optName.includes(personOD)) : false;
        const matchesDirect = personOD === selected || personOD.includes(selected);

        const matches = selected.length <= 4
          ? (matchesToken || matchesName || personOD === selected)
          : (matchesDirect || matchesToken || matchesName);

        if (!matches) return false;
      }

      if (searchUnit && searchUnit.trim().length > 0) {
        const u = searchUnit.toLowerCase().trim();
        const su = (p.sub_unit || p.division || '').toLowerCase();
        if (!su.includes(u)) return false;
      }

      if (searchSubUnit && searchSubUnit.trim().length > 0) {
        const d = searchSubUnit.toLowerCase().trim();
        const dt = (p.details || p.detail || '').toLowerCase();
        if (!dt.includes(d)) return false;
      }

      if (searchStation && searchStation.trim().length > 0) {
        const s = searchStation.toLowerCase().trim();
        const st = (p.station || '').toLowerCase();
        if (!st.includes(s)) return false;
      }

      if (searchPStatus && searchPStatus !== 'Please select') {
        if (p.status.toLowerCase() !== searchPStatus.toLowerCase()) return false;
      }

      const gender = String(p.gender || '').trim();
      if (searchGender === UNRECORDED_GENDER_FILTER && gender) return false;
      if (searchGender && searchGender !== UNRECORDED_GENDER_FILTER && gender.toLocaleLowerCase() !== searchGender.toLocaleLowerCase()) return false;

      if (searchBirthMonth && String(birthDateParts?.month || '') !== searchBirthMonth) return false;
      if (searchBirthYear && String(birthDateParts?.year || '') !== searchBirthYear) return false;

      return true;
    });
  }, [
    personnelList,
    globalSearchQuery,
    searchAccountNo,
    searchLastName,
    searchFirstName,
    searchMiddleName,
    searchBadgeNo,
    searchRank,
    searchRankCategory,
    searchOfficeDivision,
    searchUnit,
    searchSubUnit,
    searchStation,
    searchPStatus,
    searchGender,
    searchBirthMonth,
    searchBirthYear
  ]);

  // Selection helpers (placed after filteredPersonnel)
  const selectAllFiltered = () => setSelectedIds(new Set(filteredPersonnel.map(p => p.id)));
  const exportRecords = useMemo<Personnel[]>(() =>
    selectedIds.size > 0
      ? personnelList.filter(p => selectedIds.has(p.id))
      : filteredPersonnel,
    [selectedIds, personnelList, filteredPersonnel]
  );

  // Sorted Personnel
  const sortedPersonnel = useMemo(() => {
    return [...filteredPersonnel].sort((a, b) => {
      const getSortValue = (person: Personnel) => {
        if (sortField === 'name') return `${person.lastName || ''} ${person.firstName || person.fullName || ''}`.trim();
        if (sortField === 'birthdate') return datePartsSortKey(parseDateParts(getPersonnelBirthDate(person)));
        if (sortField === 'badge') return person.badgeNo || (person.salaryGrade ? `SG-${person.salaryGrade}` : '');
        if (sortField === 'rank') {
          const rankCode = normalizeRankCode(person.rank || '');
          const rankIndex = UNIFORMED_RANKS_ORDER.findIndex(rank => normalizeRankCode(rank) === rankCode);
          return rankIndex >= 0 ? `rank-${String(rankIndex).padStart(2, '0')}` : person.rank ? `rank-99-${person.rank}` : '';
        }
        if (sortField === 'status') return person.status || '';
        if (sortField === 'officeDivision') return person.officeDivision || person.sub_unit || person.division || person.unit || '';
        if (sortField === 'designation') return person.designation || '';
        return datePartsSortKey(parseDateParts(person.desUp || person.dateOfEntry || person.dateEnteredService || ''));
      };

      const aVal = getSortValue(a);
      const bVal = getSortValue(b);
      if (!aVal || !bVal) {
        if (!aVal && bVal) return 1;
        if (aVal && !bVal) return -1;
      }

      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp;
      return `${a.lastName || ''} ${a.firstName || a.fullName || ''}`.localeCompare(
        `${b.lastName || ''} ${b.firstName || b.fullName || ''}`,
        undefined,
        { numeric: true, sensitivity: 'base' }
      );
    });
  }, [filteredPersonnel, sortField, sortDirection]);

  // Paginated Data
  const totalPages = Math.ceil(sortedPersonnel.length / pageSize) || 1;
  const paginatedPersonnel = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPersonnel.slice(start, start + pageSize);
  }, [sortedPersonnel, currentPage, pageSize]);

  // Inspect Personnel Handler
  const handleInspectRow = (
    personnelId: string, 
    defaultTab: 'personnel' | 'summary' = 'summary',
    startEditing: boolean = false
  ) => {
    setSelectedPersonnelId(personnelId);
    setInspectActiveTab(defaultTab);
    setIsEditingProfile(startEditing);
    setInspectModalOpen(true);
    setActiveActionMenuId(null);
  };

  // Add Personnel Submit Handler
  const handleAddPersonnelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    if (!newPersonnelForm.rankCategory) {
      setAddFormError('Please select a Rank Category (PCO, PNCO, or NUP) first.');
      return;
    }

    if (!newPersonnelForm.rank) {
      setAddFormError(`Please select a valid Rank for the ${newPersonnelForm.rankCategory} category.`);
      return;
    }

    if (!isRankInCategory(newPersonnelForm.rank, newPersonnelForm.rankCategory)) {
      setAddFormError(`The selected rank "${newPersonnelForm.rank}" does not match the chosen Rank Category "${newPersonnelForm.rankCategory}".`);
      return;
    }

    if (!newPersonnelForm.firstName?.trim() || !newPersonnelForm.lastName?.trim()) {
      setAddFormError('First Name and Last Name are required.');
      return;
    }

    const isUniformed = newPersonnelForm.rankCategory !== 'NUP';
    const trimmedBadge = (newPersonnelForm.badgeNo || '').trim();
    if (isUniformed) {
      if (!trimmedBadge) {
        setAddFormError('Badge Number is required for Uniformed Personnel.');
        return;
      }
      const existing = personnelList.find(
        p => p.badgeNo && p.badgeNo.toLowerCase() === trimmedBadge.toLowerCase()
      );
      if (existing) {
        setAddFormError(`A personnel record with Badge Number "${trimmedBadge}" already exists (${existing.fullName}).`);
        return;
      }
    }

    const rankStr = newPersonnelForm.rank;
    const rankFull = isUniformed ? getRankFullName(rankStr) : 'Non-Uniformed Personnel';
    const rankCat = newPersonnelForm.rankCategory;
    const fnStr   = (newPersonnelForm.firstName || '').toUpperCase();
    const mnStr   = (newPersonnelForm.middleName || '').toUpperCase();
    const lnStr   = (newPersonnelForm.lastName || '').toUpperCase();
    const qStr    = (newPersonnelForm.qualification || newPersonnelForm.qualifier || '').toUpperCase();
    const full    = `${rankStr} ${fnStr}${mnStr ? ' ' + mnStr[0] + '.' : ''} ${lnStr}${qStr ? ' ' + qStr : ''}`.trim();

    const unitStr = (newPersonnelForm.unit || newPersonnelForm.officeDivision || 'ITMS').trim();
    const subUnitStr = (newPersonnelForm.subUnit || newPersonnelForm.sub_unit || newPersonnelForm.division || '').trim();
    const detailsStr = (newPersonnelForm.details || newPersonnelForm.detail || '').trim();
    const stationStr = (newPersonnelForm.station || '').trim();
    const phoneStr   = (newPersonnelForm.phoneNumber || newPersonnelForm.contactNumber || '').trim();

    const bdate = newPersonnelForm.birthdate || newPersonnelForm.birthday || '';
    const calculatedAge = newPersonnelForm.ageToDate ?? (bdate ? calculateYearsBetween(bdate) ?? undefined : undefined);
    const sdate = newPersonnelForm.dateEnteredService || newPersonnelForm.desUp || newPersonnelForm.dateOfEntry || '';
    const calculatedService = newPersonnelForm.ageOfServiceToDate ?? (sdate ? calculateYearsBetween(sdate) ?? undefined : undefined);

    const created: Personnel = {
      id: `pnp-${Date.now()}`,
      rankCategory: rankCat,
      rank: rankStr,
      rankFullName: rankFull,
      firstName: fnStr,
      middleName: mnStr || undefined,
      lastName: lnStr,
      qualifier: qStr || undefined,
      qualification: qStr || undefined,
      fullName: full,
      badgeNo: isUniformed ? trimmedBadge : '',
      badge_number: isUniformed ? trimmedBadge : '',
      salaryGrade: isUniformed ? undefined : (String(newPersonnelForm.salaryGrade || '').trim() || undefined),
      plantilla: isUniformed ? '' : (newPersonnelForm.plantilla || '').trim(),
      positionCategory: newPersonnelForm.positionCategory || 'Main',
      unitCategory: newPersonnelForm.unitCategory || 'ITMS HQ',
      subUnitCategory: newPersonnelForm.subUnitCategory || 'Division',
      officeDivision: unitStr || undefined,
      sub_unit: subUnitStr || undefined,
      details: detailsStr || undefined,
      station: stationStr || undefined,
      division: subUnitStr || undefined,
      detail: detailsStr || undefined,
      designation: (newPersonnelForm.designation || '').trim(),
      address: (newPersonnelForm.address || '').trim() || undefined,
      gender: newPersonnelForm.gender || 'Male',
      civilStatus: (newPersonnelForm.civilStatus || '').trim() || undefined,
      religion: (newPersonnelForm.religion || '').trim() || undefined,
      email: (newPersonnelForm.email || '').trim() || undefined,
      phoneNumber: phoneStr || undefined,
      contactNumber: phoneStr || undefined,
      tin: (newPersonnelForm.tin || '').trim() || undefined,
      gsisNumber: (newPersonnelForm.gsisNumber || '').trim() || undefined,
      philHealthNo: (newPersonnelForm.philHealthNo || '').trim() || undefined,
      pagibigNo: (newPersonnelForm.pagibigNo || '').trim() || undefined,
      birthday: bdate || undefined,
      birthdate: bdate || undefined,
      ageToDate: calculatedAge,
      dateOfEntry: sdate || undefined,
      desUp: sdate || undefined,
      dateEnteredService: sdate || undefined,
      ageOfServiceToDate: calculatedService,
      sourceOfCommissionship: (newPersonnelForm.sourceOfCommissionship || '').trim() || undefined,
      dateOfOfficershipOrCommission: (newPersonnelForm.dateOfOfficershipOrCommission || newPersonnelForm.enterInOfficerPositionDate || '').trim() || undefined,
      enterInOfficerPositionDate: (newPersonnelForm.dateOfOfficershipOrCommission || newPersonnelForm.enterInOfficerPositionDate || '').trim() || undefined,
      designationDate: newPersonnelForm.designationDate || '',
      effectiveDate: newPersonnelForm.effectiveDate || '',
      lastPromotionDate: newPersonnelForm.lastPromotionDate || '',
      pstatus: newPersonnelForm.pstatus || newPersonnelForm.status || 'Active',
      pstatusDate: newPersonnelForm.pstatusDate || '',
      status: newPersonnelForm.status || newPersonnelForm.pstatus || 'Active',
      rankStatus: newPersonnelForm.rankStatus || 'PERM',
      unitCode: (newPersonnelForm.unitCode || 'C02').trim() || undefined,
      unit: unitStr || undefined,
      subUnitCode: (newPersonnelForm.subUnitCode || '').trim() || undefined,
      subUnit: subUnitStr || undefined,
      stationCode: (newPersonnelForm.stationCode || '').trim() || undefined,
      subStationCode: (newPersonnelForm.subStationCode || '').trim() || undefined,
      subStation: (newPersonnelForm.subStation || '').trim() || undefined,
    };

    addPersonnel(created);
    setAddModalOpen(false);
    // Reset form
    setPersonnelType('Uniformed Personnel');
    setAddFormError(null);
    setNewPersonnelForm({
      rankCategory: undefined,
      rank: '',
      rankFullName: '',
      firstName: '',
      middleName: '',
      lastName: '',
      qualifier: '',
      qualification: '',
      badgeNo: '',
      salaryGrade: undefined,
      plantilla: '',
      positionCategory: 'Main',
      unitCategory: 'ITMS HQ',
      subUnitCategory: 'Division',
      officeDivision: '',
      sub_unit: '',
      details: '',
      station: '',
      division: '',
      detail: '',
      designation: '',
      address: '',
      gender: 'Male',
      civilStatus: 'Single',
      religion: '',
      email: '',
      phoneNumber: '',
      contactNumber: '',
      tin: '',
      gsisNumber: '',
      philHealthNo: '',
      pagibigNo: '',
      birthday: '',
      birthdate: '',
      ageToDate: undefined,
      dateOfEntry: '',
      desUp: '',
      dateEnteredService: '',
      ageOfServiceToDate: undefined,
      sourceOfCommissionship: '',
      dateOfOfficershipOrCommission: '',
      enterInOfficerPositionDate: '',
      designationDate: '',
      effectiveDate: '',
      lastPromotionDate: '',
      pstatus: 'Active',
      pstatusDate: '',
      rankStatus: 'PERM',
      unitCode: 'C02',
      unit: 'ITMS',
      subUnitCode: '',
      subUnit: '',
      stationCode: '',
      subStationCode: '',
      subStation: '',
      status: 'Active'
    });
  };

  const selectedPerson = personnelList.find(p => p.id === selectedPersonnelId) || personnelList[0];

  // Headcount summary for live strength bar
  const strengthSummary = useMemo(() => {
    let pco = 0;
    let pnco = 0;
    let nup = 0;
    let active = 0;
    for (const p of personnelList) {
      const cat = p.rankCategory || getRankCategory(p.rank);
      if (cat === 'PCO') pco++;
      else if (cat === 'PNCO') pnco++;
      else if (cat === 'NUP') nup++;
      if (p.status === 'Active') active++;
    }
    return { total: personnelList.length, pco, pnco, nup, active };
  }, [personnelList]);

  return (
    <div className="w-full space-y-4 animate-fade-in font-sans text-slate-800 text-xs">

      <PageHeader
        eyebrow="Personnel records"
        title="Personnel Information"
        description="Search, review, and maintain personnel records. Filter by birth month or year and choose how results are sorted."
        meta={<span className="text-[11px] text-slate-500">{personnelList.length} total records</span>}
        reference="201-MASTER-INDEX"
      />

      {/* SEARCH PANEL CONTAINER (Full Width, No Outer Overflow) */}
      <section className="record-toolbar w-full overflow-hidden" aria-labelledby="personnel-search-heading">
        <div className="record-section-header">
          <div><h2 id="personnel-search-heading" className="app-section-title">Directory search & filters</h2><p className="mt-0.5 text-[11px] text-slate-500">Locate personnel by identity, organization, rank, or duty status.</p></div>
        </div>
        <div className="space-y-4 p-4">

          {/* Quick Personnel Strength Counters */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xs font-extrabold uppercase text-slate-500 tracking-wider mr-1">Strength:</span>
              <button
                type="button"
                onClick={() => { setSearchRankCategory('Please select'); setCurrentPage(1); }}
                className={`px-2 py-1 rounded text-2xs font-bold transition-colors cursor-pointer ${
                  searchRankCategory === 'Please select' ? 'bg-blue-800 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Total: <span className="font-mono">{strengthSummary.total}</span>
              </button>
              <button
                type="button"
                onClick={() => { setSearchRankCategory('PCO'); setCurrentPage(1); }}
                className={`px-2 py-1 rounded text-2xs font-bold transition-colors cursor-pointer ${
                  searchRankCategory === 'PCO' ? 'bg-indigo-800 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                PCO: <span className="font-mono">{strengthSummary.pco}</span>
              </button>
              <button
                type="button"
                onClick={() => { setSearchRankCategory('PNCO'); setCurrentPage(1); }}
                className={`px-2 py-1 rounded text-2xs font-bold transition-colors cursor-pointer ${
                  searchRankCategory === 'PNCO' ? 'bg-blue-700 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                PNCO: <span className="font-mono">{strengthSummary.pnco}</span>
              </button>
              <button
                type="button"
                onClick={() => { setSearchRankCategory('NUP'); setCurrentPage(1); }}
                className={`px-2 py-1 rounded text-2xs font-bold transition-colors cursor-pointer ${
                  searchRankCategory === 'NUP' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                NUP: <span className="font-mono">{strengthSummary.nup}</span>
              </button>
              <span className="text-2xs text-slate-400 font-semibold mx-1">|</span>
              <span className="text-2xs font-bold text-slate-600">
                On Duty: <span className="font-mono text-emerald-700 font-bold">{strengthSummary.active}</span>
              </span>
            </div>
            <div className="text-2xs font-semibold text-slate-500">
              Showing <span className="font-bold text-slate-800">{filteredPersonnel.length}</span> matching records
            </div>
          </div>

          {/* Row 1: Last Name, First Name, Middle Name, Badge Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                placeholder="Search Last Name..."
                value={searchLastName}
                onChange={e => { setSearchLastName(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                placeholder="Search First Name..."
                value={searchFirstName}
                onChange={e => { setSearchFirstName(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1">Middle Name</label>
              <input
                type="text"
                placeholder="Search Middle Name..."
                value={searchMiddleName}
                onChange={e => { setSearchMiddleName(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1">Badge Number</label>
              <input
                type="text"
                placeholder="Search Badge No..."
                value={searchBadgeNo}
                onChange={e => { setSearchBadgeNo(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Rank Category, Rank, Office / Division, Sub-Unit, Details, Station, Status + Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-2">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Rank Category</label>
              <select
                value={searchRankCategory}
                onChange={e => {
                  const newCat = e.target.value;
                  setSearchRankCategory(newCat);
                  if (searchRank !== 'Please select') {
                    if (newCat === 'PCO' && !getPcoRanks().includes(searchRank as any)) setSearchRank('Please select');
                    else if (newCat === 'PNCO' && !getPncoRanks().includes(searchRank as any)) setSearchRank('Please select');
                    else if (newCat === 'NUP' && searchRank !== 'NUP') setSearchRank('NUP');
                  }
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none font-bold text-indigo-700"
              >
                <option value="Please select">All Categories</option>
                <option value="PCO">PCO (Police Commissioned Officers)</option>
                <option value="PNCO">PNCO (Police Non-Commissioned Officers)</option>
                <option value="NUP">NUP (Non-Uniformed Personnel)</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Rank</label>
              <select
                value={searchRank}
                onChange={e => {
                  const r = e.target.value;
                  setSearchRank(r);
                  if (r !== 'Please select') {
                    const cat = getRankCategory(r);
                    if (searchRankCategory !== cat) setSearchRankCategory(cat);
                  }
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none font-bold text-blue-700"
              >
                <option value="Please select">All Ranks</option>
                {searchRankCategory === 'PCO' ? (
                  PCO_DISPLAY_RANKS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)
                ) : searchRankCategory === 'PNCO' ? (
                  PNCO_DISPLAY_RANKS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)
                ) : searchRankCategory === 'NUP' ? (
                  <option value="NUP">NUP (Non-Uniformed Personnel)</option>
                ) : (
                  [...PCO_DISPLAY_RANKS, ...PNCO_DISPLAY_RANKS, ...NUP_DISPLAY_RANKS].map(r => <option key={r.code} value={r.code}>{r.label}</option>)
                )}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Office / Division</label>
              <select
                value={searchOfficeDivision}
                onChange={e => { setSearchOfficeDivision(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none font-semibold text-slate-800"
              >
                <option value="Please select">All Offices / Divisions</option>
                {officeDivisionChoices.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Sub-Unit</label>
              <input
                type="text"
                placeholder="Filter Sub-Unit..."
                value={searchUnit}
                onChange={e => { setSearchUnit(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Details</label>
              <input
                type="text"
                placeholder="Filter..."
                value={searchSubUnit}
                onChange={e => { setSearchSubUnit(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Station <span className="text-[10px] font-normal text-slate-400">(Opt)</span></label>
              <input
                type="text"
                placeholder="Station..."
                value={searchStation}
                onChange={e => { setSearchStation(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={searchPStatus}
                onChange={e => { setSearchPStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none font-bold"
              >
                <option value="Please select">All</option>
                <option value="Active">ACTIVE</option>
                <option value="On Leave">ON LEAVE</option>
                <option value="Retired">RETIRED</option>
              </select>
            </div>

            {/* Buttons Column */}
            <div className="lg:col-span-2 flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setCurrentPage(1)}
                className="flex-1 min-w-[55px] px-2 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>

              <button
                onClick={handleReset}
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1 border border-slate-300 transition-colors cursor-pointer"
                title="Reset search filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              {canManage && (
                <>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-2 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    title="Import Bulk CSV/Excel Data"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>

                  <button
                    onClick={() => {
                      setPersonnelType('Uniformed Personnel');
                      setAddFormError(null);
                      setNewPersonnelForm({
                        rankCategory: undefined,
                        rank: '',
                        rankFullName: '',
                        firstName: '',
                        middleName: '',
                        lastName: '',
                        qualifier: '',
                        qualification: '',
                        badgeNo: '',
                        salaryGrade: undefined,
                        plantilla: '',
                        positionCategory: 'Main',
                        unitCategory: 'ITMS HQ',
                        subUnitCategory: 'Division',
                        officeDivision: '',
                        sub_unit: '',
                        details: '',
                        station: '',
                        division: '',
                        detail: '',
                        designation: '',
                        address: '',
                        gender: 'Male',
                        contactNumber: '',
                        birthday: '',
                        birthdate: '',
                        ageToDate: undefined,
                        dateOfEntry: '',
                        desUp: '',
                        ageOfServiceToDate: undefined,
                        enterInOfficerPositionDate: '',
                        designationDate: '',
                        effectiveDate: '',
                        lastPromotionDate: '',
                        status: 'Active'
                      });
                      setAddModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    title="Add New Personnel Record"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="sm:col-span-2 xl:col-span-5">
              <h3 className="text-2xs font-extrabold text-slate-700">Personnel filters and result order</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">Birth month, birth year, and gender filters can be combined. Filters update immediately; sort order applies to the matching records.</p>
            </div>
            <div>
              <label htmlFor="personnel-birth-month" className="mb-1 block text-2xs font-bold text-slate-700">Birth month</label>
              <select
                id="personnel-birth-month"
                value={searchBirthMonth}
                onChange={event => { setSearchBirthMonth(event.target.value); setCurrentPage(1); }}
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Any month</option>
                {BIRTH_MONTH_OPTIONS.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="personnel-birth-year" className="mb-1 block text-2xs font-bold text-slate-700">Birth year</label>
              <select
                id="personnel-birth-year"
                value={searchBirthYear}
                onChange={event => { setSearchBirthYear(event.target.value); setCurrentPage(1); }}
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Any year</option>
                {birthYearChoices.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="personnel-gender" className="mb-1 block text-2xs font-bold text-slate-700">Gender</label>
              <select
                id="personnel-gender"
                value={searchGender}
                onChange={event => { setSearchGender(event.target.value); setCurrentPage(1); }}
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="">All genders</option>
                {genderFilterOptions.map(gender => <option key={gender.toLocaleLowerCase()} value={gender}>{gender}</option>)}
                <option value={UNRECORDED_GENDER_FILTER}>Not recorded</option>
              </select>
            </div>

            <div>
              <label htmlFor="personnel-sort-field" className="mb-1 block text-2xs font-bold text-slate-700">Sort records by</label>
              <select
                id="personnel-sort-field"
                value={sortField}
                onChange={event => handleSortFieldChange(event.target.value as PersonnelSortField)}
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
              >
                {PERSONNEL_SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="personnel-sort-direction" className="mb-1 block text-2xs font-bold text-slate-700">Sort order</label>
              <select
                id="personnel-sort-direction"
                value={sortDirection}
                onChange={event => { setSortDirection(event.target.value as 'asc' | 'desc'); setCurrentPage(1); }}
                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
              >
                <option value="asc">Ascending (A–Z / earliest first)</option>
                <option value="desc">Descending (Z–A / latest first)</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-500">{sortDirectionHelp}</p>
            </div>
          </div>
        </div>
      </section>

      {/* PERSONNEL TABLE CONTAINER */}
      <section className="record-section w-full">
        <div className="record-section-header flex-wrap">
          <div className="flex items-center gap-2 font-bold text-xs">
            <Users className="w-4 h-4 text-blue-700" />
            <span className="text-slate-900">Personnel directory</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs text-slate-500">Showing {filteredPersonnel.length} matched (total {personnelList.length})</span>
            {selectedIds.size > 0 && (
              <span className="text-2xs font-bold text-blue-700">• {selectedIds.size} selected</span>
            )}
            {/* Select toggle */}
            <button
              onClick={() => { setSelectMode(v => !v); if (selectMode) clearSelection(); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-2xs font-extrabold transition-colors ${
                selectMode ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {selectMode ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
              {selectMode ? 'Selecting' : 'Select'}
            </button>
            {/* Export button */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-semibold bg-blue-700 hover:bg-blue-800 text-white transition-colors"
            >
              <Download className="w-3 h-3" />
              {selectedIds.size > 0 ? `Export (${selectedIds.size})` : 'Export All'}
            </button>
          </div>
        </div>

        {/* Table Body - Full-Width Layout with Taller Rows */}
        <div className="w-full min-h-[350px] overflow-x-auto">
          <table className="record-table min-w-[1080px] text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-3xs">
                {selectMode && <th className="p-3 w-8 border-r border-slate-200">
                  <button onClick={selectAllFiltered} title="Select all filtered" aria-label="Select all filtered personnel">
                    {selectedIds.size === filteredPersonnel.length && filteredPersonnel.length > 0
                      ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                      : <Square className="w-3.5 h-3.5 text-slate-400" />
                    }
                  </button>
                </th>}
                <th scope="col" className="cursor-pointer hover:text-blue-700 select-none" onClick={() => handleSort('name')}>
                  Rank &amp; name {sortField === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline text-blue-700" /> : <ArrowDown className="w-3 h-3 inline text-blue-700" />) : <ArrowUpDown className="w-3 h-3 inline text-slate-400 opacity-60" />}
                </th>
                <th scope="col" className="cursor-pointer hover:text-blue-700 select-none" onClick={() => handleSort('status')}>
                  Status {sortField === 'status' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline text-blue-700" /> : <ArrowDown className="w-3 h-3 inline text-blue-700" />) : <ArrowUpDown className="w-3 h-3 inline text-slate-400 opacity-60" />}
                </th>
                <th scope="col" className="cursor-pointer hover:text-blue-700 select-none" onClick={() => handleSort('badge')}>
                  Badge no. / SG {sortField === 'badge' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline text-blue-700" /> : <ArrowDown className="w-3 h-3 inline text-blue-700" />) : <ArrowUpDown className="w-3 h-3 inline text-slate-400 opacity-60" />}
                </th>
                <th scope="col" className="cursor-pointer hover:text-blue-700 select-none" onClick={() => handleSort('officeDivision')}>
                  Office / Division {sortField === 'officeDivision' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline text-blue-700" /> : <ArrowDown className="w-3 h-3 inline text-blue-700" />) : <ArrowUpDown className="w-3 h-3 inline text-slate-400 opacity-60" />}
                </th>
                <th scope="col">Sub-Unit</th>
                <th scope="col">Details</th>
                <th scope="col">Station</th>
                <th scope="col" className="cursor-pointer hover:text-blue-700 select-none" onClick={() => handleSort('designation')}>
                  Designation {sortField === 'designation' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline text-blue-700" /> : <ArrowDown className="w-3 h-3 inline text-blue-700" />) : <ArrowUpDown className="w-3 h-3 inline text-slate-400 opacity-60" />}
                </th>
                <th scope="col" className="cursor-pointer hover:text-blue-700 select-none" onClick={() => handleSort('birthdate')}>
                  Birthdate &amp; Age {sortField === 'birthdate' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline text-blue-700" /> : <ArrowDown className="w-3 h-3 inline text-blue-700" />) : <ArrowUpDown className="w-3 h-3 inline text-slate-400 opacity-60" />}
                </th>
                <th scope="col" className="cursor-pointer hover:text-blue-700 select-none" onClick={() => handleSort('entryDate')}>
                  Service / Entry {sortField === 'entryDate' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 inline text-blue-700" /> : <ArrowDown className="w-3 h-3 inline text-blue-700" />) : <ArrowUpDown className="w-3 h-3 inline text-slate-400 opacity-60" />}
                </th>
                <th scope="col" className="text-right">Record action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {paginatedPersonnel.length > 0 ? (
                paginatedPersonnel.map((person) => (
                  <tr
                    key={person.id}
                    className={`cursor-pointer ${
                      selectedIds.has(person.id) ? 'bg-blue-50' : ''
                    }`}
                    tabIndex={0}
                    aria-selected={selectedIds.has(person.id)}
                    onClick={() => selectMode ? toggleSelect(person.id) : handleInspectRow(person.id, 'summary', false)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectMode ? toggleSelect(person.id) : handleInspectRow(person.id, 'summary', false);
                      }
                    }}
                  >
                    {/* Selection checkbox cell */}
                    {selectMode && (
                      <td className="p-3 border-r border-slate-200 text-center align-middle" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(person.id)} aria-label={`${selectedIds.has(person.id) ? 'Deselect' : 'Select'} ${person.rank} ${person.fullName}`}>
                          {selectedIds.has(person.id)
                            ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                            : <Square className="w-3.5 h-3.5 text-slate-400" />
                          }
                        </button>
                      </td>
                    )}
                    {/* Rank & Name */}
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          (person.rankCategory || getRankCategory(person.rank)) === 'PCO'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : (person.rankCategory || getRankCategory(person.rank)) === 'PNCO'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {person.rankCategory || getRankCategory(person.rank)}
                        </span>
                        <p className="text-xs font-bold uppercase text-slate-900">
                          {person.rank} {person.lastName}, {person.firstName} {person.middleName ? `${person.middleName.charAt(0)}.` : ''} {person.qualifier || person.qualification || ''}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">{person.rankFullName || 'Rank full name not recorded'}</p>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap">
                      <span className={`status-marker ${
                        person.status === 'Active'
                          ? 'text-emerald-700'
                          : 'text-amber-800'
                      }`}>
                        {person.status === 'Active' ? 'On duty / active' : person.status}
                      </span>
                    </td>

                    {/* Badge No. / SG */}
                    <td>
                      {!isUniformedRank(person.rank) ? (
                        <span className="font-mono font-bold text-emerald-800 text-[11px]">
                          {person.salaryGrade ? `SG-${person.salaryGrade}` : '—'}
                        </span>
                      ) : (
                        <span className="font-mono font-semibold text-slate-800 text-[11px]">{person.badgeNo || '—'}</span>
                      )}
                    </td>

                    {/* Office / Division */}
                    <td>
                      <p className="font-semibold text-slate-900 text-[11px]">
                        {person.officeDivision?.trim() || '—'}
                      </p>
                    </td>

                    {/* Sub-Unit */}
                    <td>
                      {(person.sub_unit || person.division)?.trim() ? (
                        <p className="font-medium text-slate-800 text-[11px]">
                          {(person.sub_unit || person.division)?.trim()}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[10px]">No sub-unit recorded</p>
                      )}
                    </td>

                    {/* Details */}
                    <td>
                      {(person.details || person.detail)?.trim() ? (
                        <p className="font-medium text-slate-700 text-[11px]">
                          {(person.details || person.detail)?.trim()}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[10px]">
                          No Details recorded
                        </p>
                      )}
                    </td>

                    {/* Station */}
                    <td>
                      {person.station?.trim() ? (
                        <p className="font-medium text-slate-700 text-[11px]">
                          {person.station.trim()}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[10px]">
                          No Station recorded
                        </p>
                      )}
                    </td>

                    {/* Designation */}
                    <td className="max-w-[170px]">
                      {person.designation?.trim() ? (
                        <p className="truncate text-xs font-semibold text-slate-900" title={person.designation}>
                          {person.designation}
                        </p>
                      ) : (
                        <p className="text-slate-400 italic text-[10px]">Not assigned</p>
                      )}
                    </td>

                    {/* Birthdate & Age */}
                    <td className="whitespace-nowrap">
                      <p className="font-mono text-slate-800 text-[10px]">{person.birthdate || person.birthday || '—'}</p>
                      {(person.ageToDate || (person.birthdate && calculateYearsBetween(person.birthdate))) && (
                        <p className="text-[10px] text-slate-500 font-medium">
                          {person.ageToDate || calculateYearsBetween(person.birthdate!)} yrs old
                        </p>
                      )}
                    </td>

                    {/* Service & Date of Entry */}
                    <td className="whitespace-nowrap">
                      <p className="font-mono text-slate-800 text-[10px]">{person.desUp || person.dateOfEntry || '—'}</p>
                      {(person.ageOfServiceToDate || (person.desUp && calculateYearsBetween(person.desUp))) && (
                        <p className="text-[10px] text-blue-700 font-semibold">
                          {person.ageOfServiceToDate || calculateYearsBetween(person.desUp!)} yrs svc
                        </p>
                      )}
                    </td>

                    {/* ACTIONS DROPDOWN BUTTON */}
                    <td className="relative whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActiveActionMenuId(activeActionMenuId === person.id ? null : person.id)}
                          aria-label={`Open actions for ${person.rank} ${person.fullName}`}
                          className="inline-flex items-center justify-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                        >
                          <span>Actions</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu Popup */}
                        {activeActionMenuId === person.id && (
                          <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-xl border border-slate-200 w-44 py-1 text-left animate-scale-in">
                            <button
                              onClick={() => handleInspectRow(person.id, 'summary')}
                              className="w-full px-3 py-1.5 text-2xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-600" />
                              <span>View 201 Profile</span>
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleInspectRow(person.id, 'personnel', true)}
                                  className="w-full px-3 py-1.5 text-2xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Edit Details</span>
                                </button>
                                <div className="my-1 border-t border-slate-100"></div>
                                <button
                                  onClick={() => {
                                    deletePersonnel(person.id);
                                    setActiveActionMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-2xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Delete Record</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={selectMode ? 11 : 10} className="p-8 text-center text-slate-500 font-semibold">
                    No record found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination (Matching Screenshot) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-2xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Page {currentPage} of {totalPages} | Show</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          {/* Pagination Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              aria-label="First page"
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronsLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            
            <span className="rounded bg-blue-800 px-2 py-0.5 font-bold text-white" aria-current="page">
              {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Last page"
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronsRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* BULK IMPORT MASSIVE DATA MODAL */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        backendConnected={backendConnected}
        onClose={() => setIsImportModalOpen(false)}
        onImport={bulkImportPersonnel}
      />

      {/* EXPORT MODAL */}
      {exportModalOpen && (
        <PersonnelExportModal
          records={exportRecords}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* FLOATING SELECTION TOOLBAR */}
      {selectMode && selectedIds.size > 0 && (
        <div className="selection-toolbar fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center gap-3 rounded-md border border-slate-700 bg-slate-900 px-5 py-3 text-white shadow-2xl">
          <CheckSquare className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-bold">{selectedIds.size} personnel selected</span>
          <div className="w-px h-5 bg-slate-700" />
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-sm font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Selected
          </button>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-700 text-sm font-semibold text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {/* PERSONNEL RECORD MODAL — Personnel Profile | Summary Profile */}
      {inspectModalOpen && selectedPerson && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
          onClick={() => setInspectModalOpen(false)}
          role="presentation"
        >
          <div
            className="my-2 sm:my-4 bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="personnel-modal-title"
          >
            {/* Modal Header */}
            <div className="bg-white text-slate-900 px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedPerson.rank}
                </div>
                <div className="min-w-0">
                  <h3 id="personnel-modal-title" className="text-sm font-bold text-slate-900 leading-tight truncate">
                    {selectedPerson.rank} {selectedPerson.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">
                    BADGE: {selectedPerson.badgeNo || 'N/A'} · SUB-UNIT: {selectedPerson.sub_unit || selectedPerson.division || '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs Bar: Personnel Profile | Summary Profile */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 gap-2 shrink-0" role="tablist" aria-label="Personnel record sub-tabs">
              <button
                type="button"
                role="tab"
                aria-selected={inspectActiveTab === 'personnel'}
                onClick={() => setInspectActiveTab('personnel')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs border-b-2 transition-all cursor-pointer ${
                  inspectActiveTab === 'personnel'
                    ? 'border-blue-700 text-blue-800 bg-white font-extrabold shadow-2xs rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-t-lg'
                }`}
              >
                <User className="w-4 h-4 text-blue-700" />
                <span>Personnel Profile</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={inspectActiveTab === 'summary'}
                onClick={() => setInspectActiveTab('summary')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs border-b-2 transition-all cursor-pointer ${
                  inspectActiveTab === 'summary'
                    ? 'border-blue-700 text-blue-800 bg-white font-extrabold shadow-2xs rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold rounded-t-lg'
                }`}
              >
                <Eye className="w-4 h-4 text-blue-700" />
                <span>Summary Profile</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {inspectActiveTab === 'personnel' ? (
                <PersonnelInfoTab
                  personnel={selectedPerson}
                  isEditing={isEditingProfile}
                  onToggleEdit={editing => setIsEditingProfile(editing)}
                  onSaved={() => {
                    setIsEditingProfile(false);
                  }}
                />
              ) : (
                <div className="max-w-2xl mx-auto">
                  <PersonnelSummaryCard
                    personnel={selectedPerson}
                    onEdit={() => {
                      setInspectActiveTab('personnel');
                      setIsEditingProfile(true);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW PERSONNEL MODAL */}
      {addModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto" role="presentation">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-in my-2 sm:my-6 flex flex-col max-h-[92vh]" role="dialog" aria-modal="true" aria-labelledby="add-personnel-title">
            {/* Header */}
            <div className="bg-white text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5 font-bold text-sm">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="add-personnel-title" className="text-sm font-extrabold text-slate-900">Register New Personnel Record</h3>
                  <p className="text-[11px] text-slate-500 font-normal">Official 34-Column Roster Specification · PAIS 2.0</p>
                </div>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" aria-label="Close add personnel dialog">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPersonnelSubmit} className="p-4 sm:p-6 space-y-6 text-xs overflow-y-auto flex-1">
              {addFormError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{addFormError}</span>
                </div>
              )}

              {/* ── Section A: Personal Information ── */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-700" />
                    <div>
                      <p className="text-2xs font-extrabold text-blue-800 uppercase tracking-widest">A. Personal Information</p>
                      <p className="text-[11px] text-slate-500">Biographical credentials, official rank, civil status, and personal details.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">Personal Info</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Rank Category */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">
                      Rank Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newPersonnelForm.rankCategory || ''}
                      onChange={e => handleRankCategoryChange(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-indigo-700 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      required
                    >
                      <option value="">-- Select Rank Category --</option>
                      <option value="PCO">PCO (Police Commissioned Officers)</option>
                      <option value="PNCO">PNCO (Police Non-Commissioned Officers)</option>
                      <option value="NUP">NUP (Non-Uniformed Personnel)</option>
                    </select>
                  </div>

                  {/* Rank */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">
                      Rank <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newPersonnelForm.rank || ''}
                      onChange={e => handleRankChange(e.target.value)}
                      disabled={!newPersonnelForm.rankCategory || newPersonnelForm.rankCategory === 'NUP'}
                      className={`w-full p-2 border rounded font-bold bg-white focus:outline-none focus:border-blue-500 ${
                        !newPersonnelForm.rankCategory 
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : newPersonnelForm.rankCategory === 'NUP'
                            ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                            : 'border-slate-300 text-blue-700 cursor-pointer'
                      }`}
                      required
                    >
                      {!newPersonnelForm.rankCategory ? (
                        <option value="">-- Select Category First --</option>
                      ) : newPersonnelForm.rankCategory === 'PCO' ? (
                        <>
                          <option value="">-- Select PCO Rank --</option>
                          {PCO_DISPLAY_RANKS.map(r => (
                            <option key={r.code} value={r.code}>{r.label}</option>
                          ))}
                        </>
                      ) : newPersonnelForm.rankCategory === 'PNCO' ? (
                        <>
                          <option value="">-- Select PNCO Rank --</option>
                          {PNCO_DISPLAY_RANKS.map(r => (
                            <option key={r.code} value={r.code}>{r.label}</option>
                          ))}
                        </>
                      ) : (
                        <option value="NUP">NUP (Non-Uniformed Personnel)</option>
                      )}
                    </select>
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={newPersonnelForm.lastName || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, lastName: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-bold uppercase bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. DELA CRUZ"
                    />
                  </div>

                  {/* First Name */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={newPersonnelForm.firstName || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, firstName: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-bold uppercase bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. JUAN"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Middle Name */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={newPersonnelForm.middleName || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, middleName: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded uppercase bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. SANTOS"
                    />
                  </div>

                  {/* Qualification (Qual) */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Qualification (QUAL.)</label>
                    <input
                      type="text"
                      value={newPersonnelForm.qualification || newPersonnelForm.qualifier || ''}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        qualification: e.target.value,
                        qualifier: e.target.value
                      })}
                      className="w-full p-2 border border-slate-300 rounded uppercase bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. JR., III, MSCS, CPA"
                    />
                  </div>

                  {/* Birthdate */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">BirthDate</label>
                    <input
                      type="date"
                      value={newPersonnelForm.birthdate || newPersonnelForm.birthday || ''}
                      onChange={e => {
                        const bdate = e.target.value;
                        const age = calculateYearsBetween(bdate);
                        setNewPersonnelForm({
                          ...newPersonnelForm,
                          birthdate: bdate,
                          birthday: bdate,
                          ageToDate: age || undefined
                        });
                      }}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Age to Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-2xs font-bold text-slate-700">Age to Date</label>
                      <span className="text-[10px] text-blue-600 font-semibold">Auto-Calculated</span>
                    </div>
                    <input
                      type="number"
                      value={newPersonnelForm.ageToDate ?? ''}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        ageToDate: e.target.value ? parseInt(e.target.value, 10) : undefined
                      })}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 38"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Gender */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Gender <span className="text-red-500">*</span></label>
                    <select
                      value={newPersonnelForm.gender || 'Male'}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, gender: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Civil Status */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Civil Status</label>
                    <select
                      value={newPersonnelForm.civilStatus || 'Single'}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, civilStatus: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>

                  {/* Religion */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Religion</label>
                    <input
                      type="text"
                      value={newPersonnelForm.religion || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, religion: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Roman Catholic, Christian, Islam"
                    />
                  </div>

                  {/* Residential Address */}
                  <div className="sm:col-span-3 lg:col-span-1">
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={newPersonnelForm.address || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, address: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500"
                      placeholder="Residential address"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section B: Identification & Contact ── */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-emerald-700" />
                    <div>
                      <p className="text-2xs font-extrabold text-emerald-800 uppercase tracking-widest">B. Identification &amp; Contact</p>
                      <p className="text-[11px] text-slate-500">PNP Badge, government identification numbers, and contact channels.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">ID &amp; Contact</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Badge No (Uniformed) vs Salary Grade (NUP) */}
                  {newPersonnelForm.rankCategory !== 'NUP' ? (
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">Badge Number <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={newPersonnelForm.badgeNo || ''}
                        onChange={e => setNewPersonnelForm({...newPersonnelForm, badgeNo: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold bg-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. O-08161, 230200"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">Salary Grade (SG) <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={newPersonnelForm.salaryGrade ?? ''}
                        onChange={e => setNewPersonnelForm({...newPersonnelForm, salaryGrade: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded font-bold text-emerald-800 bg-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. 14, SG-14"
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newPersonnelForm.email || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, email: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. officer@pnp.gov.ph"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={newPersonnelForm.phoneNumber || newPersonnelForm.contactNumber || ''}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        phoneNumber: e.target.value,
                        contactNumber: e.target.value
                      })}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 0917-123-4567"
                    />
                  </div>

                  {/* TIN */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">TIN</label>
                    <input
                      type="text"
                      value={newPersonnelForm.tin || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, tin: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 900-744-527"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* GSIS Number */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Gsis Number</label>
                    <input
                      type="text"
                      value={newPersonnelForm.gsisNumber || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, gsisNumber: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 0002131234"
                    />
                  </div>

                  {/* PhilHealth No */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Phil Health No</label>
                    <input
                      type="text"
                      value={newPersonnelForm.philHealthNo || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, philHealthNo: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 12-345678901-2"
                    />
                  </div>

                  {/* Pag-IBIG No */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Pagibig No</label>
                    <input
                      type="text"
                      value={newPersonnelForm.pagibigNo || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, pagibigNo: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 1234-5678-9012"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section C: Service & Career ── */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-700" />
                    <div>
                      <p className="text-2xs font-extrabold text-indigo-800 uppercase tracking-widest">C. Service &amp; Career Information</p>
                      <p className="text-[11px] text-slate-500">Service longevity, commissionship, promotion records, and official status.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">Service &amp; Career</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Date Entered Service */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">
                      {newPersonnelForm.rankCategory === 'NUP' ? 'Date Entered Service' : 'Date Entered Service (DES UP)'}
                    </label>
                    <input
                      type="date"
                      value={newPersonnelForm.dateEnteredService || newPersonnelForm.desUp || newPersonnelForm.dateOfEntry || ''}
                      onChange={e => {
                        const sdate = e.target.value;
                        const los = calculateYearsBetween(sdate);
                        setNewPersonnelForm({
                          ...newPersonnelForm,
                          dateEnteredService: sdate,
                          desUp: sdate,
                          dateOfEntry: sdate,
                          ageOfServiceToDate: los || undefined
                        });
                      }}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Age of Service to Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-2xs font-bold text-slate-700">Age of Service to Date</label>
                      <span className="text-[10px] text-blue-600 font-semibold">Auto-Calculated</span>
                    </div>
                    <input
                      type="number"
                      value={newPersonnelForm.ageOfServiceToDate ?? ''}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        ageOfServiceToDate: e.target.value ? parseInt(e.target.value, 10) : undefined
                      })}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 15"
                    />
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={newPersonnelForm.designation || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, designation: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-semibold bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Director, Section Chief, Specialist"
                    />
                  </div>

                  {/* Designation Date */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Designation Date</label>
                    <input
                      type="date"
                      value={newPersonnelForm.designationDate || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, designationDate: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Effective Date */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Effective Date of Designation</label>
                    <input
                      type="date"
                      value={newPersonnelForm.effectiveDate || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, effectiveDate: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Last Promotion Date */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Last Promotion Date</label>
                    <input
                      type="date"
                      value={newPersonnelForm.lastPromotionDate || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, lastPromotionDate: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Source Of Commissionship */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Source Of Commissionship</label>
                    <input
                      type="text"
                      value={newPersonnelForm.sourceOfCommissionship || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, sourceOfCommissionship: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded uppercase bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. LATERAL, PNPA, OCS"
                    />
                  </div>

                  {/* Date Of Officership Or Commission */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Date Of Officership Or Commission</label>
                    <input
                      type="date"
                      value={newPersonnelForm.dateOfOfficershipOrCommission || newPersonnelForm.enterInOfficerPositionDate || ''}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        dateOfOfficershipOrCommission: e.target.value,
                        enterInOfficerPositionDate: e.target.value
                      })}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* PStatus */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">PStatus (Personnel Status) <span className="text-red-500">*</span></label>
                    <select
                      value={newPersonnelForm.pstatus || newPersonnelForm.status || 'Active'}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        pstatus: e.target.value,
                        status: e.target.value
                      })}
                      className="w-full p-2 border border-slate-300 rounded font-bold bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Active">ACTIVE</option>
                      <option value="On Leave">ON LEAVE</option>
                      <option value="Detailed Out">DETAILED OUT</option>
                      <option value="Non-Active">NON-ACTIVE</option>
                      <option value="Suspended">SUSPENDED</option>
                      <option value="Retired">RETIRED</option>
                    </select>
                  </div>

                  {/* PStatus Date */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">PStatus Date</label>
                    <input
                      type="date"
                      value={newPersonnelForm.pstatusDate || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, pstatusDate: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Rank Status */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Rank Status</label>
                    <select
                      value={newPersonnelForm.rankStatus || 'PERM'}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, rankStatus: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-semibold bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="PERM">PERM (Permanent)</option>
                      <option value="TEMP">TEMP (Temporary)</option>
                      <option value="PROB">PROB (Probationary)</option>
                    </select>
                  </div>

                  {/* Position Category */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Position Category</label>
                    <select
                      value={newPersonnelForm.positionCategory || 'Main'}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, positionCategory: e.target.value as any})}
                      className="w-full p-2 border border-slate-300 rounded font-semibold bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {POSITION_CATEGORIES.map(pc => (
                        <option key={pc} value={pc}>{pc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section D: Organizational Assignment ── */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-700" />
                    <div>
                      <p className="text-2xs font-extrabold text-amber-800 uppercase tracking-widest">D. Organizational Assignment</p>
                      <p className="text-[11px] text-slate-500">Unit hierarchy, sub-unit codes, stations, and duty placement.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">Assignment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Unit Code */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Unit Code</label>
                    <input
                      type="text"
                      value={newPersonnelForm.unitCode || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, unitCode: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono font-bold bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. C02"
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={newPersonnelForm.unit || newPersonnelForm.officeDivision || ''}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        unit: e.target.value,
                        officeDivision: e.target.value
                      })}
                      className="w-full p-2 border border-slate-300 rounded font-semibold bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. ITMS"
                    />
                  </div>

                  {/* Sub Unit Code */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Sub Unit Code</label>
                    <input
                      type="text"
                      value={newPersonnelForm.subUnitCode || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, subUnitCode: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. ARMD, ITPMD, CSD"
                    />
                  </div>

                  {/* Sub Unit */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Sub Unit</label>
                    <input
                      type="text"
                      value={newPersonnelForm.subUnit || newPersonnelForm.sub_unit || newPersonnelForm.division || ''}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        subUnit: e.target.value,
                        sub_unit: e.target.value,
                        division: e.target.value
                      })}
                      className="w-full p-2 border border-slate-300 rounded font-medium bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Administrative and Resource Management Division"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Station Code */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Station Code</label>
                    <input
                      type="text"
                      value={newPersonnelForm.stationCode || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, stationCode: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. CRAME"
                    />
                  </div>

                  {/* Station */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Station</label>
                    <input
                      type="text"
                      value={newPersonnelForm.station || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, station: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-medium bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Camp Crame"
                    />
                  </div>

                  {/* Sub Station Code */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Sub Station Code</label>
                    <input
                      type="text"
                      value={newPersonnelForm.subStationCode || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, subStationCode: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. HQ-01"
                    />
                  </div>

                  {/* Sub Station */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Sub Station</label>
                    <input
                      type="text"
                      value={newPersonnelForm.subStation || ''}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, subStation: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-medium bg-white focus:outline-none focus:border-blue-500"
                      placeholder="Sub Station Name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Details */}
                  <div className="sm:col-span-2">
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Details (Specific Role / Placement)</label>
                    <input
                      type="text"
                      value={newPersonnelForm.details || newPersonnelForm.detail || ''}
                      onChange={e => setNewPersonnelForm({
                        ...newPersonnelForm,
                        details: e.target.value,
                        detail: e.target.value
                      })}
                      className="w-full p-2 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500 font-medium"
                      placeholder="e.g. Network Monitoring Section"
                    />
                  </div>

                  {/* Unit Category */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Unit Category</label>
                    <select
                      value={newPersonnelForm.unitCategory || 'ITMS HQ'}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, unitCategory: e.target.value as any})}
                      className="w-full p-2 border border-slate-300 rounded font-semibold bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {UNIT_CATEGORIES.map(uc => (
                        <option key={uc} value={uc}>{uc}</option>
                      ))}
                    </select>
                  </div>

                  {/* Plantilla Item (For NUP) */}
                  {newPersonnelForm.rankCategory === 'NUP' && (
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 mb-1">Plantilla Item</label>
                      <input
                        type="text"
                        value={newPersonnelForm.plantilla || ''}
                        onChange={e => setNewPersonnelForm({...newPersonnelForm, plantilla: e.target.value})}
                        className="w-full p-2 border border-slate-300 rounded font-mono bg-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g. ITMS-CSD-2024-001"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Save Personnel Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
