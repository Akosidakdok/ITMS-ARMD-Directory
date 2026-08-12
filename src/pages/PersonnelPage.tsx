import React, { useState, useMemo } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Personnel } from '../types/pais';
import { BulkImportModal } from '../components/personnel/BulkImportModal';
import { PersonnelSummaryCard } from '../components/personnel/PersonnelSummaryCard';
import { exportPersonnelCsv, exportPersonnelPdf } from '../utils/personnelExport';
import { 
  Users, 
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
  Loader2
} from 'lucide-react';

// ─── Export Modal Component ───────────────────────────────────────────────────

type ExportFormat = 'csv' | 'pdf';

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#4682B4]/10 to-cyan-50">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#4682B4]" />
            <h2 className="text-sm font-extrabold text-slate-800">Export Personnel</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Count badge */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <CheckSquare className="w-4 h-4 text-[#4682B4] flex-shrink-0" />
            <p className="text-xs font-bold text-blue-700">
              Exporting <span className="font-extrabold text-blue-900">{records.length} personnel</span> records
            </p>
          </div>

          {/* Format */}
          <div>
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">File Format</p>
            <div className="grid grid-cols-2 gap-2">
              {([['pdf', 'PDF Document', 'Formatted, printable'], ['csv', 'CSV Spreadsheet', 'Raw data for Excel']] as const).map(([key, label, desc]) => (
                <button
                  key={key}
                  onClick={() => setFormat(key as ExportFormat)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    format === key ? 'border-[#4682B4] bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {key === 'pdf'
                      ? <FileText className={`w-4 h-4 ${format === key ? 'text-red-500' : 'text-slate-400'}`} />
                      : <FileSpreadsheet className={`w-4 h-4 ${format === key ? 'text-green-600' : 'text-slate-400'}`} />
                    }
                    <span className={`text-xs font-extrabold ${format === key ? 'text-[#4682B4]' : 'text-slate-700'}`}>{label}</span>
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
            className="px-5 py-2 text-xs rounded-lg bg-[#4682B4] text-white font-extrabold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60 shadow-sm"
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

  // Search Inputs State (Real-Time Reactive & Filterable)
  const [searchAccountNo, setSearchAccountNo] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchMiddleName, setSearchMiddleName] = useState('');
  const [searchBadgeNo, setSearchBadgeNo] = useState('');
  const [searchRank, setSearchRank] = useState('Please select');
  const [searchUnit, setSearchUnit] = useState('Please select');
  const [searchSubUnit, setSearchSubUnit] = useState('Please Select');
  const [searchPStatus, setSearchPStatus] = useState('Please select');

  // Modals & Action Menus
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
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

  // New Personnel Form State — all CSV fields
  const [newPersonnelForm, setNewPersonnelForm] = useState<Partial<Personnel>>({
    rank: 'PCpl',
    rankFullName: '',
    firstName: '',
    middleName: '',
    lastName: '',
    qualifier: '',
    badgeNo: '',
    salaryGrade: 14,
    plantilla: '',
    division: 'ITSD',
    detail: '',
    designation: '',
    address: '',
    gender: 'Male',
    contactNumber: '',
    birthday: '',
    dateOfEntry: '',
    enterInOfficerPositionDate: '',
    lastPromotionDate: '',
    status: 'Active'
  });

  // Handle Search Reset
  const handleReset = () => {
    setSearchAccountNo('');
    setSearchLastName('');
    setSearchFirstName('');
    setSearchMiddleName('');
    setSearchBadgeNo('');
    setSearchRank('Please select');
    setSearchUnit('Please select');
    setSearchSubUnit('Please Select');
    setSearchPStatus('Please select');
    setGlobalSearchQuery('');
    setCurrentPage(1);
    clearSelection();
  };

  // REAL-TIME REACTIVE FILTER LOGIC
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter(p => {
      if (globalSearchQuery && globalSearchQuery.trim().length > 0) {
        const q = globalSearchQuery.toLowerCase().trim();
        const matchesGlobal = (
          (p.fullName && p.fullName.toLowerCase().includes(q)) ||
          (p.badgeNo && p.badgeNo.toLowerCase().includes(q)) ||
          (p.rank && p.rank.toLowerCase().includes(q)) ||
          (p.division && p.division.toLowerCase().includes(q)) ||
          (p.designation && p.designation.toLowerCase().includes(q)) ||
          (p.detail && p.detail.toLowerCase().includes(q))
        );
        if (!matchesGlobal) return false;
      }

      if (searchAccountNo && searchAccountNo.trim().length > 0) {
        const acc = searchAccountNo.toLowerCase().trim();
        const matchesAcc = p.id.toLowerCase().includes(acc) || p.badgeNo.toLowerCase().includes(acc);
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
        if (p.rank !== searchRank) return false;
      }

      if (searchUnit && searchUnit !== 'Please select') {
        const selectedCode = searchUnit.split(' ')[0].toUpperCase();
        if (selectedCode !== 'ITMS' && p.division.toUpperCase() !== selectedCode) {
          if (!p.division.toUpperCase().includes(selectedCode)) return false;
        }
      }

      if (searchSubUnit && searchSubUnit !== 'Please Select') {
        const su = searchSubUnit.toLowerCase();
        const detailStr = (p.detail || '').toLowerCase();
        const plantStr = (p.plantilla || '').toLowerCase();
        if (!detailStr.includes(su) && !plantStr.includes(su)) return false;
      }

      if (searchPStatus && searchPStatus !== 'Please select') {
        if (p.status.toLowerCase() !== searchPStatus.toLowerCase()) return false;
      }

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
    searchUnit,
    searchSubUnit,
    searchPStatus
  ]);

  // Selection helpers (placed after filteredPersonnel)
  const selectAllFiltered = () => setSelectedIds(new Set(filteredPersonnel.map(p => p.id)));
  const exportRecords = useMemo<Personnel[]>(() =>
    selectedIds.size > 0
      ? personnelList.filter(p => selectedIds.has(p.id))
      : filteredPersonnel,
    [selectedIds, personnelList, filteredPersonnel]
  );

  // Paginated Data
  const totalPages = Math.ceil(filteredPersonnel.length / pageSize) || 1;
  const paginatedPersonnel = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPersonnel.slice(start, start + pageSize);
  }, [filteredPersonnel, currentPage, pageSize]);

  // Bulk Import Confirm Handler
  // Inspect Personnel Handler
  const handleInspectRow = (personnelId: string) => {
    setSelectedPersonnelId(personnelId);
    setInspectModalOpen(true);
    setActiveActionMenuId(null);
  };

  // Add Personnel Submit Handler
  const handleAddPersonnelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonnelForm.firstName || !newPersonnelForm.lastName) return;

    const rankStr = newPersonnelForm.rank || 'PCpl';
    const fnStr   = (newPersonnelForm.firstName || '').toUpperCase();
    const mnStr   = (newPersonnelForm.middleName || '').toUpperCase();
    const lnStr   = (newPersonnelForm.lastName || '').toUpperCase();
    const qStr    = (newPersonnelForm.qualifier || '').toUpperCase();
    const full    = `${rankStr} ${fnStr}${mnStr ? ' ' + mnStr[0] + '.' : ''} ${lnStr}${qStr ? ' ' + qStr : ''}`.trim();

    const created: Personnel = {
      id: `pnp-${Date.now()}`,
      rank: rankStr,
      rankFullName: newPersonnelForm.rankFullName || '',
      firstName: fnStr,
      middleName: mnStr,
      lastName: lnStr,
      qualifier: qStr,
      fullName: full,
      badgeNo: newPersonnelForm.badgeNo || '',
      salaryGrade: Number(newPersonnelForm.salaryGrade) || 1,
      plantilla: newPersonnelForm.plantilla || '',
      division: newPersonnelForm.division || 'CSD',
      detail: newPersonnelForm.detail || '',
      designation: newPersonnelForm.designation || '',
      address: newPersonnelForm.address || '',
      gender: newPersonnelForm.gender || 'Male',
      contactNumber: newPersonnelForm.contactNumber || '',
      birthday: newPersonnelForm.birthday || '',
      dateOfEntry: newPersonnelForm.dateOfEntry || '',
      enterInOfficerPositionDate: newPersonnelForm.enterInOfficerPositionDate || '',
      lastPromotionDate: newPersonnelForm.lastPromotionDate || '',
      status: newPersonnelForm.status || 'Active',
    };

    addPersonnel(created);
    setAddModalOpen(false);
    // Reset form
    setNewPersonnelForm({
      rank: 'PCpl', rankFullName: '', firstName: '', middleName: '', lastName: '',
      qualifier: '', badgeNo: '', salaryGrade: 14, plantilla: '', division: 'ITSD',
      detail: '', designation: '', address: '', gender: 'Male', contactNumber: '',
      birthday: '', dateOfEntry: '', enterInOfficerPositionDate: '', lastPromotionDate: '',
      status: 'Active'
    });
  };

  const selectedPerson = personnelList.find(p => p.id === selectedPersonnelId) || personnelList[0];

  return (
    <div className="w-full space-y-4 animate-fade-in font-sans text-slate-800 text-xs">

      {/* Top Header Breadcrumb Matching Screenshot */}
      <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 text-2xs text-slate-500 font-medium">
          <span className="text-slate-600">Personnel</span>
          <span>•</span>
          <span className="text-slate-400">List</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-slate-900">Personnel</h1>
          <span className="text-xs text-slate-500 italic">view, add, edit personnel</span>
        </div>
      </div>

      {/* SEARCH PANEL CONTAINER (Full Width, No Outer Overflow) */}
      <div className="w-full bg-white rounded-md border border-cyan-500/40 shadow-xs overflow-hidden">
        <div className="p-4 space-y-4">
          <h2 className="text-xs font-bold text-slate-600 tracking-wide">Search</h2>

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

          {/* Row 2: Rank, Unit, Sub-Unit, PStatus + Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Rank</label>
              <select
                value={searchRank}
                onChange={e => { setSearchRank(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none font-bold text-blue-700"
              >
                <option value="Please select">Please select</option>
                <option value="PGEN">PGEN</option>
                <option value="PLTGEN">PLTGEN</option>
                <option value="PMGEN">PMGEN</option>
                <option value="PBGEN">PBGEN</option>
                <option value="PCOL">PCOL</option>
                <option value="PLTCOL">PLTCOL</option>
                <option value="PMAJ">PMAJ</option>
                <option value="PCPT">PCPT</option>
                <option value="PLT">PLT</option>
                <option value="PEMS">PEMS</option>
                <option value="PCMS">PCMS</option>
                <option value="PSMS">PSMS</option>
                <option value="PMSg">PMSg</option>
                <option value="PSSg">PSSg</option>
                <option value="PCpl">PCpl</option>
                <option value="Pat">Pat</option>
                <option value="NUP">NUP</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Unit</label>
              <select
                value={searchUnit}
                onChange={e => { setSearchUnit(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none truncate"
              >
                <option value="Please select">Please select</option>
                <option value="ITSD">ITSD – Information Technology Support Division</option>
                <option value="PTD">PTD – Plans and Training Division</option>
                <option value="SMD">SMD – Systems Management Division</option>
                <option value="DMD">DMD – Data Management Division</option>
                <option value="ARMD">ARMD – Administrative and Resource Management Division</option>
                <option value="ISSD">ISSD – Information Systems Security Division</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Sub-Unit</label>
              <select
                value={searchSubUnit}
                onChange={e => { setSearchSubUnit(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none"
              >
                <option value="Please Select">Please Select</option>
                <option value="ITMS HQ">ITMS HQ - Camp Crame</option>
                <option value="RITMO 4A">RITMO 4A (CALABARZON)</option>
                <option value="Cyber Operations Center">Cyber Defense Center</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-2xs font-bold text-slate-700 mb-1">PStatus</label>
              <select
                value={searchPStatus}
                onChange={e => { setSearchPStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none font-bold"
              >
                <option value="Please select">Please select</option>
                <option value="Active">ON DUTY/ACTIVE</option>
                <option value="On Leave">ON LEAVE</option>
                <option value="Retired">RETIRED</option>
              </select>
            </div>

            {/* Buttons Row */}
            <div className="md:col-span-3 flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setCurrentPage(1)}
                className="flex-1 min-w-[75px] px-3 py-1.5 bg-[#17a2b8] hover:bg-cyan-600 text-white font-bold text-xs rounded flex items-center justify-center gap-1 shadow-xs transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>SEARCH</span>
              </button>

              <button
                onClick={handleReset}
                className="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET</span>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-2.5 py-1.5 bg-[#17a2b8] hover:bg-cyan-700 text-white font-bold text-xs rounded flex items-center gap-1 shadow-xs transition-colors"
                title="Import Bulk CSV/Excel Data"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>IMPORT MASSIVE DATA</span>
              </button>

              <button
                onClick={() => setAddModalOpen(true)}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded flex items-center gap-1 shadow-xs transition-colors"
                title="Add New Personnel Record"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>ADD NEW</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PERSONNEL TABLE CONTAINER */}
      <div className="w-full bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        {/* Solid Blue Header Bar */}
        <div className="bg-[#4682B4] text-white px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-xs">
            <Users className="w-4 h-4 text-white" />
            <span>Personnel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-blue-100">Showing {filteredPersonnel.length} Matched (Total {personnelList.length})</span>
            {selectedIds.size > 0 && (
              <span className="text-2xs font-bold text-yellow-300">• {selectedIds.size} selected</span>
            )}
            {/* Select toggle */}
            <button
              onClick={() => { setSelectMode(v => !v); if (selectMode) clearSelection(); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-2xs font-extrabold transition-colors ${
                selectMode ? 'bg-yellow-400 text-slate-900' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {selectMode ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
              {selectMode ? 'Selecting' : 'Select'}
            </button>
            {/* Export button */}
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-2xs font-extrabold bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm"
            >
              <Download className="w-3 h-3" />
              {selectedIds.size > 0 ? `Export (${selectedIds.size})` : 'Export All'}
            </button>
          </div>
        </div>

        {/* Table Body - Full-Width Layout with Taller Rows */}
        <div className="w-full overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-[11px] border-collapse table-auto">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-3xs">
                {selectMode && <th className="p-3 w-8 border-r border-slate-200">
                  <button onClick={selectAllFiltered} title="Select all filtered">
                    {selectedIds.size === filteredPersonnel.length && filteredPersonnel.length > 0
                      ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                      : <Square className="w-3.5 h-3.5 text-slate-400" />
                    }
                  </button>
                </th>}
                <th className="p-3 border-r border-slate-200">FIRST NAME</th>
                <th className="p-3 border-r border-slate-200">MIDDLE NAME</th>
                <th className="p-3 border-r border-slate-200">LAST NAME</th>
                <th className="p-3 border-r border-slate-200 text-center">QUALIFIER</th>
                <th className="p-3 border-r border-slate-200">ADDRESS</th>
                <th className="p-3 border-r border-slate-200 text-center">GENDER</th>
                <th className="p-3 border-r border-slate-200">CONTACT NUMBER</th>
                <th className="p-3 border-r border-slate-200 text-center">BIRTHDAY</th>
                <th className="p-3 border-r border-slate-200 text-center">DATE OF ENTRY</th>
                <th className="p-3 border-r border-slate-200 text-center">ENTER IN OFFICER POSITION</th>
                <th className="p-3 border-r border-slate-200 text-center">STATUS</th>
                <th className="p-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {paginatedPersonnel.length > 0 ? (
                paginatedPersonnel.map((person) => (
                  <tr
                    key={person.id}
                    className={`hover:bg-cyan-50/60 transition-colors cursor-pointer ${
                      selectedIds.has(person.id) ? 'bg-violet-50 border-l-2 border-violet-400' : ''
                    }`}
                    onClick={() => selectMode ? toggleSelect(person.id) : handleInspectRow(person.id)}
                  >
                    {/* Selection checkbox cell */}
                    {selectMode && (
                      <td className="p-3 border-r border-slate-200 text-center align-middle" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(person.id)}>
                          {selectedIds.has(person.id)
                            ? <CheckSquare className="w-3.5 h-3.5 text-violet-600" />
                            : <Square className="w-3.5 h-3.5 text-slate-400" />
                          }
                        </button>
                      </td>
                    )}
                    {/* First Name */}
                    <td className="p-3 border-r border-slate-200 font-bold uppercase align-middle text-xs">
                      {person.firstName}
                    </td>

                    {/* Middle Name */}
                    <td className="p-3 border-r border-slate-200 uppercase text-slate-600 align-middle text-xs">
                      {person.middleName || '-'}
                    </td>

                    {/* Last Name */}
                    <td className="p-3 border-r border-slate-200 font-bold uppercase align-middle text-xs">
                      {person.lastName}
                    </td>

                    {/* Qualifier */}
                    <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-700 align-middle text-xs">
                      {person.qualifier || '-'}
                    </td>

                    {/* Address */}
                    <td className="p-3 border-r border-slate-200 text-slate-700 align-middle max-w-[150px] truncate text-xs" title={person.address}>
                      {person.address || '-'}
                    </td>

                    {/* Gender */}
                    <td className="p-3 border-r border-slate-200 text-center text-slate-700 align-middle text-xs">
                      {person.gender || '-'}
                    </td>

                    {/* Contact Number */}
                    <td className="p-3 border-r border-slate-200 font-mono text-emerald-700 font-bold align-middle whitespace-nowrap text-xs">
                      {person.contactNumber || '-'}
                    </td>

                    {/* Birthday */}
                    <td className="p-3 border-r border-slate-200 text-center text-slate-700 align-middle font-mono text-xs whitespace-nowrap">
                      {person.birthday || '-'}
                    </td>

                    {/* Date of Entry */}
                    <td className="p-3 border-r border-slate-200 text-center text-slate-700 align-middle font-mono text-xs whitespace-nowrap">
                      {person.dateOfEntry || '-'}
                    </td>

                    {/* Enter in Officer Position */}
                    <td className="p-3 border-r border-slate-200 text-center text-slate-700 align-middle font-mono text-xs whitespace-nowrap">
                      {person.enterInOfficerPositionDate || '-'}
                    </td>

                    {/* Status */}
                    <td className="p-3 border-r border-slate-200 text-center align-middle whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded text-3xs font-bold uppercase tracking-wider inline-block ${
                        person.status === 'Active'
                          ? 'bg-[#337ab7] text-white'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {person.status === 'Active' ? 'ON DUTY/ACTIVE' : person.status}
                      </span>
                    </td>

                    {/* ACTIONS DROPDOWN BUTTON */}
                    <td className="p-3 text-center align-middle relative whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActiveActionMenuId(activeActionMenuId === person.id ? null : person.id)}
                          className="px-3 py-1.5 bg-[#17a2b8] hover:bg-cyan-600 text-white font-bold text-xs rounded flex items-center justify-center gap-1 shadow-xs transition-colors"
                        >
                          <span>ACTIONS</span>
                          <ChevronDown className="w-3.5 h-3.5 text-white" />
                        </button>

                        {/* Dropdown Menu Popup */}
                        {activeActionMenuId === person.id && (
                          <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-xl border border-slate-200 w-44 py-1 text-left animate-scale-in">
                            <button
                              onClick={() => handleInspectRow(person.id)}
                              className="w-full px-3 py-1.5 text-2xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-2"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-600" />
                              <span>View 201 Profile</span>
                            </button>
                            <button
                              onClick={() => handleInspectRow(person.id)}
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
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={selectMode ? 13 : 12} className="p-8 text-center text-slate-500 font-bold italic">
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
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronsLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            
            <span className="px-2 py-0.5 bg-cyan-600 text-white font-bold rounded">
              {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronsRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700">
          <CheckSquare className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-bold">{selectedIds.size} personnel selected</span>
          <div className="w-px h-5 bg-slate-700" />
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-extrabold transition-colors"
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

      {/* SUMMARY PROFILE MODAL — opens when clicking a row */}
      {inspectModalOpen && selectedPerson && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
          onClick={() => setInspectModalOpen(false)}
        >
          <div
            className="my-2 sm:my-4 bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold">Summary Profile</span>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Profile Card */}
            <div className="p-4">
              <PersonnelSummaryCard personnel={selectedPerson} />
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW PERSONNEL MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-scale-in my-2 sm:my-6">
            {/* Header */}
            <div className="bg-cyan-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <UserPlus className="w-5 h-5" />
                <span>Register New Personnel Record</span>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-white hover:text-cyan-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPersonnelSubmit} className="p-4 sm:p-6 space-y-5 text-xs">

              {/* ── Section: Identity ── */}
              <div>
                <p className="text-2xs font-extrabold text-cyan-700 uppercase tracking-widest mb-2 border-b border-cyan-100 pb-1">Identity</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Rank */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Rank *</label>
                    <select
                      value={newPersonnelForm.rank}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, rank: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-bold text-blue-700"
                    >
                      <option value="PGEN">PGEN</option>
                      <option value="PLTGEN">PLTGEN</option>
                      <option value="PMGEN">PMGEN</option>
                      <option value="PBGEN">PBGEN</option>
                      <option value="PCOL">PCOL</option>
                      <option value="PLTCOL">PLTCOL</option>
                      <option value="PMAJ">PMAJ</option>
                      <option value="PCPT">PCPT</option>
                      <option value="PLT">PLT</option>
                      <option value="PEMS">PEMS</option>
                      <option value="PCMS">PCMS</option>
                      <option value="PSMS">PSMS</option>
                      <option value="PMSg">PMSg</option>
                      <option value="PSSg">PSSg</option>
                      <option value="PCpl">PCpl</option>
                      <option value="Pat">Pat</option>
                      <option value="NUP">NUP</option>
                    </select>
                  </div>
                  {/* Rank Full Name */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Rank Full Name</label>
                    <input
                      type="text"
                      value={newPersonnelForm.rankFullName}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, rankFullName: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded text-slate-600"
                      placeholder="e.g. Police Corporal"
                    />
                  </div>
                  {/* Badge No */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Badge Number *</label>
                    <input
                      type="text"
                      required
                      value={newPersonnelForm.badgeNo}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, badgeNo: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                      placeholder="e.g. 20230200374"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                  {/* First Name */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={newPersonnelForm.firstName}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, firstName: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded"
                      placeholder="e.g. RUEL"
                    />
                  </div>
                  {/* Middle Name */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={newPersonnelForm.middleName}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, middleName: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded"
                      placeholder="e.g. AMPIS"
                    />
                  </div>
                  {/* Last Name */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={newPersonnelForm.lastName}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, lastName: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-bold"
                      placeholder="e.g. APALLA"
                    />
                  </div>
                  {/* Qualifier */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Qualifier</label>
                    <input
                      type="text"
                      value={newPersonnelForm.qualifier}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, qualifier: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded"
                      placeholder="e.g. JR. / III"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section: Assignment ── */}
              <div>
                <p className="text-2xs font-extrabold text-cyan-700 uppercase tracking-widest mb-2 border-b border-cyan-100 pb-1">Assignment</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Division */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Unit / Division</label>
                    <select
                      value={newPersonnelForm.division}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, division: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded"
                    >
                      <option value="ITSD">ITSD – Information Technology Support Division</option>
                      <option value="PTD">PTD – Plans and Training Division</option>
                      <option value="SMD">SMD – Systems Management Division</option>
                      <option value="DMD">DMD – Data Management Division</option>
                      <option value="ARMD">ARMD – Administrative and Resource Management Division</option>
                      <option value="ISSD">ISSD – Information Systems Security Division</option>
                    </select>
                  </div>
                  {/* Detail */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Detail / Sub-unit</label>
                    <input
                      type="text"
                      value={newPersonnelForm.detail}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, detail: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded"
                      placeholder="e.g. Cyber Defense Operations Center"
                    />
                  </div>
                  {/* Designation */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={newPersonnelForm.designation}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, designation: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded"
                      placeholder="e.g. Cyber Security Specialist"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {/* Plantilla */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Plantilla</label>
                    <input
                      type="text"
                      value={newPersonnelForm.plantilla}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, plantilla: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                      placeholder="e.g. ITMS-CSD-2024-001"
                    />
                  </div>
                  {/* Salary Grade */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Salary Grade (SG-ST)</label>
                    <input
                      type="number"
                      min={1}
                      max={33}
                      value={newPersonnelForm.salaryGrade}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, salaryGrade: Number(e.target.value)})}
                      className="w-full p-2 border border-slate-300 rounded font-bold"
                    />
                  </div>
                  {/* Status */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={newPersonnelForm.status}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, status: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-bold"
                    >
                      <option value="Active">ON DUTY / ACTIVE</option>
                      <option value="On Leave">ON LEAVE</option>
                      <option value="Detailed Out">DETAILED OUT</option>
                      <option value="Suspended">SUSPENDED</option>
                      <option value="Retired">RETIRED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section: Personal Information ── */}
              <div>
                <p className="text-2xs font-extrabold text-cyan-700 uppercase tracking-widest mb-2 border-b border-cyan-100 pb-1">Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Gender */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={newPersonnelForm.gender}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, gender: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  {/* Birthday */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Birthday</label>
                    <input
                      type="date"
                      value={newPersonnelForm.birthday}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, birthday: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  {/* Contact Number */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Contact Number</label>
                    <input
                      type="text"
                      value={newPersonnelForm.contactNumber}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, contactNumber: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                      placeholder="e.g. 0917-000-0000"
                    />
                  </div>
                </div>

                {/* Address — full width */}
                <div className="mt-3">
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={newPersonnelForm.address}
                    onChange={e => setNewPersonnelForm({...newPersonnelForm, address: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded"
                    placeholder="e.g. 123 Rizal St., Quezon City, Metro Manila"
                  />
                </div>
              </div>

              {/* ── Section: Service Dates ── */}
              <div>
                <p className="text-2xs font-extrabold text-cyan-700 uppercase tracking-widest mb-2 border-b border-cyan-100 pb-1">Service Dates</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Date of Entry */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Date of Entry</label>
                    <input
                      type="date"
                      value={newPersonnelForm.dateOfEntry}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, dateOfEntry: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  {/* Enter in Officer Position */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Enter in Officer Position Date</label>
                    <input
                      type="date"
                      value={newPersonnelForm.enterInOfficerPositionDate}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, enterInOfficerPositionDate: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  {/* Last Promotion Date */}
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 mb-1">Last Promotion Date</label>
                    <input
                      type="date"
                      value={newPersonnelForm.lastPromotionDate}
                      onChange={e => setNewPersonnelForm({...newPersonnelForm, lastPromotionDate: e.target.value})}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-md"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
