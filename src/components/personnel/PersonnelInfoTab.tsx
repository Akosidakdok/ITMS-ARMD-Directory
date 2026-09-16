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
  Edit3,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { hasManagementAccess } from '../../utils/accessControl';
import { 
  getRankFullName, 
  isUniformedRank, 
  RANK_CATEGORIES, 
  UNIT_CATEGORIES, 
  POSITION_CATEGORIES, 
  SUB_UNIT_CATEGORIES, 
  getPcoRanks, 
  getPncoRanks, 
  getRankCategory,
  PCO_DISPLAY_RANKS,
  PNCO_DISPLAY_RANKS,
  NUP_DISPLAY_RANKS,
  isRankInCategory,
  getRanksByCategory
} from '../../constants/ranks';

const UNIFORMED_RANKS_ORDER = [
  'Pat', 'PCpl', 'PSSg', 'PMSg', 'PSMS', 'PCMS', 'PEMS',
  'PLT', 'PCPT', 'PMAJ', 'PLTCOL', 'PCOL', 'PBGEN', 'PMGEN', 'PLTGEN', 'PGEN'
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
  const [personnelType, setPersonnelType] = useState<'Uniformed Personnel' | 'Non-Uniformed Personnel'>(
    personnel.rank === 'NUP' ? 'Non-Uniformed Personnel' : 'Uniformed Personnel'
  );
  const [formData, setFormData] = useState<Personnel>(personnel);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setInternalEditing(isEditing);
  }, [isEditing]);

  useEffect(() => {
    const derivedCat = personnel.rankCategory || getRankCategory(personnel.rank);
    setFormData({
      ...personnel,
      rankCategory: derivedCat
    });
    setPersonnelType(personnel.rank === 'NUP' ? 'Non-Uniformed Personnel' : 'Uniformed Personnel');
    setErrorMessage(null);
    setSavedSuccess(false);
  }, [personnel]);

  const handleRankCategoryChange = (cat: 'PCO' | 'PNCO' | 'NUP' | '') => {
    setErrorMessage(null);
    if (!cat) {
      setFormData(prev => ({
        ...prev,
        rankCategory: undefined,
        rank: '' as any,
        rankFullName: ''
      }));
      return;
    }

    const currentRank = formData.rank;
    const isCompatible = Boolean(currentRank && isRankInCategory(currentRank, cat));

    if (cat === 'PCO') {
      setPersonnelType('Uniformed Personnel');
      const nextRank = isCompatible ? currentRank : '';
      setFormData(prev => ({
        ...prev,
        rankCategory: 'PCO',
        rank: nextRank as any,
        rankFullName: nextRank ? getRankFullName(nextRank) : '',
        plantilla: '',
        salaryGrade: undefined
      }));
    } else if (cat === 'PNCO') {
      setPersonnelType('Uniformed Personnel');
      const nextRank = isCompatible ? currentRank : '';
      setFormData(prev => ({
        ...prev,
        rankCategory: 'PNCO',
        rank: nextRank as any,
        rankFullName: nextRank ? getRankFullName(nextRank) : '',
        plantilla: '',
        salaryGrade: undefined
      }));
    } else {
      setPersonnelType('Non-Uniformed Personnel');
      setFormData(prev => ({
        ...prev,
        rankCategory: 'NUP',
        rank: 'NUP',
        rankFullName: 'Non-Uniformed Personnel',
        salaryGrade: prev.salaryGrade || '14'
      }));
    }
  };

  const handleRankChange = (selectedRank: string) => {
    setErrorMessage(null);
    if (!selectedRank) {
      setFormData(prev => ({
        ...prev,
        rank: '' as any,
        rankFullName: ''
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      rank: selectedRank as any,
      rankFullName: getRankFullName(selectedRank)
    }));
  };

  const handlePersonnelTypeChange = (type: 'Uniformed Personnel' | 'Non-Uniformed Personnel') => {
    setPersonnelType(type);
    if (type === 'Uniformed Personnel') {
      handleRankCategoryChange(formData.rankCategory === 'PCO' ? 'PCO' : 'PNCO');
    } else {
      handleRankCategoryChange('NUP');
    }
  };

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
    const derivedCat = personnel.rankCategory || getRankCategory(personnel.rank);
    setFormData({
      ...personnel,
      rankCategory: derivedCat
    });
    setPersonnelType(personnel.rank === 'NUP' ? 'Non-Uniformed Personnel' : 'Uniformed Personnel');
    setErrorMessage(null);
    setSavedSuccess(false);
  };

  const handleToggleEdit = (editing: boolean) => {
    setInternalEditing(editing);
    onToggleEdit?.(editing);
    if (!editing) {
      const derivedCat = personnel.rankCategory || getRankCategory(personnel.rank);
      setFormData({
        ...personnel,
        rankCategory: derivedCat
      });
      setPersonnelType(personnel.rank === 'NUP' ? 'Non-Uniformed Personnel' : 'Uniformed Personnel');
      setErrorMessage(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.rankCategory) {
      setErrorMessage('Please select a Rank Category (PCO, PNCO, or NUP).');
      return;
    }

    if (!formData.rank) {
      setErrorMessage(`Please select a valid Rank for the ${formData.rankCategory} category.`);
      return;
    }

    if (!isRankInCategory(formData.rank, formData.rankCategory)) {
      setErrorMessage(`The selected rank "${formData.rank}" does not match the chosen Rank Category "${formData.rankCategory}".`);
      return;
    }

    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setErrorMessage('First Name and Last Name are required.');
      return;
    }

    const isUniformed = formData.rankCategory !== 'NUP';
    const subUnitStr = (formData.sub_unit || formData.division || '').trim();
    const detailsStr = (formData.details || formData.detail || '').trim();
    const stationStr = (formData.station || '').trim();
    const fnStr = (formData.firstName || '').trim();
    const mnStr = (formData.middleName || '').trim();
    const lnStr = (formData.lastName || '').trim();
    const qStr  = (formData.qualifier || '').trim();
    const rankStr = formData.rank;
    const rankFull = isUniformed ? getRankFullName(rankStr) : 'Non-Uniformed Personnel';

    const middleInitial = mnStr ? ` ${mnStr.charAt(0).toUpperCase()}.` : '';
    const qualifierPart = qStr ? ` ${qStr}` : '';
    const fullName = `${rankStr} ${fnStr}${middleInitial} ${lnStr}${qualifierPart}`.trim();

    const payload: Personnel = {
      ...formData,
      rankCategory: formData.rankCategory || (isUniformed ? getRankCategory(rankStr) : 'NUP'),
      rank: rankStr,
      rankFullName: rankFull,
      firstName: fnStr,
      middleName: mnStr,
      lastName: lnStr,
      qualifier: qStr,
      fullName: fullName || formData.fullName,
      badgeNo: (formData.badgeNo || '').trim(),
      salaryGrade: isUniformed ? undefined : (String(formData.salaryGrade || '').trim() || undefined),
      plantilla: isUniformed ? '' : (formData.plantilla || '').trim(),
      positionCategory: formData.positionCategory || 'Main',
      unitCategory: formData.unitCategory || 'ITMS HQ',
      subUnitCategory: formData.subUnitCategory || 'Division',
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
      enterInOfficerPositionDate: formData.enterInOfficerPositionDate || formData.designationDate || '',
      designationDate: formData.designationDate || formData.enterInOfficerPositionDate || '',
      effectiveDate: formData.effectiveDate || '',
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
          {/* ── Section 1: Identity & Rank ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-blue-600" /> 1. Identity &amp; Rank Credentials
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">Identity</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Rank Category */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">
                  Rank Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.rankCategory || ''}
                  onChange={e => handleRankCategoryChange(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded font-bold text-indigo-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
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
                  value={formData.rank || ''}
                  onChange={e => handleRankChange(e.target.value)}
                  disabled={!formData.rankCategory || formData.rankCategory === 'NUP'}
                  className={`w-full p-2 border rounded font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 ${
                    !formData.rankCategory 
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : formData.rankCategory === 'NUP'
                        ? 'border-slate-200 bg-slate-100 text-slate-700 cursor-not-allowed'
                        : 'border-slate-300 text-blue-700 cursor-pointer'
                  }`}
                  required
                >
                  {!formData.rankCategory ? (
                    <option value="">-- Select Rank Category first --</option>
                  ) : formData.rankCategory === 'PCO' ? (
                    <>
                      <option value="">-- Select PCO Rank --</option>
                      {PCO_DISPLAY_RANKS.map(r => (
                        <option key={r.code} value={r.code}>{r.label}</option>
                      ))}
                    </>
                  ) : formData.rankCategory === 'PNCO' ? (
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

              {formData.rankCategory === 'NUP' && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-blue-950">Non-Uniformed Personnel (NUP)</p>
                    <p className="text-blue-800">
                      Strictly isolated from uniformed police ranks. Rank is automatically set to <strong>NUP (Non-Uniformed Personnel)</strong>. Please record the employee's <strong>Plantilla Item</strong>, <strong>Salary Grade (SG)</strong>, and <strong>Position/Designation</strong> under the <strong>Assignment Details</strong> section below.
                    </p>
                  </div>
                </div>
              )}

              {/* Badge Number */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Badge Number *</label>
                <input
                  type="text"
                  required
                  value={formData.badgeNo || ''}
                  onChange={e => handleChange('badgeNo', e.target.value)}
                  placeholder="e.g. 101001"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-semibold"
                />
              </div>

              {/* Qualifier */}
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

              {/* First Name */}
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

              {/* Middle Name */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName || ''}
                  onChange={e => handleChange('middleName', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName || ''}
                  onChange={e => handleChange('lastName', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Gender *</label>
                <select
                  value={formData.gender || 'Male'}
                  onChange={e => handleChange('gender', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
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
                  value={formData.birthday || ''}
                  onChange={e => handleChange('birthday', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
              </div>

              {/* Contact Number */}
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

              {/* Residential Address */}
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
            </div>

            {/* Service Dates in Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
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

          {/* ── Section 2: Organizational Placement & Assignment ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> 2. Organizational Placement &amp; Assignment
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Position Category */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Position Category *</label>
                <select
                  value={formData.positionCategory || 'Main'}
                  onChange={e => handleChange('positionCategory', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {POSITION_CATEGORIES.map(pc => (
                    <option key={pc} value={pc}>{pc}</option>
                  ))}
                </select>
              </div>

              {/* Unit Category */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Unit Category *</label>
                <select
                  value={formData.unitCategory || 'ITMS HQ'}
                  onChange={e => handleChange('unitCategory', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {UNIT_CATEGORIES.map(uc => (
                    <option key={uc} value={uc}>{uc}</option>
                  ))}
                </select>
              </div>

              {/* Sub-Unit Category */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Sub-Unit Category *</label>
                <select
                  value={formData.subUnitCategory || 'Division'}
                  onChange={e => handleChange('subUnitCategory', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {SUB_UNIT_CATEGORIES.map(sc => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
              </div>

              {/* Sub-Unit Name */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Sub-Unit Name</label>
                <input
                  type="text"
                  value={formData.sub_unit || formData.division || ''}
                  onChange={e => handleChange('sub_unit', e.target.value)}
                  placeholder="e.g. Network Operations Section"
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              {/* Details */}
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

              {/* Station (Explicitly Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-2xs font-bold text-slate-700">Station</label>
                  <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
                </div>
                <input
                  type="text"
                  value={formData.station || ''}
                  onChange={e => handleChange('station', e.target.value)}
                  placeholder="e.g. Camp Crame (Optional)"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Designation */}
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

              {/* Duty Status */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Duty Status *</label>
                <select
                  value={formData.status || 'Active'}
                  onChange={e => handleChange('status', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                >
                  <option value="Active">Active / On Duty</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Detailed Out">Detailed Out</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
            </div>

            {/* NUP Specific: Plantilla & Salary Grade */}
            {formData.rankCategory === 'NUP' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-2xs font-bold text-slate-700">Salary Grade (SG-ST)</label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Compensation Grade</span>
                  </div>
                  <input
                    type="text"
                    value={formData.salaryGrade ?? ''}
                    onChange={e => handleChange('salaryGrade', e.target.value)}
                    placeholder="e.g. 14, SG-14, or 14-1"
                    className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Salary Grade is recorded here under Assignment as a position-level compensation grade that changes over time.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 3: Designation Orders & Dates ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> 3. Designation Orders &amp; Dates
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 uppercase">Orders</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-2xs font-bold text-slate-800">Designation Date (Date Order Issued)</label>
                  <span className="text-[10px] text-cyan-700 font-mono bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">Header Date</span>
                </div>
                <input
                  type="date"
                  value={formData.designationDate || formData.enterInOfficerPositionDate || ''}
                  onChange={e => {
                    handleChange('designationDate', e.target.value);
                    handleChange('enterInOfficerPositionDate', e.target.value);
                  }}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1">Displayed in the upper-right portion / header of the Order (when authority issued/signed the order).</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-2xs font-bold text-slate-800">Effective Date of Designation</label>
                  <span className="text-[10px] text-indigo-700 font-mono bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">Body Date</span>
                </div>
                <input
                  type="date"
                  value={formData.effectiveDate || ''}
                  onChange={e => handleChange('effectiveDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white focus:outline-none focus:border-blue-500 font-mono font-medium"
                />
                <p className="text-[10px] text-slate-500 mt-1">Displayed in the body of the Order (when duties, accountability, and command officially begin).</p>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
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
          {/* ── Box 1: Identity & Rank Credentials ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-blue-600" /> 1. Identity &amp; Rank Credentials
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">Identity</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Rank Category</span>
                <span className="font-extrabold text-indigo-700 text-xs">{personnel.rankCategory || getRankCategory(personnel.rank)}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Rank</span>
                <span className="font-extrabold text-blue-800 text-xs">{personnel.rank}</span>
                {personnel.rankFullName && (
                  <span className="text-[10px] text-slate-500 block truncate">{personnel.rankFullName}</span>
                )}
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Badge No.</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{personnel.badgeNo || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Official Full Name</span>
                <span className="font-bold text-slate-900 text-xs truncate">{personnel.rank} {personnel.fullName}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Gender &amp; Birthday</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.gender || 'Male'} · {personnel.birthday || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Contact Number</span>
                <span className="font-mono font-semibold text-emerald-700 text-xs">{personnel.contactNumber || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Residential Address</span>
                <span className="font-medium text-slate-800 text-xs truncate">{personnel.address || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date of Entry into Police Service</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.dateOfEntry || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Promotion Date</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.lastPromotionDate || '—'}</span>
              </div>
            </div>
          </div>

          {/* ── Box 2: Organizational Placement & Assignment ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" /> 2. Organizational Placement &amp; Assignment
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Position Category</span>
                <span className="font-semibold text-slate-800 text-xs">{personnel.positionCategory || 'Main'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Unit Category</span>
                <span className="font-bold text-blue-800 text-xs">{personnel.unitCategory || 'ITMS HQ'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sub-Unit Category</span>
                <span className="font-semibold text-slate-800 text-xs">{personnel.subUnitCategory || 'Division'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sub-Unit Name</span>
                <span className="font-bold text-blue-800 text-xs truncate">{personnel.sub_unit || personnel.division || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Details</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.details || personnel.detail || 'No Details recorded'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Station</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.station || 'No Station recorded (Optional)'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Designation</span>
                <span className="font-semibold text-slate-800 text-xs">{personnel.designation || 'Not assigned'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Duty Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={personnel.status === 'Active' ? 'success' : 'neutral'} size="sm">{personnel.status}</Badge>
                </div>
              </div>

              {!isUniformedRank(personnel.rank) && (
                <>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Plantilla Item</span>
                    <span className="font-mono text-slate-800 text-xs">{personnel.plantilla || '—'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Salary Grade (Compensation Step)</span>
                    <span className="font-mono text-emerald-800 text-xs font-bold">
                      {!personnel.salaryGrade ? '—' : (/^sg\b/i.test(String(personnel.salaryGrade).trim()) ? String(personnel.salaryGrade).trim() : `SG ${personnel.salaryGrade}`)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Box 3: Designation Orders & Dates ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> 3. Designation Orders &amp; Dates
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 uppercase">Orders</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Designation Date (Date Order Issued)</span>
                  <span className="text-[9px] font-mono text-cyan-700 bg-cyan-50 px-1 rounded border border-cyan-200">Header Date</span>
                </div>
                <span className="font-mono font-bold text-slate-800 text-xs mt-1 block">
                  {personnel.designationDate || personnel.enterInOfficerPositionDate || '—'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Displayed on the upper-right portion / header of the administrative order.</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Effective Date of Designation</span>
                  <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-200">Body Date</span>
                </div>
                <span className="font-mono font-bold text-slate-800 text-xs mt-1 block">
                  {personnel.effectiveDate || '—'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Displayed in the body of the administrative order when duties officially take effect.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
