import { supabase } from '../config/supabase.js';

async function forceDelete() {
  console.log('🔍 Querying Supabase personnel table...');
  const { data, error } = await supabase.from('personnel').select('*');
  if (error) {
    console.error('Error fetching personnel:', error);
    process.exit(1);
  }

  console.log(`Fetched ${data.length} records from Supabase personnel table.`);
  for (const row of data) {
    console.log(`Deleting ID: ${row.id} - ${row.fullName}`);
    const { error: delErr } = await supabase.from('personnel').delete().eq('id', row.id);
    if (delErr) {
      console.error(`Failed to delete ${row.id}:`, delErr.message);
    } else {
      console.log(`Deleted ${row.id}`);
    }
  }

  const { data: remaining } = await supabase.from('personnel').select('*');
  console.log(`Remaining records in Supabase: ${remaining ? remaining.length : 0}`);
  process.exit(0);
}

forceDelete();
