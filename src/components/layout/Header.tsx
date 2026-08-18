import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Database, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, UserRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuthRole } from '../../context/AuthRoleContext';
import { getRoleDescription, getRoleLabel } from '../../utils/accessControl';

interface HeaderProps {
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/personnel': 'Personnel Information',
  '/management': 'Management Center',
  '/assignment': 'Assignment Records',
  '/orders': 'Orders',
  '/education': 'Education & Training',
  '/promotion': 'Promotion & Time-in-Grade',
  '/reports': 'Reports',
  '/admin-accounts': 'Administrator Accounts'
};

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onSidebarToggle, sidebarCollapsed = false }) => {
  const { backendConnected, backendHealth, authUser, role, logout } = useAuthRole();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pageTitle = pageTitles[pathname] || 'Personnel Administration';
  const supabaseConnected = Boolean(backendHealth?.database?.supabase?.isConnected);
  const checkingBackend = backendHealth === null;
  const roleLabel = getRoleLabel(role);
  const roleDescription = getRoleDescription(role);
  const initials = authUser?.displayName
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
  const systemLabel = checkingBackend ? 'Checking system' : supabaseConnected ? 'Supabase connected' : backendConnected ? 'Database unavailable' : 'System offline';
  const statusTone = supabaseConnected ? 'bg-emerald-600' : checkingBackend ? 'bg-slate-400' : 'bg-amber-600';

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header role="banner" className="no-print sticky top-0 z-40 flex h-[4.5rem] items-center border-b border-slate-200 bg-white/95 px-3 shadow-2xs backdrop-blur sm:px-5">
      <button
        type="button"
        onClick={onMenuClick}
        className="mr-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onSidebarToggle}
        className="mr-3 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 lg:inline-flex"
        aria-controls="primary-sidebar"
        aria-expanded={!sidebarCollapsed}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed
          ? <PanelLeftOpen aria-hidden="true" className="h-5 w-5" />
          : <PanelLeftClose aria-hidden="true" className="h-5 w-5" />}
      </button>

      <div className="min-w-0">
        <div className="hidden items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:flex">
          PNP–ITMS <ChevronRight aria-hidden="true" className="h-3 w-3" /> Personnel Administration
        </div>
        <p className="truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-base">{pageTitle}</p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div
          className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 md:flex"
          title={systemLabel}
          role="status"
        >
          <Database aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" />
          <span className={`h-2 w-2 rounded-full ${statusTone}`} />
          <span>{systemLabel}</span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex min-h-10 items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-slate-50 sm:px-2"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${role === 'superadmin' ? 'bg-blue-900 ring-2 ring-amber-300/65' : 'bg-blue-700'}`}>{initials}</span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-36 truncate text-xs font-semibold text-slate-800">{authUser?.displayName || authUser?.username}</span>
              <span className="block text-[10px] font-medium text-slate-500">{roleLabel}</span>
            </span>
            <ChevronDown aria-hidden="true" className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
              <div className="border-b border-slate-100 px-2.5 py-2.5">
                <p className="truncate text-xs font-semibold text-slate-900">{authUser?.displayName || authUser?.username}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700"><ShieldCheck aria-hidden="true" className="h-3 w-3" /> {roleLabel}</span>
                <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{roleDescription}</p>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-600">
                <UserRound aria-hidden="true" className="h-4 w-4 text-slate-400" /> Authorized account
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
