import { NextRequest, NextResponse } from 'next/server'
import { parseSession } from '@/libs/auth'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/api/auth')
  const token = req.cookies.get('kvault_session')?.value
  const hasSession = Boolean(token && parseSession(token))

  if (!isPublic && !hasSession) {
    if (pathname.startsWith('/api/'))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
