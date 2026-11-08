import { Schema, model, models } from 'mongoose'
import crypto from 'crypto'

const SCRYPT_PREFIX = 'scrypt'
const SCRYPT_KEY_LENGTH = 64

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
}, { timestamps: true })

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex')
  return `${SCRYPT_PREFIX}$${salt}$${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
  try {
    if (storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
      const [, salt, expectedHex] = storedHash.split('$')
      const actual = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH)
      const expected = Buffer.from(expectedHex, 'hex')
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
    }

    // Tương thích tài khoản cũ dùng SHA-256; sẽ được nâng cấp sau khi đăng nhập thành công.
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex')
    const actual = Buffer.from(legacyHash, 'hex')
    const expected = Buffer.from(storedHash, 'hex')
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function passwordHashNeedsUpgrade(storedHash: string) {
  return !storedHash.startsWith(`${SCRYPT_PREFIX}$`)
}

export const User = models.User || model('User', UserSchema)
