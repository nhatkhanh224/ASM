import { Schema, model, models } from 'mongoose'

const AssetSchema = new Schema(
  {
    name: { type: String, required: true },

    type: {
      type: String,
      enum: ['cash', 'bank', 'investment', 'property', 'digital', 'other'],
      required: true,
    },

    // Giá trị đã quy đổi sang VND (dùng để tính toán)
    value: { type: Number, required: true },

    // Giá trị người dùng nhập
    originalValue: { type: Number, required: true },

    // Đơn vị gốc
    currency: {
      type: String,
      enum: ['VND', 'USD', 'BTC', 'ETH', 'ASTER'],
      default: 'VND',
    },

    note: String,
  },
  { timestamps: true }
)

export const Asset = models.Asset || model('Asset', AssetSchema)
