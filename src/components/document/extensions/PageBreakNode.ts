import { Node, mergeAttributes } from '@tiptap/core';

export const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  selectable: true,
  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-page-break]'
      },
      {
        tag: 'hr.page-break'
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-page-break': 'true',
          class: 'my-6 flex items-center justify-center border-t-2 border-dashed border-slate-300 py-3 text-[11px] font-semibold tracking-wider uppercase text-slate-500 select-none print:hidden [break-after:page]'
        },
        HTMLAttributes
      ),
      '--- Page Break ---'
    ];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => {
        return chain().insertContent({ type: this.name }).run();
      }
    };
  }
});
