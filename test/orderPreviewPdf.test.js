import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedOrderPreviewPath, convertOrderDocxToPdf } from '../backend/services/orderPreviewPdf.js';

test('preview path stays beside the generated DOCX version', () => {
  assert.equal(buildGeneratedOrderPreviewPath('generated/2026/SO/ORDER-1/v4/order.docx'), 'generated/2026/SO/ORDER-1/v4/preview.pdf');
  assert.throws(() => buildGeneratedOrderPreviewPath('source.docx'), /Invalid generated/);
});

test('PDF conversion reads the exact DOCX bytes and removes temporary files', async () => {
  const sourceBytes = Buffer.from('sample-docx-bytes');
  let temporaryDirectory = '';
  const pdf = await convertOrderDocxToPdf(sourceBytes, async (_binary, args) => {
    const source = args.at(-1);
    temporaryDirectory = path.dirname(source);
    assert.deepEqual(await readFile(source), sourceBytes);
    await writeFile(path.join(temporaryDirectory, 'order.pdf'), Buffer.from('%PDF-1.7\npreview'));
  });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal(existsSync(temporaryDirectory), false);
});

test('PDF conversion rejects invalid output and still cleans up', async () => {
  let temporaryDirectory = '';
  await assert.rejects(convertOrderDocxToPdf(Buffer.from('docx'), async (_binary, args) => {
    temporaryDirectory = path.dirname(args.at(-1));
    await writeFile(path.join(temporaryDirectory, 'order.pdf'), Buffer.from('not a pdf'));
  }), /invalid PDF/);
  assert.equal(existsSync(temporaryDirectory), false);
});
