export type TransactionType = "opening" | "buy" | "sell" | "deposit" | "withdraw";

export interface TransactionRecord {
  _id: string;
  assetId: string;
  assetName: string;
  type: TransactionType;
  currency: string;
  quantity: number;
  pricePerUnit: number;
  totalValueVND: number;
  note?: string;
  transactedAt: string | Date;
}

export interface AssetPnlSummary {
  assetId: string;
  assetName: string;
  currency: string;
  totalQuantity: number;
  totalCostVND: number;
  avgCostVND: number;
  currentPriceVND: number;
  currentValueVND: number;
  unrealizedPnlVND: number;
  unrealizedPnlPct: number;
  realizedPnlVND: number;
}
