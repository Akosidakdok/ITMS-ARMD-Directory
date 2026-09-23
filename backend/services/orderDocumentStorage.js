import { supabase, supabaseAdmin } from '../config/supabase.js';

export const ORDER_DOCUMENT_BUCKET = process.env.ORDER_DOCUMENT_BUCKET || 'order-documents';
export const GENERATED_ORDER_DOCUMENT_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const SIGNED_ORDER_DOCUMENT_MIMES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

const safePathSegment = value => String(value || 'unknown')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 120) || 'unknown';

export const buildGeneratedOrderDocumentPath = ({ order, version }) => {
  const year = String(order.issuedDate || '').slice(0, 4) || 'undated';
  const series = safePathSegment(order.series || 'legacy');
  const orderNumber = safePathSegment(order.orderNumber || order.id);
  return `generated/${year}/${series}/${orderNumber}/v${version}/order.docx`;
};

export const buildSignedOrderDocumentPath = ({ order, version, extension = 'png' }) => {
  const year = String(order.issuedDate || '').slice(0, 4) || 'undated';
  const series = safePathSegment(order.series || 'legacy');
  const orderNumber = safePathSegment(order.orderNumber || order.id);
  const safeExtension = safePathSegment(extension).toLowerCase() || 'png';
  return `signed/${year}/${series}/${orderNumber}/v${version}/signed-order.${safeExtension}`;
};

// Legacy alias retained for existing DOCX upload records and tests.
export const buildOrderDocumentPath = ({ order, version }) => {
  const year = String(order.issuedDate || '').slice(0, 4) || 'undated';
  const series = safePathSegment(order.series || 'legacy');
  const orderNumber = safePathSegment(order.orderNumber || order.id);
  return `${year}/${series}/${orderNumber}/v${version}/source.docx`;
};

const getStorageClient = () => supabaseAdmin || supabase;

const requireStorage = () => {
  const client = getStorageClient();
  if (!client) throw new Error('Private document storage is not configured on the server.');
  return client.storage.from(ORDER_DOCUMENT_BUCKET);
};

export const uploadOrderDocument = async ({ path, buffer, contentType }) => {
  const bucket = requireStorage();
  const { error } = await bucket.upload(path, buffer, {
    contentType,
    upsert: false,
    cacheControl: '3600'
  });
  if (error) throw new Error(`Order document upload failed: ${error.message}`);
};

export const removeOrderDocument = async path => {
  const client = getStorageClient();
  if (!path || !client) return;
  const { error } = await client.storage.from(ORDER_DOCUMENT_BUCKET).remove([path]);
  if (error) throw new Error(`Order document removal failed: ${error.message}`);
};

export const createOrderDocumentUrl = async (path, downloadName) => {
  const bucket = requireStorage();
  const options = downloadName ? { download: downloadName } : undefined;
  const { data, error } = await bucket.createSignedUrl(path, 300, options);
  if (error || !data?.signedUrl) throw new Error(`Order document link creation failed: ${error?.message || 'No URL returned'}`);
  return data.signedUrl;
};

export const downloadOrderDocument = async path => {
  const bucket = requireStorage();
  const { data, error } = await bucket.download(path);
  if (error || !data) throw new Error(`Order document download failed: ${error?.message || 'No file returned'}`);
  return Buffer.from(await data.arrayBuffer());
};

export const isDocxZip = buffer => buffer?.length >= 4
  && buffer[0] === 0x50
  && buffer[1] === 0x4b
  && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  && (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

export const isSignedOrderImage = (buffer, mime) => {
  if (!buffer || !SIGNED_ORDER_DOCUMENT_MIMES.includes(mime)) return false;
  if (mime === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
};
