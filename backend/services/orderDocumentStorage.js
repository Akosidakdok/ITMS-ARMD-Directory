import { supabase, supabaseAdmin } from '../config/supabase.js';

export const ORDER_DOCUMENT_BUCKET = process.env.ORDER_DOCUMENT_BUCKET || 'order-documents';

const safePathSegment = value => String(value || 'unknown')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 120) || 'unknown';

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

export const createOrderDocumentUrl = async path => {
  const bucket = requireStorage();
  const { data, error } = await bucket.createSignedUrl(path, 300);
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
