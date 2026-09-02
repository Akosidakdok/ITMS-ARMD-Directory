import React, { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'pais-sidebar-collapsed';

const getInitialSidebarCollapsed = () => {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed);
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

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
    } catch {
      // The layout remains usable when browser storage is unavailable.
    }
  }, [sidebarCollapsed]);

  return (
    <div className="authenticated-shell flex min-h-dvh overflow-x-hidden text-slate-900">
      <Sidebar collapsed={sidebarCollapsed} />

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

      <div className={`flex min-w-0 flex-1 flex-col overflow-x-hidden transition-[margin] duration-200 ease-out ${sidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-60'}`}>
        <Header
          onMenuClick={openMobileMenu}
          onSidebarToggle={() => setSidebarCollapsed(collapsed => !collapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="authenticated-main w-full min-w-0 flex-1 p-3 sm:p-4 lg:p-5">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet />
          </div>
        </main>
        <footer className="no-print flex min-h-10 items-center justify-between gap-3 border-t border-slate-300 bg-[#fcfbf7] px-4 text-[10px] text-slate-500 sm:px-6">
          <span className="font-mono">PAIS 2.0 · PERSONNEL RECORDS DESK</span>
          <span className="hidden sm:inline">PNP Information Technology Management Service</span>
        </footer>
      </div>
    </div>
  );
};
