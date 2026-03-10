export type Currency = 'VND' | 'USD' | 'BTC' | 'ETH'| 'ASTER'

export type AssetType =
  | 'cash'
  | 'bank'
  | 'investment'
  | 'property'
  | 'digital'
  | 'other'

export interface Asset {
  _id?: string
  name: string
  type: AssetType

  value: number            // VND
  originalValue: number    // giá trị gốc
  currency: Currency

  note?: string
}
