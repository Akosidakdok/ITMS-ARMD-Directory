import React, { useState, useMemo } from 'react';
import { X, Calculator, Search, Check } from 'lucide-react';

interface InsertFunctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFunction: (template: string) => void;
}

interface FunctionDef {
  name: string;
  category: 'Math' | 'Date' | 'Logical' | 'Text' | 'Lookup';
  syntax: string;
  template: string;
  description: string;
}

const FUNCTIONS: FunctionDef[] = [
  { name: 'SUM', category: 'Math', syntax: 'SUM(number1, [number2], ...)', template: '=SUM(', description: 'Adds all the numbers in a range of cells.' },
  { name: 'AVERAGE', category: 'Math', syntax: 'AVERAGE(number1, [number2], ...)', template: '=AVERAGE(', description: 'Returns the average (arithmetic mean) of the arguments.' },
  { name: 'MIN', category: 'Math', syntax: 'MIN(number1, [number2], ...)', template: '=MIN(', description: 'Returns the smallest number in a set of values.' },
  { name: 'MAX', category: 'Math', syntax: 'MAX(number1, [number2], ...)', template: '=MAX(', description: 'Returns the largest number in a set of values.' },
  { name: 'COUNT', category: 'Math', syntax: 'COUNT(value1, [value2], ...)', template: '=COUNT(', description: 'Counts the number of cells that contain numbers.' },
  { name: 'COUNTA', category: 'Math', syntax: 'COUNTA(value1, [value2], ...)', template: '=COUNTA(', description: 'Counts the number of cells that are not empty.' },
  { name: 'ROUND', category: 'Math', syntax: 'ROUND(number, num_digits)', template: '=ROUND(', description: 'Rounds a number to a specified number of digits.' },
  { name: 'SUMIF', category: 'Math', syntax: 'SUMIF(range, criteria, [sum_range])', template: '=SUMIF(', description: 'Adds the cells specified by a given condition or criteria.' },
  { name: 'COUNTIF', category: 'Math', syntax: 'COUNTIF(range, criteria)', template: '=COUNTIF(', description: 'Counts the number of cells that meet a criterion.' },

  { name: 'TODAY', category: 'Date', syntax: 'TODAY()', template: '=TODAY()', description: 'Returns the current calendar date.' },
  { name: 'NOW', category: 'Date', syntax: 'NOW()', template: '=NOW()', description: 'Returns the current date and time.' },
  { name: 'DATE', category: 'Date', syntax: 'DATE(year, month, day)', template: '=DATE(', description: 'Returns the serial number that represents a particular date.' },
  { name: 'DATEDIF', category: 'Date', syntax: 'DATEDIF(start_date, end_date, unit)', template: '=DATEDIF(', description: 'Calculates the number of days, months, or years between two dates.' },

  { name: 'IF', category: 'Logical', syntax: 'IF(logical_test, [value_if_true], [value_if_false])', template: '=IF(', description: 'Checks whether a condition is met, and returns one value if TRUE, and another value if FALSE.' },
  { name: 'AND', category: 'Logical', syntax: 'AND(logical1, [logical2], ...)', template: '=AND(', description: 'Returns TRUE if all its arguments evaluate to TRUE.' },
  { name: 'OR', category: 'Logical', syntax: 'OR(logical1, [logical2], ...)', template: '=OR(', description: 'Returns TRUE if any argument is TRUE.' },
  { name: 'NOT', category: 'Logical', syntax: 'NOT(logical)', template: '=NOT(', description: 'Reverses the logic of its argument.' },
  { name: 'IFERROR', category: 'Logical', syntax: 'IFERROR(value, value_if_error)', template: '=IFERROR(', description: 'Returns value_if_error if expression is an error and the value of the expression itself otherwise.' },

  { name: 'CONCAT', category: 'Text', syntax: 'CONCAT(text1, [text2], ...)', template: '=CONCAT(', description: 'Combines the text from multiple ranges and/or strings.' },
  { name: 'LEFT', category: 'Text', syntax: 'LEFT(text, [num_chars])', template: '=LEFT(', description: 'Returns the specified number of characters from the start of a text string.' },
  { name: 'RIGHT', category: 'Text', syntax: 'RIGHT(text, [num_chars])', template: '=RIGHT(', description: 'Returns the specified number of characters from the end of a text string.' },
  { name: 'MID', category: 'Text', syntax: 'MID(text, start_num, num_chars)', template: '=MID(', description: 'Returns a specific number of characters from a text string, starting at the position you specify.' },
  { name: 'LEN', category: 'Text', syntax: 'LEN(text)', template: '=LEN(', description: 'Returns the number of characters in a text string.' },
  { name: 'TRIM', category: 'Text', syntax: 'TRIM(text)', template: '=TRIM(', description: 'Removes all spaces from text except for single spaces between words.' },
  { name: 'UPPER', category: 'Text', syntax: 'UPPER(text)', template: '=UPPER(', description: 'Converts text to uppercase.' },
  { name: 'LOWER', category: 'Text', syntax: 'LOWER(text)', template: '=LOWER(', description: 'Converts text to lowercase.' },

  { name: 'VLOOKUP', category: 'Lookup', syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])', template: '=VLOOKUP(', description: 'Looks for a value in the leftmost column of a table, and then returns a value in the same row from a column you specify.' },
  { name: 'INDEX', category: 'Lookup', syntax: 'INDEX(array, row_num, [column_num])', template: '=INDEX(', description: 'Returns a value or the reference to a value from within a table or range.' },
  { name: 'MATCH', category: 'Lookup', syntax: 'MATCH(lookup_value, lookup_array, [match_type])', template: '=MATCH(', description: 'Returns the relative position of an item in an array that matches a specified value.' }
];

