import { Schema, model, models } from 'mongoose'

const SnapshotSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  month: { type: String, required: true },
  totalVND: { type: Number, required: true },
  byType: { type: Map, of: Number },
  // Dùng Schema.Types.Mixed để bypass validation hoàn toàn
  assets: { type: Schema.Types.Mixed, default: [] },
}, { timestamps: true })

SnapshotSchema.index({ userId: 1, month: 1 }, { unique: true })

delete (models as any).Snapshot

export const Snapshot = model('Snapshot', SnapshotSchema)