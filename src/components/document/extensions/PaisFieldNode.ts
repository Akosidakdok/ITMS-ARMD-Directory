import { Node, mergeAttributes } from '@tiptap/core';

export const PaisFieldNode = Node.create({
  name: 'paisField',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      fieldKey: {
        default: 'personnel.full_name'
      },
      label: {
        default: 'Full Name'
      },
      category: {
        default: 'personnel'
      },
      fallbackValue: {
        default: ''
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-pais-field]',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return {};
          return {
            fieldKey: element.getAttribute('data-pais-field'),
            label: element.getAttribute('data-label'),
            category: element.getAttribute('data-category'),
            fallbackValue: element.getAttribute('data-value')
          };
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const fieldKey = HTMLAttributes.fieldKey || 'field';
    const label = HTMLAttributes.label || fieldKey;
    const value = HTMLAttributes.fallbackValue || `{{${fieldKey}}}`;

    return [
      'span',
      mergeAttributes(
        {
          'data-pais-field': fieldKey,
          'data-label': label,
          'data-category': HTMLAttributes.category,
          'data-value': HTMLAttributes.fallbackValue,
          class: 'inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200 select-none cursor-pointer hover:bg-teal-100 hover:border-teal-300 transition-colors mx-0.5 print:bg-transparent print:border-none print:p-0 print:text-inherit print:font-inherit',
          title: `PAIS Dynamic Field: {{${fieldKey}}}`
        },
        HTMLAttributes
      ),
      value
    ];
  }
});
