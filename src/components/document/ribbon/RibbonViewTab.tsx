import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sliders,
  Ruler
} from 'lucide-react';

interface RibbonViewTabProps {
  zoom: number;
  onChangeZoom: (newZoom: number) => void;
  showRuler: boolean;
  onToggleRuler: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const RibbonViewTab: React.FC<RibbonViewTabProps> = ({
  zoom,
  onChangeZoom,
  showRuler,
  onToggleRuler,
  isFullscreen,
  onToggleFullscreen
}) => {
  const ZOOM_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 text-xs">
      {/* Zoom Controls */}
      <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3">
        <span className="font-semibold text-slate-500 mr-1">Zoom:</span>
        <button
          type="button"
          onClick={() => onChangeZoom(Math.max(0.4, Number((zoom - 0.1).toFixed(1))))}
          className="rounded p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>

        <span className="w-12 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={() => onChangeZoom(Math.min(2.0, Number((zoom + 0.1).toFixed(1))))}
          className="rounded p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>

        <div className="flex gap-1 ml-2">
          {ZOOM_PRESETS.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => onChangeZoom(preset)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                Math.round(zoom * 100) === Math.round(preset * 100)
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {Math.round(preset * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Show Ruler Toggle */}
      <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
        <button
          type="button"
          onClick={onToggleRuler}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition ${
            showRuler
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 border border-teal-300'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <Ruler size={13} />
          <span>Ruler</span>
        </button>
      </div>

      {/* Fullscreen Toggle */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
        </button>
      </div>
    </div>
  );
};
