import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

import {
  CustomParagraph,
  CustomTable,
  CustomTableRow,
  CustomTableCell,
  CustomTableHeader,
  CustomImage
} from './extensions/CustomDocumentExtensions';
import { PaisFieldNode } from './extensions/PaisFieldNode';
import { PageBreakNode } from './extensions/PageBreakNode';
import { DocumentRibbon } from './ribbon/DocumentRibbon';
import { DocumentCanvas } from './canvas/DocumentCanvas';
import { PageLayoutConfig } from './ribbon/RibbonLayoutTab';
import { InsertTableModal } from './dialogs/InsertTableModal';
import { InsertImageModal } from './dialogs/InsertImageModal';
import { InsertPaisFieldModal } from './dialogs/InsertPaisFieldModal';
import { FindReplaceModal } from './dialogs/FindReplaceModal';
import { VersionHistoryModal } from './dialogs/VersionHistoryModal';
import { DocumentPropertiesModal } from './dialogs/DocumentPropertiesModal';
import { NewDocumentModal } from './dialogs/NewDocumentModal';

import { exportToDocx } from './utils/docxExporter';
import { exportToPdf } from './utils/pdfExporter';
import { DEFAULT_TEMPLATES, TemplatePreset } from './utils/defaultTemplates';
import { resolvePaisFieldValue, resolveAllPaisFieldsInHtml, PaisFieldDefinition } from './utils/paisFieldResolver';
import { CANONICAL_DOCUMENT_CONFIG } from './utils/sharedOrderDocument';
import type { DocumentRecord, DocumentVersion } from '../../services/documentsApi';
import type { Personnel } from '../../types/pais';
import './documentEditor.css';

import {
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft
} from 'lucide-react';

interface DocumentEditorModuleProps {
  initialDocument?: Partial<DocumentRecord>;
  associatedOrder?: any;
  personnelList?: Personnel[];
  onSave?: (savedDoc: {
    id?: string;
    title: string;
    content_json: any;
    content_html: string;
    change_summary?: string;
  }) => Promise<any>;
  onClose?: () => void;
  readOnly?: boolean;
}

