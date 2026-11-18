import { Schema, model, models } from 'mongoose';

const CapitalEntrySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fundId: { type: Schema.Types.ObjectId, ref: 'CapitalFund', required: true, index: true },
  kind: { type: String, enum: ['bet', 'cashflow'], required: true },
  occurredAt: { type: Date, required: true, default: Date.now },
  note: { type: String, default: '', maxlength: 500 },
  matchName: { type: String, trim: true, maxlength: 200 },
  bankrollBefore: { type: Number, min: 0 },
  odds: { type: Number, min: 1 },
  stake: { type: Number, min: 0 },
  result: { type: String, enum: ['pending', 'win', 'half_win', 'push', 'half_loss', 'loss'] },
  payout: { type: Number, min: 0 },
  profitLoss: { type: Number },
  cashflowType: { type: String, enum: ['deposit', 'withdrawal'] },
  amount: { type: Number, min: 0 },
}, { timestamps: true });

CapitalEntrySchema.index({ userId: 1, fundId: 1, occurredAt: -1 });
export const CapitalEntry = models.CapitalEntry || model('CapitalEntry', CapitalEntrySchema);
