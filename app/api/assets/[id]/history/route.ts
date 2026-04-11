import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { AssetHistory } from '@/models/AssetHistory'
import { getUserIdFromRequest } from '@/libs/auth'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  await connectDB()

  const history = await AssetHistory.find({ assetId: id, userId })
    .sort({ changedAt: -1 })
    .limit(50)

  return NextResponse.json(history)
}