import React, { useState, useRef, useEffect } from 'react';
import { useAuthRole } from '../../context/AuthRoleContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UserCheck, 
  Eye, 
  Bell, 
  Command
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
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 flex items-center justify-between">
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
            className="w-full pl-10 pr-12 py-2 text-xs bg-slate-50 text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            <Command className="w-3 h-3" /> K
          </div>
        </div>

        {/* Live Search Dropdown */}
        {isSearchOpen && matchingPersonnel.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-2.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Matching Personnel Records</span>
              <span className="text-blue-600 font-bold">{matchingPersonnel.length} found</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {matchingPersonnel.map((person) => (
                <div
                  key={person.id}
                  onClick={() => handleSelectPerson(person.id)}
                  className="p-3 hover:bg-blue-50/60 cursor-pointer transition-colors flex items-center gap-3"
                >
                  <img
                    src={person.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'}
                    alt={person.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-blue-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-700">{person.rank}</span>
                      <span className="text-xs font-semibold text-slate-900 truncate">{person.lastName}, {person.firstName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Badge: <strong className="text-slate-700 font-mono">{person.badgeNo}</strong></span>
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
        {/* Role Toggle Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-2xs">
          <button
            onClick={toggleRole}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              role === 'admin' 
                ? 'bg-blue-600 text-white shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </button>
          <button
            onClick={toggleRole}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              role === 'view_only' 
                ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">View Only</span>
          </button>
        </div>

        {/* Notifications Icon */}
        <button className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 transition-colors shadow-2xs">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
        </button>

        {/* User Profile Pill Avatar Widget */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 font-bold text-white text-xs flex items-center justify-center shadow-xs">
            DA
          </div>
          <div className="hidden md:block text-left leading-tight">
            <div className="text-xs font-bold text-slate-900">
              Demo Admin
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Admin
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};



