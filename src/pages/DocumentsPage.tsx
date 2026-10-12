import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Search, Edit3, Copy, Trash2, Archive, RefreshCw, Plus } from 'lucide-react';
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
import { DEFAULT_TEMPLATES } from '../components/document/utils/defaultTemplates';
import { useAuthRole } from '../context/AuthRoleContext';
import { PageHeader } from '../components/common/SystemUI';
import './ModulePages.css';
import './RecordsModules.css';
import './DocumentsPage.css';

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
    <div className="module-page records-module documents-page mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader
        title="Document Editor"
        description="Create documents from templates, edit administrative records, and manage your document library."
        actions={<>
          <button type="button" onClick={loadDocuments} disabled={loading} className="documents-button" aria-label="Refresh documents" title="Refresh documents">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={() => setIsNewDocModalOpen(true)} className="documents-button documents-button-primary">
            <Plus size={16} /> New Document
          </button>
        </>}
      />

      <section className="record-section documents-library" aria-label="Document library">
        <div className="module-view-tabs documents-tabs" aria-label="Document views">
          {(['all', 'my', 'templates', 'recent', 'archived'] as DocumentTab[]).map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab}>
              {tab === 'all' ? 'All Documents' : tab === 'my' ? 'My Documents' : tab === 'templates' ? 'Templates' : tab === 'recent' ? 'Recent' : 'Archived'}
            </button>
          ))}
        </div>

        {activeTab !== 'templates' ? (
          <div className="module-search-toolbar">
            <div className="module-search-input">
              <Search size={16} aria-hidden="true" />
              <input type="search" aria-label="Search documents by title, type, or author" placeholder="Search by title, type, or author…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="module-reset">Clear search</button>}
            <span className="module-result-count" role="status">{loading ? 'Loading…' : `${filteredDocuments.length} ${filteredDocuments.length === 1 ? 'document' : 'documents'}`}</span>
          </div>
        ) : (
          <div className="record-section-header documents-catalogue-heading">
            <h2>Start with a template</h2>
            <p>Choose a format to open a new document in the editor.</p>
          </div>
        )}

        {error && (
          <div className="documents-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={loadDocuments} disabled={loading} className="documents-button">Try again</button>
          </div>
        )}

        {loading ? (
          <div className="documents-empty" role="status">
            <RefreshCw size={24} className="animate-spin" aria-hidden="true" />
            <p>Loading documents…</p>
          </div>
        ) : activeTab === 'templates' ? (
          <div className="documents-templates">
            {DEFAULT_TEMPLATES.map(tmpl => (
              <article key={tmpl.id} className="documents-template">
                <div>
                  <span className="documents-category">{tmpl.category}</span>
                  <h3>{tmpl.name}</h3>
                  <p>{tmpl.description}</p>
                </div>
                <div className="documents-template-footer">
                  <span>{tmpl.pageSize} · {tmpl.orientation}</span>
                  <button type="button" className="documents-button documents-button-primary" onClick={() => {
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
                  }}>Use Template</button>
                </div>
              </article>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="documents-empty">
            <FileText size={28} aria-hidden="true" />
            <h2>No documents found</h2>
            <p>{searchQuery ? 'Try a different title, document type, or author.' : 'Create a document or open an Administrative Order to edit.'}</p>
            <button type="button" onClick={() => setIsNewDocModalOpen(true)} className="documents-button documents-button-primary">
              <Plus size={16} /> New Document
            </button>
          </div>
        ) : (
          <ul className="documents-list" aria-label="Documents">
            {filteredDocuments.map(doc => {
              const updatedDateStr = new Date(doc.updated_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <li key={doc.id} className="documents-row">
                  <FileText size={20} className="documents-row-icon" aria-hidden="true" />
                  <div className="documents-row-content">
                    <h2><button type="button" onClick={() => setEditingDocument(doc)} className="documents-title">{doc.title}</button></h2>
                    {doc.description && <p className="documents-description">{doc.description}</p>}
                    <div className="documents-metadata">
                      <span>{doc.document_type || 'Administrative Order'}</span>
                      <span>By {doc.created_by || 'System'}</span>
                      {doc.order_id && <span>Linked Order</span>}
                    </div>
                  </div>
                  <div className="documents-row-details">
                    <span className={`documents-status ${doc.status === 'Final' ? 'is-final' : ''}`}>{doc.status}</span>
                    <span>Updated {updatedDateStr}</span>
                    <span>Version {doc.version || 1}</span>
                  </div>
                  <div className="documents-row-actions">
                    <button type="button" onClick={() => handleDuplicate(doc)} className="documents-button documents-icon-button" aria-label={`Duplicate ${doc.title}`} title="Duplicate Document"><Copy size={16} /></button>
                    <button type="button" onClick={() => handleDelete(doc.id, activeTab === 'archived')} className={`documents-button documents-icon-button ${activeTab === 'archived' ? 'documents-delete' : ''}`} aria-label={`${activeTab === 'archived' ? 'Permanently delete' : 'Archive'} ${doc.title}`} title={activeTab === 'archived' ? 'Delete Permanently' : 'Archive Document'}>
                      {activeTab === 'archived' ? <Trash2 size={16} /> : <Archive size={16} />}
                    </button>
                    <button type="button" onClick={() => setEditingDocument(doc)} className="documents-button"><Edit3 size={14} /> Edit</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
