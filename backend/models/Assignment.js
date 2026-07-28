import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  personnelId: { type: String, required: true, index: true },
  unit: { type: String, required: true },
  position: { type: String, required: true },
  orderRef: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  status: { type: String, default: 'Current' },
  remarks: { type: String }
}, {
  timestamps: true
});

export const AssignmentModel = mongoose.model('Assignment', AssignmentSchema);
