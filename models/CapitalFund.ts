import { Schema, model, models } from 'mongoose';

const CapitalFundSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  currency: { type: String, enum: ['VND', 'USD'], required: true, default: 'VND' },
  initialCapital: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  note: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });

CapitalFundSchema.index({ userId: 1, createdAt: -1 });
export const CapitalFund = models.CapitalFund || model('CapitalFund', CapitalFundSchema);
