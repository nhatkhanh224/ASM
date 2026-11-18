import { Schema, model, models } from 'mongoose';

const DebtInstallmentSchema = new Schema(
  {
    id: { type: String, required: true },
    installmentNumber: { type: Number, required: true, min: 1 },
    dueDate: { type: Date, required: true },
    principalAmount: { type: Number, required: true, min: 0 },
    interestAmount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paidAt: { type: Date },
    note: { type: String },
  },
  { _id: false }
);

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
    interestRateUnit: { type: String, enum: ['annual', 'monthly'], default: 'annual' },
    purpose: { type: String, enum: ['general', 'investment'], default: 'general' },
    linkedAssetId: { type: String },
    linkedAssetName: { type: String },
    investmentFee: { type: Number, min: 0, default: 0 },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'paid'],
      default: 'active',
      required: true,
    },
    repaymentMode: {
      type: String,
      enum: ['single', 'installment', 'interest_only'],
      default: 'single',
    },
    calculationMethod: {
      type: String,
      enum: ['equal_payment', 'equal_principal', 'no_interest'],
    },
    firstPaymentDate: { type: Date },
    termMonths: { type: Number, min: 1, max: 600 },
    installments: { type: [DebtInstallmentSchema], default: [] },
    note: { type: String },
  },
  { timestamps: true }
);

delete models.Debt;
export const Debt = model('Debt', DebtSchema);
