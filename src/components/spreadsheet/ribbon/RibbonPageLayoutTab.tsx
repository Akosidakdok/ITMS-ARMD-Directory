import React from 'react';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Sliders,
  Eye,
  Columns
} from 'lucide-react';

interface RibbonPageLayoutTabProps {
  showGridlines: boolean;
  onToggleGridlines: () => void;
  showHeadings: boolean;
  onToggleHeadings: () => void;
  onOpenPageSetup: () => void;
  onPrintCurrentSheet: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
}

export const RibbonPageLayoutTab: React.FC<RibbonPageLayoutTabProps> = ({
  showGridlines,
  onToggleGridlines,
  showHeadings,
  onToggleHeadings,
  onOpenPageSetup,
  onPrintCurrentSheet,
  onExportPdf,
  onExportExcel
}) => {
  return (
    <div className="flex items-center gap-4 overflow-x-auto py-1 px-3 text-xs select-none">
      {/* 1. Page Setup */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onOpenPageSetup}
          title="Page Setup (Orientation, Margins, Paper Size)"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] mt-0.5">Page Setup</span>
        </button>
      </div>

      {/* 2. Sheet Options */}
      <div className="flex flex-col gap-1 pr-3 border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sheet Options</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showGridlines}
            onChange={onToggleGridlines}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Gridlines</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showHeadings}
            onChange={onToggleHeadings}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Headings (Row/Col)</span>
        </label>
      </div>

      {/* 3. Print & Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrintCurrentSheet}
          title="Print Active Worksheet (Ctrl+P)"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Printer className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          <span className="text-[10px] mt-0.5">Print</span>
        </button>

        <button
          onClick={onExportExcel}
          title="Export to Authentic Excel Workbook (.xlsx)"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-emerald-50 text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">Excel Export</span>
        </button>

        <button
          onClick={onExportPdf}
          title="Export Sheet as PDF Document"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-red-50 text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <FileText className="h-4 w-4" />
          <span className="text-[10px] mt-0.5">PDF Export</span>
        </button>
      </div>
    </div>
  );
};
