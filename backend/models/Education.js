import mongoose from 'mongoose';

const EducationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  personnelId: { type: String, required: true, index: true },
  academicLevel: { type: String },
  degree: { type: String },
  institution: { type: String },
  major: { type: String },
  startYear: { type: Number },
  yearGraduated: { type: Number },
  honors: { type: String },
  highest: { type: Boolean, default: false },
  ranking: { type: Number },
  certifications: [{ type: String }],
  createdBy: { type: String },
  createdOn: { type: String },
  modifiedBy: { type: String },
  modifiedOn: { type: String }
}, {
  timestamps: true
});

export const EducationModel = mongoose.model('Education', EducationSchema);
