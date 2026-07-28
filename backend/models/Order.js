import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  orderNumber: { type: String, required: true },
  orderType: { type: String, required: true },
  subject: { type: String, required: true },
  issuedDate: { type: String },
  effectiveDate: { type: String },
  signatory: { type: String },
  signatoryTitle: { type: String },
  status: { type: String, default: 'Active' },
  affectedPersonnelCount: { type: Number, default: 1 },
  description: { type: String }
}, {
  timestamps: true
});

export const OrderModel = mongoose.model('Order', OrderSchema);
