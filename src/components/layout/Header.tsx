import React, { useState, useRef, useEffect } from 'react';
import { useAuthRole } from '../../context/AuthRoleContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Shield, 
  UserCheck, 
  Eye, 
  Bell, 
  Sun,
  Moon,
  Command,
  Sparkles
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const Header: React.FC = () => {
  const { 
    role, 
    toggleRole, 
    globalSearchQuery, 
    setGlobalSearchQuery, 
    personnelList,
    setSelectedPersonnelId 
  } = useAuthRole();

  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter search results
  const matchingPersonnel = globalSearchQuery.trim() === '' 
    ? [] 
    : personnelList.filter(p => 
        p.fullName.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        p.badgeNo.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        p.rank.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        p.division.toLowerCase().includes(globalSearchQuery.toLowerCase())
      ).slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPerson = (id: string) => {
    setSelectedPersonnelId(id);
    setGlobalSearchQuery('');
    setIsSearchOpen(false);
    navigate('/personnel');
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between theme-transition">
      {/* Search Input Container */}
      <div className="relative w-full max-w-md" ref={searchRef}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search personnel by name, badge no., or rank..."
            className="w-full pl-10 pr-12 py-2 text-xs bg-slate-100/80 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-xs"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            <Command className="w-3 h-3" /> K
          </div>
        </div>

        {/* Live Search Dropdown */}
        {isSearchOpen && matchingPersonnel.length > 0 && (
          <div className="absolute top-full mt-2 w-full glass-panel bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Matching Personnel Records</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{matchingPersonnel.length} found</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto">
              {matchingPersonnel.map((person) => (
                <div
                  key={person.id}
                  onClick={() => handleSelectPerson(person.id)}
                  className="p-3 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center gap-3"
                >
                  <img
                    src={person.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                    alt={person.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-blue-200 dark:border-blue-500/30"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{person.rank}</span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{person.lastName}, {person.firstName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Badge: <strong className="text-slate-700 dark:text-slate-300 font-mono">{person.badgeNo}</strong></span>
                      <span>•</span>
                      <span>{person.division}</span>
                    </div>
                  </div>
                  <Badge variant={person.status === 'Active' ? 'success' : 'warning'} size="sm">
                    {person.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Header Right Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle Button (Light/Dark) */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xs"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-300" />
          )}
        </button>

        {/* Role Toggle Switcher */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs">
          <button
            onClick={toggleRole}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              role === 'admin' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin / Editor</span>
            <span className="sm:hidden">Admin</span>
          </button>
          <button
            onClick={toggleRole}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              role === 'view_only' 
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="hidden sm:inline">View Only</span>
            <span className="sm:hidden">View</span>
          </button>
        </div>

        {/* Notifications Icon */}
        <button className="relative p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
        </button>

        {/* Current Logged User Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 p-0.5 shadow-sm">
            <div className="w-full h-full bg-blue-700 dark:bg-slate-950 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              PAIS Officer
              <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              ITMS-ARMD-HQ
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

