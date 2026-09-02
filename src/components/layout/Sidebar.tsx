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
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobile = false, onNavigate, collapsed = false }) => {
  const { role, authUser, logout } = useAuthRole();
  const isCollapsed = collapsed && !mobile;
  const sidebarVariant = mobile ? 'mobile' : 'desktop';
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
      id={mobile ? 'mobile-navigation' : 'primary-sidebar'}
      aria-label="Primary navigation"
      className={mobile
        ? 'flex h-full w-[min(17rem,86vw)] flex-col border-r border-white/10 bg-blue-900 text-white'
        : `fixed inset-y-0 left-0 z-30 hidden h-dvh flex-col border-r border-blue-950 bg-blue-900 text-white transition-[width] duration-200 ease-out lg:flex ${isCollapsed ? 'w-[4.5rem]' : 'w-60'}`}
    >
      <div className={`flex h-[4.5rem] shrink-0 items-center border-b border-white/10 ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
        <div className="flex h-11 w-10 shrink-0 items-center justify-center border-r border-white/15 pr-2">
          <img src={pnpLogo} alt="" aria-hidden="true" className="h-9 w-7 object-contain" />
        </div>
        <div className={isCollapsed ? 'sr-only' : undefined}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-blue-200">PNP–ITMS</p>
          <p className="text-sm font-bold tracking-[0.01em] text-white">PAIS 2.0</p>
          <p className="text-[9px] font-medium uppercase tracking-[0.06em] text-blue-200/70">Personnel records desk</p>
        </div>
      </div>

      <nav className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        <div className="space-y-5">
          {navigationGroups.map(group => {
            const visibleItems = group.items.filter(item => !item.superadminOnly || role === 'superadmin');
            if (!visibleItems.length) return null;
            const groupId = `${sidebarVariant}-nav-${group.label.replace(/\s+/g, '-').toLowerCase()}`;
            return (
              <section key={group.label} aria-labelledby={groupId}>
                <p id={groupId} className={isCollapsed ? 'sr-only' : 'mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-300/70'}>
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
                        title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) => `group relative flex min-h-9 items-center rounded py-2 text-xs transition-colors ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${
                        isActive
                            ? 'bg-white/11 font-semibold text-white before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-amber-300'
                            : 'font-medium text-blue-100/75 hover:bg-white/6 hover:text-white'
                        }`}
                      >
                        {({ isActive }) => (
                          <>
                            <Icon aria-hidden="true" className={`${isCollapsed ? 'h-[1.125rem] w-[1.125rem]' : 'h-4 w-4'} shrink-0 ${isActive ? 'text-blue-200' : 'text-blue-200/60 group-hover:text-blue-100'}`} />
                            <span className={isCollapsed ? 'sr-only' : undefined}>{item.label}</span>
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
        <div className={`mb-2 flex items-center border border-white/8 bg-white/5 py-2.5 ${isCollapsed ? 'justify-center px-1' : 'gap-2.5 px-2.5'}`} title={isCollapsed ? `${authUser?.displayName || authUser?.username} · ${roleLabel}` : undefined}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${role === 'superadmin' ? 'bg-blue-950 ring-1 ring-amber-300/70' : 'bg-blue-700'}`}>{initials}</span>
          <span className={isCollapsed ? 'sr-only' : 'min-w-0 flex-1'}>
            <span className="block truncate text-xs font-semibold text-white">{authUser?.displayName || authUser?.username}</span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold text-blue-100">{roleLabel}</span>
            <span className="block truncate text-[9px] text-blue-200/55">{roleDescription}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className={`flex min-h-9 w-full items-center rounded-lg py-2 text-xs font-medium text-blue-100/75 hover:bg-white/6 hover:text-white ${isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'}`}
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          <span className={isCollapsed ? 'sr-only' : undefined}>Sign out</span>
        </button>
      </div>
    </aside>
  );
};
