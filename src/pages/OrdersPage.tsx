import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Award,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  FileText,
  Filter,
  Loader2,
  Plus,
  RotateCcw,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AwardForm } from '../components/orders/AwardForm';
import { AdministrativeOrderModeModal, type AdministrativeOrderMode } from '../components/orders/AdministrativeOrderModeModal';
import { DocumentTemplatePanel } from '../components/orders/DocumentTemplatePanel';
import { LeaveCalendar } from '../components/orders/LeaveCalendar';
import { LeaveCalendarForm } from '../components/orders/LeaveCalendarForm';
import { OrderTypeSelectorModal } from '../components/orders/OrderTypeSelectorModal';
import { NotificationToast } from '../components/common/NotificationToast';
import { Modal } from '../components/common/Modal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { OperationalSummary, PageHeader } from '../components/common/SystemUI';
import { useAuthRole } from '../context/AuthRoleContext';
import { hasManagementAccess } from '../utils/accessControl';
import type { AwardRecord, LeaveRecord, OrderRecord } from '../types/pais';
import { LEAVE_TYPES } from '../data/leaveTypes';
import type { OrderStatusHistoryRecord } from '../services/api';
import {
  getOrderPurposeLabel,
  LEGACY_ORDER_STATUS_OPTIONS,
  ORDER_DOCUMENT_STATUS_OPTIONS,
  ORDER_PURPOSE_OPTIONS,
  ORDER_SERIES_OPTIONS,
  getOrderPurposeDefinition,
  type OrderDocumentStatus,
  type OrderPersonnelRoleCode,
  type OrderPurposeCode,
  type OrderSeries,
} from '../constants/orders';

type DashboardRecord =
  | { kind: 'order'; id: string; reference: string; recordType: string; subtype: string; title: string; personnel: string; date: string; status: string; source: OrderRecord }
  | { kind: 'award'; id: string; reference: string; recordType: string; subtype: string; title: string; personnel: string; date: string; status: string; source: AwardRecord }
  | { kind: 'leave'; id: string; reference: string; recordType: string; subtype: string; title: string; personnel: string; date: string; status: string; source: LeaveRecord };

const ORDER_STATUSES = [...ORDER_DOCUMENT_STATUS_OPTIONS.map(option => option.value), ...LEGACY_ORDER_STATUS_OPTIONS];
const LOCKED_ORDER_STATUSES = new Set<OrderDocumentStatus | string>(['Signed', 'Released', 'Archived', 'Revoked']);

const normalizedOrderStatus = (order: OrderRecord): OrderDocumentStatus => {
  const value = order.documentStatus || order.status;
  if (ORDER_DOCUMENT_STATUS_OPTIONS.some(option => option.value === value)) return value as OrderDocumentStatus;
  if (value === 'Pending') return 'For Approval';
  return 'Draft';
};

const hasGeneratedOrderDocument = (order: OrderRecord) => Boolean(order.generatedDocument?.storagePath);

const legacySeriesFromOrder = (order: OrderRecord): OrderSeries => order.series || 'SO';
const legacyPurposeFromOrder = (order: OrderRecord): OrderPurposeCode => {
  if (order.purposeCode && ORDER_PURPOSE_OPTIONS.some(option => option.value === order.purposeCode)) {
    return order.purposeCode as OrderPurposeCode;
  }
  const legacyType = (order.orderType || order.type || '').toLowerCase();
  if (legacyType.includes('promotion')) return 'PR';
  if (legacyType.includes('award') || legacyType.includes('commend')) return 'AW';
  if (legacyType.includes('assignment')) return 'AO';
  if (legacyType.includes('relief')) return 'TDS';
  if (legacyType.includes('movement')) return 'DO';
  return 'DES';
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const clean = String(value).trim();
  if (!clean) return '—';
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime())
    ? clean
    : parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateRange = (start: string, end?: string) =>
  !end || end === start ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;

