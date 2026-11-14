import { Schema, model, models } from 'mongoose'

const AssetSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['cash', 'bank', 'investment', 'property', 'digital', 'gold', 'other'],
      required: true,
    },

    value: { type: Number, required: true },
    originalValue: { type: Number, required: true },

    // Bỏ enum, chấp nhận bất kỳ string nào
    currency: {
      type: String,
      required: true,
      default: 'VND',
    },

    trackingMode: { type: String, enum: ['manual', 'transactions'], default: 'manual' },
    monthlyDcaBudgetVND: { type: Number, min: 0, default: 0 },
    monthlyDcaBudgetAmount: { type: Number, min: 0, default: 0 },
    dcaBudgetCurrency: { type: String, enum: ['VND', 'USD'], default: 'VND' },
    dcaDayOfMonth: { type: Number, min: 1, max: 28, default: 1 },

    isFutures: { type: Boolean, default: false },
    coinSymbol: { type: String },
    leverage: { type: Number },
    positionType: { type: String, enum: ['long', 'short'] },
    entryPrice: { type: Number },
    liquidationPrice: { type: Number },

    note: String,
  },
  { timestamps: true }
)

delete models.Asset
export const Asset = model('Asset', AssetSchema)
