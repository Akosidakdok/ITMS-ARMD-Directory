import Paragraph from '@tiptap/extension-paragraph';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';

export const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        }
      },
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        }
      }
    };
  }
});

export const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => (attrs.style ? { style: attrs.style } : {})
      },
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => (attrs.class ? { class: attrs.class } : {})
      }
    };
  }
});

export const CustomTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => (attrs.style ? { style: attrs.style } : {})
      },
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => (attrs.class ? { class: attrs.class } : {})
      }
    };
  }
});

export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => (attrs.style ? { style: attrs.style } : {})
      },
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => (attrs.class ? { class: attrs.class } : {})
      },
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width'),
        renderHTML: attrs => (attrs.width ? { width: attrs.width } : {})
      }
    };
  }
});

export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => (attrs.style ? { style: attrs.style } : {})
      },
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => (attrs.class ? { class: attrs.class } : {})
      },
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width'),
        renderHTML: attrs => (attrs.width ? { width: attrs.width } : {})
      }
    };
  }
});

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => (attrs.style ? { style: attrs.style } : {})
      },
      width: {
        default: null,
        parseHTML: el => el.getAttribute('width') || el.style.width,
        renderHTML: attrs => (attrs.width ? { width: attrs.width } : {})
      },
      height: {
        default: null,
        parseHTML: el => el.getAttribute('height') || el.style.height,
        renderHTML: attrs => (attrs.height ? { height: attrs.height } : {})
      },
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => (attrs.class ? { class: attrs.class } : {})
      }
    };
  }
});
