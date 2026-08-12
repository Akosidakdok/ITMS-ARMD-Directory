import React, { useState } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Edit3, Eye, Plus, Search } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import type { AssignmentRecord } from '../types/pais';

export const AssignmentPage: React.FC = () => {
  const { role, personnelList, assignmentsList, addAssignment, updateAssignment } = useAuthRole();
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRecord | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRecord | null>(null);

  // Form state for new assignment
  const [personnelId, setPersonnelId] = useState(personnelList[0]?.id || '');
  const [unit, setUnit] = useState('');
  const [position, setPosition] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Current');
  const [remarks, setRemarks] = useState('');

  const filteredAssignments = assignmentsList.filter(asg => {
    const person = personnelList.find(p => p.id === asg.personnelId);
    const matchesDiv = selectedDivision === 'ALL' || (person && person.division === selectedDivision);
    const matchesSearch = !searchQuery || 
      asg.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asg.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (person && person.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDiv && matchesSearch;
  });

  const resetForm = () => {
    setPersonnelId(personnelList[0]?.id || '');
    setUnit('');
    setPosition('');
    setOrderRef('');
    setStartDate('');
    setEndDate('');
    setStatus('Current');
    setRemarks('');
    setEditingAssignment(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (assignment: AssignmentRecord) => {
    setEditingAssignment(assignment);
    setPersonnelId(assignment.personnelId);
    setUnit(assignment.unit);
    setPosition(assignment.position);
    setOrderRef(assignment.orderRef);
    setStartDate(assignment.startDate);
    setEndDate(assignment.endDate || '');
    setStatus(assignment.status || 'Current');
    setRemarks(assignment.remarks || '');
    setIsModalOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AssignmentRecord = {
      id: editingAssignment?.id || `asg-${Date.now()}`,
      personnelId,
      unit,
      position,
      orderRef,
      startDate,
      endDate: endDate || undefined,
      status,
      remarks
    };
    if (editingAssignment) {
      await updateAssignment(payload);
    } else {
      await addAssignment(payload);
    }
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
              Assignments Module
            </span>
            <span className="text-xs text-slate-500 font-mono">ITMS Personnel Postings</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Duty Postings & Unit Detail Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage unit assignments, position designations, and regional details</p>
        </div>

        {role === 'admin' && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Reassign Personnel
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col lg:flex-row lg:flex-wrap lg:items-center justify-between gap-4 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search position, unit, or personnel name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 font-bold">Division Filter:</span>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-extrabold focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Divisions</option>
            <option value="ITSD">ITSD – Information Technology Support Division</option>
            <option value="PTD">PTD – Plans and Training Division</option>
            <option value="SMD">SMD – Systems Management Division</option>
            <option value="DMD">DMD – Data Management Division</option>
            <option value="ARMD">ARMD – Administrative and Resource Management Division</option>
            <option value="ISSD">ISSD – Information Systems Security Division</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase text-[11px]">
                <th className="py-3 px-4">Personnel</th>
                <th className="py-3 px-4">Assigned Position</th>
                <th className="py-3 px-4">Unit / Division</th>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 font-bold">
              {filteredAssignments.map((asg) => {
                const person = personnelList.find(p => p.id === asg.personnelId);
                return (
                  <tr key={asg.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-extrabold text-slate-900">{person?.rank} {person?.lastName}, {person?.firstName}</div>
                        <div className="text-[10px] text-slate-500 font-mono font-semibold">Badge #{person?.badgeNo}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-700">{asg.position}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{asg.unit}</td>
                    <td className="py-3 px-4 font-mono text-sky-700 font-extrabold">{asg.orderRef}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{asg.startDate}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{asg.endDate || 'Present'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={asg.status === 'Current' ? 'primary' : 'neutral'} size="sm">
                        {asg.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedAssignment(asg)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:border-blue-400 hover:text-blue-700"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => openEditModal(asg)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredAssignments.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs font-semibold text-slate-500">
                    No assignment records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssignment ? 'Edit Personnel Assignment' : 'Reassign Personnel to Duty Posting'}
        subtitle={editingAssignment ? 'Update unit assignment, order reference, and assignment status' : 'Issue new unit assignment with Special Order tracking'}
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Select Personnel</label>
            <select
              value={personnelId}
              onChange={e => setPersonnelId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
            >
              {personnelList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.rank} {p.lastName}, {p.firstName} ({p.division} - #{p.badgeNo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Unit / Division Name</label>
            <input
              type="text"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g. Systems Development Division (SDD)"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Position Title</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="e.g. Lead Software Engineer"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Order Reference</label>
              <input
                type="text"
                value={orderRef}
                onChange={e => setOrderRef(e.target.value)}
                placeholder="e.g. SO-ITMS-2026-099"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="Current">Current</option>
                <option value="Completed">Completed</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Specific duty context or directives..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold h-20 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingAssignment ? 'Save Changes' : 'Confirm Posting'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        title="Assignment Record"
        subtitle="Connected personnel posting details"
      >
        {selectedAssignment && (
          <div className="space-y-3 text-xs">
            {[
              ['Personnel', personnelList.find(p => p.id === selectedAssignment.personnelId)?.fullName || 'Unknown personnel'],
              ['Position', selectedAssignment.position],
              ['Unit / Division', selectedAssignment.unit],
              ['Order Reference', selectedAssignment.orderRef],
              ['Start Date', selectedAssignment.startDate],
              ['End Date', selectedAssignment.endDate || 'Present'],
              ['Status', selectedAssignment.status],
              ['Remarks', selectedAssignment.remarks || 'No remarks']
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 font-bold text-slate-900">{value}</p>
              </div>
            ))}
            {role === 'admin' && (
              <div className="flex justify-end border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    openEditModal(selectedAssignment);
                    setSelectedAssignment(null);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Edit Assignment
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};


