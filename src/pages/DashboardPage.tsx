import React from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Briefcase, 
  Calendar, 
  GraduationCap, 
  Award, 
  ShieldCheck, 
  FileText, 
  ArrowRight,
  Activity,
  Zap,
  Clock
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { calculateTimeInGrade } from '../utils/timeInGrade';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { personnelList, assignmentsList, leaveList, trainingList, setSelectedPersonnelId } = useAuthRole();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Compute live KPIs
  const totalPersonnel = personnelList.length;
  const activeAssignments = assignmentsList.filter(a => a.status === 'Current').length;
  const onLeaveToday = personnelList.filter(p => p.status === 'On Leave').length;
  const upcomingTrainings = trainingList.length;
  const eligibleForPromotion = personnelList.filter(p => calculateTimeInGrade(p.lastPromotionDate).eligibleForPromotion).length;

  // Chart Data: Personnel by Division
  const divisionCounts: Record<string, number> = {};
  personnelList.forEach(p => {
    divisionCounts[p.division] = (divisionCounts[p.division] || 0) + 1;
  });

  const divisionChartData = Object.keys(divisionCounts).map(div => ({
    name: div,
    count: divisionCounts[div]
  }));

  const COLORS = ['#1d4ed8', '#2563eb', '#3b82f6', '#0284c7', '#0891b2', '#4f46e5', '#6366f1'];

  const handleSelectPersonnel = (id: string) => {
    setSelectedPersonnelId(id);
    navigate('/personnel');
  };

  const isDark = theme === 'dark';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Command Center Hero Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white border border-blue-900/50 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 translate-x-10 -translate-y-10 opacity-15 pointer-events-none">
          <ShieldCheck className="w-80 h-80 text-blue-400" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              PNP ITMS Command Center
            </span>
            <span className="text-xs text-slate-300 font-mono">Camp BGen Rafael T Crame</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Personnel & Assignment Information System
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Real-time management dashboard for ITMS police personnel records, unit assignments, time-in-grade eligibility, and administrative orders.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Personnel"
          value={totalPersonnel}
          subtitle="Registered Active & Staff"
          icon={Users}
          color="blue"
          onClick={() => navigate('/personnel')}
        />
        <StatCard
          title="Active Assignments"
          value={activeAssignments}
          subtitle="Current duty postings"
          icon={Briefcase}
          color="blue"
          onClick={() => navigate('/assignment')}
        />
        <StatCard
          title="On Leave Today"
          value={onLeaveToday}
          subtitle="Approved leave credits"
          icon={Calendar}
          color="emerald"
          onClick={() => navigate('/reports')}
        />
        <StatCard
          title="Upcoming Trainings"
          value={upcomingTrainings}
          subtitle="IT & Career courses"
          icon={GraduationCap}
          color="purple"
          onClick={() => navigate('/education')}
        />
        <StatCard
          title="TIG Promotion Eligible"
          value={eligibleForPromotion}
          subtitle="≥ 3 Years in rank"
          icon={Award}
          color="cyan"
          onClick={() => navigate('/promotion')}
        />
      </div>

      {/* Main Visuals & Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart: Personnel Distribution by Division */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 theme-transition shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Personnel Distribution by Division & Office
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Strength allocation across ITMS headquarters and regional units</p>
            </div>
            <Badge variant="primary" size="sm">Live Analytics</Badge>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#64748b'} fontSize={11} tickLine={false} />
                <YAxis stroke={isDark ? '#64748b' : '#64748b'} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                    borderColor: isDark ? '#334155' : '#e2e8f0', 
                    borderRadius: '12px', 
                    color: isDark ? '#fff' : '#0f172a', 
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)'
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {divisionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 flex flex-col justify-between theme-transition shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Administrative Quick Actions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Perform immediate tasks across system modules</p>

            <div className="mt-4 space-y-2.5">
              <button
                onClick={() => navigate('/personnel')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-colors flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">View Personnel Roster</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Inspect full 201 profile records</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-colors flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Generate Alpha List Report</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Current assignments printout</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => navigate('/orders')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-colors flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Draft Special Order</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Assignment or relief directives</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 text-xs text-blue-900 dark:text-blue-200">
            <span className="font-bold block text-[11px] uppercase tracking-wider mb-0.5 text-blue-700 dark:text-blue-400">TIG Audit Reminder</span>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
              {eligibleForPromotion} personnel meet the 3-year Time-In-Grade threshold for rank promotion review.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Roster Showcase & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personnel Showcase Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 theme-transition shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Active Duty Key Personnel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quick access to individual 201 records</p>
            </div>
            <button
              onClick={() => navigate('/personnel')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3">Rank & Name</th>
                  <th className="py-3 px-3">Badge No</th>
                  <th className="py-3 px-3">Division</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                {personnelList.slice(0, 5).map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 flex items-center gap-3">
                      <img
                        src={person.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                        alt={person.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-blue-200 dark:border-blue-500/30"
                      />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{person.rank} {person.lastName}, {person.firstName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{person.rankFullName}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{person.badgeNo}</td>
                    <td className="py-3 px-3 font-bold text-blue-700 dark:text-blue-400">{person.division}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">{person.designation}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleSelectPersonnel(person.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-500/30 transition-colors"
                      >
                        Inspect Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 theme-transition shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Recent Administrative Activity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">System log of orders, leaves, and promotions</p>
          </div>

          <div className="space-y-3.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <Badge variant="primary" size="sm">Special Order Issued</Badge>
                <span className="text-slate-500 font-mono">Today</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">SO-ITMS-2024-045 Reassignment</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">PCOL Dela Cruz designated as Chief, ARMD</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <Badge variant="success" size="sm">Leave Approved</Badge>
                <span className="text-slate-500 font-mono">Yesterday</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">PCPT Garcia Vacation Leave</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">5-day wellness leave approved by Chief ARMD</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <Badge variant="info" size="sm">Training Completed</Badge>
                <span className="text-slate-500 font-mono">3 days ago</span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Advanced Threat Hunting Course</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">PLTCOL Reyes completed 120-hr SANS course</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

