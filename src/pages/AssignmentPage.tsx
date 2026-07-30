import React, { useState } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Plus, Search } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const AssignmentPage: React.FC = () => {
  const { role, personnelList, assignmentsList, addAssignment } = useAuthRole();
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for new assignment
  const [personnelId, setPersonnelId] = useState(personnelList[0]?.id || '');
  const [unit, setUnit] = useState('');
  const [position, setPosition] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [startDate, setStartDate] = useState('');
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

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    addAssignment({
      id: `asg-${Date.now()}`,
      personnelId,
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
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Reassign Personnel
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shadow-2xs">
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
            <option value="ARMD">ARMD (Administrative)</option>
            <option value="CSD">CSD (Cyber Security)</option>
            <option value="SDD">SDD (Software Dev)</option>
            <option value="NDCMD">NDCMD (Data Center)</option>
            <option value="OMD">OMD (Operations)</option>
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
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900 font-bold">
              {filteredAssignments.map((asg) => {
                const person = personnelList.find(p => p.id === asg.personnelId);
                return (
                  <tr key={asg.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <img
                        src={person?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                        alt={person?.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-blue-200"
                      />
                      <div>
                        <div className="font-extrabold text-slate-900">{person?.rank} {person?.lastName}, {person?.firstName}</div>
                        <div className="text-[10px] text-slate-500 font-mono font-semibold">Badge #{person?.badgeNo}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-700">{asg.position}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{asg.unit}</td>
                    <td className="py-3 px-4 font-mono text-sky-700 font-extrabold">{asg.orderRef}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{asg.startDate}</td>
                    <td className="py-3 px-4">
                      <Badge variant={asg.status === 'Current' ? 'primary' : 'neutral'} size="sm">
                        {asg.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Reassign Personnel to Duty Posting"
        subtitle="Issue new unit assignment with Special Order tracking"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
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
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm Posting
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


