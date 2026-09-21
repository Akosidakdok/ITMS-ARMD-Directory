import React from 'react';
import {
  Plus,
  Table,
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Calendar,
  Clock,
  Link,
  MessageSquarePlus
} from 'lucide-react';

interface RibbonInsertTabProps {
  canEdit: boolean;
  onInsertRow: () => void;
  onInsertColumn: () => void;
  onOpenChartModal: () => void;
  onInsertDate: () => void;
  onInsertTime: () => void;
  onInsertComment: () => void;
  onInsertHyperlink: () => void;
}

export const RibbonInsertTab: React.FC<RibbonInsertTabProps> = ({
  canEdit,
  onInsertRow,
  onInsertColumn,
  onOpenChartModal,
  onInsertDate,
  onInsertTime,
  onInsertComment,
  onInsertHyperlink
}) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto py-1 px-3 text-xs select-none">
      {/* 1. Rows and Columns */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onInsertRow}
          disabled={!canEdit}
          title="Insert Row Above"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 text-emerald-600" />
          <span className="text-[10px] mt-0.5">Insert Row</span>
        </button>

        <button
          onClick={onInsertColumn}
          disabled={!canEdit}
          title="Insert Column Left"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 text-emerald-600" />
          <span className="text-[10px] mt-0.5">Insert Col</span>
        </button>
      </div>

      {/* 2. Charts */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onOpenChartModal}
          title="Create Chart from Selected Data"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] mt-0.5">Chart</span>
        </button>

        <div className="flex gap-1">
          <button
            onClick={onOpenChartModal}
            title="Column Chart"
            className="p-1 rounded hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onOpenChartModal}
            title="Line Chart"
            className="p-1 rounded hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LineIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onOpenChartModal}
            title="Pie Chart"
            className="p-1 rounded hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <PieIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Date, Time & Hyperlink */}
      <div className="flex items-center gap-1">
        <button
          onClick={onInsertDate}
          disabled={!canEdit}
          title="Insert Current Date (=TODAY())"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Calendar className="h-4 w-4 text-amber-600" />
          <span className="text-[10px] mt-0.5">Today</span>
        </button>

        <button
          onClick={onInsertTime}
          disabled={!canEdit}
          title="Insert Current Time (=NOW())"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Clock className="h-4 w-4 text-purple-600" />
          <span className="text-[10px] mt-0.5">Now</span>
        </button>

        <button
          onClick={onInsertHyperlink}
          disabled={!canEdit}
          title="Insert Link"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Link className="h-4 w-4 text-blue-500" />
          <span className="text-[10px] mt-0.5">Link</span>
        </button>

        <button
          onClick={onInsertComment}
          disabled={!canEdit}
          title="Insert Cell Note/Comment"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <MessageSquarePlus className="h-4 w-4 text-emerald-600" />
          <span className="text-[10px] mt-0.5">Note</span>
        </button>
      </div>
    </div>
  );
};
