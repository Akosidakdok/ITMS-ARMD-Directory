import React from 'react';
import {
  FileText,
  RotateCw,
  Maximize2,
  Columns2,
  Columns3,
  AlignJustify
} from 'lucide-react';

export interface PageLayoutConfig {
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  columns: 1 | 2 | 3;
}

interface RibbonLayoutTabProps {
  layout: PageLayoutConfig;
  onChangeLayout: (newLayout: Partial<PageLayoutConfig>) => void;
}

export const RibbonLayoutTab: React.FC<RibbonLayoutTabProps> = ({ layout, onChangeLayout }) => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 text-xs">
      {/* Page Size */}
      <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3">
        <span className="font-semibold text-slate-500">Size:</span>
        <select
          value={layout.pageSize}
          onChange={e => onChangeLayout({ pageSize: e.target.value as PageLayoutConfig['pageSize'] })}
          className="h-7 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-medium"
        >
          <option value="A4">A4 (210 × 297 mm)</option>
          <option value="Letter">Letter (8.5 × 11 in)</option>
          <option value="Legal">Legal (8.5 × 14 in)</option>
        </select>
      </div>

      {/* Orientation */}
      <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-3">
        <span className="font-semibold text-slate-500 mr-0.5">Orientation:</span>
        <button
          type="button"
          onClick={() => onChangeLayout({ orientation: 'portrait' })}
          className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
            layout.orientation === 'portrait'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <FileText size={13} />
          <span>Portrait</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeLayout({ orientation: 'landscape' })}
          className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
            layout.orientation === 'landscape'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <RotateCw size={13} />
          <span>Landscape</span>
        </button>
      </div>

      {/* Margins Presets */}
      <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3">
        <span className="font-semibold text-slate-500">Margins:</span>
        <select
          value={
            layout.marginTop === 25.4 && layout.marginLeft === 25.4
              ? 'normal'
              : layout.marginTop === 12.7 && layout.marginLeft === 12.7
                ? 'narrow'
                : layout.marginTop === 19 && layout.marginLeft === 19
                  ? 'moderate'
                  : layout.marginTop === 38 && layout.marginLeft === 38
                    ? 'wide'
                    : 'custom'
          }
          onChange={e => {
            const val = e.target.value;
            if (val === 'normal') onChangeLayout({ marginTop: 25.4, marginBottom: 25.4, marginLeft: 25.4, marginRight: 25.4 });
            else if (val === 'narrow') onChangeLayout({ marginTop: 12.7, marginBottom: 12.7, marginLeft: 12.7, marginRight: 12.7 });
            else if (val === 'moderate') onChangeLayout({ marginTop: 19.05, marginBottom: 19.05, marginLeft: 19.05, marginRight: 19.05 });
            else if (val === 'wide') onChangeLayout({ marginTop: 38.1, marginBottom: 38.1, marginLeft: 38.1, marginRight: 38.1 });
          }}
          className="h-7 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-medium"
        >
          <option value="normal">Normal (1 in / 25.4 mm)</option>
          <option value="narrow">Narrow (0.5 in / 12.7 mm)</option>
          <option value="moderate">Moderate (0.75 in / 19 mm)</option>
          <option value="wide">Wide (1.5 in / 38 mm)</option>
          <option value="custom">Custom Margins</option>
        </select>
      </div>

      {/* Columns */}
      <div className="flex items-center gap-1">
        <span className="font-semibold text-slate-500 mr-0.5">Columns:</span>
        <button
          type="button"
          onClick={() => onChangeLayout({ columns: 1 })}
          className={`rounded px-2 py-1 font-medium transition ${
            layout.columns === 1
              ? 'bg-teal-600 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
          title="Single Column"
        >
          One
        </button>
        <button
          type="button"
          onClick={() => onChangeLayout({ columns: 2 })}
          className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition ${
            layout.columns === 2
              ? 'bg-teal-600 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
          title="Two Columns"
        >
          <Columns2 size={13} />
          <span>Two</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeLayout({ columns: 3 })}
          className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition ${
            layout.columns === 3
              ? 'bg-teal-600 text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
          title="Three Columns"
        >
          <Columns3 size={13} />
          <span>Three</span>
        </button>
      </div>
    </div>
  );
};
