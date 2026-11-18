import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Transaction } from '@/models/Transaction'
import { Asset } from '@/models/Asset'
import { getUserIdFromRequest } from '@/libs/auth'
import { calculateTrackedQuantity } from '@/libs/portfolioCalculator'
import { Debt } from '@/models/Debt'

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Có lỗi xảy ra'

// GET /api/transactions?assetId=xxx  (optional filter)
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')

    // Nhận quyền sở hữu cho dữ liệu cũ dựa trên tài sản thuộc đúng người dùng.
    const ownedAssets = await Asset.find({ userId }).select('_id').lean()
    const ownedAssetIds = ownedAssets.map((asset) => asset._id.toString())
    if (ownedAssetIds.length > 0) {
      await Transaction.updateMany(
        { userId: { $exists: false }, assetId: { $in: ownedAssetIds } },
        { $set: { userId } },
      )
    }

    const query = assetId ? { userId, assetId } : { userId }
    const transactions = await Transaction.find(query).sort({ transactedAt: -1 }).limit(200)
    return NextResponse.json(transactions)
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}

// POST /api/transactions
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()
    const body = await request.json()

    const { assetId, type, currency, quantity, pricePerUnit, totalValueVND, note, transactedAt } = body
    const numericQuantity = Number(quantity)
    const numericPrice = Number(pricePerUnit ?? 0)
    const numericTotal = Number(totalValueVND)

    if (!assetId || !['opening', 'buy', 'sell', 'deposit', 'withdraw'].includes(type) || !currency
      || !Number.isFinite(numericQuantity) || numericQuantity <= 0
      || !Number.isFinite(numericPrice) || numericPrice < 0
      || !Number.isFinite(numericTotal) || numericTotal < 0) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    const asset = await Asset.findOne({ _id: assetId, userId }).select('name currency trackingMode')
    if (!asset) return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 })

    if (type === 'opening' && await Transaction.exists({ userId, assetId, type: 'opening' })) {
      return NextResponse.json({ error: 'Tài sản này đã có số dư ban đầu' }, { status: 409 })
    }

    let debtId: string | undefined
    if (body.fundingSource === 'debt') {
      const debt = await Debt.findOne({
        _id: body.debtId,
        userId,
        type: 'borrowed',
        purpose: 'investment',
        status: 'active',
        linkedAssetId: assetId,
      }).select('_id')
      if (!debt) return NextResponse.json({ error: 'Khoản vay đầu tư không hợp lệ hoặc không liên kết với tài sản này' }, { status: 400 })
      debtId = debt._id.toString()
    }

    const tx = await Transaction.create({
      userId,
      assetId,
      assetName: asset.name,
      type,
      currency: asset.currency,
      quantity: numericQuantity,
      pricePerUnit: numericPrice,
      totalValueVND: numericTotal,
      note: typeof note === 'string' ? note.trim().slice(0, 500) : '',
      fundingSource: body.fundingSource === 'debt' ? 'debt' : 'personal',
      debtId,
      transactedAt: transactedAt ? new Date(transactedAt) : new Date(),
    })

    if (body.enableTracking === true || type === 'opening' || asset.trackingMode === 'transactions') {
      const ledger = await Transaction.find({ userId, assetId }).sort({ transactedAt: 1 }).lean()
      asset.originalValue = calculateTrackedQuantity(ledger)
      asset.trackingMode = 'transactions'
      await asset.save()
    }

    return NextResponse.json(tx, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
