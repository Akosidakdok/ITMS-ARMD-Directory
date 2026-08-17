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
  UserCog,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useAuthRole } from '../../context/AuthRoleContext';

export const Sidebar: React.FC = () => {
  const { role, authUser, logout } = useAuthRole();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Personnel', path: '/personnel', icon: Users, badge: 'Main' },
    { label: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { label: 'All Orders', path: '/orders', icon: FileText },
    { label: 'Assignment', path: '/assignment', icon: Briefcase },
    { label: 'Education', path: '/education', icon: GraduationCap },
    { label: 'Promotion', path: '/promotion', icon: Award },
    { label: 'Management', path: '/management', icon: Settings, badge: 'Admin' }
  ];
  if (role === 'superadmin') navItems.push({ label: 'Admin Accounts', path: '/admin-accounts', icon: UserCog, badge: 'Super' });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-64 flex-col border-r border-[#0f285e] bg-[#061942] text-white shadow-xl select-none lg:flex">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-extrabold tracking-tight text-white font-outfit">PNP-ITMS</h1>
          <span className="text-[11px] font-medium text-blue-200/80 truncate">
            Personnel Directory
          </span>
        </div>
      </div>

      {/* User Info Card Widget */}
      <div className="px-4 py-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 shadow-inner">
          <div className="w-9 h-9 rounded-full bg-blue-600 font-bold text-white text-xs flex items-center justify-center flex-shrink-0 border border-blue-400/30">
            {authUser?.displayName.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{authUser?.displayName || authUser?.username}</div>
            <div className="text-[11px] text-blue-200/60 font-medium capitalize truncate">
              {role === 'superadmin' ? 'Superadmin' : role === 'admin' ? 'Administrator' : 'View-Only User'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1.5 text-[10px] font-extrabold text-blue-300/60 uppercase tracking-widest">
          Administration
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#183166] text-white font-bold shadow-xs border-l-4 border-blue-500'
                    : 'text-blue-200/80 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-blue-400' : 'text-blue-300/70 group-hover:text-white'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-blue-200 group-hover:bg-white/20'
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

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-200/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4 text-blue-300/70" />
          <span>Sign Out</span>
        </button>

        <div className="text-center text-[10px] text-blue-300/40 font-mono pt-1">
          v1.0.0
        </div>
      </div>
    </aside>
  );
};




