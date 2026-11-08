import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Transaction } from '@/models/Transaction'
import { getUserIdFromRequest } from '@/libs/auth'

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Có lỗi xảy ra'

// DELETE /api/transactions/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params
    await connectDB()

    const tx = await Transaction.findOneAndDelete({ _id: id, userId })
    if (!tx) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 })

    return NextResponse.json({ message: 'Đã xóa', tx })
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
