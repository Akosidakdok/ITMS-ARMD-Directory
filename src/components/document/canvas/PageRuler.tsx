import React from 'react';

interface PageRulerProps {
  pageWidthMm: number;
  marginLeftMm: number;
  marginRightMm: number;
}

export const PageRuler: React.FC<PageRulerProps> = ({
  pageWidthMm,
  marginLeftMm,
  marginRightMm
}) => {
  const totalCm = Math.floor(pageWidthMm / 10);
  const leftMarginCm = marginLeftMm / 10;
  const rightMarginCm = (pageWidthMm - marginRightMm) / 10;

  return (
    <div className="no-print mx-auto mb-2 h-5 bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center relative text-[9px] font-mono text-slate-400 select-none overflow-hidden rounded-t shadow-2xs"
         style={{ width: `${pageWidthMm}mm`, maxWidth: '100%' }}>
      {/* Left Margin Shading */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-slate-200/80 dark:bg-slate-900/60 border-r border-slate-400"
        style={{ width: `${(marginLeftMm / pageWidthMm) * 100}%` }}
        title={`Left Margin: ${marginLeftMm}mm`}
      />

      {/* Right Margin Shading */}
      <div
        className="absolute top-0 bottom-0 right-0 bg-slate-200/80 dark:bg-slate-900/60 border-l border-slate-400"
        style={{ width: `${(marginRightMm / pageWidthMm) * 100}%` }}
        title={`Right Margin: ${marginRightMm}mm`}
      />

      {/* Centimeter ticks */}
      <div className="w-full flex justify-between px-1 relative z-10">
        {Array.from({ length: totalCm + 1 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <span className="h-2 w-px bg-slate-400" />
            <span className="text-[8px] leading-none mt-0.5">{idx}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
