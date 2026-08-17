import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireSuperadmin } from '../middleware/auth.js';

const router = express.Router();
router.use(requireSuperadmin);

router.get('/', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ success: false, message: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' });
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return res.status(400).json({ success: false, message: error.message });
  const { data: profiles, error: profileError } = await supabaseAdmin.from('admin_profiles').select('*');
  const profileMap = new Map((profiles || []).map(profile => [profile.user_id, profile]));
  const users = data.users.filter(user => ['admin', 'superadmin'].includes(user.app_metadata?.role)).map(user => {
    const profile = profileMap.get(user.id);
    return { id: user.id, email: user.email, displayName: profile?.display_name || user.user_metadata?.display_name || user.email, division: profile?.division || 'ARMD', role: profile?.role || user.app_metadata?.role, status: profile?.status || 'active', createdAt: user.created_at, lastSignInAt: user.last_sign_in_at };
  });
  if (profileError) res.set('X-Admin-Profiles-Warning', 'Run create_admin_profiles.sql in Supabase SQL Editor');
  return res.json({ success: true, data: users });
});

router.post('/', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ success: false, message: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const displayName = String(req.body?.displayName || '').trim();
  const division = String(req.body?.division || 'ARMD').trim();
  if (!email || password.length < 8 || !displayName) return res.status(400).json({ success: false, message: 'Name, valid email, and a password of at least 8 characters are required.' });
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName }, app_metadata: { role: 'admin' } });
  if (error) return res.status(400).json({ success: false, message: error.message });
  const profile = { user_id: data.user.id, email, display_name: displayName, division, role: 'admin', status: 'active' };
  const { error: profileError } = await supabaseAdmin.from('admin_profiles').insert(profile);
  if (profileError) { await supabaseAdmin.auth.admin.deleteUser(data.user.id); return res.status(500).json({ success: false, message: 'Admin profile table is not ready. Run create_admin_profiles.sql first.' }); }
  return res.status(201).json({ success: true, data: { id: data.user.id, email, displayName, division, role: 'admin', status: 'active' } });
});

router.post('/sync', async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ success: false, message: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' });
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return res.status(400).json({ success: false, message: error.message });
  const profiles = data.users.filter(user => ['admin', 'superadmin'].includes(user.app_metadata?.role)).map(user => ({ user_id: user.id, email: user.email, display_name: user.user_metadata?.display_name || user.email, division: 'ARMD', role: user.app_metadata.role, status: 'active', updated_at: new Date().toISOString() }));
  const { error: syncError } = await supabaseAdmin.from('admin_profiles').upsert(profiles, { onConflict: 'user_id' });
  if (syncError) return res.status(500).json({ success: false, message: 'Run create_admin_profiles.sql in Supabase SQL Editor before syncing.' });
  return res.json({ success: true, data: { synced: profiles.length } });
});

export default router;
