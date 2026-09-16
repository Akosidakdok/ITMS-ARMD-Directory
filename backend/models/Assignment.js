import mongoose from 'mongoose';

const AssignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  personnelId: { type: String, required: true, index: true },
  positionCategory: { type: String, enum: ['Main', 'In Addition/Concurrent'], default: 'Main' },
  unitCategory: { type: String, default: 'ITMS HQ' },
  unit: { type: String, required: true },
  subUnitCategory: { type: String, default: 'Division' },
  sub_unit: { type: String, default: '' },
  details: { type: String, default: '' },
  station: { type: String, default: '' },
  position: { type: String, required: true },
  orderRef: { type: String },
  designationDate: { type: String },
  effectiveDate: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  status: { type: String, default: 'Current' },
  remarks: { type: String }
}, {
  timestamps: true
});

export const AssignmentModel = mongoose.model('Assignment', AssignmentSchema);
