import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Transaction } from '@/models/Transaction'
import { getUserIdFromRequest } from '@/libs/auth'
import { Asset } from '@/models/Asset'
import { calculateTrackedQuantity } from '@/libs/portfolioCalculator'

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

    const asset = await Asset.findOne({ _id: tx.assetId, userId })
    if (asset?.trackingMode === 'transactions') {
      const ledger = await Transaction.find({ userId, assetId: tx.assetId }).sort({ transactedAt: 1 }).lean()
      asset.originalValue = calculateTrackedQuantity(ledger)
      await asset.save()
    }

    return NextResponse.json({ message: 'Đã xóa', tx })
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
