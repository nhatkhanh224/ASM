import React from "react";

// Currency giờ là string tự do, không còn union cứng
export type Currency = string;

export type AssetType =
  | "cash"
  | "bank"
  | "investment"
  | "property"
  | "digital"
  | "gold"
  | "other";

export interface Asset {
  _id: string;
  name: string;
  type: AssetType;
  value: number;
  originalValue: number;
  currency: Currency;
  note?: string;

  isFutures?: boolean;
  coinSymbol?: string;
  leverage?: number;
  positionType?: 'long' | 'short';
  entryPrice?: number;
  liquidationPrice?: number;
}

export interface AssetWithRate extends Asset {
  currentValueInVND: number;
  isLiquidated?: boolean;
  pnl?: number;
  pnlInCurrency?: number;
  currentCoinPrice?: number;
}

export type ExchangeRates = Record<string, number>;

export interface AssetTypeConfigItem {
  icon: React.ElementType;
  label: string;
  color: string;
  chartColor: string;
  risk: "low" | "medium" | "high";
}

export type AssetTypeConfig = Record<AssetType, AssetTypeConfigItem>;