import React from 'react';
import {
  Search,
  Replace,
  History,
  Info,
  Hash,
  FileCheck
} from 'lucide-react';

interface RibbonReviewTabProps {
  onOpenFindReplace: () => void;
  onOpenVersionHistory: () => void;
  onOpenProperties: () => void;
  wordCount: number;
  characterCount: number;
}

export const RibbonReviewTab: React.FC<RibbonReviewTabProps> = ({
  onOpenFindReplace,
  onOpenVersionHistory,
  onOpenProperties,
  wordCount,
  characterCount
}) => {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-xs">
      {/* Search & Replace */}
      <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3">
        <button
          type="button"
          onClick={onOpenFindReplace}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <Search size={14} className="text-teal-600" />
          <span>Find & Replace</span>
        </button>
      </div>

      {/* Version History */}
      <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3">
        <button
          type="button"
          onClick={onOpenVersionHistory}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <History size={14} className="text-blue-600" />
          <span>Version History</span>
        </button>

        <button
          type="button"
          onClick={onOpenProperties}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <Info size={14} className="text-slate-500" />
          <span>Document Info</span>
        </button>
      </div>

      {/* Word and Character Count pill */}
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-3 py-1 font-mono text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Hash size={13} className="text-slate-400" />
        <span>Words: <strong className="text-slate-900 dark:text-white">{wordCount.toLocaleString()}</strong></span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span>Characters: <strong className="text-slate-900 dark:text-white">{characterCount.toLocaleString()}</strong></span>
      </div>
    </div>
  );
};
