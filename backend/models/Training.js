import mongoose from 'mongoose';

const TrainingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  personnelId: { type: String, required: true, index: true },
  courseName: { type: String, required: true },
  category: { type: String },
  provider: { type: String },
  startDate: { type: String },
  completionDate: { type: String },
  hours: { type: Number },
  certificateNo: { type: String }
}, {
  timestamps: true
});

export const TrainingModel = mongoose.model('Training', TrainingSchema);
