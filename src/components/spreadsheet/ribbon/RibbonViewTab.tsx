import React from 'react';
import {
  Grid,
  SquareCode,
  Heading,
  ZoomIn,
  ZoomOut,
  Pin,
  PinOff
} from 'lucide-react';

interface RibbonViewTabProps {
  showGridlines: boolean;
  onToggleGridlines: () => void;
  showFormulaBar: boolean;
  onToggleFormulaBar: () => void;
  showHeadings: boolean;
  onToggleHeadings: () => void;

  zoomScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onChangeZoom: (zoom: number) => void;

  freezePanes: boolean;
  onToggleFreezePanes: () => void;
}

export const RibbonViewTab: React.FC<RibbonViewTabProps> = ({
  showGridlines,
  onToggleGridlines,
  showFormulaBar,
  onToggleFormulaBar,
  showHeadings,
  onToggleHeadings,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onChangeZoom,
  freezePanes,
  onToggleFreezePanes
}) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto py-1 px-3 text-xs select-none">
      {/* 1. Show / Hide */}
      <div className="flex flex-col gap-1 pr-3 border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Show</span>
        <div className="flex items-center gap-3">
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
              checked={showFormulaBar}
              onChange={onToggleFormulaBar}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Formula Bar</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showHeadings}
              onChange={onToggleHeadings}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Headings</span>
          </label>
        </div>
      </div>

      {/* 2. Zoom */}
      <div className="flex items-center gap-1 pr-3 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onZoomOut}
          title="Zoom Out (-10%)"
          className="p-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <select
          value={zoomScale}
          onChange={e => onChangeZoom(Number(e.target.value))}
          className="h-6 rounded border border-slate-200 bg-white px-1.5 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200 w-16 text-center font-bold"
        >
          <option value={60}>60%</option>
          <option value={75}>75%</option>
          <option value={90}>90%</option>
          <option value={100}>100%</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
        </select>

        <button
          onClick={onZoomIn}
          title="Zoom In (+10%)"
          className="p-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        <button
          onClick={onResetZoom}
          title="Reset Zoom to 100%"
          className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ml-1"
        >
          100%
        </button>
      </div>

      {/* 3. Freeze Panes */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleFreezePanes}
          title={freezePanes ? 'Unfreeze Panes' : 'Freeze Rows & Columns Header Panes'}
          className={`flex flex-col items-center px-2 py-1 rounded transition ${
            freezePanes
              ? 'bg-blue-100 text-blue-900 font-bold dark:bg-blue-900/60 dark:text-blue-200'
              : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {freezePanes ? <PinOff className="h-4 w-4 text-blue-600" /> : <Pin className="h-4 w-4 text-slate-500" />}
          <span className="text-[10px] mt-0.5">{freezePanes ? 'Unfreeze' : 'Freeze Panes'}</span>
        </button>
      </div>
    </div>
  );
};
