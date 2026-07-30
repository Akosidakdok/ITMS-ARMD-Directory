import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import type { LeaveRecord, Personnel } from '../../types/pais';
import { SearchableSelect } from '../common/SearchableSelect';
import { CALENDAR_LEAVE_TYPES } from './LeaveCalendarForm';

interface LeaveCalendarProps {
  leaves: LeaveRecord[];
  personnel: Personnel[];
  month: number;
  year: number;
  personnelFilter: string;
  leaveTypeFilter: string;
  onMonthChange: (month: number, year: number) => void;
  onPersonnelFilterChange: (value: string) => void;
  onLeaveTypeFilterChange: (value: string) => void;
  onSelectLeave: (leave: LeaveRecord) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDateKey = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-');

const eventColor = (leaveType: string) => {
  if (leaveType === 'Mandatory Leave') return 'bg-amber-100 border-amber-300 text-amber-900';
  if (leaveType === 'Special Privilege Leave') return 'bg-violet-100 border-violet-300 text-violet-900';
  return 'bg-blue-100 border-blue-300 text-blue-900';
};

const compactDateRange = (leave: LeaveRecord) => {
  const start = leave.startDate;
  const end = leave.endDate || start;
  return start === end ? start : `${start} – ${end}`;
};

export const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
  leaves,
  personnel,
  month,
  year,
  personnelFilter,
  leaveTypeFilter,
  onMonthChange,
  onPersonnelFilterChange,
  onLeaveTypeFilterChange,
  onSelectLeave
}) => {
  const personnelById = useMemo(
    () => new Map(personnel.map(person => [person.id, person])),
    [personnel]
  );

  const visibleLeaves = useMemo(() => leaves.filter(leave => {
    const isCalendarType = CALENDAR_LEAVE_TYPES.includes(
      leave.leaveType as typeof CALENDAR_LEAVE_TYPES[number]
    );
    return isCalendarType &&
      (!personnelFilter || leave.personnelId === personnelFilter) &&
      (!leaveTypeFilter || leave.leaveType === leaveTypeFilter);
  }), [leaves, personnelFilter, leaveTypeFilter]);

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = formatDateKey(date);
      return {
        date,
        key,
        isCurrentMonth: date.getMonth() === month,
        events: visibleLeaves.filter(leave =>
          key >= leave.startDate && key <= (leave.endDate || leave.startDate)
        )
      };
    });
  }, [month, year, visibleLeaves]);

  const personnelOptions = personnel.map(person => ({
    value: person.id,
    label: `${person.rank} ${person.fullName}`,
    description: `${person.badgeNo} · ${person.division}`
  }));
  const leaveTypeOptions = CALENDAR_LEAVE_TYPES.map(type => ({ value: type, label: type }));

  const moveMonth = (offset: number) => {
    const target = new Date(year, month + offset, 1);
    onMonthChange(target.getMonth(), target.getFullYear());
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">Calendar Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <SearchableSelect
            label="Personnel"
            value={personnelFilter}
            options={personnelOptions}
            onChange={onPersonnelFilterChange}
            placeholder="All personnel"
          />
          <SearchableSelect
            label="Type of Leave"
            value={leaveTypeFilter}
            options={leaveTypeOptions}
            onChange={onLeaveTypeFilterChange}
            placeholder="All leave types"
          />
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Month</label>
            <select
              value={month}
              onChange={event => onMonthChange(Number(event.target.value), year)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-blue-500"
            >
              {MONTH_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Year</label>
            <select
              value={year}
              onChange={event => onMonthChange(month, Number(event.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-blue-500"
            >
              {Array.from({ length: 9 }, (_, index) => year - 4 + index).map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h2 className="text-base font-extrabold text-slate-900">{MONTH_NAMES[month]} {year}</h2>
            <p className="text-[10px] text-slate-500">Click an event to view its complete details</p>
          </div>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {DAY_NAMES.map(day => (
                <div key={day} className="px-2 py-2 text-center text-[10px] font-extrabold text-slate-500 uppercase">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map(cell => (
                <div
                  key={cell.key}
                  className={`min-h-28 p-1.5 border-r border-b border-slate-100 ${
                    cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${
                    cell.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {cell.date.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {cell.events.slice(0, 3).map(leave => {
                      const person = personnelById.get(leave.personnelId);
                      return (
                        <button
                          type="button"
                          key={`${cell.key}-${leave.id}`}
                          onClick={() => onSelectLeave(leave)}
                          className={`w-full p-1.5 rounded-md border text-left leading-tight ${eventColor(leave.leaveType)}`}
                        >
                          <span className="block text-[9px] font-extrabold truncate">
                            {person ? `${person.rank} ${person.fullName}` : 'Unknown personnel'}
                          </span>
                          <span className="block text-[8px] font-semibold truncate mt-0.5">
                            {leave.leaveType}
                          </span>
                          <span className="block text-[8px] opacity-75 truncate mt-0.5">
                            {compactDateRange(leave)}
                          </span>
                        </button>
                      );
                    })}
                    {cell.events.length > 3 && (
                      <span className="block text-[9px] font-bold text-slate-500 px-1">
                        +{cell.events.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap gap-3 bg-slate-50">
          {CALENDAR_LEAVE_TYPES.map(type => (
            <span key={type} className={`px-2 py-1 rounded-md border text-[9px] font-bold ${eventColor(type)}`}>
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
