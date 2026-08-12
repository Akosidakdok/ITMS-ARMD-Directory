import React, { useState } from 'react';
import { Personnel } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { Plus, Calendar, BookOpen } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface TrainingSubTabProps {
  personnel: Personnel;
}

export const TrainingSubTab: React.FC<TrainingSubTabProps> = ({ personnel }) => {
  const { role, trainingList, addTraining } = useAuthRole();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const personnelTrainings = trainingList.filter(t => t.personnelId === personnel.id);

  const [courseName, setCourseName] = useState('');
  const [category, setCategory] = useState<'Career Course' | 'Specialized IT' | 'Cyber Security' | 'Database Admin' | 'Network & Telecom'>('Specialized IT');
  const [provider, setProvider] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [hours, setHours] = useState(40);
  const [certificateNo, setCertificateNo] = useState('');

  const handleAddTraining = (e: React.FormEvent) => {
    e.preventDefault();
    addTraining({
      id: `trn-${Date.now()}`,
      personnelId: personnel.id,
      courseName,
      category,
      provider,
      startDate,
      completionDate,
      hours: Number(hours),
      certificateNo
    });
    setIsModalOpen(false);
    setCourseName('');
    setProvider('');
    setCertificateNo('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" /> Completed ITMS Specialized & Mandatory Training
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Career development, technical bootcamps, and cyber security courses</p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Training Record
          </button>
        )}
      </div>

      {personnelTrainings.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-xs font-semibold">No specialized training logs recorded yet for this personnel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {personnelTrainings.map((trn) => (
            <div
              key={trn.id}
              className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="info" size="sm">
                    {trn.category}
                  </Badge>
                  <span className="text-xs font-mono font-semibold text-slate-500">Cert #{trn.certificateNo}</span>
                </div>
                <span className="text-xs font-mono text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  {trn.hours} Training Hours
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900">{trn.courseName}</h4>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">Training Provider: <strong className="text-slate-900 font-bold">{trn.provider}</strong></p>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-700 font-mono pt-2 border-t border-slate-100 font-semibold">
                <span className="flex items-center gap-1 text-emerald-600 font-extrabold">
                  <Calendar className="w-3.5 h-3.5" /> Completed: {trn.completionDate}
                </span>
                <span>Period: {trn.startDate} to {trn.completionDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Completed Training Course"
        subtitle={`Add training logs for ${personnel.fullName}`}
      >
        <form onSubmit={handleAddTraining} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Course Title</label>
            <input
              type="text"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder="e.g. Masterclass in Cyber Threat Hunting"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="Career Course">Career Course</option>
                <option value="Specialized IT">Specialized IT</option>
                <option value="Cyber Security">Cyber Security</option>
                <option value="Database Admin">Database Admin</option>
                <option value="Network & Telecom">Network & Telecom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Training Institution / Provider</label>
              <input
                type="text"
                value={provider}
                onChange={e => setProvider(e.target.value)}
                placeholder="e.g. DICT Cyber Academy / SANS"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
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
              <label className="block text-xs font-bold text-slate-600 mb-1">Completion Date</label>
              <input
                type="date"
                value={completionDate}
                onChange={e => setCompletionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Total Hours</label>
              <input
                type="number"
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Certificate Reference No.</label>
            <input
              type="text"
              value={certificateNo}
              onChange={e => setCertificateNo(e.target.value)}
              placeholder="e.g. CERT-2026-9812"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
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
              Submit Training Log
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


