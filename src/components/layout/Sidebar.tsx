import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  FileText, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Settings,
  ShieldCheck,
  Building2
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, badge: 'Main' },
    { label: 'Personnel', path: '/personnel', icon: Users, badge: 'Profile' },
    { label: 'Reports', path: '/reports', icon: FileSpreadsheet, badge: 'Export' },
    { label: 'Orders', path: '/orders', icon: FileText },
    { label: 'Assignment', path: '/assignment', icon: Briefcase },
    { label: 'Education', path: '/education', icon: GraduationCap },
    { label: 'Promotion', path: '/promotion', icon: Award },
    { label: 'Management', path: '/management', icon: Settings, badge: 'Admin' }
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col h-screen sticky top-0 select-none theme-transition z-30 shadow-xs">
      {/* Brand & Logo Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-0.5 shadow-md shadow-blue-500/15 flex-shrink-0">
          <div className="w-full h-full bg-blue-700 dark:bg-slate-900 rounded-[10px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white font-outfit">PNP ITMS</h1>
            <span className="text-[10px] px-1.5 py-0.2 font-bold bg-blue-50 text-blue-700 rounded border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30">
              PAIS
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
            Personnel Info System
          </span>
        </div>
      </div>

      {/* Division Badge Banner */}
      <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-slate-700 dark:text-slate-300">ARMD Unit HQ</span>
        </span>
        <span className="font-mono text-[10px] text-blue-700 dark:text-blue-400 font-bold">ONLINE v2.4</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Core Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">System Status</span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Operational
          </span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
          PNP ITMS Administrative & Resource Management Division © 2026
        </p>
      </div>
    </aside>
  );
};

