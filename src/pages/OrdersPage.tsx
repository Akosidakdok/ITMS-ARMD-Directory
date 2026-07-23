import React, { useState } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { Plus, Search, Calendar } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { OrderRecord } from '../types/pais';

export const OrdersPage: React.FC = () => {
  const { role, ordersList, addOrder } = useAuthRole();
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Form state
  const [orderNumber, setOrderNumber] = useState('');
  const [orderType, setOrderType] = useState<'Assignment Order' | 'Movement Order' | 'Special Order' | 'Commendation Order' | 'Relief Order'>('Special Order');
  const [subject, setSubject] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [signatory, setSignatory] = useState('PBGEN BENJAMIN H ACORDA');
  const [signatoryTitle, setSignatoryTitle] = useState('Director, ITMS');
  const [affectedPersonnelCount, setAffectedPersonnelCount] = useState(1);
  const [description, setDescription] = useState('');

  const filteredOrders = ordersList.filter(ord => {
    const matchesType = filterType === 'ALL' || ord.orderType === filterType;
    const matchesStatus = filterStatus === 'ALL' || ord.status === filterStatus;
    const matchesSearch = ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ord.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ord.signatory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    addOrder({
      id: `ord-${Date.now()}`,
      orderNumber,
      orderType,
      subject,
      issuedDate,
      effectiveDate,
      signatory,
      signatoryTitle,
      status: 'Active',
      affectedPersonnelCount: Number(affectedPersonnelCount),
      description
    });
    setIsModalOpen(false);
    setOrderNumber('');
    setSubject('');
    setDescription('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 theme-transition shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30">
              Orders Management
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">PNP ITMS Directives</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Administrative Orders & Directives</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Maintain, view, and issue Special Orders, Movement Orders, and Commendations</p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Issue New Special Order
          </button>
        )}
      </div>

      {/* Filter & Search Controls */}
      <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-4 theme-transition shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number, subject, or signatory..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Order Types</option>
            <option value="Assignment Order">Assignment Orders</option>
            <option value="Movement Order">Movement Orders</option>
            <option value="Special Order">Special Orders</option>
            <option value="Commendation Order">Commendation Orders</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Orders Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrders.map((ord) => (
          <div
            key={ord.id}
            onClick={() => setSelectedOrder(ord)}
            className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 hover:border-blue-300 dark:hover:border-blue-500/40 transition-all cursor-pointer space-y-4 group shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm">
                  {ord.orderType}
                </Badge>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {ord.orderNumber}
                </span>
              </div>
              <Badge variant={ord.status === 'Active' ? 'success' : 'neutral'} size="sm">
                {ord.status}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors leading-snug">
                {ord.subject}
              </h3>
              {ord.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {ord.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <span className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Issued: {ord.issuedDate}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-sans font-semibold">
                Signatory: <strong className="text-blue-700 dark:text-blue-400">{ord.signatory}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* View Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order Document: ${selectedOrder.orderNumber}`}
          subtitle="Official Philippine National Police Special Order View"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-slate-900 text-white text-center space-y-3 shadow-md">
              <span className="text-[10px] tracking-widest text-slate-400 uppercase font-bold">Republic of the Philippines</span>
              <h3 className="text-sm font-extrabold text-blue-400 uppercase tracking-wider">PHILIPPINE NATIONAL POLICE</h3>
              <h4 className="text-xs font-semibold text-slate-300">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</h4>
              <p className="text-[11px] text-slate-400">Camp BGen Rafael T Crame, Quezon City</p>
              
              <div className="pt-3 border-t border-slate-800">
                <span className="text-xs font-mono font-bold text-blue-300 block">{selectedOrder.orderType.toUpperCase()}</span>
                <h2 className="text-base font-extrabold text-white uppercase mt-1">{selectedOrder.orderNumber}</h2>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Subject:</span>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{selectedOrder.subject}</p>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">Directives & Particulars:</span>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 font-medium">
                  {selectedOrder.description || 'Pursuant to NAPOLCOM circulars and ITMS organizational directives, personnel mentioned herein are hereby detailed as specified.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Issued Date:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{selectedOrder.issuedDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Effective Date:</span>
                  <span className="font-mono text-sky-700 dark:text-sky-400 font-bold">{selectedOrder.effectiveDate}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">{selectedOrder.signatory}</span>
                <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">{selectedOrder.signatoryTitle}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Order Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Issue New Special Order"
        subtitle="Draft official administrative directive for ITMS personnel"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Order Number</label>
              <input
                type="text"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="e.g. SO-ITMS-2026-118"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Order Type</label>
              <select
                value={orderType}
                onChange={e => setOrderType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="Assignment Order">Assignment Order</option>
                <option value="Movement Order">Movement Order</option>
                <option value="Special Order">Special Order</option>
                <option value="Commendation Order">Commendation Order</option>
                <option value="Relief Order">Relief Order</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Subject Title</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Reassignment of Cyber Incident Response Officers"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Issued Date</label>
              <input
                type="date"
                value={issuedDate}
                onChange={e => setIssuedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Effectivity Date</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Signatory Officer</label>
              <input
                type="text"
                value={signatory}
                onChange={e => setSignatory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Signatory Designation</label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={e => setSignatoryTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Directives Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter full text directives and affected unit details..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-semibold h-24 focus:outline-none focus:border-blue-500"
              required
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
              Publish Special Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

