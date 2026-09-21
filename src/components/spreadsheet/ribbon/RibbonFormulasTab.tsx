import React from 'react';
import {
  Calculator,
  Sigma,
  Calendar,
  Layers,
  Search,
  Type,
  Clock
} from 'lucide-react';

interface RibbonFormulasTabProps {
  canEdit: boolean;
  onOpenFunctionWizard: () => void;
  onInsertFormula: (template: string) => void;
}

export const RibbonFormulasTab: React.FC<RibbonFormulasTabProps> = ({
  canEdit,
  onOpenFunctionWizard,
  onInsertFormula
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 px-3 text-xs select-none">
      {/* 1. Insert Function */}
      <div className="flex items-center pr-2 border-r border-slate-200 dark:border-slate-800">
        <button
          onClick={onOpenFunctionWizard}
          title="Insert Function Wizard"
          className="flex flex-col items-center px-2 py-1 rounded hover:bg-slate-100 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] mt-0.5 font-bold">Insert fx</span>
        </button>
      </div>

      {/* 2. AutoSum */}
      <div className="flex flex-col gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-800">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AutoSum</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onInsertFormula('=SUM(')}
            disabled={!canEdit}
            title="AutoSum"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Sigma className="h-3 w-3 text-blue-600" />
            <span>SUM</span>
          </button>
          <button
            onClick={() => onInsertFormula('=AVERAGE(')}
            disabled={!canEdit}
            title="Average"
            className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            AVERAGE
          </button>
          <button
            onClick={() => onInsertFormula('=COUNT(')}
            disabled={!canEdit}
            title="Count Numbers"
            className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            COUNT
          </button>
          <button
            onClick={() => onInsertFormula('=MAX(')}
            disabled={!canEdit}
            title="Maximum"
            className="px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-[10px] text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            MAX
          </button>
        </div>
      </div>

      {/* 3. Date & Time */}
      <div className="flex flex-col gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-800">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onInsertFormula('=TODAY()')}
            disabled={!canEdit}
            title="Current Date"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-[10px] text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Calendar className="h-3 w-3 text-amber-600" />
            <span>TODAY</span>
          </button>
          <button
            onClick={() => onInsertFormula('=DATEDIF(')}
            disabled={!canEdit}
            title="Calculate Age or Service Length"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-[10px] text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Clock className="h-3 w-3 text-purple-600" />
            <span>DATEDIF</span>
          </button>
        </div>
      </div>

      {/* 4. Logical & Text */}
      <div className="flex flex-col gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-800">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Logical & Text</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onInsertFormula('=IF(')}
            disabled={!canEdit}
            title="Logical IF"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-[10px] text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Layers className="h-3 w-3 text-emerald-600" />
            <span>IF</span>
          </button>
          <button
            onClick={() => onInsertFormula('=IFERROR(')}
            disabled={!canEdit}
            title="Error Trap"
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-[10px] text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            IFERROR
          </button>
          <button
            onClick={() => onInsertFormula('=CONCAT(')}
            disabled={!canEdit}
            title="Concatenate Strings"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-[10px] text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Type className="h-3 w-3 text-sky-600" />
            <span>CONCAT</span>
          </button>
        </div>
      </div>

      {/* 5. Lookup */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lookup</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onInsertFormula('=VLOOKUP(')}
            disabled={!canEdit}
            title="Vertical Lookup"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 text-[10px] text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Search className="h-3 w-3 text-indigo-600" />
            <span>VLOOKUP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
