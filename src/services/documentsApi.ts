/**
 * PAIS 2.0 Local Document Store Service
 * 
 * 100% Client-side local implementation using localStorage.
 * No external API dependencies or network calls required.
 */

import { DEFAULT_TEMPLATES, TemplatePreset } from '../components/document/utils/defaultTemplates';

export interface DocumentRecord {
  id: string;
  title: string;
  description?: string;
  document_type: string;
  content_json?: any;
  content_html?: string;
  template_id?: string | null;
  owner_id?: string | null;
  status: 'Draft' | 'For Review' | 'Final' | 'Archived';
  version: number;
  page_size: 'A4' | 'Letter' | 'Legal' | string;
  orientation: 'portrait' | 'landscape';
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  order_id?: string | null;
  personnel_ids?: string[];
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  document_type: string;
  content_json?: any;
  content_html?: string;
  is_active: boolean;
  page_size: string;
  orientation: 'portrait' | 'landscape';
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content_json?: any;
  content_html?: string;
  created_by: string;
  created_at: string;
  change_summary?: string;
}

const STORAGE_DOCS_KEY = 'pais.local_documents.v1';
const STORAGE_VERSIONS_KEY = 'pais.local_document_versions.v1';
const STORAGE_ORDER_DOCS_KEY = 'pais.local_order_documents.v1';
const STORAGE_TEMPLATES_KEY = 'pais.local_document_templates.v1';

// Seed initial sample documents if store is empty
const getInitialSampleDocuments = (): DocumentRecord[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'doc-sample-1',
      title: 'ITMS-SO-DS-2025-001 - Assignment of PCOs and PNCOs',
      description: 'Standard Administrative Order assigning designated personnel to regional ITMS units.',
      document_type: 'Administrative Order',
      content_html: DEFAULT_TEMPLATES.find(t => t.id === 'admin-order')?.html || '<p>Administrative Order Document</p>',
      status: 'Draft',
      version: 1,
      page_size: 'A4',
      orientation: 'portrait',
      margin_top: 25.4,
      margin_bottom: 25.4,
      margin_left: 25.4,
      margin_right: 25.4,
      created_by: 'ITMS Administrator',
      created_at: now,
      updated_at: now
    },
    {
      id: 'doc-sample-2',
      title: 'Memorandum - Annual Cyber Security Awareness Briefing',
      description: 'Official directive requiring all personnel compliance in cyber hygiene programs.',
      document_type: 'Memorandum',
      content_html: DEFAULT_TEMPLATES.find(t => t.id === 'memo')?.html || '<p>Memorandum Document</p>',
      status: 'Final',
      version: 2,
      page_size: 'A4',
      orientation: 'portrait',
      margin_top: 25.4,
      margin_bottom: 25.4,
      margin_left: 25.4,
      margin_right: 25.4,
      created_by: 'PBGEN BENJAMIN H ACORDA',
      created_at: now,
      updated_at: now
    }
  ];
};

// Internal Helpers
const loadDocsFromStorage = (): DocumentRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_DOCS_KEY);
    if (!raw) {
      const initial = getInitialSampleDocuments();
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read documents from localStorage:', err);
    return [];
  }
};

const saveDocsToStorage = (docs: DocumentRecord[]) => {
  try {
    localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(docs));
  } catch (err) {
    console.error('Failed to save documents to localStorage:', err);
  }
};

