import React, { useState } from 'react';
import { Personnel } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { GraduationCap, Plus } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface EducationSubTabProps {
  personnel: Personnel;
}

export const EducationSubTab: React.FC<EducationSubTabProps> = ({ personnel }) => {
  const { role, educationList, addEducation } = useAuthRole();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const personnelEducation = educationList.filter(e => e.personnelId === personnel.id);

  const [degree, setDegree] = useState('');
  const [institution, setInstitution] = useState('');
  const [yearGraduated, setYearGraduated] = useState(2022);
  const [honors, setHonors] = useState('');
  const [certs, setCerts] = useState('');

  const handleAddEducation = (e: React.FormEvent) => {
    e.preventDefault();
    addEducation({
      id: `edu-${Date.now()}`,
      personnelId: personnel.id,
      degree,
      institution,
      yearGraduated: Number(yearGraduated),
      honors: honors || undefined,
      certifications: certs ? certs.split(',').map(c => c.trim()) : []
    });
    setIsModalOpen(false);
    setDegree('');
    setInstitution('');
    setHonors('');
    setCerts('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Academic Attainment & IT Certifications
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Degrees, academic honors, and professional IT credentials</p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Education
          </button>
        )}
      </div>

      {personnelEducation.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold">No educational record registered yet for this personnel.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {personnelEducation.map((edu) => (
            <div
              key={edu.id}
              className="p-5 rounded-xl glass-panel bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {edu.degree}
                    {edu.honors && (
                      <Badge variant="primary" size="sm">
                        {edu.honors}
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300/90 font-bold mt-0.5">{edu.institution}</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                  Class of {edu.yearGraduated}
                </span>
              </div>

              {edu.certifications.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                    Professional Certifications:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {edu.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-bold"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Educational Qualification"
        subtitle={`Record academic degree or credentials for ${personnel.fullName}`}
      >
        <form onSubmit={handleAddEducation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Degree Title</label>
            <input
              type="text"
              value={degree}
              onChange={e => setDegree(e.target.value)}
              placeholder="e.g. Master in Information Technology (MIT)"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">School / University / Academy</label>
            <input
              type="text"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              placeholder="e.g. University of the Philippines Diliman"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Year Graduated</label>
              <input
                type="number"
                value={yearGraduated}
                onChange={e => setYearGraduated(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Honors / Distinction (Optional)</label>
              <input
                type="text"
                value={honors}
                onChange={e => setHonors(e.target.value)}
                placeholder="e.g. Cum Laude"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Certifications (comma-separated)</label>
            <input
              type="text"
              value={certs}
              onChange={e => setCerts(e.target.value)}
              placeholder="e.g. CISSP, CCNA, CompTIA Security+"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
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
              Save Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

