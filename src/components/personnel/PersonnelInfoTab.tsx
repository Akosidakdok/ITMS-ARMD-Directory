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
  ShieldCheck,
  Briefcase,
  IdCard,
  Mail
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
  getRankCategory,
  PCO_DISPLAY_RANKS,
  PNCO_DISPLAY_RANKS,
  isRankInCategory
} from '../../constants/ranks';
import { calculateYearsBetween } from '../../utils/personnelCsv';

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
    const derivedCat = personnel.rankCategory || getRankCategory(personnel.rank);
    const bdate = personnel.birthdate || personnel.birthday || '';
    const sdate = personnel.dateEnteredService || personnel.desUp || personnel.dateOfEntry || '';
    setFormData({
      ...personnel,
      rankCategory: derivedCat,
      unit: personnel.unit || personnel.officeDivision || '',
      officeDivision: personnel.unit || personnel.officeDivision || '',
      subUnit: personnel.subUnit || personnel.sub_unit || personnel.division || '',
      sub_unit: personnel.subUnit || personnel.sub_unit || personnel.division || '',
      division: personnel.subUnit || personnel.sub_unit || personnel.division || '',
      details: personnel.details || personnel.detail || '',
      detail: personnel.details || personnel.detail || '',
      station: personnel.station || '',
      stationCode: personnel.stationCode || '',
      subStationCode: personnel.subStationCode || '',
      subStation: personnel.subStation || '',
      unitCode: personnel.unitCode || 'C02',
      subUnitCode: personnel.subUnitCode || '',
      qualification: personnel.qualification || personnel.qualifier || '',
      qualifier: personnel.qualification || personnel.qualifier || '',
      birthdate: bdate,
      birthday: bdate,
      ageToDate: personnel.ageToDate ?? (bdate ? calculateYearsBetween(bdate) ?? undefined : undefined),
      dateEnteredService: sdate,
      desUp: sdate,
      dateOfEntry: sdate,
      ageOfServiceToDate: personnel.ageOfServiceToDate ?? (sdate ? calculateYearsBetween(sdate) ?? undefined : undefined),
      civilStatus: personnel.civilStatus || 'Single',
      religion: personnel.religion || '',
      email: personnel.email || '',
      phoneNumber: personnel.phoneNumber || personnel.contactNumber || '',
      contactNumber: personnel.phoneNumber || personnel.contactNumber || '',
      tin: personnel.tin || '',
      gsisNumber: personnel.gsisNumber || '',
      philHealthNo: personnel.philHealthNo || '',
      pagibigNo: personnel.pagibigNo || '',
      sourceOfCommissionship: personnel.sourceOfCommissionship || '',
      dateOfOfficershipOrCommission: personnel.dateOfOfficershipOrCommission || personnel.enterInOfficerPositionDate || '',
      enterInOfficerPositionDate: personnel.dateOfOfficershipOrCommission || personnel.enterInOfficerPositionDate || '',
      pstatus: personnel.pstatus || personnel.status || 'Active',
      pstatusDate: personnel.pstatusDate || '',
      rankStatus: personnel.rankStatus || 'PERM'
    });
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

    if (cat === 'PCO' || cat === 'PNCO') {
      const nextRank = isCompatible ? currentRank : '';
      setFormData(prev => ({
        ...prev,
        rankCategory: cat,
        rank: nextRank as any,
        rankFullName: nextRank ? getRankFullName(nextRank) : '',
        plantilla: '',
        salaryGrade: undefined
      }));
    } else {
      setFormData(prev => ({
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

  const handleChange = (field: keyof Personnel, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'sub_unit' || field === 'subUnit') {
        next.division = value;
        next.sub_unit = value;
        next.subUnit = value;
      } else if (field === 'officeDivision' || field === 'unit') {
        next.officeDivision = value;
        next.unit = value;
      } else if (field === 'details' || field === 'detail') {
        next.details = value;
        next.detail = value;
      } else if (field === 'phoneNumber' || field === 'contactNumber') {
        next.phoneNumber = value;
        next.contactNumber = value;
      } else if (field === 'badgeNo' || field === 'badge_number') {
        next.badgeNo = value;
        next.badge_number = value;
      } else if (field === 'birthdate' || field === 'birthday') {
        next.birthdate = value;
        next.birthday = value;
        if (value) {
          next.ageToDate = calculateYearsBetween(value) || undefined;
        }
      } else if (field === 'desUp' || field === 'dateOfEntry' || field === 'dateEnteredService') {
        next.desUp = value;
        next.dateOfEntry = value;
        next.dateEnteredService = value;
        if (value) {
          next.ageOfServiceToDate = calculateYearsBetween(value) || undefined;
        }
      } else if (field === 'qualification' || field === 'qualifier') {
        next.qualification = value;
        next.qualifier = value;
      } else if (field === 'pstatus' || field === 'status') {
        next.pstatus = value;
        next.status = value;
      } else if (field === 'dateOfOfficershipOrCommission' || field === 'enterInOfficerPositionDate') {
        next.dateOfOfficershipOrCommission = value;
        next.enterInOfficerPositionDate = value;
      }
      return next;
    });
  };

  const handleReset = () => {
    const derivedCat = personnel.rankCategory || getRankCategory(personnel.rank);
    const bdate = personnel.birthdate || personnel.birthday || '';
    const sdate = personnel.dateEnteredService || personnel.desUp || personnel.dateOfEntry || '';
    setFormData({
      ...personnel,
      rankCategory: derivedCat,
      unit: personnel.unit || personnel.officeDivision || '',
      officeDivision: personnel.unit || personnel.officeDivision || '',
      subUnit: personnel.subUnit || personnel.sub_unit || personnel.division || '',
      sub_unit: personnel.subUnit || personnel.sub_unit || personnel.division || '',
      division: personnel.subUnit || personnel.sub_unit || personnel.division || '',
      details: personnel.details || personnel.detail || '',
      detail: personnel.details || personnel.detail || '',
      station: personnel.station || '',
      stationCode: personnel.stationCode || '',
      subStationCode: personnel.subStationCode || '',
      subStation: personnel.subStation || '',
      unitCode: personnel.unitCode || 'C02',
      subUnitCode: personnel.subUnitCode || '',
      qualification: personnel.qualification || personnel.qualifier || '',
      qualifier: personnel.qualification || personnel.qualifier || '',
      birthdate: bdate,
      birthday: bdate,
      ageToDate: personnel.ageToDate ?? (bdate ? calculateYearsBetween(bdate) ?? undefined : undefined),
      dateEnteredService: sdate,
      desUp: sdate,
      dateOfEntry: sdate,
      ageOfServiceToDate: personnel.ageOfServiceToDate ?? (sdate ? calculateYearsBetween(sdate) ?? undefined : undefined),
      civilStatus: personnel.civilStatus || 'Single',
      religion: personnel.religion || '',
      email: personnel.email || '',
      phoneNumber: personnel.phoneNumber || personnel.contactNumber || '',
      contactNumber: personnel.phoneNumber || personnel.contactNumber || '',
      tin: personnel.tin || '',
      gsisNumber: personnel.gsisNumber || '',
      philHealthNo: personnel.philHealthNo || '',
      pagibigNo: personnel.pagibigNo || '',
      sourceOfCommissionship: personnel.sourceOfCommissionship || '',
      dateOfOfficershipOrCommission: personnel.dateOfOfficershipOrCommission || personnel.enterInOfficerPositionDate || '',
      enterInOfficerPositionDate: personnel.dateOfOfficershipOrCommission || personnel.enterInOfficerPositionDate || '',
      pstatus: personnel.pstatus || personnel.status || 'Active',
      pstatusDate: personnel.pstatusDate || '',
      rankStatus: personnel.rankStatus || 'PERM'
    });
    setErrorMessage(null);
    setSavedSuccess(false);
  };

  const handleToggleEdit = (editing: boolean) => {
    setInternalEditing(editing);
    onToggleEdit?.(editing);
    if (!editing) {
      handleReset();
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
    if (isUniformed && !formData.badgeNo?.trim()) {
      setErrorMessage('Badge Number is required for Uniformed Personnel.');
      return;
    }

    const unitStr = (formData.unit || formData.officeDivision || 'ITMS').trim();
    const subUnitStr = (formData.subUnit || formData.sub_unit || formData.division || '').trim();
    const detailsStr = (formData.details || formData.detail || '').trim();
    const stationStr = (formData.station || '').trim();
    const phoneStr = (formData.phoneNumber || formData.contactNumber || '').trim();
    const fnStr = (formData.firstName || '').trim();
    const mnStr = (formData.middleName || '').trim();
    const lnStr = (formData.lastName || '').trim();
    const qStr  = (formData.qualification || formData.qualifier || '').trim();
    const rankStr = formData.rank;
    const rankFull = isUniformed ? getRankFullName(rankStr) : 'Non-Uniformed Personnel';

    const middleInitial = mnStr ? ` ${mnStr.charAt(0).toUpperCase()}.` : '';
    const qualifierPart = qStr ? ` ${qStr}` : '';
    const fullName = `${rankStr} ${fnStr}${middleInitial} ${lnStr}${qualifierPart}`.trim();

    const bdate = formData.birthdate || formData.birthday || '';
    const sdate = formData.dateEnteredService || formData.desUp || formData.dateOfEntry || '';

    const payload: Personnel = {
      ...formData,
      rankCategory: formData.rankCategory || (isUniformed ? getRankCategory(rankStr) : 'NUP'),
      rank: rankStr,
      rankFullName: rankFull,
      firstName: fnStr,
      middleName: mnStr || undefined,
      lastName: lnStr,
      qualifier: qStr || undefined,
      qualification: qStr || undefined,
      fullName: fullName || formData.fullName,
      badgeNo: isUniformed ? (formData.badgeNo || '').trim() : '',
      badge_number: isUniformed ? (formData.badgeNo || '').trim() : '',
      salaryGrade: isUniformed ? undefined : (String(formData.salaryGrade || '').trim() || undefined),
      plantilla: isUniformed ? '' : (formData.plantilla || '').trim(),
      positionCategory: formData.positionCategory || 'Main',
      unitCategory: formData.unitCategory || 'ITMS HQ',
      subUnitCategory: formData.subUnitCategory || 'Division',
      officeDivision: unitStr || undefined,
      sub_unit: subUnitStr || undefined,
      details: detailsStr || undefined,
      station: stationStr || undefined,
      division: subUnitStr || undefined,
      detail: detailsStr || undefined,
      designation: (formData.designation || '').trim(),
      address: (formData.address || '').trim() || undefined,
      gender: formData.gender || 'Male',
      civilStatus: (formData.civilStatus || '').trim() || undefined,
      religion: (formData.religion || '').trim() || undefined,
      email: (formData.email || '').trim() || undefined,
      phoneNumber: phoneStr || undefined,
      contactNumber: phoneStr || undefined,
      tin: (formData.tin || '').trim() || undefined,
      gsisNumber: (formData.gsisNumber || '').trim() || undefined,
      philHealthNo: (formData.philHealthNo || '').trim() || undefined,
      pagibigNo: (formData.pagibigNo || '').trim() || undefined,
      birthday: bdate || undefined,
      birthdate: bdate || undefined,
      ageToDate: formData.ageToDate ?? (bdate ? calculateYearsBetween(bdate) ?? undefined : undefined),
      dateOfEntry: sdate || undefined,
      desUp: sdate || undefined,
      dateEnteredService: sdate || undefined,
      ageOfServiceToDate: formData.ageOfServiceToDate ?? (sdate ? calculateYearsBetween(sdate) ?? undefined : undefined),
      sourceOfCommissionship: (formData.sourceOfCommissionship || '').trim() || undefined,
      dateOfOfficershipOrCommission: (formData.dateOfOfficershipOrCommission || formData.enterInOfficerPositionDate || '').trim() || undefined,
      enterInOfficerPositionDate: (formData.dateOfOfficershipOrCommission || formData.enterInOfficerPositionDate || '').trim() || undefined,
      designationDate: formData.designationDate || '',
      effectiveDate: formData.effectiveDate || '',
      lastPromotionDate: formData.lastPromotionDate || '',
      pstatus: formData.pstatus || formData.status || 'Active',
      pstatusDate: formData.pstatusDate || '',
      status: formData.status || formData.pstatus || 'Active',
      rankStatus: formData.rankStatus || 'PERM',
      unitCode: (formData.unitCode || 'C02').trim() || undefined,
      unit: unitStr || undefined,
      subUnitCode: (formData.subUnitCode || '').trim() || undefined,
      subUnit: subUnitStr || undefined,
      stationCode: (formData.stationCode || '').trim() || undefined,
      subStationCode: (formData.subStationCode || '').trim() || undefined,
      subStation: (formData.subStation || '').trim() || undefined
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

  const isUniformed = formData.rankCategory !== 'NUP';

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
          {/* ── Section A: Personal Information ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-700" />
                <div>
                  <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800">A. Personal Information</h4>
                  <p className="text-[11px] text-slate-500">Biographical credentials, official rank, civil status, and personal background.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">Personal Info</span>
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
                    <option value="">-- Select Category First --</option>
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

              {/* Last Name */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.lastName || ''}
                  onChange={e => handleChange('lastName', e.target.value)}
                  placeholder="e.g. DELA CRUZ"
                  className="w-full p-2 border border-slate-300 rounded uppercase font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.firstName || ''}
                  onChange={e => handleChange('firstName', e.target.value)}
                  placeholder="e.g. JUAN"
                  className="w-full p-2 border border-slate-300 rounded uppercase font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Middle Name */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName || ''}
                  onChange={e => handleChange('middleName', e.target.value)}
                  placeholder="e.g. SANTOS"
                  className="w-full p-2 border border-slate-300 rounded uppercase text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Qualification */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Qualification (QUAL.)</label>
                <input
                  type="text"
                  value={formData.qualification || formData.qualifier || ''}
                  onChange={e => handleChange('qualification', e.target.value)}
                  placeholder="e.g. JR., III, MSCS, CPA"
                  className="w-full p-2 border border-slate-300 rounded uppercase text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Birthdate */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">BirthDate</label>
                <input
                  type="date"
                  value={formData.birthdate || formData.birthday || ''}
                  onChange={e => handleChange('birthdate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
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
                  value={formData.ageToDate ?? ''}
                  onChange={e => handleChange('ageToDate', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="e.g. 38"
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              {/* Gender */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Gender <span className="text-red-500">*</span></label>
                <select
                  value={formData.gender || 'Male'}
                  onChange={e => handleChange('gender', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Civil Status */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Civil Status</label>
                <select
                  value={formData.civilStatus || 'Single'}
                  onChange={e => handleChange('civilStatus', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
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
                  value={formData.religion || ''}
                  onChange={e => handleChange('religion', e.target.value)}
                  placeholder="e.g. Roman Catholic, Christian, Islam"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Residential Address */}
              <div className="sm:col-span-3 lg:col-span-1">
                <label className="block text-2xs font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={e => handleChange('address', e.target.value)}
                  placeholder="Residential address"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* ── Section B: Identification & Contact ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-emerald-700" />
                <div>
                  <h4 className="text-2xs font-extrabold uppercase tracking-widest text-emerald-800">B. Identification &amp; Contact</h4>
                  <p className="text-[11px] text-slate-500">PNP Badge, government identification numbers, and contact channels.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">ID &amp; Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Badge No (Uniformed) vs Salary Grade (NUP) */}
              {isUniformed ? (
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Badge Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.badgeNo || ''}
                    onChange={e => handleChange('badgeNo', e.target.value)}
                    placeholder="e.g. O-08161, 230200"
                    className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Salary Grade (SG) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.salaryGrade ?? ''}
                    onChange={e => handleChange('salaryGrade', e.target.value)}
                    placeholder="e.g. 14, SG-14"
                    className="w-full p-2 border border-slate-300 rounded text-emerald-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="e.g. officer@pnp.gov.ph"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phoneNumber || formData.contactNumber || ''}
                  onChange={e => handleChange('phoneNumber', e.target.value)}
                  placeholder="e.g. 0917-123-4567"
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* TIN */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">TIN</label>
                <input
                  type="text"
                  value={formData.tin || ''}
                  onChange={e => handleChange('tin', e.target.value)}
                  placeholder="e.g. 900-744-527"
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* GSIS Number */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Gsis Number</label>
                <input
                  type="text"
                  value={formData.gsisNumber || ''}
                  onChange={e => handleChange('gsisNumber', e.target.value)}
                  placeholder="e.g. 0002131234"
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* PhilHealth No */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Phil Health No</label>
                <input
                  type="text"
                  value={formData.philHealthNo || ''}
                  onChange={e => handleChange('philHealthNo', e.target.value)}
                  placeholder="e.g. 12-345678901-2"
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Pag-IBIG No */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Pagibig No</label>
                <input
                  type="text"
                  value={formData.pagibigNo || ''}
                  onChange={e => handleChange('pagibigNo', e.target.value)}
                  placeholder="e.g. 1234-5678-9012"
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* ── Section C: Service & Career Information ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-700" />
                <div>
                  <h4 className="text-2xs font-extrabold uppercase tracking-widest text-indigo-800">C. Service &amp; Career Information</h4>
                  <p className="text-[11px] text-slate-500">Service longevity, commissionship, promotion records, and official status.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">Service &amp; Career</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Date Entered Service */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">
                  {isUniformed ? 'Date Entered Service (DES UP)' : 'Date Entered Service'}
                </label>
                <input
                  type="date"
                  value={formData.dateEnteredService || formData.desUp || formData.dateOfEntry || ''}
                  onChange={e => handleChange('dateEnteredService', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
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
                  value={formData.ageOfServiceToDate ?? ''}
                  onChange={e => handleChange('ageOfServiceToDate', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="e.g. 15"
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={e => handleChange('designation', e.target.value)}
                  placeholder="e.g. IT Project Officer"
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Designation Date */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Designation Date</label>
                <input
                  type="date"
                  value={formData.designationDate || formData.enterInOfficerPositionDate || ''}
                  onChange={e => {
                    handleChange('designationDate', e.target.value);
                    handleChange('enterInOfficerPositionDate', e.target.value);
                  }}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Effective Date */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Effective Date of Designation</label>
                <input
                  type="date"
                  value={formData.effectiveDate || ''}
                  onChange={e => handleChange('effectiveDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Last Promotion Date */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Last Promotion Date</label>
                <input
                  type="date"
                  value={formData.lastPromotionDate || ''}
                  onChange={e => handleChange('lastPromotionDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Source Of Commissionship */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Source Of Commissionship</label>
                <input
                  type="text"
                  value={formData.sourceOfCommissionship || ''}
                  onChange={e => handleChange('sourceOfCommissionship', e.target.value)}
                  placeholder="e.g. LATERAL, PNPA, OCS"
                  className="w-full p-2 border border-slate-300 rounded uppercase text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Date Of Officership Or Commission */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Date Of Officership Or Commission</label>
                <input
                  type="date"
                  value={formData.dateOfOfficershipOrCommission || formData.enterInOfficerPositionDate || ''}
                  onChange={e => {
                    handleChange('dateOfOfficershipOrCommission', e.target.value);
                    handleChange('enterInOfficerPositionDate', e.target.value);
                  }}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* PStatus */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">PStatus (Personnel Status) <span className="text-red-500">*</span></label>
                <select
                  value={formData.pstatus || formData.status || 'Active'}
                  onChange={e => handleChange('pstatus', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
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
                  value={formData.pstatusDate || ''}
                  onChange={e => handleChange('pstatusDate', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Rank Status */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Rank Status</label>
                <select
                  value={formData.rankStatus || 'PERM'}
                  onChange={e => handleChange('rankStatus', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
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
                  value={formData.positionCategory || 'Main'}
                  onChange={e => handleChange('positionCategory', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {POSITION_CATEGORIES.map(pc => (
                    <option key={pc} value={pc}>{pc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Section D: Organizational Assignment ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-700" />
                <div>
                  <h4 className="text-2xs font-extrabold uppercase tracking-widest text-amber-800">D. Organizational Assignment</h4>
                  <p className="text-[11px] text-slate-500">Unit hierarchy, sub-unit codes, stations, and duty placement.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Unit Code */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Unit Code</label>
                <input
                  type="text"
                  value={formData.unitCode || ''}
                  onChange={e => handleChange('unitCode', e.target.value)}
                  placeholder="e.g. C02"
                  className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={formData.unit || formData.officeDivision || ''}
                  onChange={e => handleChange('unit', e.target.value)}
                  placeholder="e.g. ITMS"
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Sub Unit Code */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Sub Unit Code</label>
                <input
                  type="text"
                  value={formData.subUnitCode || ''}
                  onChange={e => handleChange('subUnitCode', e.target.value)}
                  placeholder="e.g. ARMD, ITPMD, CSD"
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Sub Unit */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Sub Unit</label>
                <input
                  type="text"
                  value={formData.sub_unit || formData.subUnit || formData.division || ''}
                  onChange={e => handleChange('sub_unit', e.target.value)}
                  placeholder="e.g. Administrative and Resource Management Division"
                  className="w-full p-2 border border-slate-300 rounded font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Station Code */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Station Code</label>
                <input
                  type="text"
                  value={formData.stationCode || ''}
                  onChange={e => handleChange('stationCode', e.target.value)}
                  placeholder="e.g. CRAME"
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Station */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Station</label>
                <input
                  type="text"
                  value={formData.station || ''}
                  onChange={e => handleChange('station', e.target.value)}
                  placeholder="e.g. Camp Crame"
                  className="w-full p-2 border border-slate-300 rounded font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Sub Station Code */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Sub Station Code</label>
                <input
                  type="text"
                  value={formData.subStationCode || ''}
                  onChange={e => handleChange('subStationCode', e.target.value)}
                  placeholder="e.g. HQ-01"
                  className="w-full p-2 border border-slate-300 rounded font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Sub Station */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Sub Station</label>
                <input
                  type="text"
                  value={formData.subStation || ''}
                  onChange={e => handleChange('subStation', e.target.value)}
                  placeholder="Sub Station Name"
                  className="w-full p-2 border border-slate-300 rounded font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Details */}
              <div className="sm:col-span-2">
                <label className="block text-2xs font-bold text-slate-700 mb-1">Details (Specific Role / Placement)</label>
                <input
                  type="text"
                  value={formData.details || formData.detail || ''}
                  onChange={e => handleChange('details', e.target.value)}
                  placeholder="e.g. Network Monitoring Section"
                  className="w-full p-2 border border-slate-300 rounded font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Unit Category */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">Unit Category</label>
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

              {/* NUP Specific: Plantilla */}
              {!isUniformed && (
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">Plantilla Item</label>
                  <input
                    type="text"
                    value={formData.plantilla || ''}
                    onChange={e => handleChange('plantilla', e.target.value)}
                    placeholder="e.g. ITMS-CSD-2024-001"
                    className="w-full p-2 border border-slate-300 rounded font-mono font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
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
        <div className="space-y-4 min-w-0">
          {/* ── Box A: Personal & Biographical Information ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-blue-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> A. Personal &amp; Biographical Information
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">Biographical</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Rank Category</span>
                <span className="font-extrabold text-indigo-700 text-xs">{personnel.rankCategory || getRankCategory(personnel.rank)}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Rank</span>
                <span className="font-extrabold text-blue-800 text-xs">{personnel.rank}</span>
                {personnel.rankFullName && (
                  <span className="text-[10px] text-slate-500 block truncate">{personnel.rankFullName}</span>
                )}
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Official Full Name</span>
                <span className="block min-w-0 font-bold text-slate-900 text-xs truncate">
                  {personnel.rank} {personnel.fullName}
                  {(personnel.qualification || personnel.qualifier) && ` (${personnel.qualification || personnel.qualifier})`}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Birthdate &amp; Age</span>
                <span className="font-medium text-slate-800 text-xs">
                  {personnel.birthdate || personnel.birthday || '—'}
                  {(personnel.ageToDate || (personnel.birthdate && calculateYearsBetween(personnel.birthdate))) && 
                    ` (${personnel.ageToDate || calculateYearsBetween(personnel.birthdate!)} yrs old)`}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Gender</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.gender || 'Male'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Civil Status</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.civilStatus || 'Single'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Religion</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.religion || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words sm:col-span-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Residential Address</span>
                <span className="block min-w-0 font-medium text-slate-800 text-xs truncate">{personnel.address || '—'}</span>
              </div>
            </div>
          </div>

          {/* ── Box B: Identification & Contact ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-emerald-600" /> B. Identification &amp; Contact
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">ID &amp; Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  {isUniformed ? 'Badge No.' : 'Salary Grade (SG)'}
                </span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {isUniformed ? (personnel.badgeNo || '—') : (personnel.salaryGrade ? `SG-${personnel.salaryGrade}` : '—')}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Email Address</span>
                <span className="block min-w-0 font-mono font-medium text-slate-800 text-xs truncate">{personnel.email || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Phone Number</span>
                <span className="font-mono font-semibold text-emerald-700 text-xs">{personnel.phoneNumber || personnel.contactNumber || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">TIN</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.tin || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">GSIS Number</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.gsisNumber || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">PhilHealth No</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.philHealthNo || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Pag-IBIG No</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.pagibigNo || '—'}</span>
              </div>
            </div>
          </div>

          {/* ── Box C: Service & Career Information ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-indigo-800 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> C. Service &amp; Career Information
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 uppercase">Service &amp; Career</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  {isUniformed ? 'Date Entered Service (DES UP)' : 'Date Entered Service'}
                </span>
                <span className="font-mono text-slate-800 text-xs">
                  {personnel.dateEnteredService || personnel.desUp || personnel.dateOfEntry || '—'}
                  {(personnel.ageOfServiceToDate || ((personnel.dateEnteredService || personnel.desUp) && calculateYearsBetween((personnel.dateEnteredService || personnel.desUp)!))) && 
                    ` (${personnel.ageOfServiceToDate || calculateYearsBetween((personnel.dateEnteredService || personnel.desUp)!)} yrs)`}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Designation</span>
                <span className="font-semibold text-slate-800 text-xs">{personnel.designation || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Designation Date</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.designationDate || personnel.enterInOfficerPositionDate || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Effective Date</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.effectiveDate || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Promotion Date</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.lastPromotionDate || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Source Of Commissionship</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.sourceOfCommissionship || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date of Officership / Comm.</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.dateOfOfficershipOrCommission || personnel.enterInOfficerPositionDate || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Duty Status (PStatus)</span>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <Badge variant={(personnel.pstatus || personnel.status) === 'Active' ? 'success' : 'neutral'} size="sm">
                    {personnel.pstatus || personnel.status || 'Active'}
                  </Badge>
                  {personnel.pstatusDate && (
                    <span className="text-[10px] font-mono text-slate-400">({personnel.pstatusDate})</span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Rank Status</span>
                <span className="font-semibold text-slate-800 text-xs">{personnel.rankStatus || 'PERM'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words sm:col-span-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Position Category</span>
                <span className="font-semibold text-slate-800 text-xs">{personnel.positionCategory || 'Main'}</span>
              </div>
            </div>
          </div>

          {/* ── Box D: Organizational Assignment ── */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-2xs font-extrabold uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" /> D. Organizational Assignment
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Unit Code</span>
                <span className="font-mono font-bold text-blue-900 text-xs">{personnel.unitCode || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Unit / Office Division</span>
                <span className="font-bold text-blue-900 text-xs">{personnel.unit || personnel.officeDivision || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sub-Unit Code</span>
                <span className="font-mono font-medium text-slate-800 text-xs">{personnel.subUnitCode || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sub-Unit</span>
                <span className="block min-w-0 font-bold text-blue-800 text-xs break-words">
                  {(personnel.subUnit || personnel.sub_unit || personnel.division)?.trim() || '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Station Code</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.stationCode || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Station</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.station?.trim() || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sub Station Code</span>
                <span className="font-mono text-slate-800 text-xs">{personnel.subStationCode || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Sub Station</span>
                <span className="font-medium text-slate-800 text-xs">{personnel.subStation?.trim() || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Details (Role / Placement)</span>
                <span className="font-medium text-slate-800 text-xs">{(personnel.details || personnel.detail)?.trim() || '—'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Unit Category</span>
                <span className="font-bold text-blue-800 text-xs">{personnel.unitCategory || 'ITMS HQ'}</span>
              </div>
              {!isUniformed && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 min-w-0 break-words">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Plantilla Item</span>
                  <span className="font-mono text-slate-800 text-xs">{personnel.plantilla || '—'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
