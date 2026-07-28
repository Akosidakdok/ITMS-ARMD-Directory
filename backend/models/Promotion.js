import mongoose from 'mongoose';

const PromotionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  personnelId: { type: String, required: true, index: true },
  rankFrom: { type: String, required: true },
  rankTo: { type: String, required: true },
  promotionDate: { type: String },
  orderNumber: { type: String },
  timeInGradeAtPromotion: { type: String },
  remarks: { type: String }
}, {
  timestamps: true
});

export const PromotionModel = mongoose.model('Promotion', PromotionSchema);
