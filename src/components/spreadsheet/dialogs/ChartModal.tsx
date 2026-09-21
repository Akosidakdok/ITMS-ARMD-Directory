import React, { useState, useMemo } from 'react';
import { X, BarChart3, LineChart as LineIcon, PieChart as PieIcon, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRangeText: string;
  data: Array<{ label: string; value: number }>;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

export const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  selectedRangeText,
  data
}) => {
  const [chartType, setChartType] = useState<'column' | 'bar' | 'line' | 'pie'>('column');
  const [title, setTitle] = useState(`Chart: ${selectedRangeText || 'Selected Data'}`);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { label: 'Sample A', value: 35 },
        { label: 'Sample B', value: 48 },
        { label: 'Sample C', value: 24 },
        { label: 'Sample D', value: 65 }
      ];
    }
    return data.slice(0, 30);
  }, [data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#101b2b] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Excel Chart Visualizer</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Data Source: {selectedRangeText || 'Current Selection'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-[#0c1624]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChartType('column')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                chartType === 'column'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Column
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                chartType === 'bar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 rotate-90" />
              Bar
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <LineIcon className="h-3.5 w-3.5" />
              Line
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                chartType === 'pie'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <PieIcon className="h-3.5 w-3.5" />
              Pie
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200 max-w-[240px]"
            placeholder="Chart Title"
          />
        </div>

        {/* Chart Canvas */}
        <div className="flex-1 p-6 min-h-[350px]">
          <h3 className="mb-4 text-center text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
          <ResponsiveContainer width="100%" height={320}>
            {chartType === 'column' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chartType === 'bar' ? (
              <BarChart layout="vertical" data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="label" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" name="Value" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            ) : (
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={110} label>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-3 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1624]">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
