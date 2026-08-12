import React, { useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import {
  Award,
  Briefcase,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';

const mobileNavItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Personnel', path: '/personnel', icon: Users, badge: 'Main' },
  { label: 'Reports', path: '/reports', icon: FileSpreadsheet },
  { label: 'All Orders', path: '/orders', icon: FileText },
  { label: 'Assignment', path: '/assignment', icon: Briefcase },
  { label: 'Education', path: '/education', icon: GraduationCap },
  { label: 'Promotion', path: '/promotion', icon: Award },
  { label: 'Management', path: '/management', icon: Settings, badge: 'Admin' }
];

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const openMobileMenu = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setMobileMenuClosing(false);
    setMobileMenuOpen(true);
  };

  const closeMobileMenu = () => {
    setMobileMenuClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
    }, 220);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className={`mobile-menu-backdrop absolute inset-0 h-full w-full bg-slate-950/60 ${mobileMenuClosing ? 'mobile-menu-backdrop--closing' : ''}`}
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
          />
          <aside className={`mobile-menu-panel relative flex h-full w-[min(19rem,85vw)] flex-col bg-[#061942] text-white shadow-2xl ${mobileMenuClosing ? 'mobile-menu-panel--closing' : ''}`}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-md">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold tracking-tight text-white">PNP-ITMS</h1>
                  <p className="text-[11px] font-medium text-blue-200/80">Personnel Directory</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-blue-100 hover:bg-white/10 hover:text-white"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              <div className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-blue-300/60">
                Administration
              </div>
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `group flex items-center justify-between rounded-xl border-l-4 px-3.5 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-blue-500 bg-[#183166] text-white font-bold'
                          : 'border-transparent text-blue-200/80 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-blue-300/70'}`} />
                          <span>{item.label}</span>
                        </span>
                        {item.badge && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-blue-500 text-white' : 'bg-white/10 text-blue-200'}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden bg-slate-50 lg:ml-64">
        <Header onMenuClick={openMobileMenu} />
        <main className="flex-1 w-full min-w-0 p-2 sm:p-3 md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

