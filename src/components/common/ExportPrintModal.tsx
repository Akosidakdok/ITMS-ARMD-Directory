import React, { useState } from 'react';
import { Modal } from './Modal';
import { Printer, CheckCircle, FileSpreadsheet, FileDown } from 'lucide-react';

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
  const [exportingPdf, setExportingPdf] = useState(false);

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

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      document.setFontSize(14);
      document.text(reportTitle, 14, 16);
      document.setFontSize(8);
      document.text(`Generated: ${new Date().toLocaleString('en-PH')} • ${data.length} records`, 14, 22);
      autoTable(document, {
        startY: 27,
        head: [columns.map(column => column.label)],
        body: data.map(row => columns.map(column => String(row[column.key] ?? '—'))),
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [29, 78, 216], textColor: 255 }
      });
      document.save(`${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}.pdf`);
    } finally {
      setExportingPdf(false);
    }
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
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-extrabold rounded bg-blue-50 text-blue-700 border border-blue-200">
              Official ITMS Format
            </span>
            <span className="text-xs text-slate-600 font-bold">Total Rows: <strong className="text-slate-900 font-mono">{data.length}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleExportPdf} disabled={exportingPdf} className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-colors disabled:opacity-60">
              <FileDown className="w-4 h-4" /> {exportingPdf ? 'Creating PDF…' : 'Export PDF'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
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
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Printable/Preview container */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white p-6 space-y-4 shadow-2xs">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-[11px] uppercase tracking-widest text-slate-500 font-extrabold">Republic of the Philippines</h2>
            <h3 className="text-sm font-extrabold text-blue-700 tracking-wider uppercase mt-0.5">PHILIPPINE NATIONAL POLICE</h3>
            <h4 className="text-xs font-bold text-slate-700">INFORMATION TECHNOLOGY MANAGEMENT SERVICE</h4>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Camp BGen Rafael T Crame, Quezon City</p>
            <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wide mt-3">{reportTitle}</h1>
            <p className="text-xs text-slate-500 font-mono font-semibold">Date Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase text-[11px]">
                  <th className="py-2.5 px-3">#</th>
                  {columns.map(c => (
                    <th key={c.key} className="py-2.5 px-3">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-bold">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-400 font-mono font-normal">{idx + 1}</td>
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

          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 font-semibold">
            <span>PAIS ITMS System Generated Report</span>
            <span className="font-mono text-[10px] font-bold text-slate-500">RESTRICTED - FOR INTERNAL USE ONLY</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};


