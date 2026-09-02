import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, Briefcase, CalendarDays, FileText, Users } from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Badge } from '../components/common/Badge';
import { EmptyState, OperationalSummary, PageHeader, SectionHeader } from '../components/common/SystemUI';
import { calculateTimeInGrade } from '../utils/timeInGrade';

const formatDate = (value?: string) => {
  if (!value) return 'Date not recorded';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value.slice(0, 10)
    : new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export const DashboardPage: React.FC = () => {
  const {
    personnelList,
    assignmentsList,
    trainingList,
    leaveList,
    ordersList,
    setSelectedPersonnelId
  } = useAuthRole();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const totalPersonnel = personnelList.length;
  const activePersonnel = personnelList.filter(person => person.status === 'Active').length;
  const onLeaveToday = new Set(
    leaveList
      .filter(leave => leave.status === 'Approved' && leave.startDate <= today && leave.endDate >= today)
      .map(leave => leave.personnelId)
  ).size;
  const eligibleForPromotion = personnelList.filter(personnel =>
    personnel.lastPromotionDate && calculateTimeInGrade(personnel.lastPromotionDate).eligibleForPromotion
  ).length;
  const activeAssignments = assignmentsList.filter(assignment => assignment.status === 'Current').length;
  const personnelById = new Map(personnelList.map(person => [person.id, person]));

  const divisionCounts = personnelList.reduce<Record<string, number>>((counts, person) => {
    const division = person.division || 'Unassigned';
    counts[division] = (counts[division] || 0) + 1;
    return counts;
  }, {});
  const divisionStrength = Object.entries(divisionCounts)
    .map(([division, count]) => ({ division, count }))
    .sort((a, b) => b.count - a.count);

  const recentActivities = [
    ...ordersList.map(order => ({
      date: order.issuedDate || order.effectiveDate || '',
      type: 'Order',
      title: order.orderNumber || order.orderNo || 'Administrative order',
      detail: order.subject || 'No subject recorded'
    })),
    ...leaveList.map(leave => ({
      date: leave.updatedAt || leave.createdAt || leave.startDate,
      type: 'Leave',
      title: `${personnelById.get(leave.personnelId)?.fullName || 'Personnel'} — ${leave.leaveType}`,
      detail: `${leave.status} • ${formatDate(leave.startDate)} to ${formatDate(leave.endDate)}`
    })),
    ...trainingList.map(training => ({
      date: training.completionDate || training.endDate || training.startDate || '',
      type: 'Training',
      title: training.courseName,
      detail: personnelById.get(training.personnelId)?.fullName || training.provider || 'Personnel not specified'
    }))
  ]
    .filter(activity => activity.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const upcomingLeave = leaveList
    .filter(leave => leave.endDate >= today && leave.status !== 'Rejected')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 4);

  const handleSelectPersonnel = (id: string) => {
    setSelectedPersonnelId(id);
    navigate('/personnel');
  };

  return (
    <div className="mx-auto max-w-[1680px] space-y-5">
      <PageHeader
        eyebrow="Daily administrative briefing"
        title="Personnel Operations Desk"
        description="Current personnel strength, duty status, administrative records, and upcoming service events across PNP–ITMS."
        meta={<span className="text-[11px] text-slate-500">Camp BGen Rafael T Crame</span>}
        reference={`OPS-${today.replace(/-/g, '')}`}
      />

      <OperationalSummary items={[
        { label: 'Recorded strength', value: totalPersonnel, detail: 'personnel files', icon: Users, onClick: () => navigate('/personnel') },
        { label: 'Active status', value: activePersonnel, detail: 'on duty', icon: Users, tone: 'success', onClick: () => navigate('/personnel') },
        { label: 'Current postings', value: activeAssignments, detail: 'assignments', icon: Briefcase, onClick: () => navigate('/assignment') },
        { label: 'Leave today', value: onLeaveToday, detail: 'approved', icon: CalendarDays, tone: onLeaveToday ? 'warning' : 'success', onClick: () => navigate('/reports') },
        { label: 'For review', value: eligibleForPromotion, detail: 'promotion cases', icon: Award, tone: eligibleForPromotion ? 'warning' : 'neutral', onClick: () => navigate('/promotion') }
      ]} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="record-section xl:col-span-8" aria-labelledby="recent-personnel-heading">
          <SectionHeader id="recent-personnel-heading" title="Personnel directory" description="Quick access to current 201 profile records" actions={
            <button onClick={() => navigate('/personnel')} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">
              View all <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          } />
          <div className="overflow-x-auto">
            <table className="record-table min-w-[720px] text-xs">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 uppercase">
                  <th className="px-4 py-3">Rank & name</th>
                  <th className="px-4 py-3">Badge no.</th>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {personnelList.slice(0, 6).map(person => (
                  <tr key={person.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{person.rank} {person.lastName}, {person.firstName}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{person.rankFullName}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">{person.badgeNo || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{person.division || '—'}</td>
                    <td className="px-4 py-3">{person.designation || 'Not assigned'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleSelectPersonnel(person.id)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                        View profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!personnelList.length && <EmptyState title="No personnel records found" description="Personnel records will appear here after they are added to the directory." icon={Users} />}
          </div>
        </section>

        <section className="record-section xl:col-span-4" aria-labelledby="division-strength-heading">
          <SectionHeader id="division-strength-heading" title="Personnel by division" description="Recorded organizational distribution" />
          <div className="space-y-3.5 p-4">
            {divisionStrength.slice(0, 7).map(item => {
              const percentage = totalPersonnel ? Math.round((item.count / totalPersonnel) * 100) : 0;
              return (
                <div key={item.division}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.division}</span>
                    <span className="font-mono text-[11px] text-slate-500">{item.count} ({percentage}%)</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`${item.division}: ${item.count} personnel`}>
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {!divisionStrength.length && <EmptyState title="No division data available" icon={Briefcase} />}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="record-section xl:col-span-8" aria-labelledby="activity-heading">
          <SectionHeader id="activity-heading" title="Recent administrative updates" description="Latest orders, leave records, and training entries" actions={<FileText aria-hidden="true" className="h-4 w-4 text-slate-400" />} />
          <div className="divide-y divide-slate-100">
            {recentActivities.map((activity, index) => (
              <article key={`${activity.type}-${activity.date}-${index}`} className="grid gap-1 px-4 py-3 sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:gap-3">
                <Badge variant="primary" size="sm" className="w-fit">{activity.type}</Badge>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{activity.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{activity.detail}</p>
                </div>
                <time className="text-[10px] font-medium text-slate-500" dateTime={activity.date}>{formatDate(activity.date)}</time>
              </article>
            ))}
            {!recentActivities.length && <EmptyState title="No recent administrative updates" icon={FileText} />}
          </div>
        </section>

        <section className="record-section xl:col-span-4" aria-labelledby="leave-heading">
          <SectionHeader id="leave-heading" title="Upcoming leave" description="Approved and pending leave schedules" actions={<button onClick={() => navigate('/reports')} className="text-[11px] font-semibold text-blue-700 hover:text-blue-800">Open report</button>} />
          <div className="divide-y divide-slate-100">
            {upcomingLeave.map(leave => {
              const person = personnelById.get(leave.personnelId);
              return (
                <article key={leave.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{person?.fullName || 'Personnel record'}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{leave.leaveType} • {formatDate(leave.startDate)}</p>
                    </div>
                    <Badge variant={leave.status === 'Approved' ? 'success' : 'warning'} size="sm">{leave.status}</Badge>
                  </div>
                </article>
              );
            })}
            {!upcomingLeave.length && <EmptyState title="No upcoming leave records" icon={CalendarDays} />}
          </div>
        </section>
      </div>
    </div>
  );
};
