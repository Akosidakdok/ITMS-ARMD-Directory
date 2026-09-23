import React, { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { RibbonFileMenu } from './RibbonFileMenu';
import { RibbonHomeTab } from './RibbonHomeTab';
import { RibbonInsertTab } from './RibbonInsertTab';
import { RibbonLayoutTab, PageLayoutConfig } from './RibbonLayoutTab';
import { RibbonReviewTab } from './RibbonReviewTab';
import { RibbonViewTab } from './RibbonViewTab';

export type RibbonTabKey = 'home' | 'insert' | 'layout' | 'review' | 'view';

interface DocumentRibbonProps {
  editor: Editor | null;
  layout: PageLayoutConfig;
  onChangeLayout: (newLayout: Partial<PageLayoutConfig>) => void;
  zoom: number;
  onChangeZoom: (newZoom: number) => void;
  showRuler: boolean;
  onToggleRuler: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  wordCount: number;
  characterCount: number;
  onNew: () => void;
  onSave: () => void;
  onDuplicate: () => void;
  onVersionHistory: () => void;
  onProperties: () => void;
  onOpenInsertTable: () => void;
  onOpenInsertImage: () => void;
  onOpenInsertPaisField: () => void;
  onOpenFindReplace: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onPrint: () => void;
  onCloseEditor?: () => void;
  saving?: boolean;
}

export const DocumentRibbon: React.FC<DocumentRibbonProps> = ({
  editor,
  layout,
  onChangeLayout,
  zoom,
  onChangeZoom,
  showRuler,
  onToggleRuler,
  isFullscreen,
  onToggleFullscreen,
  wordCount,
  characterCount,
  onNew,
  onSave,
  onDuplicate,
  onVersionHistory,
  onProperties,
  onOpenInsertTable,
  onOpenInsertImage,
  onOpenInsertPaisField,
  onOpenFindReplace,
  onExportPdf,
  onExportDocx,
  onPrint,
  onCloseEditor,
  saving = false
}) => {
  const [activeTab, setActiveTab] = useState<RibbonTabKey>('home');

  const TABS: { key: RibbonTabKey; label: string }[] = [
    { key: 'home', label: 'Home' },
    { key: 'insert', label: 'Insert' },
    { key: 'layout', label: 'Layout' },
    { key: 'review', label: 'Review' },
    { key: 'view', label: 'View' }
  ];

  return (
    <div className="no-print border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-[#0c1524] select-none">
      {/* Top Tab Bar */}
      <div className="flex items-center gap-1 px-3 pt-1.5 border-b border-slate-200/80 dark:border-slate-800/80">
        <RibbonFileMenu
          onNew={onNew}
          onSave={onSave}
          onDuplicate={onDuplicate}
          onVersionHistory={onVersionHistory}
          onProperties={onProperties}
          onExportPdf={onExportPdf}
          onExportDocx={onExportDocx}
          onPrint={onPrint}
          onCloseEditor={onCloseEditor}
          saving={saving}
        />

        <div className="flex items-center gap-0.5 ml-2">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-t-md transition-all ${
                  isActive
                    ? 'bg-white text-teal-800 border-t-2 border-teal-600 shadow-2xs dark:bg-[#101b2b] dark:text-teal-300 dark:border-teal-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Ribbon Content Panel */}
      <div className="min-h-[46px] bg-white dark:bg-[#101b2b]">
        {activeTab === 'home' && <RibbonHomeTab editor={editor} />}
        {activeTab === 'insert' && (
          <RibbonInsertTab
            editor={editor}
            onOpenInsertTable={onOpenInsertTable}
            onOpenInsertImage={onOpenInsertImage}
            onOpenInsertPaisField={onOpenInsertPaisField}
          />
        )}
        {activeTab === 'layout' && (
          <RibbonLayoutTab layout={layout} onChangeLayout={onChangeLayout} />
        )}
        {activeTab === 'review' && (
          <RibbonReviewTab
            onOpenFindReplace={onOpenFindReplace}
            onOpenVersionHistory={onOpenVersionHistory}
            onOpenProperties={onOpenProperties}
            wordCount={wordCount}
            characterCount={characterCount}
          />
        )}
        {activeTab === 'view' && (
          <RibbonViewTab
            zoom={zoom}
            onChangeZoom={onChangeZoom}
            showRuler={showRuler}
            onToggleRuler={onToggleRuler}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
          />
        )}
      </div>
    </div>
  );
};
