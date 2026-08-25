import React, { useState } from 'react';
import { Personnel } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { Calendar, Plus } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  getLeaveTypePresentation,
  LEAVE_TYPE_DEFINITIONS,
  type LeaveType,
} from '../../data/leaveTypes';
import { hasManagementAccess } from '../../utils/accessControl';

interface LeaveSubTabProps {
  personnel: Personnel;
}

export const LeaveSubTab: React.FC<LeaveSubTabProps> = ({ personnel }) => {
  const { role, leaveList, addLeave } = useAuthRole();
  const canManage = hasManagementAccess(role);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const personnelLeaves = leaveList.filter(l => l.personnelId === personnel.id);

  const [leaveType, setLeaveType] = useState<LeaveType>('Vacation Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState(5);
  const [approvedBy, setApprovedBy] = useState('PCOL RODRIGO S DELA CRUZ JR');
  const [purpose, setPurpose] = useState('');

  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    addLeave({
      id: `lve-${Date.now()}`,
      personnelId: personnel.id,
      leaveType,
      startDate,
      endDate,
      days: Number(days),
      status: 'Approved',
      approvedBy,
      purpose
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Leave Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-extrabold block">Vacation Leave Balance</span>
          <span className="text-xl font-extrabold text-blue-700 font-mono">15.0 Days</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-extrabold block">Sick Leave Balance</span>
          <span className="text-xl font-extrabold text-emerald-600 font-mono">15.0 Days</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-extrabold block">Mandatory 5-Day Leave Status</span>
          <span className="text-sm font-extrabold text-sky-700">Complied 2026</span>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> Leave Applications & Approvals Log
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Color-coded leave applications and approval histories</p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> File Leave Application
          </button>
        )}
      </div>

      {personnelLeaves.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-xs font-semibold">No leave logs recorded yet for this personnel.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {personnelLeaves.map((lve) => {
            const leaveTypeStyle = getLeaveTypePresentation(lve.leaveType);
            return (
            <div key={lve.id} className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ${leaveTypeStyle.colorClassName}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${leaveTypeStyle.dotClassName}`} aria-hidden="true" />
                    {leaveTypeStyle.value}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">{lve.days} Working Days</span>
                </div>

                <Badge variant={lve.status === 'Approved' ? 'success' : lve.status === 'Pending' ? 'warning' : 'neutral'} size="sm">
                  {lve.status}
                </Badge>
              </div>

              {lve.purpose && (
                <p className="text-xs text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium">
                  Purpose: <strong className="text-slate-900">{lve.purpose}</strong>
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono pt-2 border-t border-slate-100">
                <span>Period: <strong className="text-slate-900">{lve.startDate}</strong> to <strong className="text-slate-900">{lve.endDate}</strong></span>
                <span>Approved By: <span className="text-blue-700 font-bold">{lve.approvedBy}</span></span>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="File Leave Application"
        subtitle={`Submit leave record for ${personnel.fullName}`}
      >
        <form onSubmit={handleAddLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={e => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            >
              {LEAVE_TYPE_DEFINITIONS.map(type => (
                <option key={type.value} value={type.value}>{type.value}</option>
              ))}
            </select>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
              <span className={`h-3 w-3 rounded-full ${getLeaveTypePresentation(leaveType).dotClassName}`} aria-hidden="true" />
              Selected color: <strong className="text-slate-800">{leaveType}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Number of Days</label>
              <input
                type="number"
                value={days}
                onChange={e => setDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Approving Authority / Officer</label>
            <input
              type="text"
              value={approvedBy}
              onChange={e => setApprovedBy(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Purpose / Reason</label>
            <textarea
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="e.g. Annual mandatory leave or personal study..."
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
              Submit Leave Approval
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


