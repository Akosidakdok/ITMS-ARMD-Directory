import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';

const BUCKET = 'dlos-documents';
const unavailable = () => Object.assign(new Error('Private DLOS document storage is unavailable.'), { statusCode: 503 });

const bucket = () => {
  if (!supabaseAdmin) throw unavailable();
  return supabaseAdmin.storage.from(BUCKET);
};

export const uploadDlosFile = async (caseId, file) => {
  const extension = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype];
  const path = `${caseId}/${randomUUID()}.${extension}`;
  const { error } = await bucket().upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw Object.assign(new Error(`DLOS upload failed: ${error.message}`), { statusCode: 503 });
  return path;
};

export const removeDlosFile = async path => {
  if (!path || !supabaseAdmin) return;
  await bucket().remove([path]);
};

export const downloadDlosFile = async path => {
  const { data, error } = await bucket().download(path);
  if (error || !data) throw Object.assign(new Error('DLOS file could not be downloaded.'), { statusCode: 503 });
  return Buffer.from(await data.arrayBuffer());
};
