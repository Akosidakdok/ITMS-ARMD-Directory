import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle
} from 'docx';

export interface DocxExportOptions {
  title: string;
  pageSize?: 'A4' | 'Letter' | 'Legal' | string;
  orientation?: 'portrait' | 'landscape';
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

/**
 * Converts an HTML string or text into a structured DOCX file and triggers browser download.
 */
export const exportToDocx = async (
  htmlContent: string,
  options: DocxExportOptions
): Promise<void> => {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;

  const docChildren: (Paragraph | Table)[] = [];

  const parseTextRuns = (node: Node): TextRun[] => {
    const runs: TextRun[] = [];
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text) runs.push(new TextRun({ text, font: 'Arial', size: 22 }));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const isBold = tag === 'strong' || tag === 'b' || el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight, 10) >= 600;
        const isItalic = tag === 'em' || tag === 'i' || el.style.fontStyle === 'italic';
        const isUnderline = tag === 'u' || el.style.textDecoration?.includes('underline');
        const text = el.innerText || el.textContent || '';
        if (text) {
          runs.push(
            new TextRun({
              text,
              font: 'Arial',
              size: 22,
              bold: isBold,
              italics: isItalic,
              underline: isUnderline ? {} : undefined
            })
          );
        }
      }
    });
    return runs;
  };

  const processNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'table') {
        const rows: TableRow[] = [];
        const trs = el.querySelectorAll('tr');
        trs.forEach(tr => {
          const cells: TableCell[] = [];
          const thOrTds = tr.querySelectorAll('th, td');
          thOrTds.forEach(td => {
            const isTh = td.tagName.toLowerCase() === 'th';
            cells.push(
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: td.textContent?.trim() || '',
                        bold: isTh,
                        font: 'Arial',
                        size: 20
                      })
                    ],
                    alignment: AlignmentType.LEFT
                  })
                ],
                width: { size: 100 / Math.max(1, thOrTds.length), type: WidthType.PERCENTAGE },
                shading: isTh ? { fill: 'F1F5F9' } : undefined,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }
                }
              })
            );
          });
          if (cells.length > 0) {
            rows.push(new TableRow({ children: cells }));
          }
        });

        if (rows.length > 0) {
          docChildren.push(
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE }
            })
          );
          docChildren.push(new Paragraph({ spacing: { after: 120 } }));
        }
        return;
      }

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'].includes(tag)) {
        const textAlign = el.style.textAlign;
        let alignment = AlignmentType.LEFT;
        if (textAlign === 'center') alignment = AlignmentType.CENTER;
        else if (textAlign === 'right') alignment = AlignmentType.RIGHT;
        else if (textAlign === 'justify') alignment = AlignmentType.JUSTIFIED;

        const runs = parseTextRuns(el);
        if (runs.length > 0) {
          docChildren.push(
            new Paragraph({
              children: runs,
              alignment,
              spacing: { after: 120, line: 276 }
            })
          );
        }
        return;
      }

      // Recurse for unknown wrappers
      el.childNodes.forEach(child => processNode(child));
    }
  };

  container.childNodes.forEach(child => processNode(child));

  if (docChildren.length === 0) {
    docChildren.push(new Paragraph({ children: [new TextRun({ text: container.textContent || '', font: 'Arial', size: 22 })] }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: (options.marginTop || 25.4) * 56.7, // convert mm to twips (approx 56.7 twips per mm)
              bottom: (options.marginBottom || 25.4) * 56.7,
              left: (options.marginLeft || 25.4) * 56.7,
              right: (options.marginRight || 25.4) * 56.7
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = options.title.replace(/[/\\?%*:|"<>]/g, '_');
  link.download = `${fileName || 'document'}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