export const InsertFunctionModal: React.FC<InsertFunctionModalProps> = ({
  isOpen,
  onClose,
  onSelectFunction
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [selectedFunc, setSelectedFunc] = useState<FunctionDef>(FUNCTIONS[0]);

  const filtered = useMemo(() => {
    return FUNCTIONS.filter(f => {
      const matchCat = selectedCategory === 'All' || f.category === selectedCategory;
      const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, search]);

  if (!isOpen) return null;

  const handleInsert = () => {
    if (selectedFunc) {
      onSelectFunction(selectedFunc.template);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#101b2b] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Insert Function (fx)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select a formula to insert into active cell</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0c1624] flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search functions (e.g. SUM, DATEDIF, IF)..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-[#142232] dark:text-white"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200"
          >
            <option value="All">All Categories</option>
            <option value="Math">Math & Trig</option>
            <option value="Date">Date & Time</option>
            <option value="Logical">Logical</option>
            <option value="Text">Text</option>
            <option value="Lookup">Lookup & Reference</option>
          </select>
        </div>

        {/* Function list & description */}
        <div className="grid grid-cols-2 p-4 gap-4 h-64">
          <div className="overflow-y-auto border border-slate-200 rounded-xl dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(fn => (
              <button
                key={fn.name}
                onClick={() => setSelectedFunc(fn)}
                onDoubleClick={handleInsert}
                className={`w-full text-left px-3 py-2 text-xs transition flex items-center justify-between ${
                  selectedFunc?.name === fn.name
                    ? 'bg-blue-600 text-white font-bold'
                    : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>{fn.name}</span>
                <span className={`text-[10px] ${selectedFunc?.name === fn.name ? 'text-blue-100' : 'text-slate-400'}`}>
                  {fn.category}
                </span>
              </button>
            ))}
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#0c1624] flex flex-col justify-between">
            {selectedFunc ? (
              <div className="space-y-3">
                <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                  {selectedFunc.syntax}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedFunc.description}
                </p>
                <div className="rounded bg-slate-200/60 dark:bg-slate-800 px-2 py-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                  Inserts: {selectedFunc.template}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Select a function to view details</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-[#0c1624]">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!selectedFunc}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Insert Function
          </button>
        </div>
      </div>
    </div>
  );
};
