import React, { useState, useMemo } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Personnel } from '../types/pais';
import { BulkImportModal } from '../components/personnel/BulkImportModal';
import { PersonnelSummaryCard } from '../components/personnel/PersonnelSummaryCard';
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
  Maximize2
} from 'lucide-react';

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
  
  // Image Lightbox Modal State
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);
  const [enlargedPhotoName, setEnlargedPhotoName] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // New Personnel Form State
  const [newPersonnelForm, setNewPersonnelForm] = useState<Partial<Personnel>>({
    rank: 'PCPL',
    firstName: '',
    middleName: '',
    lastName: '',
    qualifier: '',
    badgeNo: '',
    salaryGrade: 14,
    plantilla: 'ITMS-CSD-2024-001',
    division: 'CSD',
    detail: 'Cyber Defense Operations Center',
    designation: 'Cyber Security Specialist',
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

    const full = `${newPersonnelForm.rank || 'PCPL'} ${newPersonnelForm.firstName} ${newPersonnelForm.middleName ? newPersonnelForm.middleName[0] + '.' : ''} ${newPersonnelForm.lastName} ${newPersonnelForm.qualifier || ''}`.trim();

    const created: Personnel = {
      id: `pnp-${Date.now()}`,
      rank: newPersonnelForm.rank || 'PCPL',
      firstName: newPersonnelForm.firstName.toUpperCase(),
      middleName: (newPersonnelForm.middleName || '').toUpperCase(),
      lastName: newPersonnelForm.lastName.toUpperCase(),
      qualifier: (newPersonnelForm.qualifier || '').toUpperCase(),
      fullName: full.toUpperCase(),
      badgeNo: newPersonnelForm.badgeNo || `E-${Math.floor(100000 + Math.random() * 900000)}`,
      salaryGrade: Number(newPersonnelForm.salaryGrade) || 14,
      plantilla: newPersonnelForm.plantilla || 'ITMS-CSD-2024-001',
      division: newPersonnelForm.division || 'CSD',
      detail: newPersonnelForm.detail || 'ITMS Headquarters',
      designation: newPersonnelForm.designation || 'IT Specialist',
      address: newPersonnelForm.address || 'Quezon City, Metro Manila',
      gender: newPersonnelForm.gender || 'Male',
      contactNumber: newPersonnelForm.contactNumber || '0917-000-0000',
      birthday: newPersonnelForm.birthday || '1990-01-01',
      dateOfEntry: newPersonnelForm.dateOfEntry || '2015-01-01',
      enterInOfficerPositionDate: newPersonnelForm.enterInOfficerPositionDate || 'N/A',
      status: newPersonnelForm.status || 'Active',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400'
    };

    addPersonnel(created);
    setAddModalOpen(false);
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

          {/* Row 1: Account Number, Last Name, First Name, Middle Name, Badge Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-2xs font-bold text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                placeholder="Search Account No..."
                value={searchAccountNo}
                onChange={e => { setSearchAccountNo(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none"
              />
            </div>
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
                <option value="PCOL">PCOL (Police Colonel)</option>
                <option value="PLTCOL">PLTCOL (Lieutenant Colonel)</option>
                <option value="PMAJ">PMAJ (Police Major)</option>
                <option value="PCPT">PCPT (Police Captain)</option>
                <option value="PLT">PLT (Police Lieutenant)</option>
                <option value="PEMS">PEMS (Executive Master Sgt)</option>
                <option value="PCMS">PCMS (Chief Master Sgt)</option>
                <option value="PCPL">PCPL (Police Corporal)</option>
                <option value="Pat">Pat (Patrolman/Patrolwoman)</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-2xs font-bold text-slate-700 mb-1">Unit</label>
              <select
                value={searchUnit}
                onChange={e => { setSearchUnit(e.target.value); setCurrentPage(1); }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-cyan-500 focus:outline-none truncate"
              >
                <option value="Please select">ITMS - Information Technology Management Service...</option>
                <option value="ARMD">ARMD (Admin & Resource Management)</option>
                <option value="CSD">CSD (Cyber Security Division)</option>
                <option value="SDD">SDD (Software Development Division)</option>
                <option value="NDCMD">NDCMD (Network & Data Center)</option>
                <option value="PPD">PPD (Plans & Programs Division)</option>
                <option value="OMD">OMD (Operations Management Division)</option>
                <option value="ISSD">ISSD (Information Systems Audit)</option>
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

      {/* PERSONNEL TABLE CONTAINER (TALLER ROW HEIGHT & SPACIOUS PHOTO BADGES) */}
      <div className="w-full bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        {/* Solid Blue Header Bar matching user's screenshot (#4682B4) */}
        <div className="bg-[#4682B4] text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs">
            <Users className="w-4 h-4 text-white" />
            <span>Personnel</span>
          </div>
          <div className="flex items-center gap-2 text-2xs text-blue-100">
            <span>Showing {filteredPersonnel.length} Matched Records (Total {personnelList.length})</span>
          </div>
        </div>

        {/* Table Body - Full-Width Layout with Taller Rows */}
        <div className="w-full overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-[11px] border-collapse table-auto">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-3xs">
                <th className="p-3 border-r border-slate-200 text-center">PHOTO</th>
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
                    className="hover:bg-cyan-50/60 transition-colors cursor-pointer"
                    onClick={() => handleInspectRow(person.id)}
                  >
                    {/* PHOTO */}
                    <td className="p-3 border-r border-slate-200 text-center align-middle">
                      <div className="relative group mx-auto inline-block">
                        <img 
                          src={person.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'} 
                          alt={person.fullName}
                          className="w-24 h-28 object-cover rounded border border-slate-300 shadow-sm cursor-pointer group-hover:opacity-95 group-hover:scale-102 transition-all"
                          onClick={() => {
                            setEnlargedPhotoUrl(person.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800');
                            setEnlargedPhotoName(person.fullName);
                          }}
                        />
                        <div 
                          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer rounded"
                          onClick={() => {
                            setEnlargedPhotoUrl(person.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800');
                            setEnlargedPhotoName(person.fullName);
                          }}
                        >
                          <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </td>

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
                  <td colSpan={13} className="p-8 text-center text-slate-500 font-bold italic">
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

      {/* LIGHTBOX MODAL FOR ENLARGED PHOTO VIEW */}
      {enlargedPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full flex flex-col items-center shadow-2xl relative">
            <button 
              onClick={() => setEnlargedPhotoUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-800 mb-3">{enlargedPhotoName}</h3>

            <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img 
                src={enlargedPhotoUrl} 
                alt={enlargedPhotoName}
                className="w-full h-full object-cover" 
              />
            </div>

            <button
              onClick={() => setEnlargedPhotoUrl(null)}
              className="mt-4 px-6 py-2 bg-cyan-600 text-white font-bold text-xs rounded-xl hover:bg-cyan-700"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* BULK IMPORT MASSIVE DATA MODAL */}
      <BulkImportModal
        isOpen={isImportModalOpen}
        backendConnected={backendConnected}
        onClose={() => setIsImportModalOpen(false)}
        onImport={bulkImportPersonnel}
      />

      {/* SUMMARY PROFILE MODAL — opens when clicking a row */}
      {inspectModalOpen && selectedPerson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setInspectModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md animate-scale-in"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
            <div className="bg-cyan-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <UserPlus className="w-5 h-5" />
                <span>Register New Personnel Record</span>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-white hover:text-cyan-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPersonnelSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Rank *</label>
                  <select
                    value={newPersonnelForm.rank}
                    onChange={e => setNewPersonnelForm({...newPersonnelForm, rank: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded font-bold text-blue-700"
                  >
                    <option value="PCOL">PCOL (Police Colonel)</option>
                    <option value="PLTCOL">PLTCOL (Lieutenant Colonel)</option>
                    <option value="PMAJ">PMAJ (Police Major)</option>
                    <option value="PCPT">PCPT (Police Captain)</option>
                    <option value="PLT">PLT (Police Lieutenant)</option>
                    <option value="PEMS">PEMS (Executive Master Sgt)</option>
                    <option value="PCMS">PCMS (Chief Master Sgt)</option>
                    <option value="PCPL">PCPL (Police Corporal)</option>
                    <option value="Pat">Pat (Patrolman/Patrolwoman)</option>
                  </select>
                </div>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Unit / Division</label>
                  <select
                    value={newPersonnelForm.division}
                    onChange={e => setNewPersonnelForm({...newPersonnelForm, division: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="ARMD">C0216 - Admin & Resource Management</option>
                    <option value="CSD">CSD (Cyber Security Division)</option>
                    <option value="SDD">SDD (Software Development Division)</option>
                    <option value="NDCMD">NDCMD (Network & Data Center)</option>
                    <option value="PPD">PPD (Plans & Programs Division)</option>
                    <option value="OMD">OMD (Operations Management)</option>
                    <option value="ISSD">ISSD (Systems Audit Unit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newPersonnelForm.designation}
                    onChange={e => setNewPersonnelForm({...newPersonnelForm, designation: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded"
                    placeholder="e.g. Action PNCO"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Salary Grade (SG-ST)</label>
                  <input
                    type="number"
                    value={newPersonnelForm.salaryGrade}
                    onChange={e => setNewPersonnelForm({...newPersonnelForm, salaryGrade: Number(e.target.value)})}
                    className="w-full p-2 border border-slate-300 rounded font-bold"
                  />
                </div>
              </div>

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
