import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Asset } from '@/models/Asset'
import { getUserIdFromRequest } from '@/libs/auth'

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const assets = await Asset.find({ userId }).sort({ createdAt: -1 })
  return NextResponse.json(assets)
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req)
  console.log("🚀 ~ POST ~ userId:", userId)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const asset = await Asset.create({ userId, ...body })
  console.log("🚀 ~ POST ~ asset:", asset)
  return NextResponse.json(asset)
}