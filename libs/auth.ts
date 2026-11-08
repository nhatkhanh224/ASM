import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_COOKIE = 'kvault_session'

type SessionPayload = { userId: string; email: string; exp: number }

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.MONGODB_URI
  if (!secret) throw new Error('SESSION_SECRET is not configured')
  return secret
}

function signPayload(encodedPayload: string) {
  return crypto.createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url')
}

export function makeSession(userId: string, email: string) {
  const payload: SessionPayload = {
    userId,
    email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${signPayload(encodedPayload)}`
}

export function parseSession(token: string) {
  try {
    const [encodedPayload, signature] = token.split('.')
    if (!encodedPayload || !signature) return null
    const expectedSignature = signPayload(encodedPayload)
    const actual = Buffer.from(signature)
    const expected = Buffer.from(expectedSignature)
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as SessionPayload
    if (!payload.userId || !payload.email || !payload.exp || payload.exp <= Date.now()) return null
    return { userId: payload.userId, email: payload.email, exp: payload.exp }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return parseSession(token)
}

export async function setSessionCookie(userId: string, email: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, makeSession(userId, email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 ngày
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getUserIdFromRequest(request?: Request) {
  void request
  const cookieStore = await cookies()
  const token = cookieStore.get('kvault_session')?.value
  if (!token) return null
  return parseSession(token)?.userId ?? null
}
