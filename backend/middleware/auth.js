import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createSupabaseAuthClient, isSupabaseConfigured } from '../config/supabase.js';

const authDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(authDirectory, '../.env.auth') });

const adminEmails = () => new Set(String(process.env.AUTH_ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean));
const superadminEmails = () => new Set(String(process.env.AUTH_SUPERADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean));

export const isAuthConfigured = () => isSupabaseConfigured();

export const resolveAppRole = user => {
  const email = String(user?.email || '').toLowerCase();
  if (user?.app_metadata?.role === 'superadmin' || superadminEmails().has(email)) return 'superadmin';
  return user?.app_metadata?.role === 'admin' || adminEmails().has(email) ? 'admin' : 'view_only';
};

export const toAuthenticatedUser = user => ({
  id: user.id,
  username: user.email,
  email: user.email,
  displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email,
  role: resolveAppRole(user)
});

export const login = async (email, password) => {
  const client = createSupabaseAuthClient();
  if (!client) throw new Error('Supabase Auth is not configured.');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new Error(error?.message || 'Invalid email or password.');
  return { token: data.session.access_token, user: toAuthenticatedUser(data.user) };
};

export const verifyToken = async token => {
  const client = createSupabaseAuthClient();
  if (!client || !token) return null;
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : toAuthenticatedUser(data.user);
};

export const authenticateRequest = async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const user = await verifyToken(authorization.startsWith('Bearer ') ? authorization.slice(7) : '');
  if (!user) return res.status(401).json({ success: false, message: 'Authentication is required.' });
  req.user = user;
  next();
};

export const requireAdminForMutation = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || ['admin', 'superadmin'].includes(req.user?.role)) return next();
  return res.status(403).json({ success: false, message: 'Administrator permission is required.' });
};

export const requireSuperadmin = (req, res, next) => req.user?.role === 'superadmin'
  ? next()
  : res.status(403).json({ success: false, message: 'Superadmin permission is required.' });
