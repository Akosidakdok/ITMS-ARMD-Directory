import mongoose from 'mongoose';

const LeaveSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  personnelId: { type: String, required: true, index: true },
  leaveType: { type: String, required: true },
  startDate: { type: String },
  endDate: { type: String },
  days: { type: Number },
  status: { type: String, default: 'Pending' },
  approvedBy: { type: String },
  purpose: { type: String }
}, {
  timestamps: true
});

export const LeaveModel = mongoose.model('Leave', LeaveSchema);
