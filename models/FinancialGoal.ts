import { Schema, model, models } from 'mongoose';

const GoalTaskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['VND', 'USD'] },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const FinancialGoalSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, required: true, default: 0 },
    currency: {
      type: String,
      required: true,
      enum: ['VND', 'USD'],
      default: 'VND',
    },
    deadline: { type: Date },
    note: { type: String },
    linkAllAssets: { type: Boolean, default: false },
    linkedAssetIds: { type: [String], default: [] },
    tasks: { type: [GoalTaskSchema], default: [] },
  },
  { timestamps: true }
);

delete models.FinancialGoal;
export const FinancialGoal = model('FinancialGoal', FinancialGoalSchema);
