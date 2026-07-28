import { supabase } from '../config/supabase.js';

async function clearAllTables() {
  console.log('🧹 Purging all data from Supabase PostgreSQL tables...');

  if (!supabase) {
    console.error('❌ Supabase client not initialized. Check .env credentials.');
    process.exit(1);
  }

  const tables = ['personnel', 'orders', 'assignments', 'education', 'promotions', 'training', 'leave'];

  for (const table of tables) {
    try {
      // Delete all records where id is not null
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.warn(`⚠️ Warning deleting from table ${table}:`, error.message);
      } else {
        console.log(`✅ Table '${table}' purged successfully.`);
      }
    } catch (err) {
      console.error(`❌ Error purging ${table}:`, err.message);
    }
  }

  console.log('🎉 Supabase database is now 100% CLEAN!');
  process.exit(0);
}

clearAllTables();
