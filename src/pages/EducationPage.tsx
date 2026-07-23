import React from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { GraduationCap, BookOpen } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const EducationPage: React.FC = () => {
  const { personnelList, educationList, trainingList } = useAuthRole();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 theme-transition shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30">
              Education & Skill Matrix
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">ITMS Technical Qualifications</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Academic Degrees & Cyber Certifications</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Inventory of academic degrees, professional IT certifications, and technical courses</p>
        </div>
      </div>

      {/* Grid of Qualifications by Personnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personnelList.map((person) => {
          const pEdus = educationList.filter(e => e.personnelId === person.id);
          const pTrns = trainingList.filter(t => t.personnelId === person.id);

          return (
            <div
              key={person.id}
              className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 space-y-4 theme-transition shadow-xs"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <img
                  src={person.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                  alt={person.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-blue-200 dark:border-blue-500/30"
                />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{person.rank} {person.fullName}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 font-bold">{person.designation} • {person.division}</div>
                </div>
              </div>

              {/* Degrees */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Academic Attainment
                </span>
                {pEdus.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No formal degree record logged.</p>
                ) : (
                  pEdus.map(edu => (
                    <div key={edu.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">{edu.degree}</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{edu.yearGraduated}</span>
                      </div>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300/80 font-semibold">{edu.institution}</p>

                      {edu.certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {edu.certifications.map((c, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-mono font-bold">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Training Bootcamps */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Specialized IT Trainings
                </span>
                {pTrns.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No completed training bootcamp logs.</p>
                ) : (
                  pTrns.map(trn => (
                    <div key={trn.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-200 block">{trn.courseName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{trn.provider}</span>
                      </div>
                      <Badge variant="info" size="sm">
                        {trn.hours} hrs
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

