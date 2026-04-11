import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Goal } from '@/models/Goal'
import { getUserIdFromRequest } from '@/libs/auth'

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const goal = await Goal.findOne({ userId })
  return NextResponse.json(goal)
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { targetVND, label } = await req.json()
  const goal = await Goal.findOneAndUpdate(
    { userId },
    { userId, targetVND, label },
    { upsert: true, new: true }
  )
  return NextResponse.json(goal)
}