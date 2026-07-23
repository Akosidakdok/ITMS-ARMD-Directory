import React, { useState } from 'react';
import { Modal } from './Modal';
import { Printer, Download, CheckCircle, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  data: any[];
  columns: { key: string; label: string }[];
}

export const ExportPrintModal: React.FC<ExportPrintModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  data,
  columns
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportCSV = () => {
    // Generate CSV string
    const headers = columns.map(c => c.label).join(',');
    const rows = data.map(row => 
      columns.map(c => {
        const val = row[c.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export / Print: ${reportTitle}`}
      subtitle={`Previewing ${data.length} records formatted for official PNP ITMS administrative reporting`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30">
              Official ITMS Format
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Rows: <strong className="text-slate-900 dark:text-white font-mono">{data.length}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Exported CSV!
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" /> Export CSV Data
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Printable/Preview container */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/80 p-6 space-y-4 shadow-xs">
          <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Republic of the Philippines</h2>
            <h3 className="text-sm font-extrabold text-blue-700 dark:text-blue-400 tracking-wider uppercase mt-0.5">PHILIPPINE NATIONAL POLICE</h3>
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</h4>
            <p className="text-xs text-slate-500 mt-0.5">Camp BGen Rafael T Crame, Quezon City</p>
            <h1 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wide mt-3">{reportTitle}</h1>
            <p className="text-xs text-slate-500 font-mono">Date Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 text-blue-700 dark:text-blue-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">#</th>
                  {columns.map(c => (
                    <th key={c.key} className="py-2.5 px-3">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    {columns.map(c => (
                      <td key={c.key} className="py-2 px-3">
                        {String(row[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>PAIS ITMS System Generated Report</span>
            <span className="font-mono text-[10px]">RESTRICTED - FOR INTERNAL USE ONLY</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

