import React, { useState } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { 
  UserPlus, 
  Trash2, 
  Edit, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  Search
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Personnel, RankAbbr } from '../types/pais';

export const ManagementPage: React.FC = () => {
  const { 
    role, 
    toggleRole, 
    personnelList, 
    addPersonnel, 
    deletePersonnel,
    setSelectedPersonnelId 
  } = useAuthRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Personnel Form
  const [rank, setRank] = useState<RankAbbr>('PLT');
  const [rankFullName, setRankFullName] = useState('Police Lieutenant');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [badgeNo, setBadgeNo] = useState('');
  const [salaryGrade, setSalaryGrade] = useState(22);
  const [plantilla, setPlantilla] = useState('');
  const [division, setDivision] = useState('SDD');
  const [detail, setDetail] = useState('ITMS Headquarters - Camp Crame');
  const [designation, setDesignation] = useState('Software Engineer');
  const [address, setAddress] = useState('Quezon City, Metro Manila');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [contactNumber, setContactNumber] = useState('0917-000-0000');
  const [birthday, setBirthday] = useState('1995-01-01');
  const [dateOfEntry, setDateOfEntry] = useState('2018-06-01');

  const filteredPersonnel = personnelList.filter(p => 
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.badgeNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.division.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPersonnelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPerson: Personnel = {
      id: `pnp-${Date.now()}`,
      rank,
      rankFullName,
      firstName: firstName.toUpperCase(),
      middleName: middleName.toUpperCase(),
      lastName: lastName.toUpperCase(),
      fullName: `${rank} ${firstName.toUpperCase()} ${lastName.toUpperCase()}`,
      badgeNo,
      salaryGrade: Number(salaryGrade),
      plantilla,
      division,
      detail,
      designation,
      address,
      gender,
      contactNumber,
      birthday,
      dateOfEntry,
      enterInOfficerPositionDate: dateOfEntry,
      lastPromotionDate: dateOfEntry,
      status: 'Active',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    };

    addPersonnel(newPerson);
    setIsAddModalOpen(false);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setBadgeNo('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner with Role Status Indicator */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
              System Administration
            </span>
            <span className="text-xs text-slate-500 font-mono">Role-Based Access Control</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Data Maintenance & Management Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">Maintain personnel records, plantilla allocations, and system entities</p>
        </div>

        {/* Role Mode Switcher Widget */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 block font-bold">Active Session Mode</span>
            <span className={`text-xs font-extrabold ${role === 'admin' ? 'text-blue-700' : 'text-slate-600'}`}>
              {role === 'admin' ? 'System Administrator / Editor' : 'View-Only Personnel Officer'}
            </span>
          </div>

          <button
            onClick={toggleRole}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              role === 'admin' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 shadow-xs'
            }`}
          >
            {role === 'admin' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Switch Role</span>
          </button>
        </div>
      </div>

      {/* Role State Warning Bar if View-Only */}
      {role === 'view_only' && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-between text-xs shadow-2xs font-semibold">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Read-Only Permission Enabled:</strong> Administrative editing and deletion options are restricted. Switch to <strong>Admin / Editor</strong> mode in the top header or button above to test CRUD operations.
            </span>
          </div>
        </div>
      )}

      {/* Data Management Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden space-y-4 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search database records..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          {role === 'admin' ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105"
            >
              <UserPlus className="w-4 h-4" /> Register New Personnel Entry
            </button>
          ) : (
            <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
              <Lock className="w-3.5 h-3.5" /> Editing Restricted in View-Only Mode
            </span>
          )}
        </div>

        {/* Personnel Master Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3 px-4">Rank & Full Name</th>
                <th className="py-3 px-4">Badge No</th>
                <th className="py-3 px-4">Plantilla Item</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 font-bold">
              {filteredPersonnel.map((person) => (
                <tr key={person.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <img
                      src={person.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                      alt={person.fullName}
                      className="w-8 h-8 rounded-full object-cover border border-blue-200"
                    />
                    <div>
                      <div className="font-extrabold text-slate-900">{person.rank} {person.lastName}, {person.firstName}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{person.rankFullName}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{person.badgeNo}</td>
                  <td className="py-3 px-4 font-mono text-sky-700 text-[11px] font-extrabold">{person.plantilla}</td>
                  <td className="py-3 px-4 font-bold text-blue-700">{person.division}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{person.designation}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={person.status === 'Active' ? 'success' : 'warning'} size="sm">
                      {person.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {role === 'admin' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedPersonnelId(person.id);
                          }}
                          title="Edit Personnel Record"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePersonnel(person.id)}
                          title="Delete Record"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic font-semibold">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Personnel Entry Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Police Personnel Entry"
        subtitle="Create 201 profile record for PNP ITMS administrative database"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddPersonnelSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Rank Abbreviation</label>
              <select
                value={rank}
                onChange={e => {
                  const val = e.target.value as RankAbbr;
                  setRank(val);
                  if (val === 'PCOL') setRankFullName('Police Colonel');
                  else if (val === 'PLTCOL') setRankFullName('Police Lieutenant Colonel');
                  else if (val === 'PMAJ') setRankFullName('Police Major');
                  else if (val === 'PCPT') setRankFullName('Police Captain');
                  else if (val === 'PLT') setRankFullName('Police Lieutenant');
                  else if (val === 'PEMS') setRankFullName('Police Executive Master Sergeant');
                  else if (val === 'PCMS') setRankFullName('Police Chief Master Sergeant');
                  else setRankFullName('Police Corporal');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="PCOL">PCOL (Police Colonel)</option>
                <option value="PLTCOL">PLTCOL (Police Lieutenant Colonel)</option>
                <option value="PMAJ">PMAJ (Police Major)</option>
                <option value="PCPT">PCPT (Police Captain)</option>
                <option value="PLT">PLT (Police Lieutenant)</option>
                <option value="PEMS">PEMS (Police Executive Master Sergeant)</option>
                <option value="PCMS">PCMS (Police Chief Master Sergeant)</option>
                <option value="PCPL">PCPL (Police Corporal)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Badge / Serial No.</label>
              <input
                type="text"
                value={badgeNo}
                onChange={e => setBadgeNo(e.target.value)}
                placeholder="e.g. 0-192834"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={e => setMiddleName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Salary Grade (SG)</label>
              <input
                type="number"
                value={salaryGrade}
                onChange={e => setSalaryGrade(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Plantilla Item No.</label>
              <input
                type="text"
                value={plantilla}
                onChange={e => setPlantilla(e.target.value)}
                placeholder="e.g. ITMS-SDD-2026-09"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Division</label>
              <select
                value={division}
                onChange={e => setDivision(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="ARMD">ARMD</option>
                <option value="CSD">CSD</option>
                <option value="SDD">SDD</option>
                <option value="NDCMD">NDCMD</option>
                <option value="OMD">OMD</option>
                <option value="PPD">PPD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Designation Title</label>
            <input
              type="text"
              value={designation}
              onChange={e => setDesignation(e.target.value)}
              placeholder="e.g. Cyber Defense Analyst"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Register Personnel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


