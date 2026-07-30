import React from 'react';
import { useAuthRole } from '../../context/AuthRoleContext';
import { Bell } from 'lucide-react';

export const Header: React.FC = () => {
  const { backendConnected } = useAuthRole();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between">
      {/* Header Right Actions */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">

        {/* Backend Server Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
            backendConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
          title={backendConnected ? 'Connected to live Node.js Express REST API' : 'Running in Standalone Local Store Mode'}
        >
          <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="hidden lg:inline">{backendConnected ? 'API: Connected' : 'Local Store'}</span>
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
