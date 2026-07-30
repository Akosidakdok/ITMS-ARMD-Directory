import mongoose from 'mongoose';

const AwardSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  orderType: {
    type: String,
    required: true,
    enum: ['General Order', 'Special Order', 'Letter Order']
  },
  title: { type: String, required: true },
  citationDetails: { type: String, required: true },
  awardName: { type: String, required: true },
  authorityDate: { type: String, required: true },
  personnelId: { type: String, required: true, index: true },
  personnelName: { type: String, required: true },
  status: { type: String, default: 'Active' }
}, {
  timestamps: true
});

export const AwardModel = mongoose.model('Award', AwardSchema);
