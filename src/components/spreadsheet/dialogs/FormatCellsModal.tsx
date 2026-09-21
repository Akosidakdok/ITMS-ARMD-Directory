import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface FormatCellsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (styles: any, numFmt?: string) => void;
  currentStyle?: any;
  currentNumFmt?: string;
  selectedAddress: string;
}

const FONT_FAMILIES = ['Arial', 'Arial Narrow', 'Calibri', 'Times New Roman', 'Segoe UI', 'Courier New', 'Consolas'];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];
const PRESET_COLORS = [
  '#000000', '#ffffff', '#1e293b', '#64748b', '#ef4444', '#f97316',
  '#f59e0b', '#10b981', '#06b6d4', '#2563eb', '#8b5cf6', '#ec4899',
  '#dbeafe', '#dcfce7', '#fef3c7', '#fee2e2', '#f3e8ff'
];

export const FormatCellsModal: React.FC<FormatCellsModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentStyle = {},
  currentNumFmt = 'General',
  selectedAddress
}) => {
  const [activeTab, setActiveTab] = useState<'number' | 'alignment' | 'font' | 'border' | 'fill'>('number');

  // Form states initialized with current values
  const [numFmt, setNumFmt] = useState(currentNumFmt);
  const [alignH, setAlignH] = useState<'left' | 'center' | 'right'>(currentStyle.ah || 'left');
  const [alignV, setAlignV] = useState<'top' | 'middle' | 'bottom'>(currentStyle.av || 'middle');
  const [wrapText, setWrapText] = useState(!!currentStyle.wrap);

  const [fontFamily, setFontFamily] = useState(currentStyle.fn || 'Arial');
  const [fontSize, setFontSize] = useState<number>(currentStyle.sz || 11);
  const [bold, setBold] = useState(!!currentStyle.b);
  const [italic, setItalic] = useState(!!currentStyle.i);
  const [underline, setUnderline] = useState(!!currentStyle.u);
  const [textColor, setTextColor] = useState(currentStyle.c || '#000000');
  const [fillColor, setFillColor] = useState(currentStyle.bg || '');

  const [borderType, setBorderType] = useState<string>(
    currentStyle.br?.bottom === 'double' ? 'double-bottom' :
    currentStyle.br?.bottom === 'thick' ? 'thick-bottom' :
    currentStyle.br?.bottom === 'thin' ? 'all' : 'none'
  );

  if (!isOpen) return null;

  const handleSave = () => {
    let br: any = undefined;
    if (borderType === 'double-bottom') br = { bottom: 'double' };
    else if (borderType === 'thick-bottom') br = { bottom: 'thick' };
    else if (borderType === 'all') br = { top: 'thin', bottom: 'thin', left: 'thin', right: 'thin' };

    const newStyle = {
      ...currentStyle,
      ah: alignH,
      av: alignV,
      wrap: wrapText ? 1 : undefined,
      fn: fontFamily,
      sz: fontSize,
      b: bold ? 1 : undefined,
      i: italic ? 1 : undefined,
      u: underline ? 1 : undefined,
      c: textColor !== '#000000' ? textColor : undefined,
      bg: fillColor || undefined,
      br
    };

    onApply(newStyle, numFmt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#101b2b] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Format Cells</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Target: {selectedAddress}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 dark:border-slate-800 dark:bg-[#0c1624]">
          {(['number', 'alignment', 'font', 'border', 'fill'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-bold capitalize border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-[280px]">
          {activeTab === 'number' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Category:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'General', label: 'General', desc: 'No specific number format' },
                  { id: '#,##0.00', label: 'Number (1,234.56)', desc: 'Standard decimal formatting' },
                  { id: '₱#,##0.00', label: 'Currency (₱1,234.56)', desc: 'Philippine Peso currency symbol' },
                  { id: 'accounting', label: 'Accounting', desc: 'Financial column alignment and paren negatives' },
                  { id: '0.0%', label: 'Percentage (12.5%)', desc: 'Multiplies by 100 with %' },
                  { id: 'date', label: 'Date (MM/DD/YYYY)', desc: 'Standard calendar date format' },
                  { id: '@', label: 'Text', desc: 'Treated exactly as entered' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setNumFmt(item.id)}
                    className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition ${
                      numFmt === item.id
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/30 font-bold text-blue-900 dark:text-sky-300'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] font-normal text-slate-500">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'alignment' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Horizontal Alignment:</label>
                <div className="space-y-1.5">
                  {(['left', 'center', 'right'] as const).map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="alignH"
                        checked={alignH === opt}
                        onChange={() => setAlignH(opt)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Vertical Alignment:</label>
                <div className="space-y-1.5">
                  {(['top', 'middle', 'bottom'] as const).map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="alignV"
                        checked={alignV === opt}
                        onChange={() => setAlignV(opt)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wrapText}
                    onChange={e => setWrapText(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Wrap text (auto-adjust to multiple lines)</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'font' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Font Family:</label>
                  <select
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200"
                  >
                    {FONT_FAMILIES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Font Size:</label>
                  <select
                    value={fontSize}
                    onChange={e => setFontSize(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-[#142232] dark:text-slate-200"
                  >
                    {FONT_SIZES.map(s => (
                      <option key={s} value={s}>{s} pt</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={bold} onChange={e => setBold(e.target.checked)} className="rounded text-blue-600" />
                  <span className="font-bold">Bold</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={italic} onChange={e => setItalic(e.target.checked)} className="rounded text-blue-600" />
                  <span className="italic">Italic</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={underline} onChange={e => setUnderline(e.target.checked)} className="rounded text-blue-600" />
                  <span className="underline">Underline</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Text Color:</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setTextColor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-6 w-6 rounded-md border border-slate-300 dark:border-slate-700 ${textColor === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'border' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Border Presets:</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'none', label: 'No Border' },
                  { id: 'all', label: 'All Borders (Thin)' },
                  { id: 'thick-bottom', label: 'Thick Bottom Border' },
                  { id: 'double-bottom', label: 'Double Bottom (Accounting Total)' }
                ].map(b => (
                  <button
                    key={b.id}
                    onClick={() => setBorderType(b.id)}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                      borderType === b.id
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/30 text-blue-900 dark:text-sky-300'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fill' && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Background Fill Color:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFillColor('')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-700 dark:text-slate-300 ${!fillColor ? 'border-blue-500 font-bold' : 'border-slate-300 dark:border-slate-700'}`}
                >
                  No Fill
                </button>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setFillColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-7 w-7 rounded-lg border border-slate-300 dark:border-slate-700 ${fillColor === c ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                  />
                ))}
              </div>
            </div>
          )}
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
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Check className="h-4 w-4" />
            Apply Formatting
          </button>
        </div>
      </div>
    </div>
  );
};
