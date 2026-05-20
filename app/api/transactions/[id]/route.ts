import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Transaction } from '@/models/Transaction'

// DELETE /api/transactions/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await connectDB()

    const tx = await Transaction.findByIdAndDelete(id)
    if (!tx) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 })

    return NextResponse.json({ message: 'Đã xóa', tx })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}