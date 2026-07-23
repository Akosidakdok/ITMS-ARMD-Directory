import React, { useState } from 'react';
import { Personnel } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { Briefcase, Plus, Calendar, FileText } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface AssignmentsSubTabProps {
  personnel: Personnel;
}

export const AssignmentsSubTab: React.FC<AssignmentsSubTabProps> = ({ personnel }) => {
  const { role, assignmentsList, addAssignment } = useAuthRole();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const personnelAssignments = assignmentsList.filter(a => a.personnelId === personnel.id);

  const [unit, setUnit] = useState('');
  const [position, setPosition] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [startDate, setStartDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    addAssignment({
      id: `asg-${Date.now()}`,
      personnelId: personnel.id,
      unit,
      position,
      orderRef,
      startDate,
      status: 'Current',
      remarks
    });
    setIsModalOpen(false);
    setUnit('');
    setPosition('');
    setOrderRef('');
    setStartDate('');
    setRemarks('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Assignment & Duty Posting History
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Chronological record of positions and unit designations</p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Assignment
          </button>
        )}
      </div>

      {personnelAssignments.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">No assignment history recorded yet for this personnel.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {personnelAssignments.map((asg) => (
            <div
              key={asg.id}
              className="p-4 rounded-xl glass-panel bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={asg.status === 'Current' ? 'primary' : 'neutral'} size="sm">
                    {asg.status}
                  </Badge>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{asg.position}</h4>
                </div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">{asg.unit}</p>
                {asg.remarks && <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-1">{asg.remarks}</p>}
              </div>

              <div className="text-left md:text-right space-y-1 border-t md:border-t-0 border-slate-200 dark:border-slate-800 pt-2 md:pt-0">
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center md:justify-end gap-1.5 font-mono font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{asg.startDate} {asg.endDate ? `to ${asg.endDate}` : '• Present'}</span>
                </div>
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
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Unit / Division Name</label>
            <input
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g. Cyber Security Division (CSD)"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Position / Designation</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="e.g. Cyber Incident Response Lead"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Special Order Reference No.</label>
            <input
              type="text"
              value={orderRef}
              onChange={e => setOrderRef(e.target.value)}
              placeholder="e.g. SO-ITMS-2026-104"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Effectivity Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Remarks / Directives</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Operational directives or authority context..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold h-20 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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

