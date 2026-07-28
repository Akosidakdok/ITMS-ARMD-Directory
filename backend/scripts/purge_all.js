import { supabase } from '../config/supabase.js';

async function purgeTargeted() {
  console.log('🔥 Purging Supabase Cloud Database records...');

  if (!supabase) {
    console.error('❌ Supabase not initialized.');
    process.exit(1);
  }

  // 1. Fetch all IDs currently in Supabase personnel table
  const { data: records, error: fetchErr } = await supabase.from('personnel').select('id');
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${records.length} records in Supabase personnel table:`, records.map(r => r.id));

  if (records.length > 0) {
    const ids = records.map(r => r.id);
    const { error: delErr } = await supabase.from('personnel').delete().in('id', ids);
    if (delErr) {
      console.error('Delete error:', delErr);
    } else {
      console.log(`✅ Successfully deleted ${records.length} records from Supabase personnel table!`);
    }
  } else {
    console.log('Table is already empty!');
  }

  // Double check remaining count
  const { data: check } = await supabase.from('personnel').select('id');
  console.log(`Remaining record count in Supabase: ${check?.length || 0}`);
  process.exit(0);
}

purgeTargeted();
