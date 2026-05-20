import { Schema, model, models } from 'mongoose'

export interface ITransaction {
  _id?: string
  assetId: string        // ref to Asset._id
  assetName: string      // denormalized for display
  type: 'buy' | 'sell' | 'deposit' | 'withdraw'
  currency: string       // BTC, ETH, VND, USD...
  quantity: number       // số lượng coin/tiền
  pricePerUnit: number   // giá mỗi đơn vị tại thời điểm giao dịch (USD)
  totalValueVND: number  // tổng giá trị quy VND tại thời điểm giao dịch
  note?: string
  transactedAt: Date
  createdAt?: Date
}

const TransactionSchema = new Schema<ITransaction>(
  {
    assetId:       { type: String, required: true, index: true },
    assetName:     { type: String, required: true },
    type:          { type: String, enum: ['buy', 'sell', 'deposit', 'withdraw'], required: true },
    currency:      { type: String, required: true },
    quantity:      { type: Number, required: true },
    pricePerUnit:  { type: Number, required: true, default: 0 }, // 0 nếu là VND deposit/withdraw
    totalValueVND: { type: Number, required: true },
    note:          { type: String, default: '' },
    transactedAt:  { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
)

export const Transaction = models.Transaction || model<ITransaction>('Transaction', TransactionSchema)