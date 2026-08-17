import React, { useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Shield, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useAuthRole } from '../context/AuthRoleContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuthRole();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [demoOpen, setDemoOpen] = useState(true);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const fillAdministratorAccount = () => {
    setUsername('cjbaldonado11@gmail.com');
    setError('');
    usernameInputRef.current?.focus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 p-4">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-[#061942] to-blue-800 px-7 py-8 text-white">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 shadow-lg">
            <ShieldCheck aria-hidden="true" className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold">PNP-ITMS Personnel Directory</h1>
          <p className="mt-2 text-sm leading-6 text-blue-100">Sign in with your authorized administrative or view-only account.</p>
        </div>

        <form className="space-y-5 p-7" onSubmit={handleSubmit} noValidate>
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}
          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/70">
            <button type="button" onClick={() => setDemoOpen(open => !open)} aria-expanded={demoOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-100/60">
              <span className="flex items-center gap-2">
                <Sparkles aria-hidden="true" className="h-4 w-4 text-blue-600" />
                <strong className="text-sm text-blue-900">Demo Account</strong>
                <span className="text-xs text-blue-600">— tap to fill</span>
              </span>
              <ChevronDown aria-hidden="true" className={`h-4 w-4 text-blue-500 transition-transform ${demoOpen ? 'rotate-180' : ''}`} />
            </button>
            {demoOpen && (
              <div className="border-t border-blue-200 p-2.5">
                <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Shield aria-hidden="true" className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-blue-900">Administrator</strong>
                    <span className="block truncate text-xs text-slate-500">cjbaldonado11@gmail.com</span>
                  </span>
                  <button type="button" onClick={fillAdministratorAccount} className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-extrabold text-blue-700 hover:bg-blue-200">Fill</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="login-username" className="mb-1.5 block text-sm font-bold text-slate-700">Email address</label>
            <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <User aria-hidden="true" className="pointer-events-none h-4 w-4 shrink-0 text-slate-400" />
              <input ref={usernameInputRef} id="login-username" name="email" type="email" autoComplete="username" autoFocus required disabled={submitting} value={username} onChange={event => setUsername(event.target.value)} placeholder="Enter Supabase account email" className="relative z-10 w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none disabled:cursor-wait" />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
            <div className="flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <ShieldCheck aria-hidden="true" className="pointer-events-none h-4 w-4 shrink-0 text-slate-400" />
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={submitting} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter password" className="relative z-10 w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none disabled:cursor-wait" />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={submitting || !username.trim() || !password} className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="text-center text-xs text-slate-500">Restricted system • Authorized personnel only</p>
        </form>
      </section>
    </main>
  );
};
