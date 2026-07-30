import React, { useState } from 'react';
import { Personnel } from '../../types/pais';
import { useAuthRole } from '../../context/AuthRoleContext';
import { 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  Shield, 
  Award, 
  CheckCircle, 
  Lock,
  Save
} from 'lucide-react';
import { Badge } from '../common/Badge';

interface PersonnelInfoTabProps {
  personnel: Personnel;
}

export const PersonnelInfoTab: React.FC<PersonnelInfoTabProps> = ({ personnel }) => {
  const { role, updatePersonnel } = useAuthRole();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Personnel>(personnel);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePersonnel(formData);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Action */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> Complete Personnel Identification Record
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Primary administrative personnel bio-data as maintained by ITMS ARMD</p>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
            <CheckCircle className="w-3.5 h-3.5" /> Saved!
          </span>
        )}

        {role === 'admin' ? (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              isEditing 
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
            }`}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Bio-Data'}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            <Lock className="w-3.5 h-3.5" /> View Only Mode
          </span>
        )}
      </div>

      {/* Form or Display */}
      {isEditing ? (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Middle Name</label>
            <input
              type="text"
              value={formData.middleName}
              onChange={e => setFormData({ ...formData, middleName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Qualifier (Jr., Sr., III)</label>
            <input
              type="text"
              value={formData.qualifier || ''}
              onChange={e => setFormData({ ...formData, qualifier: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={e => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Contact Number</label>
            <input
              type="text"
              value={formData.contactNumber}
              onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Birthday</label>
            <input
              type="date"
              value={formData.birthday}
              onChange={e => setFormData({ ...formData, birthday: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Date of Entry into Police Service</label>
            <input
              type="date"
              value={formData.dateOfEntry}
              onChange={e => setFormData({ ...formData, dateOfEntry: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Enter in Officer Position Date</label>
            <input
              type="text"
              value={formData.enterInOfficerPositionDate}
              onChange={e => setFormData({ ...formData, enterInOfficerPositionDate: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Detailed Out">Detailed Out</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <div className="md:col-span-2 pt-3 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" /> Save Record Updates
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">First Name</span>
            <p className="text-sm font-extrabold text-slate-900">{personnel.firstName}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Middle Name</span>
            <p className="text-sm font-extrabold text-slate-900">{personnel.middleName || '—'}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Last Name</span>
            <p className="text-sm font-extrabold text-slate-900">{personnel.lastName}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Qualifier</span>
            <p className="text-sm font-extrabold text-blue-700">{personnel.qualifier || 'N/A'}</p>
          </div>

          <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Address
            </span>
            <p className="text-xs font-bold text-slate-900">{personnel.address}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Gender</span>
            <p className="text-xs font-bold text-slate-900">{personnel.gender}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Contact Number
            </span>
            <p className="text-xs font-bold font-mono text-emerald-700">{personnel.contactNumber}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" /> Birthday
            </span>
            <p className="text-xs font-bold text-slate-900 font-mono">{personnel.birthday}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" /> Date of Entry
            </span>
            <p className="text-xs font-bold text-slate-900 font-mono">{personnel.dateOfEntry}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-600" /> Enter in Officer Position
            </span>
            <p className="text-xs font-bold text-slate-900 font-mono">{personnel.enterInOfficerPositionDate}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Status</span>
            <div>
              <Badge variant={personnel.status === 'Active' ? 'success' : 'warning'}>
                {personnel.status}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


