import React, { useState } from 'react';
import { Personnel, PositionCategory, UnitCategory, SubUnitCategory } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { Briefcase, Plus, Calendar, FileText, MapPin, Building2, Layers } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { hasManagementAccess } from '../../utils/accessControl';
import { POSITION_CATEGORIES, UNIT_CATEGORIES, SUB_UNIT_CATEGORIES } from '../../constants/ranks';

interface AssignmentsSubTabProps {
  personnel: Personnel;
}

export const AssignmentsSubTab: React.FC<AssignmentsSubTabProps> = ({ personnel }) => {
  const { role, assignmentsList, addAssignment } = useAuthRole();
  const canManage = hasManagementAccess(role);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const personnelAssignments = assignmentsList.filter(a => a.personnelId === personnel.id);

  const [positionCategory, setPositionCategory] = useState<PositionCategory>('Main');
  const [unitCategory, setUnitCategory] = useState<UnitCategory>('ITMS HQ');
  const [subUnitCategory, setSubUnitCategory] = useState<SubUnitCategory>('Division');
  const [subUnit, setSubUnit] = useState('');
  const [details, setDetails] = useState('');
  const [station, setStation] = useState('');
  const [position, setPosition] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [designationDate, setDesignationDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const resetForm = () => {
    setPositionCategory('Main');
    setUnitCategory('ITMS HQ');
    setSubUnitCategory('Division');
    setSubUnit('');
    setDetails('');
    setStation('');
    setPosition('');
    setOrderRef('');
    setDesignationDate('');
    setEffectiveDate('');
    setStartDate('');
    setRemarks('');
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const effective = effectiveDate || startDate;
    addAssignment({
      id: `asg-${Date.now()}`,
      personnelId: personnel.id,
      positionCategory,
      unitCategory,
      subUnitCategory,
      sub_unit: subUnit.trim() || undefined,
      details: details.trim() || undefined,
      station: station.trim() || undefined,
      unit: subUnit.trim() ? `${unitCategory} - ${subUnit.trim()}` : (unitCategory || 'ITMS HQ'),
      position: position.trim(),
      orderRef: orderRef.trim(),
      designationDate: designationDate || undefined,
      effectiveDate: effective || undefined,
      startDate: startDate || effective || '',
      status: 'Current',
      remarks: remarks.trim() || undefined
    });
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" /> Assignment & Duty Posting History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Chronological record of positions, unit categories, designations, and orders</p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Assignment
          </button>
        )}
      </div>

      {personnelAssignments.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-xs font-semibold">No assignment history recorded yet for this personnel.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {personnelAssignments.map((asg) => (
            <div
              key={asg.id}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={asg.status === 'Current' ? 'primary' : 'neutral'} size="sm">
                    {asg.status}
                  </Badge>
                  {asg.positionCategory && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      asg.positionCategory === 'Main' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {asg.positionCategory}
                    </span>
                  )}
                  {asg.unitCategory && (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {asg.unitCategory}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-slate-900">{asg.position}</h4>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className="font-bold text-blue-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    {asg.sub_unit ? `${asg.subUnitCategory || 'Unit'}: ${asg.sub_unit}` : asg.unit}
                  </span>
                  {asg.details && (
                    <span className="text-slate-500 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" /> {asg.details}
                    </span>
                  )}
                  {asg.station && (
                    <span className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Station: {asg.station}
                    </span>
                  )}
                </div>

                {asg.remarks && <p className="text-xs text-slate-600 italic">{asg.remarks}</p>}
              </div>

              <div className="text-left md:text-right space-y-1 border-t md:border-t-0 border-slate-200 pt-2 md:pt-0">
                <div className="text-xs text-slate-600 flex items-center md:justify-end gap-1.5 font-mono font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  <span>{asg.startDate} {asg.endDate ? `to ${asg.endDate}` : '• Present'}</span>
                </div>
                {asg.designationDate && (
                  <div className="text-[11px] text-slate-500 font-mono flex items-center md:justify-end gap-1">
                    <span className="text-slate-400">Order Issued:</span> {asg.designationDate}
                  </div>
                )}
                {asg.effectiveDate && (
                  <div className="text-[11px] text-slate-500 font-mono flex items-center md:justify-end gap-1">
                    <span className="text-slate-400">Effective:</span> {asg.effectiveDate}
                  </div>
                )}
                <div className="text-xs text-slate-500 font-mono flex items-center md:justify-end gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> {asg.orderRef}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Issue New Duty Assignment"
        subtitle={`Assign new posting for ${personnel.fullName}`}
      >
        <form onSubmit={handleAddAssignment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Position Category</label>
              <select
                value={positionCategory}
                onChange={e => setPositionCategory(e.target.value as PositionCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                {POSITION_CATEGORIES.map(pc => (
                  <option key={pc} value={pc}>{pc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Unit Category</label>
              <select
                value={unitCategory}
                onChange={e => setUnitCategory(e.target.value as UnitCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                {UNIT_CATEGORIES.map(uc => (
                  <option key={uc} value={uc}>{uc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Sub-unit Category</label>
              <select
                value={subUnitCategory}
                onChange={e => setSubUnitCategory(e.target.value as SubUnitCategory)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                {SUB_UNIT_CATEGORIES.map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Sub-unit Name</label>
              <input
                type="text"
                value={subUnit}
                onChange={e => setSubUnit(e.target.value)}
                placeholder="e.g. ITSD, ARMD, SOD, SMD"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Details / Section</label>
              <input
                type="text"
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="e.g. Cybersecurity Section, Admin"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Station <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={station}
                onChange={e => setStation(e.target.value)}
                placeholder="e.g. Camp BGen Rafael T Crame"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Position / Designation Title</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="e.g. Cyber Incident Response Lead, Section Chief"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Special Order Reference No.</label>
            <input
              type="text"
              value={orderRef}
              onChange={e => setOrderRef(e.target.value)}
              placeholder="e.g. SO-ITMS-2026-104"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Designation Date
                <span className="block text-[10px] text-slate-400 font-normal">Date Order Issued (Upper Right)</span>
              </label>
              <input
                type="date"
                value={designationDate}
                onChange={e => setDesignationDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Effective Date
                <span className="block text-[10px] text-slate-400 font-normal">Of Designation (Order Body)</span>
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Start Date
                <span className="block text-[10px] text-slate-400 font-normal">Posting Timeline</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Remarks / Directives</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Operational directives or authority context..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold h-20 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
