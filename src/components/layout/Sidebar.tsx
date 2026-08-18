import React from 'react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Briefcase,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCog,
  Users
} from 'lucide-react';
import { useAuthRole } from '../../context/AuthRoleContext';
import pnpLogo from '../../assets/pnp-logo-transparent.png';
import { getRoleDescription, getRoleLabel } from '../../utils/accessControl';

interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  superadminOnly?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    label: 'General',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Personnel Information', path: '/personnel', icon: Users },
      { label: 'Management Center', path: '/management', icon: Settings }
    ]
  },
  {
    label: 'Personnel Records',
    items: [
      { label: 'Assignment', path: '/assignment', icon: Briefcase },
      { label: 'Orders', path: '/orders', icon: FileText },
      { label: 'Education & Training', path: '/education', icon: GraduationCap },
      { label: 'Promotion', path: '/promotion', icon: Award }
    ]
  },
  {
    label: 'Reporting',
    items: [{ label: 'Reports', path: '/reports', icon: FileSpreadsheet }]
  },
  {
    label: 'System Administration',
    items: [{ label: 'Administrator Accounts', path: '/admin-accounts', icon: UserCog, superadminOnly: true }]
  }
];

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobile = false, onNavigate }) => {
  const { role, authUser, logout } = useAuthRole();
  const initials = authUser?.displayName
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
  const roleLabel = getRoleLabel(role);
  const roleDescription = getRoleDescription(role);

  return (
    <aside
      aria-label="Primary navigation"
      className={mobile
        ? 'flex h-full w-[min(17rem,86vw)] flex-col border-r border-white/10 bg-blue-800 text-white'
        : 'fixed inset-y-0 left-0 z-30 hidden h-dvh w-60 flex-col border-r border-blue-900 bg-blue-800 text-white lg:flex'}
    >
      <div className="flex h-[4.5rem] items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/8">
          <img src={pnpLogo} alt="" aria-hidden="true" className="h-9 w-7 object-contain" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-blue-200">PNP–ITMS</p>
          <p className="text-sm font-bold tracking-[0.01em] text-white">PAIS 2.0</p>
          <p className="text-[9px] font-medium text-blue-200/70">Personnel administration</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {navigationGroups.map(group => {
            const visibleItems = group.items.filter(item => !item.superadminOnly || role === 'superadmin');
            if (!visibleItems.length) return null;
            return (
              <section key={group.label} aria-labelledby={`nav-${group.label.replace(/\s+/g, '-').toLowerCase()}`}>
                <p id={`nav-${group.label.replace(/\s+/g, '-').toLowerCase()}`} className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-300/70">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        onClick={onNavigate}
                        className={({ isActive }) => `group relative flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors ${
                          isActive
                            ? 'bg-white/12 font-semibold text-white shadow-sm before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-amber-300'
                            : 'font-medium text-blue-100/75 hover:bg-white/6 hover:text-white'
                        }`}
                      >
                        {({ isActive }) => (
                          <>
                            <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-200' : 'text-blue-200/60 group-hover:text-blue-100'}`} />
                            <span>{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/5 px-2.5 py-2.5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${role === 'superadmin' ? 'bg-blue-950 ring-1 ring-amber-300/70' : 'bg-blue-600'}`}>{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-white">{authUser?.displayName || authUser?.username}</span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold text-blue-100">{roleLabel}</span>
            <span className="block truncate text-[9px] text-blue-200/55">{roleDescription}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-blue-100/75 hover:bg-white/6 hover:text-white"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
};
