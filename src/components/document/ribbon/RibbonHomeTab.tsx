import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  RemoveFormatting,
  Highlighter,
  Baseline
} from 'lucide-react';

interface RibbonHomeTabProps {
  editor: Editor | null;
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' }
];

const FONT_SIZES = ['9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt'];

export const RibbonHomeTab: React.FC<RibbonHomeTabProps> = ({ editor }) => {
  if (!editor) return null;

  const currentHeading = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : editor.isActive('blockquote')
          ? 'quote'
          : 'p';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-xs">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
          className="rounded p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30"
        >
          <Undo size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
          className="rounded p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-30"
        >
          <Redo size={14} />
        </button>
      </div>

      {/* Font Family & Size */}
      <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2">
        <select
          onChange={e => {
            const font = e.target.value;
            if (font) editor.chain().focus().setMark('textStyle', { fontFamily: font }).run();
          }}
          className="h-7 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[11px] font-medium"
        >
          {FONT_FAMILIES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <select
          defaultValue="11pt"
          onChange={e => {
            const size = e.target.value;
            if (size) editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
          }}
          className="h-7 w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 text-[11px] font-medium"
        >
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Basic Text Formatting */}
      <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
          className={`rounded p-1.5 transition ${
            editor.isActive('bold')
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200 font-bold'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Bold size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
          className={`rounded p-1.5 transition ${
            editor.isActive('italic')
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Italic size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
          className={`rounded p-1.5 transition ${
            editor.isActive('underline')
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <UnderlineIcon size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          className={`rounded p-1.5 transition ${
            editor.isActive('strike')
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Strikethrough size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Highlight"
          className={`rounded p-1.5 transition ${
            editor.isActive('highlight')
              ? 'bg-yellow-200 text-yellow-900'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Highlighter size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Clear Formatting"
          className="rounded p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          <RemoveFormatting size={14} />
        </button>
      </div>

      {/* Paragraph Alignment & Lists */}
      <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
          className={`rounded p-1.5 transition ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <AlignLeft size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Center"
          className={`rounded p-1.5 transition ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <AlignCenter size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
          className={`rounded p-1.5 transition ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <AlignRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title="Justify"
          className={`rounded p-1.5 transition ${
            editor.isActive({ textAlign: 'justify' })
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <AlignJustify size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bulleted List"
          className={`rounded p-1.5 transition ${
            editor.isActive('bulletList')
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <List size={14} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          className={`rounded p-1.5 transition ${
            editor.isActive('orderedList')
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
              : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <ListOrdered size={14} />
        </button>
      </div>

      {/* Styles (Headings & Normal) */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`rounded px-2.5 py-1 font-medium transition ${
            currentHeading === 'p'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          Normal
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`rounded px-2.5 py-1 font-bold transition ${
            currentHeading === 'h1'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          Heading 1
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded px-2.5 py-1 font-semibold transition ${
            currentHeading === 'h2'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          Heading 2
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`rounded px-2.5 py-1 font-medium transition ${
            currentHeading === 'h3'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          Heading 3
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded px-2.5 py-1 italic transition ${
            currentHeading === 'quote'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          Quote
        </button>
      </div>
    </div>
  );
};
