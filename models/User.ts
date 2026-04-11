import { Schema, model, models } from 'mongoose'
import crypto from 'crypto'

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
}, { timestamps: true })

UserSchema.methods.verifyPassword = function (password: string) {
  const hash = crypto.createHash('sha256').update(password).digest('hex')
  return hash === this.passwordHash
}

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export const User = models.User || model('User', UserSchema)