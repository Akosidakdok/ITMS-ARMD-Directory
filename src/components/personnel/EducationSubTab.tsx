import React, { useState } from 'react';
import { Personnel } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { GraduationCap, Plus } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { hasManagementAccess } from '../../utils/accessControl';

interface EducationSubTabProps {
  personnel: Personnel;
}

export const EducationSubTab: React.FC<EducationSubTabProps> = ({ personnel }) => {
  const { role, educationList, addEducation } = useAuthRole();
  const canManage = hasManagementAccess(role);
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
      <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" /> Academic Attainment & IT Certifications
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Degrees, academic honors, and professional IT credentials</p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Education
          </button>
        )}
      </div>

      {personnelEducation.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
          <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-xs font-semibold">No educational record registered yet for this personnel.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {personnelEducation.map((edu) => (
            <div
              key={edu.id}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="info" size="sm">{edu.degree}</Badge>
                  {edu.honors && <Badge variant="primary" size="sm">{edu.honors}</Badge>}
                </div>
                <h4 className="text-sm font-bold text-slate-900">{edu.institution}</h4>
                {edu.certifications && edu.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {edu.certifications.map((cert, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold border border-sky-200">
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-left md:text-right space-y-1 border-t md:border-t-0 border-slate-200 pt-2 md:pt-0">
                <div className="text-xs text-slate-600 font-mono font-bold">
                  Class of {edu.yearGraduated}
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
        title="Add Educational Qualification"
        subtitle={`Record academic degree or credentials for ${personnel.fullName}`}
      >
        <form onSubmit={handleAddEducation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Degree Title</label>
            <input
              type="text"
              value={degree}
              onChange={e => setDegree(e.target.value)}
              placeholder="e.g. Master in Information Technology (MIT)"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">School / University / Academy</label>
            <input
              type="text"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              placeholder="e.g. University of the Philippines Diliman"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Year Graduated</label>
              <input
                type="number"
                value={yearGraduated}
                onChange={e => setYearGraduated(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Honors / Distinction (Optional)</label>
              <input
                type="text"
                value={honors}
                onChange={e => setHonors(e.target.value)}
                placeholder="e.g. Cum Laude"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Certifications (comma-separated)</label>
            <input
              type="text"
              value={certs}
              onChange={e => setCerts(e.target.value)}
              placeholder="e.g. CISSP, CCNA, CompTIA Security+"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
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
              Save Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


