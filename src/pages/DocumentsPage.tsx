import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  FilePlus,
  Search,
  Filter,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Archive,
  Download,
  Printer,
  History,
  Clock,
  User,
  Layout,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  fetchDocumentsApi,
  createDocumentApi,
  updateDocumentApi,
  deleteDocumentApi,
  fetchOrderDocumentForEditApi,
  saveOrderDocumentFromEditorApi,
  DocumentRecord
} from '../services/documentsApi';
import { DocumentEditorModule } from '../components/document/DocumentEditorModule';
import { DocumentErrorBoundary } from '../components/document/DocumentErrorBoundary';
import { NewDocumentModal } from '../components/document/dialogs/NewDocumentModal';
import { DEFAULT_TEMPLATES, TemplatePreset } from '../components/document/utils/defaultTemplates';
import { useAuthRole } from '../context/AuthRoleContext';

type DocumentTab = 'all' | 'my' | 'templates' | 'recent' | 'archived';

export const DocumentsPage: React.FC = () => {
  const { authUser, personnelList } = useAuthRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  const docIdParam = searchParams.get('docId');

  const [activeTab, setActiveTab] = useState<DocumentTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Document in Editor Mode
  const [editingDocument, setEditingDocument] = useState<Partial<DocumentRecord> | null>(null);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);

  // Load documents
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchDocumentsApi({
        archived: activeTab === 'archived'
      });
      setDocuments(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [activeTab]);

  // Handle direct open via URL params (?orderId=... or ?docId=...)
  useEffect(() => {
    if (orderIdParam) {
      handleOpenOrderDocument(orderIdParam);
    } else if (docIdParam) {
      handleOpenDocumentById(docIdParam);
    }
  }, [orderIdParam, docIdParam]);

  const handleOpenOrderDocument = async (orderId: string) => {
    try {
      setLoading(true);
      const data = await fetchOrderDocumentForEditApi(orderId);
      setEditingDocument(data.document);
      setEditingOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Failed to open order document');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocumentById = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setEditingDocument(doc);
    } else {
      try {
        setLoading(true);
        const fetched = await fetchDocumentsApi();
        const found = fetched.find(d => d.id === id);
        if (found) setEditingDocument(found);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (activeTab === 'my') {
        const myName = authUser?.displayName || authUser?.email;
        if (myName && doc.created_by && !doc.created_by.includes(myName)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (doc.title || '').toLowerCase().includes(q);
        const matchType = (doc.document_type || '').toLowerCase().includes(q);
        const matchOwner = (doc.created_by || '').toLowerCase().includes(q);
        if (!matchTitle && !matchType && !matchOwner) return false;
      }
      return true;
    });
  }, [documents, activeTab, searchQuery, authUser]);

  // Save handler from Editor
  const handleSaveDocument = async (payload: {
    id?: string;
    title: string;
    content_json: any;
    content_html: string;
    change_summary?: string;
  }) => {
    if (editingOrder?.id) {
      const res = await saveOrderDocumentFromEditorApi(editingOrder.id, payload);
      setEditingDocument(res.document);
      loadDocuments();
      return res.document;
    } else if (payload.id) {
      const updated = await updateDocumentApi(payload.id, {
        title: payload.title,
        content_json: payload.content_json,
        content_html: payload.content_html,
        incrementVersion: true,
        change_summary: payload.change_summary
      });
      setEditingDocument(updated);
      loadDocuments();
      return updated;
    } else {
      const created = await createDocumentApi({
        title: payload.title,
        content_json: payload.content_json,
        content_html: payload.content_html,
        document_type: 'Custom Document',
        created_by: authUser?.displayName || authUser?.email || 'System'
      });
      setEditingDocument(created);
      loadDocuments();
      return created;
    }
  };

  // Duplicate Document
  const handleDuplicate = async (doc: DocumentRecord) => {
    try {
      await createDocumentApi({
        title: `${doc.title} (Copy)`,
        description: doc.description,
        document_type: doc.document_type,
        content_json: doc.content_json,
        content_html: doc.content_html,
        page_size: doc.page_size,
        orientation: doc.orientation,
        margin_top: doc.margin_top,
        margin_bottom: doc.margin_bottom,
        margin_left: doc.margin_left,
        margin_right: doc.margin_right,
        created_by: authUser?.displayName || authUser?.email || 'System'
      });
      loadDocuments();
    } catch (e: any) {
      alert(`Failed to duplicate: ${e.message}`);
    }
  };

  // Archive / Delete Document
  const handleDelete = async (id: string, hard = false) => {
    if (!window.confirm(hard ? 'Permanently delete this document?' : 'Archive this document?')) return;
    try {
      await deleteDocumentApi(id, hard);
      loadDocuments();
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  // Close Editor mode and return to document list
  const handleCloseEditor = () => {
    setEditingDocument(null);
    setEditingOrder(null);
    setSearchParams({});
    loadDocuments();
  };

  // Render Full Word-like Editor if active
  if (editingDocument) {
    return (
      <DocumentErrorBoundary onClose={handleCloseEditor}>
        <DocumentEditorModule
          initialDocument={editingDocument}
          associatedOrder={editingOrder}
          personnelList={personnelList}
          onSave={handleSaveDocument}
          onClose={handleCloseEditor}
        />
      </DocumentErrorBoundary>
    );
  }

  return (
    <div className="mx-auto max-w-[1680px] space-y-5">
      {/* Top Banner */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-xs dark:bg-[#101b2b] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
              PAIS 2.0 Document Center
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-500">Official Document Management & Editor</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Documents & Orders Editor
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Native Microsoft Word-style administrative document creation, template auto-fill, and record generation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDocuments}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
            title="Refresh documents list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setIsNewDocModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition"
          >
            <Plus size={16} />
            <span>New Document</span>
          </button>
        </div>
      </section>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex gap-1 overflow-x-auto text-xs font-bold text-slate-600 dark:text-slate-400">
          {(['all', 'my', 'templates', 'recent', 'archived'] as DocumentTab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3.5 py-1.5 capitalize transition ${
                activeTab === tab
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800'
              }`}
            >
              {tab === 'all' ? 'All Documents' : tab === 'my' ? 'My Documents' : tab}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by title or author..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Document Grid / List */}
      {loading ? (
        <div className="py-20 text-center text-xs font-semibold text-slate-500">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-teal-600" />
          Loading PAIS documents...
        </div>
      ) : activeTab === 'templates' ? (
        /* Templates Tab */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEFAULT_TEMPLATES.map(tmpl => (
            <div
              key={tmpl.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#101b2b] flex flex-col justify-between"
            >
              <div>
                <span className="rounded-md bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:text-teal-200 uppercase">
                  {tmpl.category}
                </span>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{tmpl.name}</h3>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{tmpl.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{tmpl.pageSize} · {tmpl.orientation}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDocument({
                      title: `${tmpl.name} - ${new Date().toISOString().slice(0, 10)}`,
                      document_type: tmpl.documentType,
                      content_html: tmpl.html,
                      page_size: tmpl.pageSize,
                      orientation: tmpl.orientation,
                      margin_top: tmpl.marginTop,
                      margin_bottom: tmpl.marginBottom,
                      margin_left: tmpl.marginLeft,
                      margin_right: tmpl.marginRight
                    });
                  }}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white dark:bg-[#101b2b]">
          <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No documents found</h3>
          <p className="mt-1 text-xs text-slate-400">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first document or open an Administrative Order to edit.'}
          </p>
          <button
            type="button"
            onClick={() => setIsNewDocModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
          >
            <Plus size={14} /> New Document
          </button>
        </div>
      ) : (
        /* Regular Document Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(doc => {
            const updatedDateStr = new Date(doc.updated_at).toLocaleDateString('en-PH', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-[#101b2b] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {doc.document_type || 'Administrative Order'}
                    </span>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      doc.status === 'Final'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                    }`}>
                      {doc.status}
                    </span>
                  </div>

                  <h3
                    onClick={() => setEditingDocument(doc)}
                    className="cursor-pointer font-bold text-sm text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 line-clamp-1"
                    title={doc.title}
                  >
                    {doc.title}
                  </h3>

                  {doc.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{doc.description}</p>
                  )}

                  <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {updatedDateStr}
                    </span>
                    <span>v{doc.version || 1}</span>
                    {doc.order_id && (
                      <span className="rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1 font-mono text-[10px]">
                        Linked Order
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                    By {doc.created_by || 'System'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(doc)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      title="Duplicate Document"
                    >
                      <Copy size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, activeTab === 'archived')}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      title={activeTab === 'archived' ? 'Delete Permanently' : 'Archive Document'}
                    >
                      <Trash2 size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingDocument(doc)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition ml-1"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Document Modal */}
      <NewDocumentModal
        isOpen={isNewDocModalOpen}
        onClose={() => setIsNewDocModalOpen(false)}
        onCreate={payload => {
          setEditingDocument({
            title: payload.title,
            document_type: payload.template.documentType,
            content_html: payload.template.html,
            page_size: payload.template.pageSize,
            orientation: payload.template.orientation,
            margin_top: payload.template.marginTop,
            margin_bottom: payload.template.marginBottom,
            margin_left: payload.template.marginLeft,
            margin_right: payload.template.marginRight,
            personnel_ids: payload.personnelId ? [payload.personnelId] : []
          });
        }}
        personnelList={personnelList}
      />
    </div>
  );
};
