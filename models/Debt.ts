import { Schema, model, models } from 'mongoose';

const DebtSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['borrowed', 'lent'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: {
      type: String,
      required: true,
      default: 'VND',
    },
    interestRate: { type: Number },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'paid'],
      default: 'active',
      required: true,
    },
    note: { type: String },
  },
  { timestamps: true }
);

delete (models as any).Debt;
export const Debt = model('Debt', DebtSchema);
