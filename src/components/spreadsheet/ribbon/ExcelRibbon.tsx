import React, { useState } from 'react';
import {
  Save,
  RotateCcw,
  RotateCw,
  Printer,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { RibbonHomeTab } from './RibbonHomeTab';
import { RibbonInsertTab } from './RibbonInsertTab';
import { RibbonPageLayoutTab } from './RibbonPageLayoutTab';
import { RibbonFormulasTab } from './RibbonFormulasTab';
import { RibbonDataTab } from './RibbonDataTab';
import { RibbonReviewTab } from './RibbonReviewTab';
import { RibbonViewTab } from './RibbonViewTab';

export type RibbonTabType = 'home' | 'insert' | 'pageLayout' | 'formulas' | 'data' | 'review' | 'view';

interface ExcelRibbonProps {
  activeTab: RibbonTabType;
  onChangeTab: (tab: RibbonTabType) => void;
  isSaving: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  unsavedCount: number;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPrint: () => void;

  // Children tab props
  homeProps: React.ComponentProps<typeof RibbonHomeTab>;
  insertProps: React.ComponentProps<typeof RibbonInsertTab>;
  pageLayoutProps: React.ComponentProps<typeof RibbonPageLayoutTab>;
  formulasProps: React.ComponentProps<typeof RibbonFormulasTab>;
  dataProps: React.ComponentProps<typeof RibbonDataTab>;
  reviewProps: React.ComponentProps<typeof RibbonReviewTab>;
  viewProps: React.ComponentProps<typeof RibbonViewTab>;
}

export const ExcelRibbon: React.FC<ExcelRibbonProps> = ({
  activeTab,
  onChangeTab,
  isSaving,
  saveStatus,
  unsavedCount,
  onSave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPrint,
  homeProps,
  insertProps,
  pageLayoutProps,
  formulasProps,
  dataProps,
  reviewProps,
  viewProps
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="border-b border-slate-200 bg-[#f3f4f6] dark:border-slate-800 dark:bg-[#0c1624] text-xs">
      {/* Top Quick Access Toolbar & Tabs Bar */}
      <div className="flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {/* Excel Brand & Quick Access */}
          <div className="flex items-center gap-1 pr-3 border-r border-slate-300 dark:border-slate-700 py-1.5">
            <div className="rounded bg-emerald-600 p-1 text-white shadow-xs">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <button
              onClick={onSave}
              disabled={isSaving || unsavedCount === 0}
              title={unsavedCount > 0 ? `Save ${unsavedCount} change(s) (Ctrl+S)` : 'All changes saved'}
              className="p-1 rounded hover:bg-slate-200 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              ) : (
                <Save className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400" />
              )}
            </button>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1 rounded hover:bg-slate-200 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1 rounded hover:bg-slate-200 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-30"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onPrint}
              title="Print (Ctrl+P)"
              className="p-1 rounded hover:bg-slate-200 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Ribbon Tabs Switcher */}
          <div className="flex items-center gap-0.5">
            {[
              { id: 'home', label: 'Home' },
              { id: 'insert', label: 'Insert' },
              { id: 'pageLayout', label: 'Page Layout' },
              { id: 'formulas', label: 'Formulas' },
              { id: 'data', label: 'Data' },
              { id: 'review', label: 'Review' },
              { id: 'view', label: 'View' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  onChangeTab(tab.id as RibbonTabType);
                  if (isCollapsed) setIsCollapsed(false);
                }}
                className={`px-3 py-2 text-xs font-semibold transition border-b-2 ${
                  activeTab === tab.id && !isCollapsed
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#101b2b]'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Save state & Ribbon Collapse */}
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-sky-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved ({unsavedCount})
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" />
              Error saving
            </span>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Ribbon' : 'Collapse Ribbon'}
            className="p-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Active Ribbon Panel */}
      {!isCollapsed && (
        <div className="bg-white dark:bg-[#101b2b] py-1 shadow-inner min-h-[48px] flex items-center">
          {activeTab === 'home' && <RibbonHomeTab {...homeProps} />}
          {activeTab === 'insert' && <RibbonInsertTab {...insertProps} />}
          {activeTab === 'pageLayout' && <RibbonPageLayoutTab {...pageLayoutProps} />}
          {activeTab === 'formulas' && <RibbonFormulasTab {...formulasProps} />}
          {activeTab === 'data' && <RibbonDataTab {...dataProps} />}
          {activeTab === 'review' && <RibbonReviewTab {...reviewProps} />}
          {activeTab === 'view' && <RibbonViewTab {...viewProps} />}
        </div>
      )}
    </div>
  );
};
