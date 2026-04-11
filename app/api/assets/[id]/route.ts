import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Asset } from '@/models/Asset'
import { getUserIdFromRequest } from '@/libs/auth'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  await connectDB()

  const asset = await Asset.findOne({ _id: id, userId })
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 })

  return NextResponse.json(asset)
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  await connectDB()

  const body = await request.json()
  const asset = await Asset.findOneAndUpdate(
    { _id: id, userId },  // chỉ update nếu đúng chủ
    body,
    { new: true, runValidators: true }
  )
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 })

  return NextResponse.json(asset)
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  await connectDB()

  const asset = await Asset.findOneAndDelete({ _id: id, userId })  // chỉ xóa nếu đúng chủ
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 })

  return NextResponse.json({ message: 'Xóa thành công', asset })
}