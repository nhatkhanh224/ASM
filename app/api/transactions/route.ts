import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Transaction } from '@/models/Transaction'

// GET /api/transactions?assetId=xxx  (optional filter)
export async function GET(request: Request) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')

    const query = assetId ? { assetId } : {}
    const transactions = await Transaction.find(query).sort({ transactedAt: -1 }).limit(200)
    return NextResponse.json(transactions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/transactions
export async function POST(request: Request) {
  try {
    await connectDB()
    const body = await request.json()

    const { assetId, assetName, type, currency, quantity, pricePerUnit, totalValueVND, note, transactedAt } = body

    if (!assetId || !assetName || !type || !currency || quantity == null || totalValueVND == null) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    const tx = await Transaction.create({
      assetId,
      assetName,
      type,
      currency,
      quantity: Number(quantity),
      pricePerUnit: Number(pricePerUnit ?? 0),
      totalValueVND: Number(totalValueVND),
      note: note ?? '',
      transactedAt: transactedAt ? new Date(transactedAt) : new Date(),
    })

    return NextResponse.json(tx, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}