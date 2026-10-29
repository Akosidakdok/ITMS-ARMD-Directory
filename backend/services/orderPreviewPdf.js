import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { createOrderDocumentUrl, downloadOrderDocument, uploadOrderDocument } from './orderDocumentStorage.js';

const execFileAsync = promisify(execFile);
const pendingPreviews = new Map();
let conversionQueue = Promise.resolve();

const convertOneAtATime = task => {
  const next = conversionQueue.then(task);
  conversionQueue = next.catch(() => {});
  return next;
};

export const buildGeneratedOrderPreviewPath = storagePath => {
  if (!storagePath?.endsWith('/order.docx')) throw new Error('Invalid generated order document path.');
  return `${storagePath.slice(0, -'/order.docx'.length)}/preview.pdf`;
};

export const convertOrderDocxToPdf = async (docxBuffer, runConverter = execFileAsync) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'order-preview-'));
  try {
    const source = path.join(directory, 'order.docx');
    const output = path.join(directory, 'order.pdf');
    await writeFile(source, docxBuffer);
    await runConverter(process.env.LIBREOFFICE_BIN || 'soffice', [
      `-env:UserInstallation=${pathToFileURL(path.join(directory, 'profile')).href}`,
      '--headless', '--convert-to', 'pdf:writer_pdf_Export', '--outdir', directory, source
    ], { timeout: 60000, windowsHide: true, maxBuffer: 1024 * 1024 });
    const pdf = await readFile(output);
    if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('Document renderer returned an invalid PDF.');
    return pdf;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

export const getGeneratedOrderPreviewUrl = async (storagePath, downloadName) => {
  const previewPath = buildGeneratedOrderPreviewPath(storagePath);
  let ready = pendingPreviews.get(previewPath);
  if (!ready) {
    ready = (async () => {
      try {
        const existing = await downloadOrderDocument(previewPath);
        if (existing.subarray(0, 5).toString() === '%PDF-') return;
      } catch { /* Render older generated documents on first preview. */ }
      const docx = await downloadOrderDocument(storagePath);
      const pdf = await convertOneAtATime(() => convertOrderDocxToPdf(docx));
      try {
        await uploadOrderDocument({ path: previewPath, buffer: pdf, contentType: 'application/pdf' });
      } catch (error) {
        if (!/already exists|duplicate/i.test(String(error?.message))) throw error;
      }
    })().finally(() => pendingPreviews.delete(previewPath));
    pendingPreviews.set(previewPath, ready);
  }
  await ready;
  return createOrderDocumentUrl(previewPath, downloadName);
};
