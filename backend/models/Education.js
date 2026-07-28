import mongoose from 'mongoose';

const EducationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  personnelId: { type: String, required: true, index: true },
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  yearGraduated: { type: Number },
  honors: { type: String },
  certifications: [{ type: String }]
}, {
  timestamps: true
});

export const EducationModel = mongoose.model('Education', EducationSchema);
