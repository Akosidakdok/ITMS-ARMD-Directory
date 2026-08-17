import React, { useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, LockKeyhole, Shield, ShieldCheck, User } from 'lucide-react';
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg md:grid-cols-[0.9fr_1.1fr]" aria-labelledby="login-heading">
        <div className="flex flex-col justify-between bg-blue-800 px-6 py-7 text-white sm:px-8 sm:py-9">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                <ShieldCheck aria-hidden="true" className="h-5 w-5 text-blue-100" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide">PNP–ITMS</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-blue-200">Official information system</p>
              </div>
            </div>
            <h1 id="login-heading" className="max-w-sm text-2xl font-bold leading-tight tracking-[-0.025em]">Personnel & Assignment Information System</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-blue-100/85">Secure access to official personnel records, assignments, orders, training, and administrative reports.</p>
          </div>
          <div className="mt-8 border-t border-white/10 pt-4 text-[11px] leading-5 text-blue-200/75">
            Philippine National Police<br />Information Technology Management Service
          </div>
        </div>

        <form className="space-y-5 p-6 sm:p-8 md:p-10" onSubmit={handleSubmit} noValidate>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700">Authorized access</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Use your assigned Supabase administrative or view-only credentials.</p>
          </div>
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}
          <div className="overflow-hidden rounded-lg border border-blue-200 bg-blue-50/70">
            <button type="button" onClick={() => setDemoOpen(open => !open)} aria-expanded={demoOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-100/60">
              <span className="flex items-center gap-2">
                <LockKeyhole aria-hidden="true" className="h-4 w-4 text-blue-700" />
                <strong className="text-xs text-blue-900">Development access account</strong>
              </span>
              <ChevronDown aria-hidden="true" className={`h-4 w-4 text-blue-500 transition-transform ${demoOpen ? 'rotate-180' : ''}`} />
            </button>
            {demoOpen && (
              <div className="border-t border-blue-200 p-2.5">
                <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-white p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Shield aria-hidden="true" className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-blue-900">Administrator</strong>
                    <span className="block truncate text-xs text-slate-500">cjbaldonado11@gmail.com</span>
                  </span>
                  <button type="button" onClick={fillAdministratorAccount} className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">Use email</button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="login-username" className="mb-1.5 block text-sm font-bold text-slate-700">Email address</label>
            <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <User aria-hidden="true" className="pointer-events-none h-4 w-4 shrink-0 text-slate-400" />
              <input ref={usernameInputRef} id="login-username" name="email" type="email" autoComplete="username" autoFocus required disabled={submitting} value={username} onChange={event => setUsername(event.target.value)} placeholder="Enter Supabase account email" className="relative z-10 w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none disabled:cursor-wait" />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
            <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <ShieldCheck aria-hidden="true" className="pointer-events-none h-4 w-4 shrink-0 text-slate-400" />
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={submitting} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter password" className="relative z-10 w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none disabled:cursor-wait" />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={submitting || !username.trim() || !password} className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="text-center text-[11px] text-slate-500">Restricted system • Authorized PNP personnel only</p>
        </form>
      </section>
    </main>
  );
};
