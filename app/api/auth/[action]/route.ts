import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { User, hashPassword, passwordHashNeedsUpgrade, verifyPassword } from '@/models/User'
import { getSession, setSessionCookie, clearSessionCookie } from '@/libs/auth'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params  // ← await
  await connectDB()

  if (action === 'register') {
    const { email, password, name } = await req.json()
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedName = typeof name === 'string' ? name.trim() : ''
    if (!normalizedEmail || !password || !normalizedName)
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
    if (typeof password !== 'string' || password.length < 8)
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
    if (normalizedName.length > 100 || normalizedEmail.length > 254)
      return NextResponse.json({ error: 'Thông tin đăng ký không hợp lệ' }, { status: 400 })

    if (await User.findOne({ email: normalizedEmail }))
      return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 409 })

    const user = await User.create({ email: normalizedEmail, name: normalizedName, passwordHash: hashPassword(password) })
    await setSessionCookie(user._id.toString(), user.email)
    return NextResponse.json({ ok: true })
  }

  if (action === 'login') {
    const { email, password } = await req.json()
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const user = await User.findOne({ email: normalizedEmail })
    if (!user || typeof password !== 'string' || !verifyPassword(password, user.passwordHash))
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 })

    if (passwordHashNeedsUpgrade(user.passwordHash)) {
      user.passwordHash = hashPassword(password)
      await user.save()
    }

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
