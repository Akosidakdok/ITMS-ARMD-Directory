import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden bg-slate-50">
        <Header />
        <nav className="sticky top-16 z-30 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
          {[
            { label: 'Dashboard', path: '/' },
            { label: 'Personnel', path: '/personnel' },
            { label: 'Reports', path: '/reports' },
            { label: 'All Orders', path: '/orders' },
          ].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 p-3 md:p-4 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

