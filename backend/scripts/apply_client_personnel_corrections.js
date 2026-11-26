import { db } from '../store/repository.js';
import { checkSupabaseStatus } from '../config/supabase.js';
import { getClientPersonnelCorrections } from '../utils/clientPersonnelCorrections.js';

const apply = process.argv.includes('--apply');
const status = await checkSupabaseStatus();
if (!status.isConnected) throw new Error('Supabase is unavailable; no fallback or roster changes will be made.');
const corrections = getClientPersonnelCorrections(await db.getPersonnel());
console.log(JSON.stringify(corrections, null, 2));
if (corrections.some(c => c.error)) throw new Error('Resolve unmatched or ambiguous identities before applying corrections.');
if (apply) {
  for (const correction of corrections) {
    if (Object.keys(correction.patch).length) await db.updatePersonnel(correction.id, correction.patch);
  }
  console.log('Client corrections saved. Existing nonempty values were preserved.');
} else console.log('Preview only. Run with --apply after migrate_personnel_duties.sql.');
