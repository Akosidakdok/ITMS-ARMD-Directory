import React from 'react';
import { useAuthRole } from '../../context/AuthRoleContext';
import { Bell, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { backendConnected, backendHealth } = useAuthRole();
  const checkingBackend = backendHealth === null;
  const supabaseStatus = backendHealth?.database?.supabase;
  const supabaseConnected = !!supabaseStatus?.isConnected;
  const statusLabel = checkingBackend
    ? 'Checking API'
    : !backendConnected
    ? 'API Offline'
    : supabaseConnected
      ? 'Supabase Connected'
      : 'Supabase Offline';
  const statusTitle = checkingBackend
    ? 'Checking backend API status'
    : !backendConnected
    ? 'Backend API is not reachable'
    : supabaseConnected
      ? 'Connected to Supabase PostgreSQL'
      : `Backend API is online, but Supabase is unavailable${supabaseStatus?.state ? ` (${supabaseStatus.state})` : ''}`;

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 hover:text-slate-950 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Header Right Actions */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">

        {/* Backend Server Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
            supabaseConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : backendConnected
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : checkingBackend
                  ? 'bg-slate-50 text-slate-700 border-slate-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
          title={statusTitle}
        >
          <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500 animate-pulse' : backendConnected ? 'bg-orange-500' : checkingBackend ? 'bg-slate-400 animate-pulse' : 'bg-amber-500'}`} />
          <span className="hidden lg:inline">{statusLabel}</span>
        </div>

        {/* Notifications Icon */}
        <button className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 transition-colors shadow-2xs">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 font-bold text-white text-xs flex items-center justify-center shadow-xs">
            DA
          </div>
          <div className="hidden md:block text-left leading-tight">
            <div className="text-xs font-bold text-slate-900">Demo Admin</div>
            <div className="text-[10px] text-slate-500 font-medium">Admin</div>
          </div>
        </div>

      </div>
    </header>
  );
};
