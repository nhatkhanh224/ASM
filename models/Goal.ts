import { Schema, model, models } from 'mongoose'

const GoalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  targetVND: { type: Number, required: true },
  label: { type: String, default: 'Mục tiêu tài sản' },
}, { timestamps: true })

delete (models as any).Goal
export const Goal = model('Goal', GoalSchema)