import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Snapshot } from '@/models/Snapshot'
import { getUserIdFromRequest } from '@/libs/auth'

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const snapshots = await Snapshot.find({ userId }).sort({ month: -1 }).limit(24)
  return NextResponse.json(snapshots)
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { totalVND, byType, assets } = await req.json()
  const month = new Date().toISOString().slice(0, 7)

  const snapshot = await Snapshot.findOneAndUpdate(
    { userId, month },
    { userId, month, totalVND, byType, assets },  // ← không spread ...body nữa
    { upsert: true, new: true }
  )

  return NextResponse.json(snapshot)
}