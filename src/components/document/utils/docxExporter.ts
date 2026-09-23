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
  BorderStyle,
  Header,
  Footer,
  ImageRun,
  VerticalAlign
} from 'docx';

export interface DocxExportOptions {
  title: string;
  pageSize?: 'A4' | 'Letter' | 'Legal' | string;
  orientation?: 'portrait' | 'landscape';
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  headerText?: string;
  footerText?: string;
}

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

const BORDER_SINGLE = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: 'CBD5E1'
};

const base64ToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Converts an HTML document string into a pixel-accurate DOCX matching orderDocxGenerator.js
 */
export const exportToDocx = async (
  htmlContent: string,
  options: DocxExportOptions
): Promise<void> => {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;

  const docChildren: (Paragraph | Table)[] = [];

  const parseTextRuns = (node: Node, defaultSize = 24): (TextRun | ImageRun)[] => {
    const runs: (TextRun | ImageRun)[] = [];

    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text) {
          runs.push(new TextRun({ text, font: 'Arial', size: defaultSize }));
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'img') {
          const src = el.getAttribute('src') || '';
          if (src.startsWith('data:image/')) {
            try {
              const imageBytes = base64ToUint8Array(src);
              const imgType = src.includes('png') ? 'png' : 'jpeg';
              const width = parseInt(el.style.width || el.getAttribute('width') || '80', 10);
              const height = parseInt(el.style.height || el.getAttribute('height') || '80', 10);
              runs.push(
                new ImageRun({
                  data: imageBytes,
                  type: imgType as any,
                  transformation: { width, height }
                })
              );
            } catch (err) {
              console.warn('Failed to embed ImageRun:', err);
            }
          }
          return;
        }

        const isBold =
          tag === 'strong' ||
          tag === 'b' ||
          el.style.fontWeight === 'bold' ||
          parseInt(el.style.fontWeight || '400', 10) >= 600;
        const isItalic = tag === 'em' || tag === 'i' || el.style.fontStyle === 'italic';
        const isUnderline = tag === 'u' || el.style.textDecoration?.includes('underline');

        let size = defaultSize;
        const fontSizeStyle = el.style.fontSize;
        if (fontSizeStyle) {
          if (fontSizeStyle.includes('10pt')) size = 20;
          else if (fontSizeStyle.includes('11pt')) size = 22;
          else if (fontSizeStyle.includes('12pt')) size = 24;
          else if (fontSizeStyle.includes('13pt')) size = 26;
          else if (fontSizeStyle.includes('14pt')) size = 28;
          else if (fontSizeStyle.includes('8pt') || fontSizeStyle.includes('9pt')) size = 18;
        }

        // Check nested nodes
        if (el.childNodes.length > 0 && !['img', 'br'].includes(tag)) {
          el.childNodes.forEach(grandchild => {
            if (grandchild.nodeType === Node.TEXT_NODE) {
              const text = grandchild.textContent || '';
              if (text) {
                runs.push(
                  new TextRun({
                    text,
                    font: 'Arial',
                    size,
                    bold: isBold,
                    italics: isItalic,
                    underline: isUnderline ? { type: 'single' } : undefined
                  })
                );
              }
            } else {
              runs.push(...parseTextRuns(grandchild, size));
            }
          });
        } else {
          const text = el.innerText || el.textContent || '';
          if (text) {
            runs.push(
              new TextRun({
                text,
                font: 'Arial',
                size,
                bold: isBold,
                italics: isItalic,
                underline: isUnderline ? { type: 'single' } : undefined
              })
            );
          }
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
        const isBorderless =
          el.style.border?.includes('none') ||
          el.getAttribute('border') === '0' ||
          el.getAttribute('style')?.includes('border: none') ||
          el.getAttribute('style')?.includes('border:none');

        const rows: TableRow[] = [];
        const trs = el.querySelectorAll('tr');

        trs.forEach(tr => {
          const cells: TableCell[] = [];
          const thOrTds = tr.querySelectorAll('th, td');

          thOrTds.forEach(td => {
            const isTh = td.tagName.toLowerCase() === 'th';
            const tdElement = td as HTMLElement;
            const tdStyle = tdElement.getAttribute('style') || '';
            const isCellBorderless = isBorderless || tdStyle.includes('border: none') || tdStyle.includes('border:none');

            // Alignment
            let cellAlignment = AlignmentType.LEFT;
            if (tdElement.style.textAlign === 'center') cellAlignment = AlignmentType.CENTER;
            else if (tdElement.style.textAlign === 'right') cellAlignment = AlignmentType.RIGHT;

            // Extract cell paragraphs or runs
            const paragraphs: Paragraph[] = [];
            const pTags = tdElement.querySelectorAll('p');

            if (pTags.length > 0) {
              pTags.forEach(p => {
                const pRuns = parseTextRuns(p);
                paragraphs.push(
                  new Paragraph({
                    children: pRuns,
                    alignment: cellAlignment,
                    spacing: { before: 0, after: 40, line: 240 }
                  })
                );
              });
            } else {
              const cellRuns = parseTextRuns(tdElement);
              paragraphs.push(
                new Paragraph({
                  children: cellRuns,
                  alignment: cellAlignment,
                  spacing: { before: 0, after: 0, line: 240 }
                })
              );
            }

            // Cell width calculation
            const widthAttr = tdElement.style.width || tdElement.getAttribute('width') || '';
            let widthPct = Math.round(100 / Math.max(1, thOrTds.length));
            if (widthAttr.includes('%')) {
              widthPct = parseInt(widthAttr, 10);
            }

            cells.push(
              new TableCell({
                children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [] })],
                width: { size: widthPct, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: isCellBorderless
                  ? NO_BORDERS
                  : {
                      top: BORDER_SINGLE,
                      bottom: BORDER_SINGLE,
                      left: BORDER_SINGLE,
                      right: BORDER_SINGLE
                    },
                shading: isTh ? { fill: 'F1F5F9' } : undefined,
                margins: { top: 0, bottom: 0, left: 0, right: 0 }
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
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: isBorderless ? NO_BORDERS : undefined
            })
          );
          docChildren.push(new Paragraph({ spacing: { before: 0, after: 120, line: 240 } }));
        }
        return;
      }

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div'].includes(tag)) {
        // Skip root wrapper div
        if (el.classList.contains('pais-order-document-root')) {
          el.childNodes.forEach(child => processNode(child));
          return;
        }

        const textAlign = el.style.textAlign;
        let alignment = AlignmentType.LEFT;
        if (textAlign === 'center') alignment = AlignmentType.CENTER;
        else if (textAlign === 'right') alignment = AlignmentType.RIGHT;
        else if (textAlign === 'justify') alignment = AlignmentType.JUSTIFIED;

        // Calculate indents
        let indentConfig: { firstLine?: number; left?: number } | undefined;
        const style = el.getAttribute('style') || '';
        if (style.includes('text-indent: 36pt') || style.includes('text-indent:36pt') || style.includes('text-indent: 720')) {
          indentConfig = { firstLine: 720 };
        }
        if (style.includes('padding-left: 85px') || style.includes('padding-left:85px')) {
          indentConfig = { ...indentConfig, left: 1701 };
        } else if (style.includes('padding-left: 36pt') || style.includes('padding-left: 48px')) {
          indentConfig = { ...indentConfig, left: 720 };
        }

        // If this div is only a container for other blocks
        if (tag === 'div' && el.querySelectorAll('p, table, div').length > 0) {
          el.childNodes.forEach(child => processNode(child));
          return;
        }

        const runs = parseTextRuns(el);
        if (runs.length > 0) {
          docChildren.push(
            new Paragraph({
              children: runs,
              alignment,
              indent: indentConfig,
              spacing: { before: 0, after: 80, line: 240 }
            })
          );
        } else if (tag === 'p' && el.innerHTML.trim() === '') {
          // Blank line
          docChildren.push(new Paragraph({ spacing: { before: 0, after: 120, line: 240 } }));
        }
        return;
      }

      // Recurse for other nodes
      el.childNodes.forEach(child => processNode(child));
    }
  };

  container.childNodes.forEach(child => processNode(child));

  if (docChildren.length === 0) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: container.textContent || '', font: 'Arial', size: 24 })]
      })
    );
  }

  // Canonical Header / Footer matching orderDocxGenerator.js
  const headerRun = new TextRun({
    text: options.headerText || 'R E S T R I C T E D',
    font: 'Arial',
    size: 20,
    underline: { type: 'single' }
  });
  const restrictedHeader = new Paragraph({
    children: [headerRun],
    alignment: AlignmentType.CENTER
  });

  const footerRun = new TextRun({
    text: options.footerText || 'R E S T R I C T E D',
    font: 'Arial',
    size: 20,
    underline: { type: 'single' }
  });
  const restrictedFooter = new Paragraph({
    children: [footerRun],
    alignment: AlignmentType.CENTER
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 Dimensions
            margin: {
              top: options.marginTop ? Math.round(options.marginTop * 56.69) : 1276,
              right: options.marginRight ? Math.round(options.marginRight * 56.69) : 1325,
              bottom: options.marginBottom ? Math.round(options.marginBottom * 56.69) : 500,
              left: options.marginLeft ? Math.round(options.marginLeft * 56.69) : 1440,
              header: 340,
              footer: 184
            }
          }
        },
        headers: { default: new Header({ children: [restrictedHeader] }) },
        footers: { default: new Footer({ children: [restrictedFooter] }) },
        children: docChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = options.title.replace(/[/\\?%*:|"<>]/g, '_');
  link.download = `${fileName || 'order_document'}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
