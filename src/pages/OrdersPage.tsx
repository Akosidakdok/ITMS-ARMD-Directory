import { FormEvent, useMemo, useState } from 'react';
import {
  Award,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Edit3,
  Eye,
  FilePlus2,
  Filter,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AwardForm } from '../components/orders/AwardForm';
import { DocumentTemplatePanel } from '../components/orders/DocumentTemplatePanel';
import { LeaveCalendar } from '../components/orders/LeaveCalendar';
import { LeaveCalendarForm, CALENDAR_LEAVE_TYPES } from '../components/orders/LeaveCalendarForm';
import { OrderTypeSelectorModal } from '../components/orders/OrderTypeSelectorModal';
import { NotificationToast } from '../components/common/NotificationToast';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useAuthRole } from '../context/AuthRoleContext';
import type { AwardRecord, LeaveRecord, OrderRecord } from '../types/pais';

type DashboardRecord =
  | { kind: 'order'; id: string; reference: string; recordType: string; subtype: string; title: string; personnel: string; date: string; status: string; source: OrderRecord }
  | { kind: 'award'; id: string; reference: string; recordType: string; subtype: string; title: string; personnel: string; date: string; status: string; source: AwardRecord }
  | { kind: 'leave'; id: string; reference: string; recordType: string; subtype: string; title: string; personnel: string; date: string; status: string; source: LeaveRecord };

const ORDER_TYPES = ['Assignment Order', 'Movement Order', 'Special Order', 'Commendation Order', 'Relief Order'];
const ORDER_STATUSES = ['Active', 'Pending', 'Archived', 'Revoked'];

const formatDate = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateRange = (start: string, end?: string) =>
  !end || end === start ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;

