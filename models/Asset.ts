import { Schema, model, models } from 'mongoose'

const AssetSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['cash', 'bank', 'investment', 'property', 'digital', 'other'],
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

    note: String,
  },
  { timestamps: true }
)

export const Asset = models.Asset || model('Asset', AssetSchema)