const loadVersionsFromStorage = (): DocumentVersion[] => {
  try {
    const raw = localStorage.getItem(STORAGE_VERSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveVersionsToStorage = (versions: DocumentVersion[]) => {
  try {
    localStorage.setItem(STORAGE_VERSIONS_KEY, JSON.stringify(versions));
  } catch (err) {
    console.error('Failed to save versions to localStorage:', err);
  }
};

const loadOrderDocsMap = (): Record<string, DocumentRecord> => {
  try {
    const raw = localStorage.getItem(STORAGE_ORDER_DOCS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveOrderDocsMap = (map: Record<string, DocumentRecord>) => {
  try {
    localStorage.setItem(STORAGE_ORDER_DOCS_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save order documents map to localStorage:', err);
  }
};

// ================= EXPORTED LOCAL METHODS =================

export const fetchDocumentsApi = async (filters: {
  type?: string;
  status?: string;
  orderId?: string;
  search?: string;
  archived?: boolean;
} = {}): Promise<DocumentRecord[]> => {
  let docs = loadDocsFromStorage();

  if (filters.archived) {
    docs = docs.filter(d => Boolean(d.archived_at) || d.status === 'Archived');
  } else {
    docs = docs.filter(d => !d.archived_at && d.status !== 'Archived');
  }

  if (filters.type) {
    docs = docs.filter(d => d.document_type.toLowerCase() === filters.type!.toLowerCase());
  }

  if (filters.status) {
    docs = docs.filter(d => d.status.toLowerCase() === filters.status!.toLowerCase());
  }

  if (filters.orderId) {
    docs = docs.filter(d => d.order_id === filters.orderId);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    docs = docs.filter(d =>
      (d.title || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q) ||
      (d.created_by || '').toLowerCase().includes(q)
    );
  }

  return docs.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
};

export const fetchDocumentByIdApi = async (id: string): Promise<DocumentRecord> => {
  const docs = loadDocsFromStorage();
  const found = docs.find(d => d.id === id);
  if (!found) throw new Error('Document not found in local storage.');
  return found;
};

export const createDocumentApi = async (payload: Partial<DocumentRecord>): Promise<DocumentRecord> => {
  const docs = loadDocsFromStorage();
  const now = new Date().toISOString();
  const id = payload.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newDoc: DocumentRecord = {
    id,
    title: payload.title || 'Untitled Document',
    description: payload.description || '',
    document_type: payload.document_type || 'Custom Document',
    content_json: payload.content_json || {},
    content_html: payload.content_html || '',
    template_id: payload.template_id || null,
    owner_id: payload.owner_id || null,
    status: payload.status || 'Draft',
    version: 1,
    page_size: payload.page_size || 'A4',
    orientation: payload.orientation || 'portrait',
    margin_top: payload.margin_top ?? 25.4,
    margin_bottom: payload.margin_bottom ?? 25.4,
    margin_left: payload.margin_left ?? 25.4,
    margin_right: payload.margin_right ?? 25.4,
    order_id: payload.order_id || null,
    personnel_ids: payload.personnel_ids || [],
    created_by: payload.created_by || 'Current User',
    updated_by: payload.updated_by || 'Current User',
    created_at: now,
    updated_at: now,
    archived_at: null
  };

  docs.unshift(newDoc);
  saveDocsToStorage(docs);

  // Record version 1
  const versions = loadVersionsFromStorage();
  versions.unshift({
    id: `ver-${id}-1`,
    document_id: id,
    version_number: 1,
    content_json: newDoc.content_json,
    content_html: newDoc.content_html,
    created_by: newDoc.created_by || 'Current User',
    created_at: now,
    change_summary: 'Initial local creation'
  });
  saveVersionsToStorage(versions);

  return newDoc;
};

export const updateDocumentApi = async (
  id: string,
  payload: Partial<DocumentRecord> & { incrementVersion?: boolean; change_summary?: string }
): Promise<DocumentRecord> => {
  const docs = loadDocsFromStorage();
  const index = docs.findIndex(d => d.id === id);
  if (index === -1) throw new Error('Document not found in local storage.');

  const existing = docs[index];
  const now = new Date().toISOString();
  const nextVersion = existing.version + (payload.incrementVersion ? 1 : 0);

  const updated: DocumentRecord = {
    ...existing,
    ...payload,
    version: nextVersion,
    updated_at: now
  };

  docs[index] = updated;
  saveDocsToStorage(docs);

  if (payload.incrementVersion || payload.change_summary) {
    const versions = loadVersionsFromStorage();
    versions.unshift({
      id: `ver-${id}-${nextVersion}`,
      document_id: id,
      version_number: nextVersion,
      content_json: updated.content_json,
      content_html: updated.content_html,
      created_by: updated.updated_by || 'Current User',
      created_at: now,
      change_summary: payload.change_summary || `Version ${nextVersion}`
    });
    saveVersionsToStorage(versions);
  }

  return updated;
};

export const deleteDocumentApi = async (id: string, hard = false): Promise<void> => {
  let docs = loadDocsFromStorage();
  if (hard) {
    docs = docs.filter(d => d.id !== id);
    saveDocsToStorage(docs);
    const versions = loadVersionsFromStorage().filter(v => v.document_id !== id);
    saveVersionsToStorage(versions);
  } else {
    docs = docs.map(d => (d.id === id ? { ...d, status: 'Archived', archived_at: new Date().toISOString() } : d));
    saveDocsToStorage(docs);
  }
};

export const fetchDocumentTemplatesApi = async (): Promise<DocumentTemplate[]> => {
  try {
    const raw = localStorage.getItem(STORAGE_TEMPLATES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const defaults: DocumentTemplate[] = DEFAULT_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    document_type: t.documentType,
    content_html: t.html,
    is_active: true,
    page_size: t.pageSize,
    orientation: t.orientation,
    margin_top: t.marginTop,
    margin_bottom: t.marginBottom,
    margin_left: t.marginLeft,
    margin_right: t.marginRight,
    created_by: 'System',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(defaults));
  return defaults;
};

export const fetchDocumentVersionsApi = async (documentId: string): Promise<DocumentVersion[]> => {
  const versions = loadVersionsFromStorage();
  return versions
    .filter(v => v.document_id === documentId)
    .sort((a, b) => b.version_number - a.version_number);
};

export const restoreDocumentVersionApi = async (
  documentId: string,
  versionNumber: number
): Promise<DocumentRecord> => {
  const versions = await fetchDocumentVersionsApi(documentId);
  const target = versions.find(v => v.version_number === versionNumber);
  if (!target) throw new Error(`Version ${versionNumber} not found.`);

  return updateDocumentApi(documentId, {
    content_json: target.content_json,
    content_html: target.content_html,
    incrementVersion: true,
    change_summary: `Restored to version ${versionNumber}`
  });
};

export const fetchOrderDocumentForEditApi = async (
  orderId: string
): Promise<{ document: DocumentRecord | null; order: any }> => {
  const orderDocs = loadOrderDocsMap();
  const existing = orderDocs[orderId];
  if (existing) {
    return { document: existing, order: null };
  }
  return { document: null, order: null };
};

export const saveOrderDocumentFromEditorApi = async (
  orderId: string,
  payload: {
    title?: string;
    content_json?: any;
    content_html: string;
    change_summary?: string;
  }
): Promise<{ document: DocumentRecord; order: any }> => {
  const orderDocs = loadOrderDocsMap();
  const now = new Date().toISOString();
  let existing = orderDocs[orderId];

  if (existing) {
    existing = {
      ...existing,
      title: payload.title || existing.title,
      content_json: payload.content_json || existing.content_json,
      content_html: payload.content_html,
      version: (existing.version || 1) + 1,
      updated_at: now
    };
  } else {
    existing = {
      id: `doc-order-${orderId}`,
      title: payload.title || `Administrative Order - ${orderId.slice(0, 8)}`,
      description: 'Administrative Order document edited via Document Editor',
      document_type: 'Administrative Order',
      content_json: payload.content_json || {},
      content_html: payload.content_html,
      status: 'Draft',
      version: 1,
      page_size: 'A4',
      orientation: 'portrait',
      margin_top: 25.4,
      margin_bottom: 25.4,
      margin_left: 25.4,
      margin_right: 25.4,
      order_id: orderId,
      created_by: 'Current User',
      updated_by: 'Current User',
      created_at: now,
      updated_at: now
    };
  }

  // Update order docs map in localStorage
  orderDocs[orderId] = existing;
  saveOrderDocsMap(orderDocs);

  // Also sync to general documents list
  const docs = loadDocsFromStorage();
  const docIdx = docs.findIndex(d => d.order_id === orderId || d.id === existing.id);
  if (docIdx >= 0) {
    docs[docIdx] = existing;
  } else {
    docs.unshift(existing);
  }
  saveDocsToStorage(docs);

  return { document: existing, order: null };
};
