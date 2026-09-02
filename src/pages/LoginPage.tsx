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
      <div className="pais-login__ambient" aria-hidden="true">
        <span className="pais-login__light-ribbon" />

        <svg className="pais-login__signal-routes" viewBox="0 0 1920 1080" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pais-signal-blue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2563a6" stopOpacity="0" />
              <stop offset="0.45" stopColor="#3476ac" stopOpacity="0.48" />
              <stop offset="1" stopColor="#8fb5d2" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="pais-login__signal-route pais-login__signal-route--one" d="M-120 850C160 744 225 515 438 397C578 320 650 218 735-60" />
          <path className="pais-login__signal-route pais-login__signal-route--two" d="M1235-80C1405 166 1518 332 1450 525C1392 696 1658 856 2040 710" />
          <path className="pais-login__signal-route pais-login__signal-route--three" d="M-100 1005C390 812 676 1008 1002 918C1320 830 1540 824 2035 1050" />
          <path className="pais-login__signal-route pais-login__signal-route--four" d="M-80 115C365 298 525 52 920 128C1330 207 1512 295 2000 64" />
          <g className="pais-login__signal-points">
            <circle cx="175" cy="725" r="5" />
            <circle cx="374" cy="434" r="4" />
            <circle cx="1572" cy="720" r="5" />
            <circle cx="1744" cy="811" r="4" />
            <circle cx="250" cy="938" r="4" />
            <circle cx="1680" cy="930" r="5" />
            <circle cx="310" cy="185" r="4" />
            <circle cx="1650" cy="188" r="4" />
          </g>
        </svg>

        <svg className="pais-login__data-orbit pais-login__data-orbit--left" viewBox="0 0 520 520">
          <circle className="pais-login__orbit-halo" cx="260" cy="260" r="228" />
          <path className="pais-login__orbit-axis" d="M40 260H480M260 40V480" />
          <circle className="pais-login__orbit-ring pais-login__orbit-ring--outer" cx="260" cy="260" r="210" />
          <circle className="pais-login__orbit-ring pais-login__orbit-ring--middle" cx="260" cy="260" r="158" />
          <circle className="pais-login__orbit-ring pais-login__orbit-ring--inner" cx="260" cy="260" r="101" />
          <g className="pais-login__orbit-rotator pais-login__orbit-rotator--outer">
            <circle className="pais-login__orbit-node" cx="260" cy="50" r="7" />
            <circle className="pais-login__orbit-node pais-login__orbit-node--small" cx="470" cy="260" r="5" />
            <circle className="pais-login__orbit-node pais-login__orbit-node--small" cx="111" cy="409" r="4" />
          </g>
          <g className="pais-login__orbit-rotator pais-login__orbit-rotator--inner">
            <circle className="pais-login__orbit-node" cx="260" cy="159" r="6" />
            <circle className="pais-login__orbit-node pais-login__orbit-node--small" cx="361" cy="260" r="4" />
          </g>
          <circle className="pais-login__orbit-core-ping" cx="260" cy="260" r="38" />
          <circle className="pais-login__orbit-core" cx="260" cy="260" r="15" />
          <circle className="pais-login__orbit-core-dot" cx="260" cy="260" r="4" />
        </svg>

        <svg className="pais-login__data-orbit pais-login__data-orbit--right" viewBox="0 0 520 520">
          <circle className="pais-login__orbit-halo" cx="260" cy="260" r="228" />
          <path className="pais-login__orbit-axis" d="M40 260H480M260 40V480" />
          <circle className="pais-login__orbit-ring pais-login__orbit-ring--outer" cx="260" cy="260" r="210" />
          <circle className="pais-login__orbit-ring pais-login__orbit-ring--middle" cx="260" cy="260" r="158" />
          <circle className="pais-login__orbit-ring pais-login__orbit-ring--inner" cx="260" cy="260" r="101" />
          <g className="pais-login__orbit-rotator pais-login__orbit-rotator--outer">
            <circle className="pais-login__orbit-node" cx="260" cy="50" r="7" />
            <circle className="pais-login__orbit-node pais-login__orbit-node--small" cx="470" cy="260" r="5" />
            <circle className="pais-login__orbit-node pais-login__orbit-node--small" cx="111" cy="409" r="4" />
          </g>
          <g className="pais-login__orbit-rotator pais-login__orbit-rotator--inner">
            <circle className="pais-login__orbit-node" cx="260" cy="159" r="6" />
            <circle className="pais-login__orbit-node pais-login__orbit-node--small" cx="361" cy="260" r="4" />
          </g>
          <circle className="pais-login__orbit-core-ping" cx="260" cy="260" r="38" />
          <circle className="pais-login__orbit-core" cx="260" cy="260" r="15" />
          <circle className="pais-login__orbit-core-dot" cx="260" cy="260" r="4" />
        </svg>
      </div>

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

          {import.meta.env.DEV && <div className="pais-login__development">
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
          </div>}

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
