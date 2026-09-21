import React from 'react';
import { ExcelWorksheetModule } from '../components/spreadsheet/ExcelWorksheetModule';

export const ExcelIntegrationPage: React.FC = () => {
  return (
    <div className="mx-auto max-w-[1680px] space-y-4">
      {/* Top Banner */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
              PAIS 2.0 Spreadsheet Module
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">disposition September 7, 2026.xlsx</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Interactive Excel Worksheets
          </h1>
        </div>
      </section>

      {/* FULL EXCEL WORKSHEET MODULE (5 TABS) */}
      <div className="w-full">
        <ExcelWorksheetModule />
      </div>
    </div>
  );
};

