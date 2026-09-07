import React, { useState, useEffect } from 'react';
import { Personnel } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  Shield, 
  Award, 
  CheckCircle, 
  Lock,
  Save,
  AlertCircle,
  Building2,
  BadgeCheck,
  RotateCcw,
  Edit3
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { hasManagementAccess } from '../../utils/accessControl';

const PNP_RANKS = [
  'PGEN',
  'PLTGEN',
  'PMGEN',
  'PBGEN',
  'PCOL',
  'PLTCOL',
  'PMAJ',
  'PCPT',
  'PLT',
  'PEMS',
  'PCMS',
  'PSMS',
  'PMSg',
  'PSSg',
  'PCpl',
  'Pat',
  'NUP'
];

interface PersonnelInfoTabProps {
  personnel: Personnel;
  isEditing?: boolean;
  onToggleEdit?: (editing: boolean) => void;
  onSaved?: (updated: Personnel) => void;
}

export const PersonnelInfoTab: React.FC<PersonnelInfoTabProps> = ({ 
  personnel, 
  isEditing = false,
  onToggleEdit,
  onSaved 
}) => {
  const { role, updatePersonnel } = useAuthRole();
  const canManage = hasManagementAccess(role);

  const [internalEditing, setInternalEditing] = useState(isEditing);
  const [formData, setFormData] = useState<Personnel>(personnel);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setInternalEditing(isEditing);
  }, [isEditing]);

  useEffect(() => {
    setFormData(personnel);
    setErrorMessage(null);
    setSavedSuccess(false);
  }, [personnel]);

  const handleChange = (field: keyof Personnel, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'sub_unit') {
        next.division = value;
      } else if (field === 'details') {
        next.detail = value;
      }
      return next;
    });
  };

  const handleReset = () => {
    setFormData(personnel);
    setErrorMessage(null);
    setSavedSuccess(false);
  };

  const handleToggleEdit = (editing: boolean) => {
    setInternalEditing(editing);
    onToggleEdit?.(editing);
    if (!editing) {
      setFormData(personnel);
      setErrorMessage(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setErrorMessage('First Name and Last Name are required.');
      return;
    }

    const subUnitStr = (formData.sub_unit || formData.division || '').trim();
    const detailsStr = (formData.details || formData.detail || '').trim();
    const stationStr = (formData.station || '').trim();
    const fnStr = (formData.firstName || '').trim();
    const mnStr = (formData.middleName || '').trim();
    const lnStr = (formData.lastName || '').trim();
    const qStr  = (formData.qualifier || '').trim();
    const rankStr = formData.rank || 'PCpl';

    const middleInitial = mnStr ? ` ${mnStr.charAt(0).toUpperCase()}.` : '';
    const qualifierPart = qStr ? ` ${qStr}` : '';
    const fullName = `${rankStr} ${fnStr}${middleInitial} ${lnStr}${qualifierPart}`.trim();

    const payload: Personnel = {
      ...formData,
      rank: rankStr,
      rankFullName: (formData.rankFullName || '').trim(),
      firstName: fnStr,
      middleName: mnStr,
      lastName: lnStr,
      qualifier: qStr,
      fullName: fullName || formData.fullName,
      badgeNo: (formData.badgeNo || '').trim(),
      salaryGrade: Number(formData.salaryGrade) || 0,
      plantilla: (formData.plantilla || '').trim(),
      sub_unit: subUnitStr,
      details: detailsStr,
      station: stationStr,
      division: subUnitStr,
      detail: detailsStr,
      designation: (formData.designation || '').trim(),
      address: (formData.address || '').trim(),
      gender: formData.gender || 'Male',
      contactNumber: (formData.contactNumber || '').trim(),
      birthday: formData.birthday || '',
      dateOfEntry: formData.dateOfEntry || '',
      enterInOfficerPositionDate: formData.enterInOfficerPositionDate || '',
      lastPromotionDate: formData.lastPromotionDate || '',
      status: formData.status || 'Active'
    };

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await updatePersonnel(payload);
      setFormData(saved);
      setSavedSuccess(true);
      setInternalEditing(false);
      onToggleEdit?.(false);
      onSaved?.(saved);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update personnel record in database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner Status & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-700" /> Complete Personnel Profile &amp; Bio-Data
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {internalEditing && canManage
              ? 'Editing official personnel credentials, organizational assignment, and bio-data.'
              : 'Official administrative personnel bio-data as maintained by ITMS ARMD.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Record updated in database and all modules!
            </span>
          )}

          {canManage ? (
            <button
              type="button"
              onClick={() => handleToggleEdit(!internalEditing)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                internalEditing 
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              }`}
            >
              {internalEditing ? (
                <span>Cancel Edit</span>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </>
              )}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> View Only Mode
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* RENDER EDIT FORM ONLY WHEN EDITING IS ACTIVE */}
      {internalEditing && canManage ? (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Identity & Rank */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <BadgeCheck className="w-3.5 h-3.5 text-blue-600" /> Identity &amp; Rank Credentials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Rank *</label>
                <select
                  value={formData.rank}
                  onChange={e => handleChange('rank', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-bold text-blue-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  {PNP_RANKS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Rank Full Name</label>
                <input
                  type="text"
                  value={formData.rankFullName || ''}
                  onChange={e => handleChange('rankFullName', e.target.value)}
                  placeholder="e.g. Police Corporal"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Badge Number</label>
                <input
                  type="text"
                  value={formData.badgeNo || ''}
                  onChange={e => handleChange('badgeNo', e.target.value)}
                  placeholder="e.g. 101001"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Qualifier</label>
                <input
                  type="text"
                  value={formData.qualifier || ''}
                  onChange={e => handleChange('qualifier', e.target.value)}
                  placeholder="Jr., Sr., III"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName || ''}
                  onChange={e => handleChange('firstName', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName || ''}
                  onChange={e => handleChange('middleName', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-2xs font-bold text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName || ''}
                  onChange={e => handleChange('lastName', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Organizational Assignment */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building2 className="w-3.5 h-3.5 text-blue-600" /> Organizational Placement &amp; Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Sub-Unit</label>
                <input
                  type="text"
                  value={formData.sub_unit || formData.division || ''}
                  onChange={e => handleChange('sub_unit', e.target.value)}
                  placeholder="e.g. Network Operations Section"
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Details</label>
                <input
                  type="text"
                  value={formData.details || formData.detail || ''}
                  onChange={e => handleChange('details', e.target.value)}
                  placeholder="e.g. Network Monitoring"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Station</label>
                <input
                  type="text"
                  value={formData.station || ''}
                  onChange={e => handleChange('station', e.target.value)}
                  placeholder="e.g. Camp Crame"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={e => handleChange('designation', e.target.value)}
                  placeholder="e.g. Section Chief"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Plantilla Item</label>
                <input
                  type="text"
                  value={formData.plantilla || ''}
                  onChange={e => handleChange('plantilla', e.target.value)}
                  placeholder="e.g. P-001"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Salary Grade</label>
                <input
                  type="number"
                  value={formData.salaryGrade ?? ''}
                  onChange={e => handleChange('salaryGrade', e.target.value)}
                  placeholder="e.g. 14"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-2xs font-bold text-slate-700 mb-1">Duty Status</label>
                <select
                  value={formData.status || 'Active'}
                  onChange={e => handleChange('status', e.target.value)}
                  className="w-full sm:w-64 p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-bold"
                >
                  <option value="Active">Active / On Duty</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Detailed Out">Detailed Out</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Personal & Contact Information */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Phone className="w-3.5 h-3.5 text-blue-600" /> Personal &amp; Contact Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-2xs font-bold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="e.g. Quezon City, Metro Manila"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender || 'Male'}
                  onChange={e => handleChange('gender', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={formData.contactNumber || ''}
                  onChange={e => handleChange('contactNumber', e.target.value)}
                  placeholder="e.g. 09171234567"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Birthday</label>
                <input
                  type="date"
                  value={formData.birthday || ''}
                  onChange={e => handleChange('birthday', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Service History & Key Dates */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Service Timeline &amp; Dates
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Date of Entry into Police Service</label>
                <input
                  type="date"
                  value={formData.dateOfEntry || ''}
                  onChange={e => handleChange('dateOfEntry', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Enter in Officer Position Date</label>
                <input
                  type="date"
                  value={formData.enterInOfficerPositionDate || ''}
                  onChange={e => handleChange('enterInOfficerPositionDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Last Promotion Date</label>
                <input
                  type="date"
                  value={formData.lastPromotionDate || ''}
                  onChange={e => handleChange('lastPromotionDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Changes
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes…' : 'Save Changes to Database'}
            </button>
          </div>
        </form>
      ) : (
        /* Read-only view (Summary of Profile details) */
        <div className="space-y-4">
          {/* Identity & Rank Box */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <BadgeCheck className="w-3.5 h-3.5 text-blue-600" /> Identity &amp; Rank
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Rank</span>
                <span className="font-extrabold text-blue-800 text-xs">{personnel.rank}</span>
                {personnel.rankFullName && (
                  <span className="text-[10px] text-slate-500 block">{personnel.rankFullName}</span>
                )}
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Badge No.</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{personnel.badgeNo || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Official Full Name</span>
                <span className="font-bold text-slate-900 text-xs">{personnel.rank} {personnel.fullName}</span>
              </div>
            </div>
          </div>

          {/* Organizational Assignment Box */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building2 className="w-3.5 h-3.5 text-blue-600" /> Organizational Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sub-Unit</span>
                <span className="font-bold text-blue-800 text-xs">{personnel.sub_unit || personnel.division || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Details</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.details || personnel.detail || 'No Details recorded'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Station</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.station || 'No Station recorded'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Designation</span>
                <span className="font-semibold text-slate-800 text-xs">{personnel.designation || 'Not assigned'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Plantilla Item</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.plantilla || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Salary Grade / Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-slate-800 text-xs font-semibold">SG {personnel.salaryGrade || '—'}</span>
                  <Badge variant={personnel.status === 'Active' ? 'success' : 'neutral'} size="sm">{personnel.status}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Personal & Contact Details Box */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Phone className="w-3.5 h-3.5 text-blue-600" /> Personal &amp; Service Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Residential Address</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.address || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Contact Number</span>
                <span className="font-mono font-semibold text-emerald-700 text-xs">{personnel.contactNumber || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Gender / Birthday</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.gender} · {personnel.birthday || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date of Entry</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.dateOfEntry || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Officer Position Date</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.enterInOfficerPositionDate || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Promotion Date</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.lastPromotionDate || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
