import React from 'react';
import {
  ArrowDownAZ,
  ArrowUpZA,
  Filter,
  FilterX,
  Upload,
  Download,
  CopyX,
  CheckCircle2
} from 'lucide-react';

interface RibbonDataTabProps {
  canEdit: boolean;
  onSortAZ: () => void;
  onSortZA: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onOpenImportModal: () => void;
  onRemoveDuplicates: () => void;
}

export const RibbonDataTab: React.FC<RibbonDataTabProps> = ({
  canEdit,
  onSortAZ,
  onSortZA,
  hasActiveFilters,
  onClearFilters,
  onOpenImportModal,
  onRemoveDuplicates
}) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto py-1 px-3 text-xs select-none">
      {/* 1. Sort */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onSortAZ}
          title="Sort Smallest to Largest (A to Z)"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowDownAZ className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] mt-0.5">Sort A-Z</span>
        </button>

        <button
          onClick={onSortZA}
          title="Sort Largest to Smallest (Z to A)"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowUpZA className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] mt-0.5">Sort Z-A</span>
        </button>
      </div>

      {/* 2. Filter */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          title="Clear all column filters"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <FilterX className="h-4 w-4 text-amber-600" />
          <span className="text-[10px] mt-0.5">Clear Filter</span>
        </button>
      </div>

      {/* 3. Data Tools */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onRemoveDuplicates}
          disabled={!canEdit}
          title="Highlight or Remove Duplicate Rows"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <CopyX className="h-4 w-4 text-purple-600" />
          <span className="text-[10px] mt-0.5">Duplicates</span>
        </button>
      </div>

      {/* 4. Import Excel */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenImportModal}
          disabled={!canEdit}
          title="Smart Import Excel File (Auto-detects header row, e.g. row 8)"
          className="flex flex-col items-center px-2.5 py-1 rounded hover:bg-blue-50 text-blue-700 dark:text-sky-300 dark:hover:bg-blue-950/40"
        >
          <Upload className="h-4 w-4 text-blue-600" />
          <span className="text-[10px] mt-0.5 font-bold">Import Excel</span>
        </button>
      </div>
    </div>
  );
};
