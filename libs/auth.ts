import { cookies } from 'next/headers'
import { connectDB } from './db'
import { User } from '@/models/User'

const SESSION_COOKIE = 'kvault_session'

// Session = base64(userId:email) — đủ đơn giản cho app cá nhân
export function makeSession(userId: string, email: string) {
  return Buffer.from(`${userId}:${email}`).toString('base64')
}

export function parseSession(token: string) {
  try {
    const [userId, email] = Buffer.from(token, 'base64').toString().split(':')
    return userId && email ? { userId, email } : null
  } catch { return null }
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
    maxAge: 60 * 60 * 24 * 30, // 30 ngày
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getUserIdFromRequest(_req?: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('kvault_session')?.value
  if (!token) return null
  return parseSession(token)?.userId ?? null
}