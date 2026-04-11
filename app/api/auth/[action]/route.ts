import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { User, hashPassword } from '@/models/User'
import { getSession, setSessionCookie, clearSessionCookie } from '@/libs/auth'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params  // ← await
  await connectDB()

  if (action === 'register') {
    const { email, password, name } = await req.json()
    if (!email || !password || !name)
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

    if (await User.findOne({ email }))
      return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 409 })

    const user = await User.create({ email, name, passwordHash: hashPassword(password) })
    await setSessionCookie(user._id.toString(), user.email)
    return NextResponse.json({ ok: true })
  }

  if (action === 'login') {
    const { email, password } = await req.json()
    const user = await User.findOne({ email })
    if (!user || !user.verifyPassword(password))
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })

    await setSessionCookie(user._id.toString(), user.email)
    return NextResponse.json({ ok: true, name: user.name })
  }

  if (action === 'logout') {
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params  // ← await

  if (action === 'me') {
    const session = await getSession()
    if (!session) return NextResponse.json({ user: null }, { status: 401 })

    await connectDB()
    const user = await User.findById(session.userId).select('name email')
    return NextResponse.json({ user })
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}