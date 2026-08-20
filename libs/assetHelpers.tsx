import React from "react";
import {
  Wallet, Coins, TrendingUp, Home, Smartphone, MoreHorizontal, Gem
} from "lucide-react";
import { Asset, AssetType, Currency, AssetWithRate, ExchangeRates, AssetTypeConfig } from "@/types/asset";

export const POPULAR_CURRENCIES: { symbol: string; name: string }[] = [
  { symbol: "VND", name: "Việt Nam Đồng" },
  { symbol: "USD", name: "US Dollar" },
  { symbol: "SJC", name: "Vàng SJC 9999" },
  { symbol: "SJ9999", name: "Vàng Nhẫn SJC 9999" },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "Ripple" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "UNI", name: "Uniswap" },
  { symbol: "ATOM", name: "Cosmos" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "NEAR", name: "NEAR Protocol" },
  { symbol: "APT", name: "Aptos" },
  { symbol: "ARB", name: "Arbitrum" },
  { symbol: "OP", name: "Optimism" },
  { symbol: "SUI", name: "Sui" },
  { symbol: "TON", name: "Toncoin" },
  { symbol: "ASTER", name: "Aster" },
];

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  VND: 1,
  USD: 26200,
  BTC: 77443.11 * 26200,
  ETH: 2400 * 26200,
  ASTER: 0.5702 * 26200,
  SJC: 153000000,
  SJ9999: 152800000,
};

export const ASSET_TYPE_CONFIG: AssetTypeConfig = {
  cash:       { icon: Wallet,         label: "Tiền mặt",     color: "bg-green-100 text-green-700",   chartColor: "#10b981", risk: "low" },
  bank:       { icon: Coins,          label: "Ngân hàng",    color: "bg-blue-100 text-blue-700",     chartColor: "#3b82f6", risk: "low" },
  investment: { icon: TrendingUp,     label: "Đầu tư",       color: "bg-purple-100 text-purple-700", chartColor: "#a855f7", risk: "medium" },
  property:   { icon: Home,           label: "Bất động sản", color: "bg-orange-100 text-orange-700", chartColor: "#f97316", risk: "medium" },
  digital:    { icon: Smartphone,     label: "Tài sản số",   color: "bg-cyan-100 text-cyan-700",     chartColor: "#06b6d4", risk: "high" },
  gold:       { icon: Gem,            label: "Vàng",         color: "bg-amber-100 text-amber-700",   chartColor: "#f59e0b", risk: "low" },
  other:      { icon: MoreHorizontal, label: "Khác",         color: "bg-gray-100 text-gray-700",     chartColor: "#6b7280", risk: "medium" },
};

export const RISK_CONFIG = {
  low:    { label: "Thấp",       color: "text-green-600",  bg: "bg-green-100",  bar: "#10b981" },
  medium: { label: "Trung bình", color: "text-orange-500", bg: "bg-orange-100", bar: "#f97316" },
  high:   { label: "Cao",        color: "text-red-600",    bg: "bg-red-100",    bar: "#ef4444" },
};

export const ALERTABLE_COINS = ["BTC", "ETH", "BNB", "SOL", "XRP"];
export const SCENARIO_STORAGE_KEY = "kvault_scenario_prices";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Có lỗi xảy ra!";
}

export async function safeParseJson(res: Response): Promise<any | null> {
  try {
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch { return null; }
}

export async function fetchExchangeRatesFromAPI(extraCoins: string[] = []): Promise<ExchangeRates | null> {
  try {
    const params = extraCoins.length ? `?extra=${extraCoins.join(",")}` : "";
    const res = await fetch(`/api/exchange-rates${params}`);
    if (!res.ok) return null;
    const data = await safeParseJson(res);
    if (!data) return null;
    const rates: ExchangeRates = { VND: 1 };
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "number") rates[key] = val;
    }
    return Object.keys(rates).length > 1 ? rates : null;
  } catch (e) {
    console.error("fetchExchangeRatesFromAPI error:", e);
    return null;
  }
}

export async function fetchRatesWithRetry(
  extraCoins: string[] = [],
  maxRetries = 5,
  delayMs = 1000,
): Promise<ExchangeRates | null> {
  for (let i = 0; i < maxRetries; i++) {
    const rates = await fetchExchangeRatesFromAPI(extraCoins);
    if (rates) return rates;
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
    }
  }
  return null;
}

export function applyRates(assets: Asset[], rates: ExchangeRates): AssetWithRate[] {
  return assets.map((asset) => {
    const rate = rates[asset.currency] ?? 1;
    let currentValueInVND = (asset.originalValue ?? asset.value) * rate;
    let isLiquidated = false;
    let pnl = 0;
    let pnlInCurrency = 0;
    let currentCoinPrice = 0;

    if (asset.isFutures && asset.coinSymbol && asset.entryPrice && asset.leverage) {
      const coinRateVND = rates[asset.coinSymbol] ?? 0;
      const usdRateVND = rates["USD"] ?? 26200;
      const currentCoinPriceUSD = coinRateVND / usdRateVND;
      currentCoinPrice = currentCoinPriceUSD;
      
      const priceDiff = currentCoinPriceUSD - asset.entryPrice;
      const pctChange = priceDiff / asset.entryPrice;
      
      const pnlPct = asset.positionType === 'short' ? -pctChange * asset.leverage : pctChange * asset.leverage;
      
      const marginVND = currentValueInVND; 
      pnl = marginVND * pnlPct;
      pnlInCurrency = (asset.originalValue ?? asset.value) * pnlPct;
      
      currentValueInVND = marginVND + pnl;
      
      if (asset.liquidationPrice) {
         if (asset.positionType === 'short' && currentCoinPriceUSD >= asset.liquidationPrice) {
            isLiquidated = true;
         } else if (asset.positionType !== 'short' && currentCoinPriceUSD <= asset.liquidationPrice) {
            isLiquidated = true;
         }
      }
      
      if (isLiquidated) {
         currentValueInVND = 0;
         pnl = -marginVND; // Lose all margin
         pnlInCurrency = -(asset.originalValue ?? asset.value);
      }
    }

    return { ...asset, currentValueInVND, isLiquidated, pnl, pnlInCurrency, currentCoinPrice };
  });
}

export function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  return value.toLocaleString("vi-VN");
}

export function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString("en-US")}`;
}
