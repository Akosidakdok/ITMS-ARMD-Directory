import React, { useState } from 'react';
import { useAuthRole } from '../context/AuthRoleContext';
import { PersonnelSummaryCard } from '../components/personnel/PersonnelSummaryCard';
import { PersonnelInfoTab } from '../components/personnel/PersonnelInfoTab';
import { AssignmentsSubTab } from '../components/personnel/AssignmentsSubTab';
import { EducationSubTab } from '../components/personnel/EducationSubTab';
import { PromotionSubTab } from '../components/personnel/PromotionSubTab';
import { OrdersSubTab } from '../components/personnel/OrdersSubTab';
import { TrainingSubTab } from '../components/personnel/TrainingSubTab';
import { LeaveSubTab } from '../components/personnel/LeaveSubTab';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Award, 
  FileText, 
  BookOpen, 
  Calendar,
  Users
} from 'lucide-react';
import { Badge } from '../components/common/Badge';

type TabType = 'info' | 'assignments' | 'education' | 'promotion' | 'orders' | 'training' | 'leave';

export const PersonnelPage: React.FC = () => {
  const { personnelList, selectedPersonnelId, setSelectedPersonnelId } = useAuthRole();
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Currently selected personnel object
  const currentPersonnel = personnelList.find(p => p.id === selectedPersonnelId) || personnelList[0];

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'info', label: 'Personnel Info', icon: User },
    { id: 'assignments', label: 'Assignments', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'promotion', label: 'Promotion', icon: Award },
    { id: 'orders', label: 'Orders', icon: FileText },
    { id: 'training', label: 'Training', icon: BookOpen },
    { id: 'leave', label: 'Leave', icon: Calendar }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Roster Quick Selector Bar - Clean White Card */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Active Personnel 201 Roster</h2>
            <p className="text-xs text-slate-500">Select any officer or non-commissioned officer to inspect details</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Quick Roster Dropdown */}
          <div className="relative flex-1 md:w-72">
            <select
              value={currentPersonnel.id}
              onChange={(e) => setSelectedPersonnelId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-blue-700 font-bold focus:outline-none focus:border-blue-500 shadow-2xs"
            >
              {personnelList.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.rank} {person.lastName}, {person.firstName} ({person.division} - #{person.badgeNo})
                </option>
              ))}
            </select>
          </div>

          <Badge variant="primary" size="sm">
            {personnelList.length} Registered
          </Badge>
        </div>
      </div>

      {/* Main Dual Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Summary Profile (4 cols on lg) */}
        <div className="lg:col-span-4 sticky top-20">
          <PersonnelSummaryCard personnel={currentPersonnel} />
        </div>

        {/* Right Panel: Detailed Record with Sub-tabs (8 cols on lg) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-h-[600px] shadow-2xs">
          {/* Navigation Sub-tabs Bar - Clean White with Solid Blue Active Pills */}
          <div className="flex items-center gap-1.5 p-3 bg-white border-b border-slate-200 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-tab Content Area */}
          <div className="p-6 flex-1 bg-white">
            {activeTab === 'info' && <PersonnelInfoTab personnel={currentPersonnel} />}
            {activeTab === 'assignments' && <AssignmentsSubTab personnel={currentPersonnel} />}
            {activeTab === 'education' && <EducationSubTab personnel={currentPersonnel} />}
            {activeTab === 'promotion' && <PromotionSubTab personnel={currentPersonnel} />}
            {activeTab === 'orders' && <OrdersSubTab personnel={currentPersonnel} />}
            {activeTab === 'training' && <TrainingSubTab personnel={currentPersonnel} />}
            {activeTab === 'leave' && <LeaveSubTab personnel={currentPersonnel} />}
          </div>
        </div>
      </div>
    </div>
  );
};


