import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { Personnel } from '../../types/pais';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (validPersonnelRecords: Personnel[]) => void;
}

// Database schema valid field mapping rules
const VALID_DB_FIELDS: Record<string, keyof Personnel> = {
  // Rank
  'rank': 'rank',
  'RANK': 'rank',
  
  // Names
  'firstname': 'firstName',
  'first name': 'firstName',
  'FIRSTNAME': 'firstName',
  'lastname': 'lastName',
  'last name': 'lastName',
  'LASTNAME': 'lastName',
  'middlename': 'middleName',
  'middle name': 'middleName',
  'MIDDLE NAME': 'middleName',
  'qualifier': 'qualifier',
  'qual': 'qualifier',
  'QUAL': 'qualifier',
  'fullname': 'fullName',
  'full name': 'fullName',
  
  // Badge / Account
  'badgeno': 'badgeNo',
  'badge number': 'badgeNo',
  'badge no': 'badgeNo',
  'account number': 'badgeNo',
  'accountno': 'badgeNo',

  // Salary & Plantilla
  'salarygrade': 'salaryGrade',
  'salary grade': 'salaryGrade',
  'sg': 'salaryGrade',
  'sg-st': 'salaryGrade',
  'plantilla': 'plantilla',

  // Unit / Division / Detail
  'unit': 'division',
  'division': 'division',
  'subunit': 'detail',
  'sub-unit': 'detail',
  'detail': 'detail',
  'station': 'detail',
  'designation': 'designation',

  // Personal Profile
  'address': 'address',
  'gender': 'gender',
  'contactnumber': 'contactNumber',
  'contact number': 'contactNumber',
  'birthday': 'birthday',
  'dateofentry': 'dateOfEntry',
  'date of entry': 'dateOfEntry',
  'enterinofficerpositiondate': 'enterInOfficerPositionDate',
  'enter in officer position': 'enterInOfficerPositionDate',
  'status': 'status',
  'pstatus': 'status',
  'avatarurl': 'avatarUrl',
  'photo': 'avatarUrl'
};

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawContent, setRawContent] = useState<string>('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [validColumns, setValidColumns] = useState<string[]>([]);
  const [ignoredColumns, setIgnoredColumns] = useState<string[]>([]);
  const [previewRecords, setPreviewRecords] = useState<Personnel[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawContent(text);
      processCSVContent(text);
      setIsProcessing(false);
    };
    reader.readAsText(uploadedFile);
  };

  const processCSVContent = (content: string) => {
    const lines = content.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return;

    // Header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    setParsedHeaders(headers);

    const acceptedCols: string[] = [];
    const rejectedCols: string[] = [];

    // Filter headers based on database schema matching rule
    headers.forEach(h => {
      const normalizedKey = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      const mappedField = VALID_DB_FIELDS[normalizedKey] || VALID_DB_FIELDS[h.toLowerCase()];
      if (mappedField) {
        acceptedCols.push(h);
      } else {
        rejectedCols.push(h); // Strictly ignored if not in database
      }
    });

    setValidColumns(acceptedCols);
    setIgnoredColumns(rejectedCols);

    // Parse Data rows
    const records: Personnel[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === 0 || (values.length === 1 && !values[0])) continue;

      const recordObj: any = {
        id: `pnp-imp-${Date.now()}-${i}`,
        status: 'Active',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
      };

      headers.forEach((header, index) => {
        const value = values[index] || '';
        const normalizedKey = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        const mappedField = VALID_DB_FIELDS[normalizedKey] || VALID_DB_FIELDS[header.toLowerCase()];

        // CRITICAL REQUIREMENT: "if the header/title is not on the database, don't add it"
        if (mappedField) {
          if (mappedField === 'salaryGrade') {
            recordObj[mappedField] = parseInt(value, 10) || 14;
          } else {
            recordObj[mappedField] = value;
          }
        }
      });

      // Construct fullName if missing
      if (!recordObj.fullName && (recordObj.lastName || recordObj.firstName)) {
        const rankPrefix = recordObj.rank ? `${recordObj.rank} ` : '';
        const fName = recordObj.firstName || '';
        const mName = recordObj.middleName ? ` ${recordObj.middleName[0]}.` : '';
        const lName = recordObj.lastName || '';
        const qual = recordObj.qualifier ? ` ${recordObj.qualifier}` : '';
        recordObj.fullName = `${rankPrefix}${fName}${mName} ${lName}${qual}`.trim();
      }

      // Ensure minimal required fallbacks
      if (!recordObj.rank) recordObj.rank = 'PCPL';
      if (!recordObj.firstName) recordObj.firstName = 'PERSONNEL';
      if (!recordObj.lastName) recordObj.lastName = `RECORD #${i}`;
      if (!recordObj.badgeNo) recordObj.badgeNo = `E-${100000 + i}`;
      if (!recordObj.division) recordObj.division = 'ITMS';

      records.push(recordObj as Personnel);
    }

    setPreviewRecords(records);
  };

  const handleConfirmImport = () => {
    if (previewRecords.length === 0) return;
    onImport(previewRecords);
    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      setFile(null);
      setPreviewRecords([]);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500 text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Import Massive Personnel Records</h3>
              <p className="text-xs text-slate-300">Upload CSV / Excel dataset to import into database</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* File Upload Drop Area */}
          {!file && (
            <div className="border-2 border-dashed border-cyan-300 hover:border-cyan-500 bg-cyan-50/30 rounded-2xl p-8 text-center transition-all">
              <input 
                type="file" 
                accept=".csv, .txt, .xlsx" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="bulk-personnel-file-input"
              />
              <label 
                htmlFor="bulk-personnel-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">Click to upload CSV or Excel dataset</span>
                  <p className="text-xs text-slate-500 mt-1">Supports .csv, .txt formatted personnel roster files</p>
                </div>
                <span className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                  Browse File
                </span>
              </label>
            </div>
          )}

          {/* Database Header Filter Notice */}
          {file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-cyan-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{file.name}</p>
                    <p className="text-2xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • {previewRecords.length} Rows Detected</p>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); setPreviewRecords([]); }}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  Change File
                </button>
              </div>

              {/* Header Match Analysis Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Accepted DB Columns */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Database Matched Headers ({validColumns.length})</span>
                  </div>
                  <p className="text-2xs text-emerald-700 mb-2">These columns match database schema and WILL BE IMPORTED:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {validColumns.map((col, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-2xs font-bold border border-emerald-300">
                        ✓ {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ignored Non-DB Columns */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Ignored Non-Database Headers ({ignoredColumns.length})</span>
                  </div>
                  <p className="text-2xs text-amber-700 mb-2">
                    <strong>Rule Enforced:</strong> Headers not found in database ARE SKIPPED automatically:
                  </p>
                  {ignoredColumns.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {ignoredColumns.map((col, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-2xs font-bold line-through border border-amber-300">
                          ✕ {col}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-2xs text-emerald-700 font-bold">All uploaded columns match database schema!</span>
                  )}
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">Import Data Preview (First 5 Records)</h4>
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-2xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2">Rank</th>
                        <th className="p-2">Last Name</th>
                        <th className="p-2">First Name</th>
                        <th className="p-2">Middle Name</th>
                        <th className="p-2">Badge No</th>
                        <th className="p-2">Unit</th>
                        <th className="p-2">Designation</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewRecords.slice(0, 5).map((rec, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-blue-700">{rec.rank}</td>
                          <td className="p-2 font-bold">{rec.lastName}</td>
                          <td className="p-2">{rec.firstName}</td>
                          <td className="p-2 text-slate-500">{rec.middleName || '-'}</td>
                          <td className="p-2 font-mono text-slate-600">{rec.badgeNo}</td>
                          <td className="p-2 text-slate-700">{rec.division}</td>
                          <td className="p-2 text-slate-600">{rec.designation || '-'}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded">
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {importSuccess && (
            <div className="p-4 bg-emerald-600 text-white rounded-xl flex items-center justify-between animate-fade-in shadow-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <h4 className="font-bold text-sm">Massive Data Successfully Imported!</h4>
                  <p className="text-xs text-emerald-100">Added {previewRecords.length} records to database.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          {file && (
            <button
              onClick={handleConfirmImport}
              disabled={previewRecords.length === 0 || importSuccess}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <span>Import {previewRecords.length} Personnel Records</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
