import mongoose from 'mongoose';

const PersonnelSchema = new mongoose.Schema({
  id: { type: String, unique: true, sparse: true },
  rank: { type: String, default: '' },
  rankFullName: { type: String },
  firstName: { type: String, required: true },
  middleName: { type: String, default: '' },
  lastName: { type: String, required: true },
  qualifier: { type: String, default: '' },
  fullName: { type: String, default: '' },
  badgeNo: { type: String, default: '' },
  salaryGrade: { type: Number },
  plantilla: { type: String },
  division: { type: String, default: '' },
  detail: { type: String },
  designation: { type: String },
  address: { type: String },
  gender: { type: String },
  contactNumber: { type: String },
  birthday: { type: String },
  dateOfEntry: { type: String },
  enterInOfficerPositionDate: { type: String },
  lastPromotionDate: { type: String },
  status: { type: String, default: 'Active' },
  avatarUrl: { type: String }
}, {
  timestamps: true
});

export const PersonnelModel = mongoose.model('Personnel', PersonnelSchema);
