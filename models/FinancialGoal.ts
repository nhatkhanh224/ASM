import { Schema, model, models } from 'mongoose';

const FinancialGoalSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, required: true, default: 0 },
    currency: {
      type: String,
      required: true,
      default: 'VND',
    },
    deadline: { type: Date },
    note: { type: String },
  },
  { timestamps: true }
);

delete (models as any).FinancialGoal;
export const FinancialGoal = model('FinancialGoal', FinancialGoalSchema);
