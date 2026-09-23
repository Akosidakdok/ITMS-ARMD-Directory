import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  orderNumber: { type: String, required: true },
  series: { type: String, enum: ['GO', 'SO', 'LO'] },
  purposeCode: { type: String },
  purposeLabel: { type: String },
  orderType: { type: String, required: true },
  subject: { type: String, required: true },
  issuedDate: { type: String },
  effectiveDate: { type: String },
  signatory: { type: String },
  signatoryTitle: { type: String },
  status: { type: String, default: 'Active' },
  documentStatus: { type: String, default: 'Draft' },
  fileName: { type: String },
  fileMimeType: { type: String },
  fileSize: { type: Number },
  storagePath: { type: String },
  documentVersion: { type: Number, default: 0 },
  documentUploadedAt: { type: String },
  signedAt: { type: String },
  signedBy: { type: String },
  releasedAt: { type: String },
  releasedBy: { type: String },
  createdBy: { type: String },
  updatedBy: { type: String },
  affectedPersonnelCount: { type: Number, default: 1 },
  description: { type: String }
}, {
  timestamps: true
});

export const OrderModel = mongoose.model('Order', OrderSchema);