export const DocumentEditorModule: React.FC<DocumentEditorModuleProps> = ({
  initialDocument,
  associatedOrder,
  personnelList = [],
  onSave,
  onClose,
  readOnly = false
}) => {
  const [docId, setDocId] = useState<string | undefined>(initialDocument?.id);
  const [title, setTitle] = useState(initialDocument?.title || 'Untitled Document');
  const [status, setStatus] = useState<DocumentRecord['status']>(initialDocument?.status || 'Draft');
  const [version, setVersion] = useState(initialDocument?.version || 1);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Layout State
  const [layout, setLayout] = useState<PageLayoutConfig>({
    pageSize: (initialDocument?.page_size as any) || CANONICAL_DOCUMENT_CONFIG.pageSize,
    orientation: initialDocument?.orientation || CANONICAL_DOCUMENT_CONFIG.orientation,
    marginTop: initialDocument?.margin_top ?? CANONICAL_DOCUMENT_CONFIG.marginTop,
    marginBottom: initialDocument?.margin_bottom ?? CANONICAL_DOCUMENT_CONFIG.marginBottom,
    marginLeft: initialDocument?.margin_left ?? CANONICAL_DOCUMENT_CONFIG.marginLeft,
    marginRight: initialDocument?.margin_right ?? CANONICAL_DOCUMENT_CONFIG.marginRight,
    columns: 1
  });

  // View State
  const [zoom, setZoom] = useState(1.0);
  const [showRuler, setShowRuler] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Autosave & Sync State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [lastSavedMessage, setLastSavedMessage] = useState('Saved');
  const autosaveTimerRef = useRef<number | null>(null);
  const isDirtyRef = useRef(false);

  // Dialogs
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isPaisFieldModalOpen, setIsPaisFieldModalOpen] = useState(false);
  const [isFindReplaceModalOpen, setIsFindReplaceModalOpen] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);

  // Reference for PDF export & Canvas
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Build active PAIS context for variable resolution
  const activePersonnel = (initialDocument?.personnel_ids?.[0]
    ? personnelList.find(p => p.id === initialDocument.personnel_ids![0])
    : personnelList[0]) || (associatedOrder?.personnelSnapshot?.[0]);

  const paisContext = {
    personnel: activePersonnel,
    order: associatedOrder,
    assignment: activePersonnel ? {
      position: activePersonnel.designation,
      sub_unit: activePersonnel.sub_unit || activePersonnel.division,
      station: activePersonnel.station
    } : undefined
  };

  // Determine starting content
  const getStartingHtml = () => {
    if (initialDocument?.content_html) return initialDocument.content_html;
    if (initialDocument?.content_json && Object.keys(initialDocument.content_json).length > 0) {
      return undefined; // TipTap can parse json
    }
    const defaultTmpl = DEFAULT_TEMPLATES.find(t => t.id === 'admin-order') || DEFAULT_TEMPLATES[0];
    return resolveAllPaisFieldsInHtml(defaultTmpl.html, paisContext);
  };

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        paragraph: false
      }),
      CustomParagraph,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      CustomTable.configure({
        resizable: true
      }),
      CustomTableRow,
      CustomTableHeader,
      CustomTableCell,
      CustomImage.configure({
        inline: true,
        allowBase64: true
      }),
      Link.configure({
        openOnClick: false
      }),
      Highlight,
      TextStyle,
      Color,
      PaisFieldNode,
      PageBreakNode
    ],
    content: initialDocument?.content_json && Object.keys(initialDocument.content_json).length > 0
      ? initialDocument.content_json
      : getStartingHtml(),
    editable: !readOnly,
    onUpdate: () => {
      isDirtyRef.current = true;
      triggerAutosaveDebounce();
    }
  });

  // Calculate word and character count
  const textContent = editor?.getText() || '';
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const characterCount = textContent.length;

  // Local storage unsaved changes recovery
  useEffect(() => {
    const backupKey = `pais_doc_backup_${docId || 'new'}`;
    const savedBackup = localStorage.getItem(backupKey);
    if (savedBackup && !initialDocument?.content_html) {
      try {
        const parsed = JSON.parse(savedBackup);
        if (parsed.content_html && window.confirm('Unsaved changes recovered from a previous session. Restore?')) {
          editor?.commands.setContent(parsed.content_html);
        }
      } catch {
        localStorage.removeItem(backupKey);
      }
    }
  }, [docId, editor]);

  // Autosave debounce (1.5 seconds)
  const triggerAutosaveDebounce = useCallback(() => {
    if (readOnly) return;
    setSaveStatus('idle');
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = window.setTimeout(async () => {
      await performSave({ isAutosave: true });
    }, 1500);
  }, [editor, title, onSave, readOnly]);

  // Perform Save action
  const performSave = async (options: { isAutosave?: boolean; changeSummary?: string } = {}) => {
    if (!editor) return;
    try {
      setSaveStatus('saving');
      const json = editor.getJSON();
      const html = editor.getHTML();

      // Backup to localStorage
      try {
        localStorage.setItem(`pais_doc_backup_${docId || 'new'}`, JSON.stringify({ title, content_html: html, timestamp: Date.now() }));
      } catch {}

      if (onSave) {
        const result = await onSave({
          id: docId,
          title,
          content_json: json,
          content_html: html,
          change_summary: options.changeSummary || (options.isAutosave ? 'Autosaved changes' : 'Manual save')
        });
        if (result?.id && !docId) setDocId(result.id);
        if (result?.version) setVersion(result.version);
      }

      setSaveStatus('saved');
      setLastSavedTime(new Date());
      setLastSavedMessage('Saved');
      isDirtyRef.current = false;
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      setLastSavedMessage('Unable to save changes');
    }
  };

  // Keyboard Shortcuts (Ctrl+S, Ctrl+P, Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        performSave({ isAutosave: false, changeSummary: 'Manual save via shortcut' });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindReplaceModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, title, docId]);

  // Update relative time message ("Last saved X seconds ago")
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === 'saved') {
        const diffSec = Math.floor((Date.now() - lastSavedTime.getTime()) / 1000);
        if (diffSec < 5) setLastSavedMessage('Saved');
        else if (diffSec < 60) setLastSavedMessage(`Saved ${diffSec}s ago`);
        else setLastSavedMessage(`Saved ${Math.floor(diffSec / 60)}m ago`);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [saveStatus, lastSavedTime]);

  // Insert Table handler
  const handleInsertTable = (rows: number, cols: number, withHeaderRow: boolean) => {
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
  };

  // Insert Image handler
  const handleInsertImage = (url: string, alt?: string) => {
    editor?.chain().focus().setImage({ src: url, alt }).run();
  };

  // Insert PAIS dynamic field handler
  const handleInsertPaisField = (field: PaisFieldDefinition, resolvedValue: string) => {
    editor?.chain().focus().insertContent({
      type: 'paisField',
      attrs: {
        fieldKey: field.key,
        label: field.label,
        category: field.category,
        fallbackValue: resolvedValue !== `[${field.key}]` ? resolvedValue : `{{${field.key}}}`
      }
    }).run();
  };

  // Find & Replace handlers
  const handleFind = (term: string, matchCase: boolean) => {
    if (!term || !editor) return;
    const content = editor.getText();
    const regex = new RegExp(term, matchCase ? 'g' : 'gi');
    const matches = [...content.matchAll(regex)];
    alert(`Found ${matches.length} occurrence(s) of "${term}".`);
  };

  const handleReplace = (findTerm: string, replaceTerm: string, matchCase: boolean) => {
    if (!findTerm || !editor) return;
    const html = editor.getHTML();
    const regex = new RegExp(findTerm, matchCase ? '' : 'i');
    if (regex.test(html)) {
      const updated = html.replace(regex, replaceTerm);
      editor.commands.setContent(updated);
    }
  };

  const handleReplaceAll = (findTerm: string, replaceTerm: string, matchCase: boolean) => {
    if (!findTerm || !editor) return;
    const html = editor.getHTML();
    const regex = new RegExp(findTerm, matchCase ? 'g' : 'gi');
    const updated = html.replace(regex, replaceTerm);
    editor.commands.setContent(updated);
  };

  // Export DOCX
  const handleExportDocx = async () => {
    if (!editor) return;
    await performSave({ isAutosave: true });
    await exportToDocx(editor.getHTML(), {
      title,
      pageSize: layout.pageSize,
      orientation: layout.orientation,
      marginTop: layout.marginTop,
      marginBottom: layout.marginBottom,
      marginLeft: layout.marginLeft,
      marginRight: layout.marginRight
    });
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await performSave({ isAutosave: true });
    await exportToPdf(canvasRef.current, {
      title,
      pageSize: layout.pageSize,
      orientation: layout.orientation
    });
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Duplicate Document
  const handleDuplicate = () => {
    setTitle(`${title} (Copy)`);
    setDocId(undefined);
    setVersion(1);
    setSaveStatus('idle');
    setLastSavedMessage('Duplicated as new draft');
    performSave({ changeSummary: 'Duplicated from existing document' });
  };

  // New Document from Template
  const handleCreateNew = (payload: { title: string; template: TemplatePreset }) => {
    setTitle(payload.title);
    setDocId(undefined);
    setVersion(1);
    setLayout(prev => ({
      ...prev,
      pageSize: payload.template.pageSize,
      orientation: payload.template.orientation,
      marginTop: payload.template.marginTop,
      marginBottom: payload.template.marginBottom,
      marginLeft: payload.template.marginLeft,
      marginRight: payload.template.marginRight
    }));
    const filledHtml = resolveAllPaisFieldsInHtml(payload.template.html, paisContext);
    editor?.commands.setContent(filledHtml);
    setSaveStatus('idle');
    setLastSavedMessage('New document initialized');
  };

  return (
    <div className={`flex flex-col bg-slate-100 dark:bg-[#070d18] ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[calc(100vh-80px)] min-h-[640px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden'}`}>
      {/* Top Application Bar */}
      <header className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-[#101b2b]">
        <div className="flex items-center gap-3 min-w-0">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              title="Return to previous view"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 shrink-0">
              PAIS 2.0 Editor
            </span>

            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                triggerAutosaveDebounce();
              }}
              className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:bg-slate-50 dark:focus:bg-slate-900 px-1 py-0.5 rounded outline-none truncate max-w-sm"
              title="Click to rename document"
            />
          </div>
        </div>

        {/* Right Header Status & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Autosave Status Pill */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-teal-600 animate-pulse">
                <Clock size={13} /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 size={13} /> {lastSavedMessage}
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={() => performSave()}
                className="flex items-center gap-1 text-rose-600 font-semibold hover:underline"
              >
                <AlertCircle size={13} /> Retry save
              </button>
            )}
          </div>

          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            v{version} · {status}
          </span>

          <button
            type="button"
            onClick={() => performSave({ changeSummary: 'Manual save' })}
            disabled={saveStatus === 'saving'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition"
          >
            <Save size={13} />
            <span>Save</span>
          </button>
        </div>
      </header>

      {/* Word-Like Ribbon */}
      <DocumentRibbon
        editor={editor}
        layout={layout}
        onChangeLayout={newLayout => setLayout(prev => ({ ...prev, ...newLayout }))}
        zoom={zoom}
        onChangeZoom={setZoom}
        showRuler={showRuler}
        onToggleRuler={() => setShowRuler(!showRuler)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        wordCount={wordCount}
        characterCount={characterCount}
        onNew={() => setIsNewDocModalOpen(true)}
        onSave={() => performSave({ changeSummary: 'Manual save' })}
        onDuplicate={handleDuplicate}
        onVersionHistory={() => setIsVersionHistoryModalOpen(true)}
        onProperties={() => setIsPropertiesModalOpen(true)}
        onOpenInsertTable={() => setIsTableModalOpen(true)}
        onOpenInsertImage={() => setIsImageModalOpen(true)}
        onOpenInsertPaisField={() => setIsPaisFieldModalOpen(true)}
        onOpenFindReplace={() => setIsFindReplaceModalOpen(true)}
        onExportPdf={handleExportPdf}
        onExportDocx={handleExportDocx}
        onPrint={handlePrint}
        onCloseEditor={onClose}
        saving={saveStatus === 'saving'}
      />

      {/* Realistic Document Canvas */}
      <DocumentCanvas
        editor={editor}
        layout={layout}
        zoom={zoom}
        showRuler={showRuler}
        canvasRef={canvasRef}
        headerText={CANONICAL_DOCUMENT_CONFIG.headerText}
        footerText={CANONICAL_DOCUMENT_CONFIG.footerText}
      />

      {/* Status Bar */}
      <footer className="no-print flex items-center justify-between border-t border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#101b2b] select-none">
        <div className="flex items-center gap-4">
          <span>Page 1 of 1</span>
          <span>Words: <strong className="text-slate-800 dark:text-slate-200">{wordCount.toLocaleString()}</strong></span>
          <span>Characters: <strong className="text-slate-800 dark:text-slate-200">{characterCount.toLocaleString()}</strong></span>
        </div>

        {/* Zoom Slider and Percentage */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom(Math.max(0.4, Number((zoom - 0.1).toFixed(1))))}
            className="p-1 hover:text-slate-900 dark:hover:text-white"
          >
            <ZoomOut size={13} />
          </button>
          <input
            type="range"
            min={0.4}
            max={2.0}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            className="h-1.5 w-24 accent-teal-600 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setZoom(Math.min(2.0, Number((zoom + 0.1).toFixed(1))))}
            className="p-1 hover:text-slate-900 dark:hover:text-white"
          >
            <ZoomIn size={13} />
          </button>
          <span className="w-10 text-right font-mono text-[11px] font-bold">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </footer>

      {/* Modals */}
      <InsertTableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onInsert={handleInsertTable}
      />

      <InsertImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={handleInsertImage}
      />

      <InsertPaisFieldModal
        isOpen={isPaisFieldModalOpen}
        onClose={() => setIsPaisFieldModalOpen(false)}
        onInsertField={handleInsertPaisField}
        activeContext={paisContext}
      />

      <FindReplaceModal
        isOpen={isFindReplaceModalOpen}
        onClose={() => setIsFindReplaceModalOpen(false)}
        onFind={handleFind}
        onReplace={handleReplace}
        onReplaceAll={handleReplaceAll}
      />

      <VersionHistoryModal
        isOpen={isVersionHistoryModalOpen}
        onClose={() => setIsVersionHistoryModalOpen(false)}
        versions={versions}
        currentVersion={version}
        onRestore={verNumber => {
          performSave({ changeSummary: `Restored to version ${verNumber}` });
        }}
        loading={loadingVersions}
      />

      <DocumentPropertiesModal
        isOpen={isPropertiesModalOpen}
        onClose={() => setIsPropertiesModalOpen(false)}
        document={{
          title,
          document_type: initialDocument?.document_type || 'Administrative Order',
          status,
          version,
          page_size: layout.pageSize,
          orientation: layout.orientation,
          created_by: initialDocument?.created_by || 'System',
          created_at: initialDocument?.created_at,
          updated_at: initialDocument?.updated_at
        }}
        wordCount={wordCount}
        characterCount={characterCount}
      />

      <NewDocumentModal
        isOpen={isNewDocModalOpen}
        onClose={() => setIsNewDocModalOpen(false)}
        onCreate={handleCreateNew}
        personnelList={personnelList}
      />
    </div>
  );
};
