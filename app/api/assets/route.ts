import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Asset } from '@/models/Asset'
import { getUserIdFromRequest } from '@/libs/auth'
import { validateAssetPayload } from '@/libs/apiValidation'

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const assets = await Asset.find({ userId }).sort({ createdAt: -1 })
  return NextResponse.json(assets)
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json() as Record<string, unknown>
  const result = validateAssetPayload(body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  const asset = await Asset.create({ ...result.data, userId })
  return NextResponse.json(asset, { status: 201 })
}