const ModalShell = ({
  title,
  eyebrow,
  onClose,
  children,
  maxWidth = 'max-w-3xl',
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-2 sm:p-4 backdrop-blur-sm">
    <div className={`my-2 sm:my-4 max-h-[calc(100vh-1rem)] sm:max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p>}
          <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
          <X size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const OrdersPage = () => {
  const {
    role,
    personnelList,
    ordersList,
    awardsList,
    leaveList,
    addOrder,
    updateOrder,
    deleteOrder,
    createAward,
    updateAward,
    deleteAward,
    createCalendarLeave,
    updateCalendarLeave,
    deleteCalendarLeave,
  } = useAuthRole();

  const canEdit = role === 'admin';
  const [activeView, setActiveView] = useState<'list' | 'calendar' | 'templates'>('list');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [awardFormOpen, setAwardFormOpen] = useState(false);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderRecord | null>(null);
  const [editingAward, setEditingAward] = useState<AwardRecord | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [selectedAward, setSelectedAward] = useState<AwardRecord | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [search, setSearch] = useState('');
  const [recordType, setRecordType] = useState('');
  const [subtypeFilter, setSubtypeFilter] = useState('');
  const [personnelFilter, setPersonnelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [orderNumber, setOrderNumber] = useState('');
  const [orderType, setOrderType] = useState('Special Order');
  const [subject, setSubject] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [signatory, setSignatory] = useState('PBGEN BENJAMIN H ACORDA');
  const [signatoryTitle, setSignatoryTitle] = useState('Director, ITMS');
  const [affectedPersonnelCount, setAffectedPersonnelCount] = useState(1);
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [orderError, setOrderError] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarPersonnel, setCalendarPersonnel] = useState('');
  const [calendarLeaveType, setCalendarLeaveType] = useState('');

  const personnelNames = useMemo(
    () => new Map(personnelList.map((person) => [person.id, `${person.rank} ${person.fullName}`])),
    [personnelList],
  );

  const calendarLeaves = useMemo(
    () => leaveList.filter((leave) => CALENDAR_LEAVE_TYPES.includes(leave.leaveType as (typeof CALENDAR_LEAVE_TYPES)[number])),
    [leaveList],
  );

  const resetOrderForm = () => {
    setEditingOrder(null);
    setOrderNumber('');
    setOrderType('Special Order');
    setSubject('');
    setIssuedDate('');
    setEffectiveDate('');
    setStatus('Active');
    setSignatory('PBGEN BENJAMIN H ACORDA');
    setSignatoryTitle('Director, ITMS');
    setAffectedPersonnelCount(1);
    setSelectedPersonnelIds([]);
    setDescription('');
    setOrderError('');
  };

  const openOrderEdit = (order: OrderRecord) => {
    setSelectedOrder(null);
    setEditingOrder(order);
    setOrderNumber(order.orderNumber || order.orderNo || '');
    setOrderType(order.orderType || order.type || 'Special Order');
    setSubject(order.subject || '');
    setIssuedDate(order.issuedDate || '');
    setEffectiveDate(order.effectiveDate || '');
    setStatus(order.status || 'Active');
    setSignatory(order.signatory || 'PBGEN BENJAMIN H ACORDA');
    setSignatoryTitle(order.signatoryTitle || 'Director, ITMS');
    setAffectedPersonnelCount(order.affectedPersonnelCount || order.personnelIds?.length || 1);
    setSelectedPersonnelIds(order.personnelIds || []);
    setDescription(order.description || '');
    setOrderFormOpen(true);
  };

  const toggleOrderPersonnel = (personnelId: string) => {
    setSelectedPersonnelIds(prev => (
      prev.includes(personnelId)
        ? prev.filter(id => id !== personnelId)
        : [...prev, personnelId]
    ));
  };

  const rows = useMemo<DashboardRecord[]>(() => {
    const orderRows: DashboardRecord[] = ordersList.map((order) => ({
      kind: 'order',
      id: order.id,
      reference: order.orderNumber || `ORDER-${order.id.slice(-6).toUpperCase()}`,
      recordType: 'Administrative Order',
      subtype: order.orderType || order.type || 'Administrative Order',
      title: order.subject,
      personnel: order.personnelIds?.length
        ? order.personnelIds.map(id => personnelNames.get(id) || 'Unknown personnel').join(', ')
        : `${order.affectedPersonnelCount || 1} personnel`,
      date: order.issuedDate || order.effectiveDate || '',
      status: order.status || 'Active',
      source: order,
    }));
    const awardRows: DashboardRecord[] = awardsList.map((award) => ({
      kind: 'award',
      id: award.id,
      reference: `AWD-${award.id.slice(-6).toUpperCase()}`,
      recordType: 'Award',
      subtype: award.orderType,
      title: `${award.awardName} - ${award.title}`,
      personnel: award.personnelName,
      date: award.authorityDate,
      status: award.status || 'Active',
      source: award,
    }));
    const leaveRows: DashboardRecord[] = calendarLeaves.map((leave) => ({
      kind: 'leave',
      id: leave.id,
      reference: `LEAVE-${leave.id.slice(-6).toUpperCase()}`,
      recordType: 'Leave Calendar',
      subtype: leave.leaveType,
      title: leave.leaveType,
      personnel: personnelNames.get(leave.personnelId) || 'Unknown personnel',
      date: leave.startDate,
      status: leave.status,
      source: leave,
    }));
    return [...orderRows, ...awardRows, ...leaveRows].sort((a, b) => b.date.localeCompare(a.date));
  }, [ordersList, awardsList, calendarLeaves, personnelNames]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const searchableValues = [row.reference, row.recordType, row.subtype, row.title, row.personnel];
      if (row.kind === 'order') searchableValues.push(row.source.signatory || '', row.source.description || '');
      const matchesSearch = !query || searchableValues
        .some((value) => value.toLowerCase().includes(query));
      const matchesType = !recordType || row.recordType === recordType;
      const matchesSubtype = !subtypeFilter || row.subtype === subtypeFilter;
      const matchesPersonnel = !personnelFilter
        || (row.kind === 'order' && !!row.source.personnelIds?.includes(personnelFilter))
        || (row.kind === 'leave' && row.source.personnelId === personnelFilter)
        || (row.kind === 'award' && row.source.personnelId === personnelFilter);
      const matchesStatus = !statusFilter || row.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesFrom = !dateFrom || row.date >= dateFrom;
      const matchesTo = !dateTo || row.date <= dateTo;
      return matchesSearch && matchesType && matchesSubtype && matchesPersonnel && matchesStatus && matchesFrom && matchesTo;
    });
  }, [rows, search, recordType, subtypeFilter, personnelFilter, statusFilter, dateFrom, dateTo]);

  const resetFilters = () => {
    setSearch('');
    setRecordType('');
    setSubtypeFilter('');
    setPersonnelFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const openRecord = (row: DashboardRecord) => {
    if (row.kind === 'order') setSelectedOrder(row.source);
    if (row.kind === 'award') setSelectedAward(row.source);
    if (row.kind === 'leave') setSelectedLeave(row.source);
  };

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!orderNumber.trim() || !subject.trim() || !issuedDate || !effectiveDate || !signatory.trim() || !signatoryTitle.trim()) {
      setOrderError('Complete all required administrative order fields.');
      return;
    }
    if (effectiveDate < issuedDate) {
      setOrderError('The effective date cannot be earlier than the issued date.');
      return;
    }
    setSavingOrder(true);
    setOrderError('');
    try {
      const payload: OrderRecord = {
        id: editingOrder?.id || crypto.randomUUID(),
        personnelIds: selectedPersonnelIds,
        orderNumber: orderNumber.trim(),
        orderType,
        subject: subject.trim(),
        issuedDate,
        effectiveDate,
        signatory: signatory.trim(),
        signatoryTitle: signatoryTitle.trim(),
        affectedPersonnelCount: selectedPersonnelIds.length || affectedPersonnelCount,
        description: description.trim(),
        status,
      };
      if (editingOrder) {
        await updateOrder(payload);
      } else {
        await addOrder(payload);
      }
      setOrderFormOpen(false);
      resetOrderForm();
      setToast({ type: 'success', message: editingOrder ? 'Administrative order updated successfully.' : 'Administrative order saved successfully.' });
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Unable to save the order.');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleAwardSubmit = async (award: Omit<AwardRecord, 'id' | 'status'> | AwardRecord) => {
    if ('id' in award) {
      await updateAward(award);
    } else {
      await createAward(award);
    }
    setAwardFormOpen(false);
    setEditingAward(null);
    setToast({ type: 'success', message: 'Award record saved and added to All Orders.' });
  };

  const handleLeaveSubmit = async (leave: LeaveRecord) => {
    if (editingLeave) {
      await updateCalendarLeave(leave);
      setToast({ type: 'success', message: 'Leave record updated on the calendar.' });
    } else {
      await createCalendarLeave(leave);
      setToast({ type: 'success', message: 'Leave record saved and added to the calendar.' });
    }
    setLeaveFormOpen(false);
    setEditingLeave(null);
  };

  const openLeaveEdit = (leave: LeaveRecord) => {
    setSelectedLeave(null);
    setEditingLeave(leave);
    setLeaveFormOpen(true);
  };

  const removeRecord = async (kind: 'order' | 'award' | 'leave', id: string, label: string) => {
    if (!window.confirm(`Delete ${label}? This action cannot be undone.`)) return;
    try {
      if (kind === 'order') await deleteOrder(id);
      if (kind === 'award') await deleteAward(id);
      if (kind === 'leave') await deleteCalendarLeave(id);
      setSelectedOrder(null);
      setSelectedAward(null);
      setSelectedLeave(null);
      setToast({ type: 'success', message: `${label} deleted successfully.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : `Unable to delete ${label}.` });
    }
  };

  const stats = [
    { label: 'All records', value: rows.length, icon: ClipboardList, className: 'bg-slate-900 text-white' },
    { label: 'Awards', value: awardsList.length, icon: Award, className: 'bg-amber-50 text-amber-800' },
    { label: 'Scheduled leaves', value: calendarLeaves.length, icon: CalendarDays, className: 'bg-teal-50 text-teal-800' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span>Records Management</span><ChevronRight size={14} /><span className="font-medium text-slate-800">All Orders</span>
            {activeView === 'calendar' && <><ChevronRight size={14} /><span className="font-medium text-slate-800">Leave Calendar</span></>}
            {activeView === 'templates' && <><ChevronRight size={14} /><span className="font-medium text-slate-800">Document Templates</span></>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            {activeView === 'list' ? 'All Orders' : activeView === 'calendar' ? 'Leave Calendar' : 'Document Templates'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {activeView === 'list'
              ? 'Search and review administrative orders, awards, and scheduled leaves in one place.'
              : activeView === 'calendar'
                ? 'A visual overview of approved leave schedules. Leave dates are encoded through the separate form.'
                : 'Open fixed-format templates, edit allowed fields, and autofill personnel details from system records.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeView === 'calendar' ? (
            <>
              <button type="button" onClick={() => setActiveView('list')} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Back to All Orders
              </button>
              {canEdit && (
                <button type="button" onClick={() => { setEditingLeave(null); setLeaveFormOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
                  <Plus size={17} /> Add Leave Record
                </button>
              )}
            </>
          ) : activeView === 'templates' ? (
            <button type="button" onClick={() => setActiveView('list')} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to All Orders
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setActiveView('templates')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <FilePlus2 size={17} /> Document Templates
              </button>
              <button type="button" onClick={() => setActiveView('calendar')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <CalendarDays size={17} /> View Leave Calendar
              </button>
              {canEdit && (
                <>
                  <button type="button" onClick={() => { resetOrderForm(); setOrderFormOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <FilePlus2 size={17} /> Administrative Order
                  </button>
                  <button type="button" onClick={() => setSelectorOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
                    <Plus size={17} /> Select Order Type
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {activeView === 'templates' ? (
        <DocumentTemplatePanel personnel={personnelList} />
      ) : activeView === 'calendar' ? (
        <LeaveCalendar
          leaves={calendarLeaves}
          personnel={personnelList}
          month={calendarMonth}
          year={calendarYear}
          personnelFilter={calendarPersonnel}
          leaveTypeFilter={calendarLeaveType}
          onMonthChange={(month, year) => { setCalendarMonth(month); setCalendarYear(year); }}
          onPersonnelFilterChange={setCalendarPersonnel}
          onLeaveTypeFilterChange={setCalendarLeaveType}
          onSelectLeave={setSelectedLeave}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, className }) => (
              <div key={label} className={`flex items-center justify-between rounded-2xl p-5 ${className}`}>
                <div><p className="text-sm opacity-75">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>
                <Icon size={26} className="opacity-70" />
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <Filter size={18} className="text-teal-700" />
              <h2 className="font-bold text-slate-900">Search and filters</h2>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
              <label className="xl:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Search records</span>
                <div className="relative">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference, title, personnel..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                </div>
              </label>
              <SearchableSelect label="Record type" value={recordType} onChange={setRecordType} placeholder="All record types" options={['Administrative Order', 'Award', 'Leave Calendar'].map((value) => ({ value, label: value }))} />
              <SearchableSelect label="Order / leave type" value={subtypeFilter} onChange={setSubtypeFilter} placeholder="All types" options={Array.from(new Set(rows.map((row) => row.subtype))).sort().map((value) => ({ value, label: value }))} />
              <SearchableSelect label="Personnel" value={personnelFilter} onChange={setPersonnelFilter} placeholder="All personnel" options={personnelList.map((person) => ({ value: person.id, label: `${person.rank} ${person.fullName}`, description: person.badgeNo || person.division }))} />
              <SearchableSelect label="Status" value={statusFilter} onChange={setStatusFilter} placeholder="All statuses" options={['Draft', 'For Approval', 'Approved', 'Released', 'Active'].map((value) => ({ value, label: value }))} />
              <div className="flex items-end">
                <button type="button" onClick={resetFilters} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <RotateCcw size={16} /> Reset
                </button>
              </div>
              <label>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Date from</span>
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Date to</span>
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Order records</h2>
                <p className="text-sm text-slate-500">{filteredRows.length} of {rows.length} records</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] lg:min-w-[980px] w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Record type</th>
                    <th className="px-5 py-3">Title / purpose</th>
                    <th className="px-5 py-3">Personnel</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-semibold text-teal-700">{row.reference}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">{row.recordType}</p>
                        <p className="text-xs text-slate-500">{row.subtype}</p>
                      </td>
                      <td className="max-w-xs px-5 py-4 text-sm text-slate-700">{row.title}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row.personnel}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row.kind === 'leave' ? formatDateRange(row.source.startDate, row.source.endDate) : formatDate(row.date)}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.status}</span></td>
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => openRecord(row)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-700">
                          <Eye size={15} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!filteredRows.length && (
                    <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500">No records match the selected filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <OrderTypeSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={(type) => {
          setSelectorOpen(false);
          if (type === 'award') setAwardFormOpen(true);
          else {
            setActiveView('calendar');
            setEditingLeave(null);
            setLeaveFormOpen(true);
          }
        }}
      />

      {awardFormOpen && (
        <ModalShell title={editingAward ? 'Edit Award' : 'Encode Award'} eyebrow="All Orders - Award" onClose={() => { setAwardFormOpen(false); setEditingAward(null); }} maxWidth="max-w-4xl">
          <AwardForm personnel={personnelList} initialRecord={editingAward || undefined} onSubmit={handleAwardSubmit} onCancel={() => { setAwardFormOpen(false); setEditingAward(null); }} />
        </ModalShell>
      )}

      {leaveFormOpen && (
        <ModalShell title={editingLeave ? 'Edit Leave Record' : 'Encode Leave Record'} eyebrow="Leave Calendar" onClose={() => { setLeaveFormOpen(false); setEditingLeave(null); }} maxWidth="max-w-2xl">
          <LeaveCalendarForm personnel={personnelList} initialRecord={editingLeave || undefined} onSubmit={handleLeaveSubmit} onCancel={() => { setLeaveFormOpen(false); setEditingLeave(null); }} />
        </ModalShell>
      )}

      {orderFormOpen && (
        <ModalShell title={editingOrder ? 'Edit Administrative Order' : 'New Administrative Order'} eyebrow="All Orders" onClose={() => { setOrderFormOpen(false); resetOrderForm(); }} maxWidth="max-w-4xl">
          <form onSubmit={submitOrder} className="space-y-5 p-5 sm:p-6">
            {orderError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{orderError}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Order number *</span><input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <SearchableSelect label="Order type *" value={orderType} onChange={setOrderType} options={ORDER_TYPES.map((value) => ({ value, label: value }))} />
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Subject *</span><textarea value={subject} onChange={(e) => setSubject(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Issued date *</span><input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Effective date *</span><input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <SearchableSelect label="Status *" value={status} onChange={setStatus} options={ORDER_STATUSES.map((value) => ({ value, label: value }))} />
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Affected personnel count *</span><input type="number" min={1} value={affectedPersonnelCount} onChange={(e) => setAffectedPersonnelCount(Math.max(1, Number(e.target.value)))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">Personnel involved</span>
                  <span className="text-xs font-semibold text-slate-500">{selectedPersonnelIds.length} selected</span>
                </div>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-300 bg-slate-50 p-2">
                  {personnelList.map((person) => (
                    <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white">
                      <input
                        type="checkbox"
                        checked={selectedPersonnelIds.includes(person.id)}
                        onChange={() => toggleOrderPersonnel(person.id)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      />
                      <span className="font-semibold text-slate-900">{person.rank} {person.fullName}</span>
                      <span className="text-xs text-slate-500">{person.badgeNo} - {person.division}</span>
                    </label>
                  ))}
                  {!personnelList.length && <p className="px-3 py-6 text-center text-sm text-slate-500">No personnel records available.</p>}
                </div>
              </div>
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Signatory *</span><input value={signatory} onChange={(e) => setSignatory(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Signatory title *</span><input value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Directives and particulars</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => { setOrderFormOpen(false); resetOrderForm(); }} disabled={savingOrder} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="submit" disabled={savingOrder} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{savingOrder ? 'Saving...' : editingOrder ? 'Update order' : 'Save order'}</button>
            </div>
          </form>
        </ModalShell>
      )}

      {selectedOrder && (
        <ModalShell title={selectedOrder.orderNumber || selectedOrder.orderNo || 'Administrative Order'} eyebrow="Administrative Order" onClose={() => setSelectedOrder(null)}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Detail label="Order type" value={selectedOrder.orderType || selectedOrder.type || 'Administrative Order'} />
            <Detail label="Status" value={selectedOrder.status || 'Active'} />
            <Detail label="Issued date" value={formatDate(selectedOrder.issuedDate)} />
            <Detail label="Effective date" value={formatDate(selectedOrder.effectiveDate)} />
            <div className="sm:col-span-2"><Detail label="Subject" value={selectedOrder.subject} /></div>
            <Detail label="Affected personnel" value={selectedOrder.personnelIds?.length ? selectedOrder.personnelIds.map(id => personnelNames.get(id) || 'Unknown personnel').join('\n') : String(selectedOrder.affectedPersonnelCount || 1)} />
            <Detail label="Signatory" value={[selectedOrder.signatory, selectedOrder.signatoryTitle].filter(Boolean).join(' - ')} />
            {selectedOrder.description && <div className="sm:col-span-2"><Detail label="Directives and particulars" value={selectedOrder.description} /></div>}
            {canEdit && (
              <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => removeRecord('order', selectedOrder.id, 'administrative order')} className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Delete</button>
                <button type="button" onClick={() => openOrderEdit(selectedOrder)} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
                  <Edit3 size={16} /> Edit order
                </button>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {selectedAward && (
        <ModalShell title={selectedAward.awardName} eyebrow="Award details" onClose={() => setSelectedAward(null)}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Detail label="Order type" value={selectedAward.orderType} />
            <Detail label="Authority date" value={formatDate(selectedAward.authorityDate)} />
            <Detail label="Award title" value={selectedAward.title} />
            <Detail label="Name of personnel" value={selectedAward.personnelName} />
            <div className="sm:col-span-2"><Detail label="Citation details" value={selectedAward.citationDetails} /></div>
            {canEdit && (
              <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => removeRecord('award', selectedAward.id, 'award record')} className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Delete</button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAward(null);
                    setEditingAward(selectedAward);
                    setAwardFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <Edit3 size={16} /> Edit award
                </button>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {selectedLeave && (
        <ModalShell title="Leave Information" eyebrow="Leave Calendar" onClose={() => setSelectedLeave(null)} maxWidth="max-w-xl">
          <div className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Detail label="Name of personnel" value={personnelNames.get(selectedLeave.personnelId) || 'Unknown personnel'} /></div>
              <Detail label="Type of leave" value={selectedLeave.leaveType} />
              <Detail label="Status" value={selectedLeave.status} />
              <Detail label="Start date" value={formatDate(selectedLeave.startDate)} />
              <Detail label="End date" value={formatDate(selectedLeave.endDate || selectedLeave.startDate)} />
              <Detail label="Duration" value={`${selectedLeave.days} day${selectedLeave.days === 1 ? '' : 's'}`} />
              {selectedLeave.purpose && <div className="sm:col-span-2"><Detail label="Notes" value={selectedLeave.purpose} /></div>}
            </div>
            {canEdit && (
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => removeRecord('leave', selectedLeave.id, 'leave record')} className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Delete</button>
                <button type="button" onClick={() => openLeaveEdit(selectedLeave)} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Edit through leave form</button>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {toast && <NotificationToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">{value || '—'}</p>
  </div>
);
