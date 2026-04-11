import { Schema, model, models } from 'mongoose'

const AssetHistorySchema = new Schema({
  assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalValue: { type: Number, required: true },
  valueInVND: { type: Number, required: true },
  currency: { type: String, required: true },
  note: { type: String, default: '' },
  changedAt: { type: Date, default: Date.now },
})

export const AssetHistory = models.AssetHistory || model('AssetHistory', AssetHistorySchema)