import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  Shield,
  ShieldCheck,
  User
} from 'lucide-react';
import pnpLogo from '../assets/pnp-logo-transparent.png';
import { useAuthRole } from '../context/AuthRoleContext';
import './LoginPage.css';

const developmentAccounts = [
  {
    email: 'cjbaldonado11@gmail.com',
    password: 'PAIS-Admin-2026!',
    role: 'Superadmin'
  },
  {
    email: 'admin@gmail.com',
    password: '12345678',
    role: 'Admin'
  }
] as const;

export const LoginPage: React.FC = () => {
  const { login } = useAuthRole();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [demoOpen, setDemoOpen] = useState(true);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const fillDevelopmentAccount = (account: (typeof developmentAccounts)[number]) => {
    setUsername(account.email);
    setPassword(account.password);
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
    <main className="pais-login">
      <section className="pais-login__shell" aria-labelledby="login-heading">
        <aside className="pais-login__brand" aria-label="PAIS 2.0 system information">
          <span className="pais-login__brand-accent" aria-hidden="true" />
          <header className="pais-login__agency">
            <div className="pais-login__agency-mark">
              <img src={pnpLogo} alt="Philippine National Police official logo" />
            </div>
            <div>
              <p>Philippine National Police</p>
              <strong>PNP–ITMS</strong>
              <span>Information Technology Management Service</span>
            </div>
          </header>

          <div className="pais-login__brand-copy">
            <div className="pais-login__version">
              <span aria-hidden="true" />
              Secure internal portal
              <b>PAIS 2.0</b>
            </div>
            <h1 id="login-heading">Personnel &amp; Assignment Information System</h1>
            <p>One secure workspace for official personnel profiles, assignments, service records, training, and administrative reporting.</p>

            <div className="pais-login__assurances">
              <div>
                <span className="pais-login__assurance-icon"><Database aria-hidden="true" /></span>
                <span><strong>Unified personnel records</strong><small>Accurate, centralized administrative information</small></span>
              </div>
              <div>
                <span className="pais-login__assurance-icon"><FileCheck2 aria-hidden="true" /></span>
                <span><strong>Controlled system access</strong><small>Role-based permissions and protected sessions</small></span>
              </div>
            </div>
          </div>

          <footer className="pais-login__brand-footer">
            <span><i aria-hidden="true" /> Restricted government information system</span>
            <small>Authorized PNP personnel only</small>
          </footer>
        </aside>

        <form className="pais-login__form" onSubmit={handleSubmit} noValidate>
          <div className="pais-login__form-heading">
            <p>Authorized access</p>
            <h2>Welcome back</h2>
            <span>Enter your assigned credentials to continue to PAIS 2.0.</span>
          </div>

          {error && (
            <div role="alert" className="pais-login__error">
              <Shield aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="pais-login__development">
            <button type="button" onClick={() => setDemoOpen(open => !open)} aria-expanded={demoOpen} className="pais-login__development-toggle">
              <span>
                <LockKeyhole aria-hidden="true" />
                <span><strong>Development access</strong><small>Choose a prepared test account</small></span>
              </span>
              <ChevronDown aria-hidden="true" className={demoOpen ? 'is-open' : ''} />
            </button>

            {demoOpen && (
              <div className="pais-login__account-grid">
                {developmentAccounts.map(account => {
                  const isSuperadmin = account.role === 'Superadmin';
                  const isSelected = username === account.email;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => fillDevelopmentAccount(account)}
                      aria-label={`Use ${account.role} development account`}
                      aria-pressed={isSelected}
                      className={`pais-login__account${isSelected ? ' is-selected' : ''}`}
                    >
                      <span className={`pais-login__account-icon${isSuperadmin ? ' is-superadmin' : ''}`}>
                        {isSuperadmin ? <ShieldCheck aria-hidden="true" /> : <Shield aria-hidden="true" />}
                      </span>
                      <span className="pais-login__account-copy">
                        <strong>{account.role}</strong>
                        <small>{account.email}</small>
                        <span>Use account <ArrowRight aria-hidden="true" /></span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pais-login__fields">
            <div className="pais-login__field">
              <label htmlFor="login-username">Email address</label>
              <div className="pais-login__input">
                <User aria-hidden="true" />
                <input
                  ref={usernameInputRef}
                  id="login-username"
                  name="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={submitting}
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  placeholder="name@pnp.gov.ph"
                />
              </div>
            </div>

            <div className="pais-login__field">
              <label htmlFor="login-password">Password</label>
              <div className="pais-login__input">
                <LockKeyhole aria-hidden="true" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting || !username.trim() || !password} className="pais-login__submit">
            {submitting ? <><LoaderCircle aria-hidden="true" className="is-spinning" /> Signing in…</> : <>Sign in securely <ArrowRight aria-hidden="true" /></>}
          </button>

          <div className="pais-login__security-note">
            <ShieldCheck aria-hidden="true" />
            <span><strong>Protected authentication</strong><small>Your session is encrypted and access-controlled.</small></span>
          </div>

          <p className="pais-login__form-footer">PAIS 2.0 <span aria-hidden="true">•</span> PNP Information Technology Management Service</p>
        </form>
      </section>
    </main>
  );
};
