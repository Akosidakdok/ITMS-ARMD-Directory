import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

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
    }, 170);
  };

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <Sidebar />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            className={`mobile-menu-backdrop absolute inset-0 h-full w-full bg-slate-950/55 ${mobileMenuClosing ? 'mobile-menu-backdrop--closing' : ''}`}
            onClick={closeMobileMenu}
            aria-label="Close navigation menu"
          />
          <div className={`mobile-menu-panel relative h-full w-fit ${mobileMenuClosing ? 'mobile-menu-panel--closing' : ''}`}>
            <Sidebar mobile onNavigate={closeMobileMenu} />
            <button
              type="button"
              onClick={closeMobileMenu}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation menu"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden bg-slate-50 lg:ml-60">
        <Header onMenuClick={openMobileMenu} />
        <main className="w-full min-w-0 flex-1 p-3 sm:p-4 lg:p-5 xl:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
