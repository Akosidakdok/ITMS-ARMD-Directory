import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  FileText,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  Minus,
  PenTool,
  Database,
  PlusSquare,
  Trash2,
  Split,
  Combine,
  Columns3,
  Rows3
} from 'lucide-react';

interface RibbonInsertTabProps {
  editor: Editor | null;
  onOpenInsertTable: () => void;
  onOpenInsertImage: () => void;
  onOpenInsertPaisField: () => void;
}

export const RibbonInsertTab: React.FC<RibbonInsertTabProps> = ({
  editor,
  onOpenInsertTable,
  onOpenInsertImage,
  onOpenInsertPaisField
}) => {
  if (!editor) return null;

  const isInTable = editor.isActive('table');

  const insertSignatureBlock = () => {
    editor.chain().focus().insertContent(`
      <div style="margin-top: 48px; display: flex; justify-content: flex-end;">
        <div style="text-align: center; min-width: 240px;">
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-transform: uppercase;">PBGEN BENJAMIN H ACORDA</p>
          <p style="margin: 2px 0 0 0; font-size: 9pt;">Director, ITMS</p>
        </div>
      </div>
    `).run();
  };

  const insertLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter Hyperlink URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-xs">
      {/* PAIS Dynamic Fields Button - Highlighted */}
      <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-3">
        <button
          type="button"
          onClick={onOpenInsertPaisField}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-teal-700 transition"
        >
          <Database size={15} />
          <span>Insert PAIS Field</span>
        </button>
      </div>

      {/* Page & Document Elements */}
      <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
        <button
          type="button"
          onClick={() => {
            // @ts-ignore
            if (editor.commands.setPageBreak) editor.commands.setPageBreak();
            else editor.chain().focus().setHorizontalRule().run();
          }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
        >
          <FileText size={14} className="text-teal-600" />
          <span>Page Break</span>
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          title="Insert Horizontal Divider Line"
        >
          <Minus size={14} />
          <span>Divider</span>
        </button>

        <button
          type="button"
          onClick={insertSignatureBlock}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          title="Insert Standard PNP-ITMS Signature Block"
        >
          <PenTool size={14} className="text-amber-600" />
          <span>Signature Block</span>
        </button>
      </div>

      {/* Tables & Media */}
      <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
        <button
          type="button"
          onClick={onOpenInsertTable}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <TableIcon size={14} className="text-blue-600" />
          <span>Table</span>
        </button>

        <button
          type="button"
          onClick={onOpenInsertImage}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <ImageIcon size={14} className="text-emerald-600" />
          <span>Image</span>
        </button>

        <button
          type="button"
          onClick={insertLink}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-medium transition ${
            editor.isActive('link')
              ? 'border-teal-400 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <LinkIcon size={14} />
          <span>Link</span>
        </button>
      </div>

      {/* Active Table Controls (when cursor is inside a table) */}
      {isInTable && (
        <div className="flex items-center gap-1 bg-blue-50/80 dark:bg-blue-950/40 p-1 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 px-1">Table:</span>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="rounded px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-blue-200 hover:bg-blue-100"
            title="Add Row Below"
          >
            + Row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="rounded px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-blue-200 hover:bg-rose-50 text-rose-600"
            title="Delete Current Row"
          >
            - Row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="rounded px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-blue-200 hover:bg-blue-100"
            title="Add Column Right"
          >
            + Col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="rounded px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-blue-200 hover:bg-rose-50 text-rose-600"
            title="Delete Current Column"
          >
            - Col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().mergeCells().run()}
            className="rounded px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-blue-200 hover:bg-blue-100"
            title="Merge Selected Cells"
          >
            Merge
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().splitCell().run()}
            className="rounded px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-blue-200 hover:bg-blue-100"
            title="Split Cell"
          >
            Split
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="rounded p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950"
            title="Delete Entire Table"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
