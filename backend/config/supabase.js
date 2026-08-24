import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Hosted projects can take a few seconds to answer immediately after resuming.
// Keep this below the frontend health timeout so the API always returns cleanly.
const SUPABASE_HEALTH_TIMEOUT_MS = Number(process.env.SUPABASE_HEALTH_TIMEOUT_MS || 8000);

const withTimeout = (promise, timeoutMs, timeoutMessage) => (
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(timeoutMessage);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs);
    })
  ])
);

// Database access stays on the server. Prefer the service-role credential so
// table RLS can remain enabled without exposing direct anon data access.
export const supabase = (supabaseUrl && (supabaseServiceRoleKey || supabaseKey))
  ? createClient(supabaseUrl, supabaseServiceRoleKey || supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseKey);

export const createSupabaseAuthClient = () => isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
  : null;

export const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

let supabaseAvailable = false;

export const isSupabaseAvailable = () => !!supabase && supabaseAvailable;

export const checkSupabaseStatus = async () => {
  if (!supabase) {
    return { isConnected: false, state: 'Credentials Missing' };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_HEALTH_TIMEOUT_MS);
  try {
    const { error } = await withTimeout(
      supabase
        .from('personnel')
        .select('count', { count: 'exact', head: true })
        .abortSignal(controller.signal),
      SUPABASE_HEALTH_TIMEOUT_MS,
      `Supabase health check timed out after ${SUPABASE_HEALTH_TIMEOUT_MS}ms`
    );

    if (error) {
      supabaseAvailable = false;
      return {
        isConnected: false,
        state: 'Error',
        url: supabaseUrl,
        tablesReady: false,
        error: error.message
      };
    }

    supabaseAvailable = true;
    return {
      isConnected: true,
      state: 'Connected',
      url: supabaseUrl,
      tablesReady: true
    };
  } catch (err) {
    supabaseAvailable = false;
    return {
      isConnected: false,
      state: err.name === 'AbortError' || err.name === 'TimeoutError' ? 'Timeout' : 'Error',
      url: supabaseUrl,
      tablesReady: false,
      error: err.name === 'AbortError' || err.name === 'TimeoutError'
        ? `Supabase health check timed out after ${SUPABASE_HEALTH_TIMEOUT_MS}ms`
        : err.message
    };
  } finally {
    clearTimeout(timeoutId);
  }
};
