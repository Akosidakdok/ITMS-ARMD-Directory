import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  MessageSquarePlus,
  History,
  Lock,
  Unlock
} from 'lucide-react';

interface RibbonReviewTabProps {
  isProtected: boolean;
  onToggleProtect: () => void;
  onInsertComment: () => void;
  onOpenAuditDrawer: () => void;
}

export const RibbonReviewTab: React.FC<RibbonReviewTabProps> = ({
  isProtected,
  onToggleProtect,
  onInsertComment,
  onOpenAuditDrawer
}) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto py-1 px-3 text-xs select-none">
      {/* 1. Protection */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onToggleProtect}
          title={isProtected ? 'Unprotect Worksheet' : 'Protect Worksheet against accidental edits'}
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isProtected ? (
            <Lock className="h-4 w-4 text-amber-600" />
          ) : (
            <Unlock className="h-4 w-4 text-emerald-600" />
          )}
          <span className="text-[10px] mt-0.5 font-semibold">
            {isProtected ? 'Protected' : 'Protect'}
          </span>
        </button>
      </div>

      {/* 2. Comments/Notes */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onInsertComment}
          title="Add / Edit Cell Note"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <MessageSquarePlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] mt-0.5">New Note</span>
        </button>
      </div>

      {/* 3. Audit Trail */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenAuditDrawer}
          title="Open PAIS Worksheet Audit Trail Log"
          className="flex flex-col items-center px-2.5 py-1 rounded hover:bg-blue-50 text-blue-700 dark:text-sky-300 dark:hover:bg-blue-950/40"
        >
          <History className="h-4 w-4 text-blue-600" />
          <span className="text-[10px] mt-0.5 font-bold">Audit Trail</span>
        </button>
      </div>
    </div>
  );
};
