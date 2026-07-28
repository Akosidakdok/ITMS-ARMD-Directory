import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const checkSupabaseStatus = async () => {
  if (!supabase) {
    return { isConnected: false, state: 'Credentials Missing' };
  }
  try {
    const { error } = await supabase.from('personnel').select('count', { count: 'exact', head: true });
    return {
      isConnected: true,
      state: 'Connected',
      url: supabaseUrl,
      tablesReady: !error
    };
  } catch (err) {
    return {
      isConnected: false,
      state: 'Error',
      error: err.message
    };
  }
};
