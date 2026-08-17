import React from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
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
  const { personnelList, assignmentsList, trainingList, leaveList, ordersList, setSelectedPersonnelId } = useAuthRole();
  const navigate = useNavigate();

  // Compute live KPIs
  const totalPersonnel = personnelList.length;
  const activeAssignments = assignmentsList.filter(a => a.status === 'Current').length;
  const today = new Date().toISOString().slice(0, 10);
  const onLeaveToday = new Set(
    leaveList
      .filter(leave => leave.status === 'Approved' && leave.startDate <= today && leave.endDate >= today)
      .map(leave => leave.personnelId)
  ).size;
  const upcomingTrainings = trainingList.filter(training => {
    const scheduledDate = training.startDate || training.completionDate || training.endDate;
    return scheduledDate ? scheduledDate >= today : false;
  }).length;
  const eligibleForPromotion = personnelList.filter(
    personnel => personnel.lastPromotionDate && calculateTimeInGrade(personnel.lastPromotionDate).eligibleForPromotion
  ).length;
  const personnelNames = new Map(personnelList.map(person => [person.id, `${person.rank} ${person.fullName}`]));
  const recentActivities = [
    ...ordersList.map(order => ({ date: order.issuedDate || order.effectiveDate || '', type: 'Order', title: order.orderNumber || order.orderNo || 'Administrative order', detail: order.subject })),
    ...leaveList.map(leave => ({ date: leave.updatedAt || leave.createdAt || leave.startDate, type: `Leave ${leave.status}`, title: `${personnelNames.get(leave.personnelId) || 'Personnel'} — ${leave.leaveType}`, detail: `${leave.startDate} to ${leave.endDate}` })),
    ...trainingList.map(training => ({ date: training.completionDate || training.endDate || training.startDate || '', type: 'Training', title: training.courseName, detail: personnelNames.get(training.personnelId) || training.provider }))
  ].filter(activity => activity.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Command Center Hero Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 translate-x-10 -translate-y-10 opacity-15 pointer-events-none">
          <ShieldCheck className="w-80 h-80 text-blue-200" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 text-white border border-white/30">
              PNP ITMS Command Center
            </span>
            <span className="text-xs text-blue-100 font-mono">Camp BGen Rafael T Crame</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Personnel & Assignment Information System
          </h1>
          <p className="text-xs md:text-sm text-blue-100 max-w-2xl leading-relaxed">
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
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> Personnel Distribution by Division & Office
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Strength allocation across ITMS headquarters and regional units</p>
            </div>
            <Badge variant="primary" size="sm">Live Analytics</Badge>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: '#e2e8f0', 
                    borderRadius: '12px', 
                    color: '#0f172a', 
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)'
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {divisionChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 bg-white space-y-4 flex flex-col justify-between shadow-2xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-600" /> Administrative Quick Actions
            </h3>
            <p className="text-xs text-slate-500">Perform immediate tasks across system modules</p>

            <div className="mt-4 space-y-2.5">
              <button
                onClick={() => navigate('/personnel')}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 text-left transition-colors flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">View Personnel Roster</span>
                    <span className="text-[10px] text-slate-500 font-medium">Inspect {totalPersonnel} personnel profile records</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 text-left transition-colors flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Generate Alpha List Report</span>
                    <span className="text-[10px] text-slate-500 font-medium">Current assignments printout</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => navigate('/orders')}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 text-left transition-colors flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">Draft Special Order</span>
                    <span className="text-[10px] text-slate-500 font-medium">Assignment or relief directives</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
            <span className="font-bold block text-[11px] uppercase tracking-wider mb-0.5 text-blue-700">TIG Audit Reminder</span>
            <p className="text-[11px] text-slate-700 leading-tight">
              {eligibleForPromotion} personnel meet the 3-year Time-In-Grade threshold for rank promotion review.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Roster Showcase & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personnel Showcase Table */}
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Active Duty Key Personnel
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Quick access to individual 201 records</p>
            </div>
            <button
              onClick={() => navigate('/personnel')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200 uppercase text-[11px]">
                  <th className="py-3 px-3">Rank & Name</th>
                  <th className="py-3 px-3">Badge No</th>
                  <th className="py-3 px-3">Division</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                {personnelList.slice(0, 5).map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div>
                        <div className="font-extrabold text-slate-900">{person.rank} {person.lastName}, {person.firstName}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{person.rankFullName}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{person.badgeNo}</td>
                    <td className="py-3 px-3 font-bold text-blue-700">{person.division}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{person.designation}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleSelectPersonnel(person.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors"
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
        <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Recent Administrative Activity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">System log of orders, leaves, and promotions</p>
          </div>

          <div className="space-y-3.5">
            {recentActivities.map((activity, index) => (
              <div key={`${activity.type}-${activity.date}-${index}`} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <Badge variant="primary" size="sm">{activity.type}</Badge>
                  <span className="text-slate-500 font-mono">{activity.date.slice(0, 10)}</span>
                </div>
                <p className="text-xs font-bold text-slate-900">{activity.title}</p>
                <p className="text-[11px] text-slate-600">{activity.detail || 'No additional details'}</p>
              </div>
            ))}
            {!recentActivities.length && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">No recent activity is available.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};


