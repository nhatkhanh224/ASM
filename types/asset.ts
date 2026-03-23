// Currency giờ là string tự do, không còn union cứng
export type Currency = string

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
  value: number
  originalValue: number
  currency: Currency
  note?: string
}