const formatOrderReference = (reference: string) => {
  const match = reference.match(/^ITMS-[A-Z]+-[A-Z0-9]+-(\d{4}-\d+)$/);
  return match ? match[1] : reference;
};

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
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(element => !element.hasAttribute('hidden'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(() => {
      const initialFocus = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
      (initialFocus || dialogRef.current)?.focus();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-2 sm:p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCloseRef.current(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`my-2 flex max-h-[calc(100vh-1rem)] w-full ${maxWidth} flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-2xl outline-none sm:my-4 sm:max-h-[92vh]`}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div>
          {eyebrow && <p className="record-kicker">{eyebrow}</p>}
          <h2 id={titleId} className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  </div>
  );
};

export const OrdersPage = () => {
  const {
    role,
    backendConnected,
    personnelList,
    ordersList,
    awardsList,
    leaveList,
    addOrder,
    updateOrder,
    deleteOrder,
    transitionOrderStatus,
    restoreOrderStatus,
    fetchOrderStatusHistory,
    uploadOrderDocument,
    getOrderDocument,
    previewOrderDocument,
    deleteOrderDocument,
    generateOrderDocument,
    getGeneratedOrderDocument,
    previewGeneratedOrderDocument,
    uploadSignedOrderDocument,
    getSignedOrderDocument,
    deleteSignedOrderDocument,
    createAward,
    updateAward,
    deleteAward,
    createCalendarLeave,
    updateCalendarLeave,
    deleteCalendarLeave,
  } = useAuthRole();

  const canEdit = hasManagementAccess(role);
  const [activeView, setActiveView] = useState<'list' | 'calendar' | 'templates'>('list');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [adminOrderModeSelectorOpen, setAdminOrderModeSelectorOpen] = useState(false);
  const [awardFormOpen, setAwardFormOpen] = useState(false);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRecord | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderRecord | null>(null);
  const [editingAward, setEditingAward] = useState<AwardRecord | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistoryRecord[]>([]);
  const [selectedAward, setSelectedAward] = useState<AwardRecord | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{ order: OrderRecord; html: string } | null>(null);
  const [loadingDocumentPreview, setLoadingDocumentPreview] = useState(false);
  const [regeneratingDocument, setRegeneratingDocument] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [submittingRevoke, setSubmittingRevoke] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [submittingRestore, setSubmittingRestore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'order' | 'award' | 'leave'; id: string; label: string } | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [search, setSearch] = useState('');
  const [recordType, setRecordType] = useState('');
  const [subtypeFilter, setSubtypeFilter] = useState('');
  const [personnelFilter, setPersonnelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [fileFilter, setFileFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [effectiveDateFrom, setEffectiveDateFrom] = useState('');
  const [effectiveDateTo, setEffectiveDateTo] = useState('');
  const [signedDateFrom, setSignedDateFrom] = useState('');
  const [signedDateTo, setSignedDateTo] = useState('');
  const [releasedDateFrom, setReleasedDateFrom] = useState('');
  const [releasedDateTo, setReleasedDateTo] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(10);

  const [orderNumber, setOrderNumber] = useState('');
  const [orderSeries, setOrderSeries] = useState<OrderSeries>('SO');
  const [purposeCode, setPurposeCode] = useState<OrderPurposeCode>('DES');
  const [subject, setSubject] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [status, setStatus] = useState<OrderDocumentStatus>('Draft');
  const [signatory, setSignatory] = useState('PBGEN BENJAMIN H ACORDA');
  const [signatoryTitle, setSignatoryTitle] = useState('Director, ITMS');
  const [affectedPersonnelCount, setAffectedPersonnelCount] = useState(1);
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<string[]>([]);
  const [personnelRoleAssignments, setPersonnelRoleAssignments] = useState<Record<string, OrderPersonnelRoleCode>>({});
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [description, setDescription] = useState('');
  const [purposeData, setPurposeData] = useState<Record<string, string>>({});
  const [orderError, setOrderError] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  // Legacy DOCX actions remain available internally for compatibility with old records.
  const [uploadingOrderFile, setUploadingOrderFile] = useState(false);
  const [uploadingSignedDocument, setUploadingSignedDocument] = useState(false);
  const [orderMode, setOrderMode] = useState<AdministrativeOrderMode>('default');
  const [orderWizardStep, setOrderWizardStep] = useState(1);
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarPersonnel, setCalendarPersonnel] = useState('');
  const [calendarLeaveType, setCalendarLeaveType] = useState('');

  const selectedOrderStatus = selectedOrder ? normalizedOrderStatus(selectedOrder) : null;
  const revokedReturnStatus = orderHistory.find(event => event.toStatus === 'Revoked' && event.fromStatus)?.fromStatus || 'For Approval';
  const purposeDefinition = getOrderPurposeDefinition(purposeCode);
  const defaultPersonnelRole = purposeDefinition?.personnelRoles[0]?.code || 'affected';
  const unitOptions = useMemo(() => Array.from(new Set(personnelList.flatMap(person => [person.sub_unit, person.division, person.unitCategory].filter(Boolean) as string[]))).sort().map(value => ({ value, label: value })), [personnelList]);
  const renderPurposeField = (field: NonNullable<typeof purposeDefinition>['fields'][number]) => {
    const value = purposeData[field.key] || '';
    const fieldClass = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';
    if (field.type === 'textarea') return <label key={field.key} className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}{field.required && ' *'}</span><textarea required={field.required} value={value} onChange={event => updatePurposeField(field.key, event.target.value)} rows={4} className={fieldClass} /></label>;
    if (field.type === 'select') return <label key={field.key}><span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}{field.required && ' *'}</span><select required={field.required} value={value} onChange={event => updatePurposeField(field.key, event.target.value)} className={fieldClass}><option value="">Select {field.label.toLowerCase()}</option>{(field.key === 'leaveType' ? LEAVE_TYPES : []).map(option => <option key={option} value={option}>{option}</option>)}</select></label>;
    if (field.type === 'unit') return <label key={field.key}><span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}{field.required && ' *'}</span><input required={field.required} list={`order-units-${field.key}`} value={value} onChange={event => updatePurposeField(field.key, event.target.value)} placeholder="Select or enter a unit" className={fieldClass} /><datalist id={`order-units-${field.key}`}>{unitOptions.map(option => <option key={option.value} value={option.value} />)}</datalist></label>;
    return <label key={field.key}><span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}{field.required && ' *'}</span><input required={field.required} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={value} onChange={event => updatePurposeField(field.key, event.target.value)} className={fieldClass} /></label>;
  };
  const editingOrderLocked = !!editingOrder && LOCKED_ORDER_STATUSES.has(status);
  const requiresFullMetadata = true;

  useEffect(() => {
    let active = true;
    if (!selectedOrder) {
      setOrderHistory([]);
      return () => { active = false; };
    }
    fetchOrderStatusHistory(selectedOrder.id)
      .then(history => { if (active) setOrderHistory(history); })
      .catch(() => { if (active) setOrderHistory([]); });
    return () => { active = false; };
  }, [selectedOrder?.id]);

  const personnelNames = useMemo(
    () => new Map(personnelList.map((person) => [person.id, `${person.rank} ${person.fullName}`])),
    [personnelList],
  );

  const filteredPersonnel = useMemo(() => {
    const query = personnelSearch.trim().toLowerCase();
    if (!query) return personnelList;
    return personnelList.filter(person => [
      person.fullName,
      person.firstName,
      person.lastName,
      person.rank,
      person.badgeNo,
      person.sub_unit,
      person.division,
      person.unitCategory
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [personnelList, personnelSearch]);

  const selectedPersonnel = useMemo(
    () => selectedPersonnelIds.map(id => personnelList.find(person => person.id === id)).filter(Boolean),
    [personnelList, selectedPersonnelIds]
  );

  const generatedOrderNumberPreview = issuedDate
    ? `ITMS-${orderSeries}-${purposeCode}-${issuedDate.slice(0, 4)}-####`
    : 'Select an issued date to preview the order number';

  const calendarLeaves = leaveList;

  const resetOrderForm = () => {
    setEditingOrder(null);
    setOrderNumber('');
    setOrderSeries('SO');
    setPurposeCode('DES');
    setSubject('');
    setIssuedDate('');
    setEffectiveDate('');
    setStatus('Draft');
    setSignatory('PBGEN BENJAMIN H ACORDA');
    setSignatoryTitle('Director, ITMS');
    setAffectedPersonnelCount(1);
    setSelectedPersonnelIds([]);
    setPersonnelRoleAssignments({});
    setPersonnelSearch('');
    setDescription('');
    setPurposeData({});
    setOrderError('');
    setOrderMode('default');
    setOrderWizardStep(1);
  };

  const openOrderEdit = (order: OrderRecord) => {
    setSelectedOrder(null);
    setEditingOrder(order);
    setOrderNumber(order.orderNumber || order.orderNo || '');
    setOrderSeries(legacySeriesFromOrder(order));
    setPurposeCode(legacyPurposeFromOrder(order));
    setSubject(order.subject || '');
    setIssuedDate(order.issuedDate || '');
    setEffectiveDate(order.effectiveDate || '');
    setStatus(normalizedOrderStatus(order));
    setSignatory(order.signatory || 'PBGEN BENJAMIN H ACORDA');
    setSignatoryTitle(order.signatoryTitle || 'Director, ITMS');
    setAffectedPersonnelCount(order.affectedPersonnelCount || order.personnelIds?.length || 1);
    setSelectedPersonnelIds(order.personnelIds || []);
    setPersonnelRoleAssignments(Object.fromEntries(
      (order.personnelInvolvement || order.personnelIds?.map((personnelId, index) => ({ personnelId, role: 'affected' as const, sequence: index + 1 })) || [])
        .map(involvement => [involvement.personnelId, involvement.role])
    ));
    setDescription(order.description || '');
    setPurposeData(Object.fromEntries(Object.entries(order.purposeData || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value ?? '')])));
    setOrderMode('default');
    setOrderWizardStep(1);
    setOrderFormOpen(true);
  };

  const toggleOrderPersonnel = (personnelId: string) => {
    setSelectedPersonnelIds(prev => (
      prev.includes(personnelId)
        ? prev.filter(id => id !== personnelId)
        : [...prev, personnelId]
    ));
    setPersonnelRoleAssignments(previous => {
      if (previous[personnelId]) {
        const next = { ...previous };
        delete next[personnelId];
        return next;
      }
      return { ...previous, [personnelId]: defaultPersonnelRole };
    });
  };

  const toggleAllFilteredPersonnel = () => {
    const filteredIds = filteredPersonnel.map(person => person.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedPersonnelIds.includes(id));
    setSelectedPersonnelIds(previous => allSelected
      ? previous.filter(id => !filteredIds.includes(id))
      : Array.from(new Set([...previous, ...filteredIds]))
    );
    setPersonnelRoleAssignments(previous => {
      const next = { ...previous };
      if (allSelected) {
        filteredIds.forEach(id => delete next[id]);
      } else {
        filteredIds.forEach(id => { if (!next[id]) next[id] = defaultPersonnelRole; });
      }
      return next;
    });
  };

  const updateOrderPurpose = (value: string) => {
    const nextPurpose = value as OrderPurposeCode;
    const nextDefinition = getOrderPurposeDefinition(nextPurpose);
    const fallbackRole = nextDefinition?.personnelRoles[0]?.code || 'affected';
    setPurposeCode(nextPurpose);
    setPurposeData(previous => Object.fromEntries(
      (nextDefinition?.fields || []).map(field => [field.key, previous[field.key] || ''])
    ));
    setPersonnelRoleAssignments(previous => Object.fromEntries(
      Object.keys(previous).map(personnelId => {
        const currentRole = previous[personnelId];
        const roleStillAllowed = nextDefinition?.personnelRoles.some(role => role.code === currentRole);
        return [personnelId, roleStillAllowed ? currentRole : fallbackRole];
      })
    ));
  };

  const updatePurposeField = (key: string, value: string) => {
    setPurposeData(previous => ({ ...previous, [key]: value }));
  };

  const validateOrderWizardStep = () => {
    setOrderError('');
    if (orderWizardStep === 1 && (!orderSeries || !purposeCode)) {
      setOrderError('Choose an order series and purpose to continue.');
      return false;
    }
    if (orderWizardStep === 2 && (!subject.trim() || !issuedDate || !effectiveDate)) {
      setOrderError('Subject, issued date, and effective date are required.');
      return false;
    }
    if (orderWizardStep === 3) {
      const missingFields = purposeDefinition?.fields.filter(field => field.required && !String(purposeData[field.key] || '').trim()) || [];
      if (missingFields.length) {
        setOrderError(`Complete the required purpose details: ${missingFields.map(field => field.label).join(', ')}.`);
        return false;
      }
    }
    if (orderWizardStep === 4 && (!signatory.trim() || !signatoryTitle.trim() || (!editingOrder && selectedPersonnelIds.length === 0))) {
      setOrderError('Select at least one personnel record and complete the signatory details.');
      return false;
    }
    return true;
  };

  const submitOrderWizard = (event: FormEvent) => {
    event.preventDefault();
    if (orderWizardStep < 4) {
      if (validateOrderWizardStep()) setOrderWizardStep(previous => previous + 1);
      return;
    }
    void submitOrder(event);
  };

  const rows = useMemo<DashboardRecord[]>(() => {
    const orderRows: DashboardRecord[] = ordersList.map((order) => ({
      kind: 'order',
      id: order.id,
      reference: order.orderNumber || `ORDER-${order.id.slice(-6).toUpperCase()}`,
      recordType: 'Administrative Order',
      subtype: order.purposeCode
        ? `${order.purposeCode} — ${order.purposeLabel || getOrderPurposeLabel(order.purposeCode)}`
        : order.orderType || order.type || 'Administrative Order',
      title: order.subject,
      personnel: order.personnelIds?.length
        ? order.personnelIds.map(id => {
            if (personnelNames.has(id)) return personnelNames.get(id);
            const snapshotEntry = order.personnelSnapshot?.find(s => s.personnelId === id);
            if (snapshotEntry) {
              return `${snapshotEntry.rank || ''} ${snapshotEntry.fullName || ''}`.trim();
            }
            return 'Unknown personnel';
          }).join(', ')
        : (order.personnelSnapshot?.length
            ? order.personnelSnapshot.map(s => `${s.rank || ''} ${s.fullName || ''}`.trim()).join(', ')
            : `${order.affectedPersonnelCount || 1} personnel`),
      date: order.issuedDate || order.effectiveDate || '',
      status: order.documentStatus || order.status || 'Active',
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
      if (row.kind === 'order') searchableValues.push(
        row.source.signatory || '',
        row.source.description || '',
        row.source.orderNumber || row.source.orderNo || '',
        row.source.series || '',
        row.source.purposeCode || '',
        row.source.fileName || '',
        row.source.generatedDocument?.fileName || '',
        row.source.signedDocument?.fileName || '',
        row.source.createdBy || ''
      );
      const matchesSearch = !query || searchableValues
        .some((value) => String(value || '').toLowerCase().includes(query));
      const matchesType = !recordType || row.recordType === recordType;
      const matchesSubtype = !subtypeFilter || row.subtype === subtypeFilter;
      const matchesPersonnel = !personnelFilter
        || (row.kind === 'order' && !!row.source.personnelIds?.includes(personnelFilter))
        || (row.kind === 'leave' && row.source.personnelId === personnelFilter)
        || (row.kind === 'award' && row.source.personnelId === personnelFilter);
      const matchesStatus = !statusFilter || row.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesFrom = !dateFrom || row.date >= dateFrom;
      const matchesTo = !dateTo || row.date <= dateTo;
      if (row.kind !== 'order') return matchesSearch && matchesType && matchesSubtype && matchesPersonnel && matchesStatus && matchesFrom && matchesTo;
      const order = row.source;
      const issued = order.issuedDate || '';
      const effective = order.effectiveDate || '';
      const signed = order.signedAt || '';
      const released = order.releasedAt || '';
      const orderNumber = order.orderNumber || order.orderNo || '';
      const matchesOrderNumber = !orderNumberFilter || orderNumber.toLowerCase().includes(orderNumberFilter.trim().toLowerCase());
      const matchesSeries = !seriesFilter || order.series === seriesFilter;
      const matchesPurpose = !purposeFilter || order.purposeCode === purposeFilter;
      const hasGenerated = hasGeneratedOrderDocument(order);
      const hasSigned = !!order.signedDocument?.storagePath;
      const matchesFile = !fileFilter
        || (fileFilter === 'generated' && hasGenerated)
        || (fileFilter === 'signed' && hasSigned)
        || (fileFilter === 'both' && hasGenerated && hasSigned)
        || (fileFilter === 'missing-signed' && !hasSigned)
        || (fileFilter === 'missing-generated' && !hasGenerated)
        || (fileFilter === 'none' && !hasGenerated && !hasSigned);
      const matchesCreatedBy = !createdByFilter || order.createdBy === createdByFilter;
      const matchesEffectiveFrom = !effectiveDateFrom || effective >= effectiveDateFrom;
      const matchesEffectiveTo = !effectiveDateTo || effective <= effectiveDateTo;
      const matchesSignedFrom = !signedDateFrom || signed.slice(0, 10) >= signedDateFrom;
      const matchesSignedTo = !signedDateTo || signed.slice(0, 10) <= signedDateTo;
      const matchesReleasedFrom = !releasedDateFrom || released.slice(0, 10) >= releasedDateFrom;
      const matchesReleasedTo = !releasedDateTo || released.slice(0, 10) <= releasedDateTo;
      return matchesSearch && matchesType && matchesSubtype && matchesPersonnel && matchesStatus && matchesFrom && matchesTo
        && matchesOrderNumber && matchesSeries && matchesPurpose && matchesFile && matchesCreatedBy
        && matchesEffectiveFrom && matchesEffectiveTo && matchesSignedFrom && matchesSignedTo && matchesReleasedFrom && matchesReleasedTo;
    });
  }, [rows, search, recordType, subtypeFilter, personnelFilter, statusFilter, orderNumberFilter, seriesFilter, purposeFilter, fileFilter, createdByFilter, dateFrom, dateTo, effectiveDateFrom, effectiveDateTo, signedDateFrom, signedDateTo, releasedDateFrom, releasedDateTo]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredRows.length / orderPageSize));
  const paginatedOrderRows = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return filteredRows.slice(start, start + orderPageSize);
  }, [filteredRows, orderPage, orderPageSize]);

  const resetFilters = () => {
    setSearch('');
    setRecordType('');
    setSubtypeFilter('');
    setPersonnelFilter('');
    setStatusFilter('');
    setOrderNumberFilter('');
    setSeriesFilter('');
    setPurposeFilter('');
    setFileFilter('');
    setCreatedByFilter('');
    setDateFrom('');
    setDateTo('');
    setEffectiveDateFrom('');
    setEffectiveDateTo('');
    setSignedDateFrom('');
    setSignedDateTo('');
    setReleasedDateFrom('');
    setReleasedDateTo('');
    setOrderPage(1);
  };

  const openRecord = (row: DashboardRecord) => {
    if (row.kind === 'order') setSelectedOrder(row.source);
    if (row.kind === 'award') setSelectedAward(row.source);
    if (row.kind === 'leave') setSelectedLeave(row.source);
  };

  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (editingOrderLocked) {
      setOrderError('Signed, released, archived, and revoked orders are locked. Use the workflow actions to change status.');
      return;
    }
    const requiresFullMetadata = true;
    const fallbackIssuedDate = new Date().toISOString().slice(0, 10);
    const savedIssuedDate = issuedDate || fallbackIssuedDate;
    const savedEffectiveDate = effectiveDate || savedIssuedDate;
    const savedSubject = subject.trim() || `${getOrderPurposeLabel(purposeCode)} order`;
    const missingPersonnelIds = selectedPersonnelIds.filter(id => !personnelNames.has(id));
    if (requiresFullMetadata && (!subject.trim() || !issuedDate || !effectiveDate || !signatory.trim() || !signatoryTitle.trim())) {
      setOrderError('Complete all required administrative order fields.');
      return;
    }
    if (missingPersonnelIds.length) {
      setOrderError(`Remove ${missingPersonnelIds.length} personnel reference${missingPersonnelIds.length === 1 ? '' : 's'} that no longer exist.`);
      return;
    }
    if (requiresFullMetadata && !editingOrder && selectedPersonnelIds.length === 0) {
      setOrderError('Select at least one personnel record for a new administrative order.');
      return;
    }
    const personnelInvolvement = selectedPersonnelIds.map((personnelId, index) => ({
      personnelId,
      role: personnelRoleAssignments[personnelId] || defaultPersonnelRole,
      sequence: index + 1
    }));
    const requiredPersonnelRoles = purposeDefinition?.personnelRoles.filter(role => role.required) || [];
    const missingPersonnelRoles = requiredPersonnelRoles.filter(role => !personnelInvolvement.some(entry => entry.role === role.code));
    if (selectedPersonnelIds.length && missingPersonnelRoles.length) {
      setOrderError(`Select personnel for: ${missingPersonnelRoles.map(role => role.label).join(', ')}.`);
      return;
    }
    if (savedEffectiveDate && savedIssuedDate && savedEffectiveDate < savedIssuedDate) {
      setOrderError('The effective date cannot be earlier than the issued date.');
      return;
    }
    setSavingOrder(true);
    setOrderError('');
    try {
      const payload: OrderRecord = {
        id: editingOrder?.id || crypto.randomUUID(),
        personnelIds: selectedPersonnelIds,
        ...(personnelInvolvement.length ? { personnelInvolvement } : {}),
        ...(editingOrder?.orderNumber ? { orderNumber: editingOrder.orderNumber } : {}),
        series: orderSeries,
        purposeCode,
        purposeLabel: getOrderPurposeLabel(purposeCode),
        orderType: `${orderSeries} — ${getOrderPurposeLabel(purposeCode)}`,
        subject: savedSubject,
        issuedDate: savedIssuedDate,
        effectiveDate: savedEffectiveDate,
        signatory: signatory.trim(),
        signatoryTitle: signatoryTitle.trim(),
        affectedPersonnelCount: selectedPersonnelIds.length || affectedPersonnelCount,
        description: description.trim(),
        purposeData,
        status,
        documentStatus: status,
      };
      const savedOrder = editingOrder ? await updateOrder(payload) : await addOrder(payload);
      if (!backendConnected) {
        setSelectedOrder(savedOrder);
        setOrderFormOpen(false);
        resetOrderForm();
        setToast({
          type: 'success',
          message: editingOrder
            ? 'Administrative order updated for this session. Reconnect to persist it and generate the unsigned document.'
            : 'Administrative order saved for this session. Reconnect to persist it and generate the unsigned document.'
        });
        return;
      }

      let generatedOrder: OrderRecord;
      try {
        generatedOrder = await generateOrderDocument(savedOrder.id);
      } catch (error) {
        setSelectedOrder(savedOrder);
        setOrderFormOpen(false);
        resetOrderForm();
        setToast({
          type: 'error',
          message: `Administrative order ${editingOrder ? 'updated' : 'saved'}, but document generation failed. You can retry from the order details. ${error instanceof Error ? error.message : ''}`.trim()
        });
        return;
      }

      setSelectedOrder(generatedOrder);
      setOrderFormOpen(false);
      resetOrderForm();
      setToast({ type: 'success', message: editingOrder ? 'Administrative order updated and document regenerated.' : 'Administrative order saved and document generated.' });
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Unable to save the order.');
    } finally {
      setSavingOrder(false);
    }
  };

  const openOrderDocument = async (order: OrderRecord, download = false) => {
    try {
      const link = hasGeneratedOrderDocument(order) ? await getGeneratedOrderDocument(order.id, download) : await getOrderDocument(order.id, download);
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to open the order document.' });
    }
  };

  const viewOrderDocument = async (order: OrderRecord) => {
    setLoadingDocumentPreview(true);
    try {
      const preview = hasGeneratedOrderDocument(order) ? await previewGeneratedOrderDocument(order.id) : await previewOrderDocument(order.id);
      setDocumentPreview({ order, html: DOMPurify.sanitize(preview.html) });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to preview the order document.' });
    } finally {
      setLoadingDocumentPreview(false);
    }
  };

  const removeOrderDocument = async (order: OrderRecord) => {
    try {
      const updated = await deleteOrderDocument(order.id);
      setSelectedOrder(updated);
      setToast({ type: 'success', message: 'Order document removed.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to remove the order document.' });
    }
  };

  const replaceOrderDocument = async (file?: File) => {
    if (!selectedOrder || !file) return;
    if (!canEdit || LOCKED_ORDER_STATUSES.has(selectedOrderStatus || '')) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setToast({ type: 'error', message: 'Only Microsoft Word .docx files are accepted.' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setToast({ type: 'error', message: 'The DOCX file must be 25 MB or smaller.' });
      return;
    }
    if (!window.confirm(`Replace the current document with “${file.name}”?`)) return;
    setUploadingOrderFile(true);
    try {
      const updated = await uploadOrderDocument(selectedOrder.id, file);
      setSelectedOrder(updated);
      setToast({ type: 'success', message: 'Order document replaced successfully.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to replace the order document.' });
    } finally {
      setUploadingOrderFile(false);
    }
  };

  const openSignedOrderDocument = async (order: OrderRecord, download = false) => {
    try {
      const link = await getSignedOrderDocument(order.id, download);
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to open the signed order scan.' });
    }
  };

  const regenerateSelectedOrderDocument = async (order: OrderRecord) => {
    if (!canEdit || LOCKED_ORDER_STATUSES.has(normalizedOrderStatus(order))) return;
    setRegeneratingDocument(true);
    try {
      const updated = await generateOrderDocument(order.id);
      setSelectedOrder(updated);
      setToast({ type: 'success', message: 'Generated order document regenerated successfully.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to regenerate the order document.' });
    } finally {
      setRegeneratingDocument(false);
    }
  };

  const replaceSignedOrderDocument = async (file?: File) => {
    if (!selectedOrder || !file) return;
    if (!canEdit || LOCKED_ORDER_STATUSES.has(selectedOrderStatus || '')) return;
    const accepted = ['image/jpeg', 'image/png', 'image/webp'];
    if (!accepted.includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setToast({ type: 'error', message: 'Signed order scans must be JPEG, PNG, or WEBP images.' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setToast({ type: 'error', message: 'The signed order scan must be 25 MB or smaller.' });
      return;
    }
    setUploadingSignedDocument(true);
    try {
      const updated = await uploadSignedOrderDocument(selectedOrder.id, file);
      setSelectedOrder(updated);
      setToast({ type: 'success', message: updated.signedDocument?.version && updated.signedDocument.version > 1 ? 'Signed order scan replaced successfully.' : 'Signed order scan uploaded successfully.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to upload the signed order scan.' });
    } finally {
      setUploadingSignedDocument(false);
    }
  };

  const removeSignedOrderDocument = async (order: OrderRecord) => {
    try {
      const updated = await deleteSignedOrderDocument(order.id);
      setSelectedOrder(updated);
      setToast({ type: 'success', message: 'Signed order scan removed.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to remove the signed order scan.' });
    }
  };

  const transitionSelectedOrder = async (nextStatus: OrderDocumentStatus) => {
    if (!selectedOrder) return;
    if (nextStatus === 'Revoked') {
      setRevokeReason('');
      setRevokeDialogOpen(true);
      return;
    }
    try {
      const updated = await transitionOrderStatus(selectedOrder.id, nextStatus);
      setSelectedOrder(updated);
      setToast({ type: 'success', message: `Order moved to ${nextStatus}.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to change order status.' });
    }
  };

  const confirmRevokeOrder = async () => {
    if (!selectedOrder) return;
    setSubmittingRevoke(true);
    try {
      const updated = await transitionOrderStatus(selectedOrder.id, 'Revoked', revokeReason.trim());
      setSelectedOrder(updated);
      setRevokeDialogOpen(false);
      setRevokeReason('');
      setToast({ type: 'success', message: 'Order revoked successfully.' });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to revoke the order.' });
    } finally {
      setSubmittingRevoke(false);
    }
  };

  const openRestoreOrder = () => {
    if (!selectedOrder || selectedOrderStatus !== 'Revoked') return;
    setRestoreReason('');
    setRestoreDialogOpen(true);
  };

  const confirmRestoreOrder = async () => {
    if (!selectedOrder) return;
    setSubmittingRestore(true);
    try {
      const updated = await restoreOrderStatus(selectedOrder.id, restoreReason.trim());
      setSelectedOrder(updated);
      const history = await fetchOrderStatusHistory(updated.id).catch(() => orderHistory);
      setOrderHistory(history);
      setRestoreDialogOpen(false);
      setRestoreReason('');
      setToast({ type: 'success', message: `Order restored to ${normalizedOrderStatus(updated)}.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to restore the order.' });
    } finally {
      setSubmittingRestore(false);
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
    setDeleteTarget({ kind, id, label });
  };

  const confirmDeleteRecord = async () => {
    if (!deleteTarget) return;
    setSubmittingDelete(true);
    try {
      if (deleteTarget.kind === 'order') await deleteOrder(deleteTarget.id);
      if (deleteTarget.kind === 'award') await deleteAward(deleteTarget.id);
      if (deleteTarget.kind === 'leave') await deleteCalendarLeave(deleteTarget.id);
      setSelectedOrder(null);
      setSelectedAward(null);
      setSelectedLeave(null);
      setDeleteTarget(null);
      setToast({ type: 'success', message: `${deleteTarget.label} deleted successfully.` });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : `Unable to delete ${deleteTarget.label}.` });
    } finally {
      setSubmittingDelete(false);
    }
  };

  const stats = [
    { label: 'All records', value: rows.length, icon: ClipboardList },
    { label: 'Administrative orders', value: ordersList.length, icon: FileText },
    { label: 'Generated orders', value: ordersList.filter(hasGeneratedOrderDocument).length, icon: FileText },
    { label: 'Signed scans', value: ordersList.filter(order => !!order.signedDocument?.storagePath).length, icon: Upload },
    { label: 'Missing signed scan', value: ordersList.filter(order => !order.signedDocument?.storagePath && !['Archived', 'Revoked'].includes(normalizedOrderStatus(order))).length, icon: Upload },
    { label: 'Awards', value: awardsList.length, icon: Award },
    { label: 'Scheduled leaves', value: calendarLeaves.length, icon: CalendarDays },
  ];
  const activeFilterCount = [
    search, recordType, subtypeFilter, personnelFilter, statusFilter,
    orderNumberFilter, seriesFilter, purposeFilter, fileFilter, createdByFilter,
    dateFrom, dateTo, effectiveDateFrom, effectiveDateTo, signedDateFrom,
    signedDateTo, releasedDateFrom, releasedDateTo
  ].filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Orders, awards & leave"
        title={activeView === 'list' ? 'Administrative Records Register' : activeView === 'calendar' ? 'Leave Calendar' : 'Document Templates'}
        description={activeView === 'list'
              ? 'Search and review administrative orders, awards, and scheduled leaves in one place.'
              : activeView === 'calendar'
                ? 'A visual overview of approved leave schedules. Leave dates are encoded through the separate form.'
                : 'Open fixed-format templates, edit allowed fields, and autofill personnel details from system records.'}
        reference="ORD-AWD-LVE"
        actions={<div className="flex flex-wrap gap-2">
          {activeView === 'calendar' ? (
            <>
              <button type="button" onClick={() => setActiveView('list')} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Back to All Orders
              </button>
              {canEdit && (
                <button type="button" onClick={() => { setEditingLeave(null); setLeaveFormOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
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
                  <button type="button" onClick={() => setAdminOrderModeSelectorOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <FilePlus2 size={17} /> Administrative Order
                  </button>
                  <button type="button" onClick={() => setSelectorOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
                    <Plus size={17} /> Select Order Type
                  </button>
                </>
              )}
            </>
          )}
        </div>}
      />

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
          <OperationalSummary label="Administrative record summary" items={stats.map(({ label, value, icon }) => ({ label, value, icon, detail: 'records' }))} />

          <section className="record-section">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <Filter size={18} className="text-blue-800" />
              <h2 className="font-bold text-slate-900">Search and filters</h2>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
              <label className="xl:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Search records</span>
                <div className="relative">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, title, personnel..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                </div>
              </label>
              <SearchableSelect label="Record type" value={recordType} onChange={setRecordType} placeholder="All record types" options={['Administrative Order', 'Award', 'Leave Calendar'].map((value) => ({ value, label: value }))} />
              <SearchableSelect
                label="Order / leave type"
                value={subtypeFilter}
                onChange={setSubtypeFilter}
                placeholder="All types"
                options={Array.from(new Set([
                  ...ORDER_PURPOSE_OPTIONS.map(option => `${option.value} — ${option.label.replace(`${option.value} — `, '')}`),
                  ...rows.map(row => row.subtype)
                ])).sort().map((value) => ({ value, label: value }))}
              />
              <SearchableSelect label="Personnel" value={personnelFilter} onChange={setPersonnelFilter} placeholder="All personnel" options={personnelList.map((person) => ({ value: person.id, label: `${person.rank} ${person.fullName}`, description: person.badgeNo || person.division }))} />
              <SearchableSelect label="Status" value={statusFilter} onChange={setStatusFilter} placeholder="All statuses" options={ORDER_STATUSES.map((value) => ({ value, label: value }))} />
              <div className="flex items-end">
                <button type="button" onClick={resetFilters} disabled={activeFilterCount === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <RotateCcw size={16} /> Reset{activeFilterCount > 0 && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px]">{activeFilterCount}</span>}
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
            {(recordType === '' || recordType === 'Administrative Order') && (
              <details className="border-t border-slate-200 bg-slate-50/70 px-5 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-slate-500 marker:hidden"><span>Administrative order filters <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">(optional)</span></span>{activeFilterCount > 0 && <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">{activeFilterCount} active</span>}</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Order number</span>
                    <input value={orderNumberFilter} onChange={event => setOrderNumberFilter(event.target.value)} placeholder="ITMS-SO-DES-2026-0001" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-mono outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                  </label>
                  <SearchableSelect label="Series" value={seriesFilter} onChange={setSeriesFilter} placeholder="All series" options={ORDER_SERIES_OPTIONS.map(option => ({ value: option.value, label: option.label }))} />
                  <SearchableSelect label="Purpose code" value={purposeFilter} onChange={setPurposeFilter} placeholder="All purposes" options={ORDER_PURPOSE_OPTIONS.map(option => ({ value: option.value, label: option.label }))} />
                  <SearchableSelect label="Document availability" value={fileFilter} onChange={setFileFilter} placeholder="All document states" options={[
                    { value: 'generated', label: 'Has generated order' },
                    { value: 'signed', label: 'Has signed scan' },
                    { value: 'both', label: 'Has generated order and signed scan' },
                    { value: 'missing-signed', label: 'Missing signed scan' },
                    { value: 'missing-generated', label: 'Missing generated order' },
                    { value: 'none', label: 'Missing both documents' }
                  ]} />
                  <SearchableSelect label="Created by" value={createdByFilter} onChange={setCreatedByFilter} placeholder="All creators" options={Array.from(new Set(ordersList.map(order => order.createdBy).filter(Boolean) as string[])).sort().map(value => ({ value, label: value }))} />
                  <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Effective from</span><input type="date" value={effectiveDateFrom} onChange={event => setEffectiveDateFrom(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
                  <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Effective to</span><input type="date" value={effectiveDateTo} onChange={event => setEffectiveDateTo(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
                  <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Signed from</span><input type="date" value={signedDateFrom} onChange={event => setSignedDateFrom(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
                  <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Signed to</span><input type="date" value={signedDateTo} onChange={event => setSignedDateTo(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
                  <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Released from</span><input type="date" value={releasedDateFrom} onChange={event => setReleasedDateFrom(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
                  <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Released to</span><input type="date" value={releasedDateTo} onChange={event => setReleasedDateTo(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
                </div>
              </details>
            )}
          </section>

          <section className="record-section">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Order records</h2>
                <p className="text-sm text-slate-500">{filteredRows.length} of {rows.length} records</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="record-table min-w-[980px]">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Order details</th>
                    <th className="px-5 py-3">Personnel</th>
                    <th className="px-5 py-3">Dates</th>
                    <th className="px-5 py-3">Documents</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrderRows.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className="transition hover:bg-blue-50/40">
                      <td className="px-5 py-4 align-top">
                        <p className="font-mono text-sm font-bold tracking-tight text-blue-800" title={row.reference}>
                          {row.kind === 'order' ? formatOrderReference(row.reference) : row.reference}
                        </p>
                        {row.kind === 'order' && <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.source.series || 'Order'}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold leading-5 text-slate-900">{row.title}</p>
                        <p className="mt-1 text-xs leading-4 text-slate-500">{row.kind === 'order' ? row.subtype : `${row.recordType} · ${row.subtype}`}</p>
                      </td>
                      <td className="max-w-[220px] px-5 py-4 align-top text-sm text-slate-700">
                        <p className="line-clamp-2 leading-5">{row.personnel.split(',')[0]}</p>
                        {row.kind === 'order' && (row.source.personnelIds?.length || row.source.affectedPersonnelCount || 1) > 1 && (
                          <p className="mt-1 text-xs font-semibold text-blue-700">+ {(row.source.personnelIds?.length || row.source.affectedPersonnelCount || 1) - 1} more</p>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-sm text-slate-700">
                        {row.kind === 'leave' ? formatDateRange(row.source.startDate, row.source.endDate) : row.kind === 'order' ? (
                          <div className="space-y-1.5 whitespace-nowrap"><p><span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Issued</span>{formatDate(row.source.issuedDate)}</p><p className="text-xs text-slate-500"><span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Effective</span>{formatDate(row.source.effectiveDate)}</p></div>
                        ) : formatDate(row.date)}
                      </td>
                      <td className="px-5 py-4 align-top text-xs text-slate-600">
                        {row.kind === 'order' ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1.5">
                              {hasGeneratedOrderDocument(row.source) && <span className="rounded-full bg-teal-50 px-2 py-1 font-semibold text-teal-700">Generated</span>}
                              {row.source.fileName && <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">Legacy DOCX</span>}
                              {row.source.signedDocument?.storagePath && <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">Signed scan</span>}
                              {!hasGeneratedOrderDocument(row.source) && !row.source.fileName && <span className="text-slate-400">No generated order</span>}
                            </div>
                            {!row.source.signedDocument?.storagePath && <p className="font-medium text-amber-700">Missing signed scan</p>}
                            {row.source.signedAt && <p>Signed: {formatDate(row.source.signedAt)}</p>}{row.source.releasedAt && <p>Released: {formatDate(row.source.releasedAt)}</p>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-4 align-top"><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{row.status}</span></td>
                      <td className="px-5 py-4 text-right align-top">
                        <button type="button" onClick={() => openRecord(row)} aria-label={`View ${row.reference}`} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-semibold text-blue-800 shadow-sm hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                          <Eye size={15} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!paginatedOrderRows.length && (
                    <tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-500">No records match the selected filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-semibold">
              <div>
                Showing <span className="font-bold text-slate-900">{filteredRows.length ? (orderPage - 1) * orderPageSize + 1 : 0}</span> to <span className="font-bold text-slate-900">{Math.min(orderPage * orderPageSize, filteredRows.length)}</span> of <span className="font-bold text-slate-900">{filteredRows.length}</span> records
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>Per page:</span>
                  <select
                    value={orderPageSize}
                    onChange={(e) => { setOrderPageSize(Number(e.target.value)); setOrderPage(1); }}
                    className="px-2 py-1 text-xs bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={orderPage <= 1}
                    onClick={() => setOrderPage(prev => Math.max(prev - 1, 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-bold text-slate-800">Page {orderPage} of {totalOrderPages}</span>
                  <button
                    type="button"
                    disabled={orderPage >= totalOrderPages}
                    onClick={() => setOrderPage(prev => Math.min(prev + 1, totalOrderPages))}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
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

      <AdministrativeOrderModeModal
        isOpen={adminOrderModeSelectorOpen}
        onClose={() => setAdminOrderModeSelectorOpen(false)}
        onSelect={(mode) => {
          resetOrderForm();
          setOrderMode(mode);
          setOrderWizardStep(1);
          setAdminOrderModeSelectorOpen(false);
          setOrderFormOpen(true);
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
        <ModalShell title={editingOrder ? 'Edit Administrative Order' : 'New Administrative Order'} eyebrow="All Orders" onClose={() => { setOrderFormOpen(false); resetOrderForm(); }} maxWidth="max-w-5xl">
          <form onSubmit={submitOrderWizard} className="space-y-5 p-5 sm:p-6">
            {orderError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{orderError}</div>}
            {editingOrderLocked && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This order is <strong>{status}</strong> and is read-only. Status changes must use the workflow actions from the order details.</div>}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Step {orderWizardStep} of 4</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{orderWizardStep === 1 ? 'Choose series and purpose' : orderWizardStep === 2 ? 'Complete common order details' : orderWizardStep === 3 ? 'Enter purpose-specific details' : 'Add personnel and review'}</p>
                </div>
                {!editingOrder && <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{backendConnected ? 'Generated order' : 'Session-only save'}</span>}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {['Classification', 'Order details', 'Purpose details', 'People & review'].map((label, index) => <div key={label} className={`h-1.5 rounded-full ${index + 1 <= orderWizardStep ? 'bg-teal-600' : 'bg-slate-200'}`} title={label} />)}
              </div>
            </div>
            <fieldset disabled={editingOrderLocked} className="grid gap-4 md:grid-cols-2 disabled:opacity-75">
              {orderWizardStep === 1 && <>
              <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">Create an unsigned order document from the selected series, purpose, personnel, and order details.</p>
                <p className="mt-1 text-xs text-blue-700">The official order number is allocated when you save. {backendConnected ? 'The DOCX is generated automatically after the order record is created.' : 'The order can be reviewed in this session, but persistence and DOCX generation require a backend connection.'}</p>
              </div>
              <label>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Order number</span>
                <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 font-mono text-sm font-bold text-slate-800">
                  {editingOrder ? orderNumber || 'Legacy number unavailable' : generatedOrderNumberPreview}
                </div>
                <span className="mt-1 block text-xs text-slate-500">Generated automatically when the new order is saved.</span>
              </label>
              <SearchableSelect label="Order series *" value={orderSeries} disabled={!!editingOrder} onChange={(value: string) => setOrderSeries(value as OrderSeries)} options={ORDER_SERIES_OPTIONS.map(option => ({ value: option.value, label: option.label }))} />
              <SearchableSelect label="Order purpose *" value={purposeCode} disabled={!!editingOrder} onChange={updateOrderPurpose} options={ORDER_PURPOSE_OPTIONS.map(option => ({ value: option.value, label: option.label }))} />
              </>}
              {orderWizardStep === 2 && <>
              {requiresFullMetadata ? <>
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Subject {requiresFullMetadata && '*'}</span><textarea required={requiresFullMetadata} value={subject} onChange={(e) => setSubject(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">Designation Date / Date Order Issued {requiresFullMetadata && '*'}</span>
                <span className="mb-1.5 block text-xs text-slate-500">Displayed in upper-right header of Order</span>
                <input required={requiresFullMetadata} disabled={!!editingOrder} type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium text-slate-700">Effective Date of Designation {requiresFullMetadata && '*'}</span>
                <span className="mb-1.5 block text-xs text-slate-500">Displayed in body of Order (effectivity start)</span>
                <input required={requiresFullMetadata} type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
              </> : <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Minimal upload registration</p><p className="mt-1 text-xs text-emerald-700">Subject and dates will be derived automatically from the DOCX filename and the current date. You can add optional context in the next step.</p></div>}
              <label>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Workflow status</span>
                <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-800">{status}</div>
                <span className="mt-1 block text-xs text-slate-500">Controlled from the order details workflow.</span>
              </label>
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Affected personnel count</span><div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-800">{selectedPersonnelIds.length || affectedPersonnelCount}</div><span className="mt-1 block text-xs text-slate-500">Automatically derived from selected personnel.</span></label>
              </>}
              {orderWizardStep === 3 && <>
              <div className="md:col-span-2 rounded-xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-sm font-semibold text-teal-950">{purposeDefinition?.label || 'Purpose details'}</p>
                <p className="mt-1 text-xs text-teal-800">These fields become part of the generated order and are validated for the selected purpose.</p>
              </div>
              {(purposeDefinition?.fields || []).map(renderPurposeField)}
              </>}
              {orderWizardStep === 4 && <>
              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">Personnel involved</span>
                  <span className="text-xs font-semibold text-slate-500">{selectedPersonnelIds.length} selected</span>
                </div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={personnelSearch} onChange={event => setPersonnelSearch(event.target.value)} placeholder="Search name, rank, badge, or unit..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                  </div>
                  <button type="button" onClick={toggleAllFilteredPersonnel} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    {filteredPersonnel.length > 0 && filteredPersonnel.every(person => selectedPersonnelIds.includes(person.id)) ? 'Clear visible' : 'Select visible'}
                  </button>
                  <button type="button" onClick={() => { setSelectedPersonnelIds([]); setPersonnelRoleAssignments({}); }} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Clear all</button>
                </div>
                {selectedPersonnel.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5 rounded-xl border border-blue-100 bg-blue-50 p-2">
                    {selectedPersonnel.map(person => person && <span key={person.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">{person.rank} {person.lastName}<button type="button" onClick={() => toggleOrderPersonnel(person.id)} aria-label={`Remove ${person.fullName}`} className="font-bold text-blue-500 hover:text-blue-800">×</button></span>)}
                  </div>
                )}
                {selectedPersonnel.length > 0 && (
                  <div className="mb-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Personnel roles</p>
                      <p className="mt-1 text-xs text-slate-500">Assign each selected person a role for this {purposeDefinition?.label || 'order'}.</p>
                    </div>
                    {selectedPersonnel.map(person => {
                      if (!person) return null;
                      const roleOptions = purposeDefinition?.personnelRoles || [{ code: 'affected' as const, label: 'Personnel involved', multiple: true, required: true }];
                      return (
                        <div key={`role-${person.id}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="min-w-0 truncate text-xs font-semibold text-slate-800">{person.rank} {person.fullName}</span>
                          <select value={personnelRoleAssignments[person.id] || defaultPersonnelRole} onChange={event => setPersonnelRoleAssignments(previous => ({ ...previous, [person.id]: event.target.value as OrderPersonnelRoleCode }))} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:w-64">
                            {roleOptions.map(role => <option key={role.code} value={role.code}>{role.label}{role.required ? ' *' : ''}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-300 bg-slate-50 p-2">
                  {filteredPersonnel.map((person) => (
                    <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white">
                      <input
                        type="checkbox"
                        checked={selectedPersonnelIds.includes(person.id)}
                        onChange={() => toggleOrderPersonnel(person.id)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      />
                      <span className="font-semibold text-slate-900">{person.rank} {person.fullName}</span>
                      <span className="text-xs text-slate-500">{person.badgeNo} - {person.sub_unit || person.division || person.unitCategory || 'Unit not recorded'}</span>
                    </label>
                  ))}
                  {!filteredPersonnel.length && <p className="px-3 py-6 text-center text-sm text-slate-500">No personnel records match this search.</p>}
                </div>
              </div>
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Signatory {requiresFullMetadata && '*'}</span><input required={requiresFullMetadata} value={signatory} onChange={(e) => setSignatory(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              <label><span className="mb-1.5 block text-sm font-medium text-slate-700">Signatory title {requiresFullMetadata && '*'}</span><input required={requiresFullMetadata} value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              {editingOrder?.fileName && <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                This record contains a legacy DOCX attachment. It remains available from the order details view; new changes use the generated order document workflow.
              </div>}
              <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700">Directives and particulars</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
              </>}
            </fieldset>
            <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {orderWizardStep > 1 && <button type="button" onClick={() => { setOrderError(''); setOrderWizardStep(previous => previous - 1); }} disabled={savingOrder} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto">Back</button>}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={() => { setOrderFormOpen(false); resetOrderForm(); }} disabled={savingOrder} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              {!editingOrderLocked && <button type="submit" disabled={savingOrder} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{savingOrder ? (backendConnected ? 'Saving and generating...' : 'Saving locally...') : orderWizardStep < 4 ? 'Continue' : backendConnected ? editingOrder ? 'Update and regenerate' : 'Save and generate' : editingOrder ? 'Update locally' : 'Save locally'}</button>}
              </div>
            </div>
          </form>
        </ModalShell>
      )}

      {selectedOrder && (
        <ModalShell title={selectedOrder.orderNumber || selectedOrder.orderNo || 'Administrative Order'} eyebrow="Administrative Order" onClose={() => setSelectedOrder(null)}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Detail label="Order classification" value={selectedOrder.purposeCode ? `${selectedOrder.series || 'SO'} — ${selectedOrder.purposeCode} — ${selectedOrder.purposeLabel || getOrderPurposeLabel(selectedOrder.purposeCode)}` : selectedOrder.orderType || selectedOrder.type || 'Administrative Order'} />
            <Detail label="Status" value={selectedOrderStatus || 'Draft'} />
            <Detail label="Designation Date / Issued Date (Upper-Right Header)" value={formatDate(selectedOrder.issuedDate)} />
            <Detail label="Effective Date of Designation (Order Body)" value={formatDate(selectedOrder.effectiveDate)} />
            <div className="sm:col-span-2"><Detail label="Subject" value={selectedOrder.subject} /></div>
            <Detail label="Affected personnel" value={selectedOrder.personnelIds?.length ? selectedOrder.personnelIds.map(id => personnelNames.get(id) || 'Unknown personnel').join('\n') : String(selectedOrder.affectedPersonnelCount || 1)} />
            <Detail label="Signatory" value={[selectedOrder.signatory, selectedOrder.signatoryTitle].filter(Boolean).join(' - ')} />
            {selectedOrder.description && <div className="sm:col-span-2"><Detail label="Directives and particulars" value={selectedOrder.description} /></div>}
            <div className="sm:col-span-2 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-teal-950"><FileText size={16} /> Generated unsigned order</p>
                <p className="mt-1 text-xs text-teal-800">System-generated DOCX prepared for printing and wet signature.</p>
                {hasGeneratedOrderDocument(selectedOrder) ? <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => viewOrderDocument(selectedOrder)} disabled={loadingDocumentPreview} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"><Eye size={15} /> {loadingDocumentPreview ? 'Loading...' : 'View'}</button>
                  <button type="button" onClick={() => openOrderDocument(selectedOrder, true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"><Download size={15} /> Download</button>
                  {canEdit && !LOCKED_ORDER_STATUSES.has(selectedOrderStatus || '') && <button type="button" onClick={() => void regenerateSelectedOrderDocument(selectedOrder)} disabled={regeneratingDocument} className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"><RefreshCw size={15} className={regeneratingDocument ? 'animate-spin' : ''} /> {regeneratingDocument ? 'Regenerating...' : 'Regenerate document'}</button>}
                </div> : <div className="mt-3 rounded-lg border border-dashed border-teal-300 bg-white p-3 text-xs text-teal-800">
                  <p>No generated document is available.</p>
                  {canEdit && backendConnected && !LOCKED_ORDER_STATUSES.has(selectedOrderStatus || '') && <button type="button" onClick={() => void regenerateSelectedOrderDocument(selectedOrder)} disabled={regeneratingDocument} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"><RefreshCw size={15} className={regeneratingDocument ? 'animate-spin' : ''} /> {regeneratingDocument ? 'Generating...' : 'Generate document'}</button>}
                </div>}
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-blue-950"><Upload size={16} /> Signed order scan</p>
                <p className="mt-1 text-xs text-blue-800">Scanned image of the physically wet-signed order. JPEG, PNG, or WEBP.</p>
                {selectedOrder.signedDocument ? <>
                  <p className="mt-3 truncate text-xs font-semibold text-slate-800" title={selectedOrder.signedDocument.fileName}>{selectedOrder.signedDocument.fileName} · v{selectedOrder.signedDocument.version}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => openSignedOrderDocument(selectedOrder)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Eye size={15} /> View</button>
                    <button type="button" onClick={() => openSignedOrderDocument(selectedOrder, true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Download size={15} /> Download</button>
                    {canEdit && !LOCKED_ORDER_STATUSES.has(selectedOrderStatus || '') && <label className={`col-span-2 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 ${uploadingSignedDocument ? 'pointer-events-none opacity-60' : ''}`}><Upload size={15} /> {uploadingSignedDocument ? 'Replacing...' : 'Replace scan'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingSignedDocument} onChange={event => { void replaceSignedOrderDocument(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>}
                    {canEdit && !LOCKED_ORDER_STATUSES.has(selectedOrderStatus || '') && <button type="button" onClick={() => void removeSignedOrderDocument(selectedOrder)} className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={15} /> Remove scan</button>}
                  </div>
                </> : <div className="mt-3 rounded-lg border border-dashed border-blue-300 bg-white p-3"><p className="text-xs text-blue-800">No signed scan uploaded. A scan is required before marking this order Signed.</p>{canEdit && !LOCKED_ORDER_STATUSES.has(selectedOrderStatus || '') && <label className={`mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 ${uploadingSignedDocument ? 'pointer-events-none opacity-60' : ''}`}><Upload size={15} /> {uploadingSignedDocument ? 'Uploading...' : 'Upload signed scan'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingSignedDocument} onChange={event => { void replaceSignedOrderDocument(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>}</div>}
              </div>
            </div>
            {selectedOrder.fileName && <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText size={16} className="text-slate-500" /> Source document</p>
                  <p className="mt-1 text-xs text-slate-500">View, download, or replace the attached Word file.</p>
                </div>
                {selectedOrder.fileName && <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">DOCX attached</span>}
              </div>
              {selectedOrder.fileName ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-center">
                  <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="truncate text-sm font-semibold text-slate-800" title={selectedOrder.fileName}>{selectedOrder.fileName}</p>
                    <p className="mt-1 text-xs text-slate-500">Version {selectedOrder.documentVersion || 1} · {selectedOrder.fileSize ? `${(selectedOrder.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Size unavailable'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <button type="button" onClick={() => viewOrderDocument(selectedOrder)} disabled={loadingDocumentPreview} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"><Eye size={15} /> {loadingDocumentPreview ? 'Loading...' : 'View'}</button>
                    <button type="button" onClick={() => openOrderDocument(selectedOrder, true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"><Download size={15} /> Download</button>
                    <span className="col-span-2 text-[11px] text-slate-500">Legacy DOCX is read-only. Use the generated order and signed scan sections for current document actions.</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">No DOCX document uploaded yet.</p>
                  <p className="text-xs text-slate-500">No generated order is recorded for this legacy document.</p>
                </div>
              )}
            </div>}
            <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Workflow history</p>
                  <p className="text-xs text-slate-500">Every controlled status change is recorded with its actor and time.</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{orderHistory.length} event{orderHistory.length === 1 ? '' : 's'}</span>
              </div>
              {orderHistory.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="border-b border-slate-200 text-slate-500"><tr><th className="px-2 py-2 font-semibold">Change</th><th className="px-2 py-2 font-semibold">Changed by</th><th className="px-2 py-2 font-semibold">Date</th><th className="px-2 py-2 font-semibold">Reason</th></tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      {orderHistory.map(event => <tr key={event.id}><td className="px-2 py-2 font-semibold text-slate-800">{event.fromStatus || 'Created'} → {event.toStatus}</td><td className="px-2 py-2 text-slate-600">{event.changedBy || 'System'}</td><td className="px-2 py-2 text-slate-600">{event.changedAt ? new Date(event.changedAt).toLocaleString('en-PH') : '—'}</td><td className="px-2 py-2 text-slate-600">{event.reason || '—'}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-slate-500">No status changes recorded yet.</p>}
            </div>
            {canEdit && (
              <div className="sm:col-span-2 flex justify-end gap-2 border-t border-slate-200 pt-4">
                {selectedOrderStatus === 'Draft' && <button type="button" onClick={() => transitionSelectedOrder('For Approval')} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700">Submit for approval</button>}
                {selectedOrderStatus === 'For Approval' && <button type="button" onClick={() => transitionSelectedOrder('Signed')} disabled={!selectedOrder.signedDocument} title={selectedOrder.signedDocument ? 'Mark this order as signed' : 'Upload the signed order scan first'} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Mark signed</button>}
                {selectedOrderStatus === 'Signed' && <button type="button" onClick={() => transitionSelectedOrder('Released')} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Release order</button>}
                {selectedOrderStatus === 'Released' && <button type="button" onClick={() => transitionSelectedOrder('Archived')} className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Archive order</button>}
                {['For Approval', 'Signed', 'Released'].includes(selectedOrderStatus || '') && <button type="button" onClick={() => transitionSelectedOrder('Revoked')} className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">Revoke</button>}
                {selectedOrderStatus === 'Revoked' && <button type="button" onClick={openRestoreOrder} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"><RotateCcw size={16} /> Restore order</button>}
                {['Draft', 'Revoked'].includes(selectedOrderStatus || '') && <button type="button" onClick={() => removeRecord('order', selectedOrder.id, 'administrative order')} className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Delete</button>}
                {!LOCKED_ORDER_STATUSES.has(selectedOrderStatus || '') && <button type="button" onClick={() => openOrderEdit(selectedOrder)} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"><Edit3 size={16} /> Edit order</button>}
              </div>
            )}
          </div>
        </ModalShell>
      )}

      <Modal
        isOpen={revokeDialogOpen}
        onClose={() => { if (!submittingRevoke) { setRevokeDialogOpen(false); setRevokeReason(''); } }}
        title="Revoke administrative order"
        subtitle="This action changes the order status and records the reason in workflow history."
        maxWidth="md"
        closeOnBackdrop={!submittingRevoke}
        footer={(
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setRevokeDialogOpen(false); setRevokeReason(''); }} disabled={submittingRevoke} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
            <button type="button" onClick={() => void confirmRevokeOrder()} disabled={submittingRevoke} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60">{submittingRevoke && <Loader2 size={16} className="animate-spin" />} {submittingRevoke ? 'Revoking...' : 'Revoke order'}</button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <p className="font-semibold">Revoke {selectedOrder?.orderNumber || 'this order'}?</p>
            <p className="mt-1 text-xs leading-5 text-rose-800">The order will become read-only. You may provide a reason for the audit trail.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Reason <span className="font-normal text-slate-400">(optional)</span></span>
            <textarea value={revokeReason} onChange={event => setRevokeReason(event.target.value)} rows={4} maxLength={500} autoFocus placeholder="Explain why this order is being revoked..." className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
            <span className="mt-1 block text-right text-[11px] text-slate-400">{revokeReason.length}/500</span>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={restoreDialogOpen}
        onClose={() => { if (!submittingRestore) { setRestoreDialogOpen(false); setRestoreReason(''); } }}
        title="Restore revoked order"
        subtitle="Return the order to its previous workflow status and record the correction."
        maxWidth="md"
        closeOnBackdrop={!submittingRestore}
        footer={(
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setRestoreDialogOpen(false); setRestoreReason(''); }} disabled={submittingRestore} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
            <button type="button" onClick={() => void confirmRestoreOrder()} disabled={submittingRestore} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">{submittingRestore && <Loader2 size={16} className="animate-spin" />} {submittingRestore ? 'Restoring...' : 'Restore order'}</button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">Restore {selectedOrder?.orderNumber || 'this order'}?</p>
            <p className="mt-1 text-xs leading-5 text-amber-900">It will return to <span className="font-semibold">{revokedReturnStatus}</span>. You may provide a reason for the audit trail.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Reason <span className="font-normal text-slate-400">(optional)</span></span>
            <textarea value={restoreReason} onChange={event => setRestoreReason(event.target.value)} rows={4} maxLength={500} autoFocus placeholder="Explain why this order is being restored..." className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100" />
            <span className="mt-1 block text-right text-[11px] text-slate-400">{restoreReason.length}/500</span>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { if (!submittingDelete) setDeleteTarget(null); }}
        title="Delete record"
        subtitle="This action permanently removes the selected record from the register."
        maxWidth="md"
        closeOnBackdrop={!submittingDelete}
        footer={(
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={submittingDelete} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
            <button type="button" onClick={() => void confirmDeleteRecord()} disabled={submittingDelete} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60">{submittingDelete && <Loader2 size={16} className="animate-spin" />} {submittingDelete ? 'Deleting...' : 'Delete permanently'}</button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
            <p className="font-semibold">Delete this {deleteTarget?.label || 'record'}?</p>
            <p className="mt-1 text-xs leading-5 text-rose-900">This cannot be undone. For administrative orders, only Draft and Revoked records can be deleted; signed, released, and archived orders remain protected.</p>
          </div>
        </div>
      </Modal>

      {documentPreview && (
        <ModalShell
          title={documentPreview.order.fileName || 'Order document preview'}
          eyebrow="DOCX preview"
          onClose={() => setDocumentPreview(null)}
          maxWidth="max-w-5xl"
        >
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-600">
            Preview generated from the uploaded Word document. Download the original file for full Word formatting.
          </div>
          <article className="order-document-preview m-4 min-h-[420px] rounded-lg border border-slate-200 bg-white p-6 shadow-inner sm:m-6 sm:p-10" dangerouslySetInnerHTML={{ __html: documentPreview.html }} />
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
