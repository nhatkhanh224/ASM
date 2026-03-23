import { NextResponse } from "next/server";

let ratesCache: { rates: Record<string, number>; timestamp: number; cacheKey: string } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

const POPULAR_COINS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  DOT: "polkadot",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  TON: "the-open-network",
  ASTER: "aster-2",
};

const safeJson = async (res: Response): Promise<any | null> => {
  try {
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const fetchWithTimeout = async (
  url: string,
  options?: RequestInit,
  ms = 8000
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const fetchP2PPrice = async (tradeType: "BUY" | "SELL"): Promise<number | null> => {
  try {
    const res = await fetchWithTimeout(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: "USDT",
          fiat: "VND",
          merchantCheck: false,
          page: 1,
          payTypes: [],
          rows: 5,
          tradeType,
        }),
      }
    );
    if (!res.ok) return null;
    const data = await safeJson(res);
    if (!data) return null;
    const prices: number[] = (data?.data ?? [])
      .map((item: any) => parseFloat(item?.adv?.price))
      .filter((p: number) => !isNaN(p) && p > 0);
    if (!prices.length) return null;
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median =
      prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
    console.log(`✅ USDT/VND Binance P2P [${tradeType}]:`, median);
    return Math.round(median);
  } catch {
    return null;
  }
};

const fetchUSDTtoVND = async (): Promise<number> => {
  const price = await fetchP2PPrice("SELL");
  if (price) return price;
  try {
    const res = await fetchWithTimeout("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await safeJson(res);
    if (data?.rates?.VND) return Math.round(data.rates.VND);
  } catch {}
  return 26200;
};

const resolveCoingeckoId = async (symbol: string): Promise<string | null> => {
  if (POPULAR_COINS[symbol]) return POPULAR_COINS[symbol];
  try {
    const res = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/search?query=${symbol.toLowerCase()}`
    );
    if (!res.ok) return null;
    const data = await safeJson(res);
    if (!data) return null;
    const exact = data.coins?.find(
      (c: any) => c.symbol?.toUpperCase() === symbol.toUpperCase()
    );
    return exact?.id ?? data.coins?.[0]?.id ?? null;
  } catch {
    return null;
  }
};

const fetchExchangeRates = async (
  extraSymbols: string[] = []
): Promise<Record<string, number>> => {
  const usdtToVND = await fetchUSDTtoVND();
  const allSymbols = [...new Set([...Object.keys(POPULAR_COINS), ...extraSymbols])];

  const symbolToId: Record<string, string> = {};
  await Promise.all(
    allSymbols.map(async (sym) => {
      const id = await resolveCoingeckoId(sym);
      if (id) symbolToId[sym] = id;
    })
  );

  const allIds = [...new Set(Object.values(symbolToId))].join(",");
  const rates: Record<string, number> = { VND: 1, USD: usdtToVND };

  try {
    const res = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/simple/price?ids=${allIds}&vs_currencies=usd`
    );
    if (!res.ok) throw new Error("CoinGecko failed");
    const data = await safeJson(res);
    if (!data) throw new Error("CoinGecko empty");

    for (const [sym, id] of Object.entries(symbolToId)) {
      const usdPrice = (data as any)[id]?.usd;
      if (usdPrice) rates[sym] = Math.round(usdPrice * usdtToVND);
    }
  } catch (err) {
    console.error("CoinGecko failed:", err);
  }

  if (!rates.BTC) rates.BTC = Math.round(77443.11 * usdtToVND);
  if (!rates.ETH) rates.ETH = Math.round(2400 * usdtToVND);

  return rates;
};

const getSampleRates = (): Record<string, number> => ({
  VND: 1,
  USD: 26200,
  BTC: Math.round(77443.11 * 26200),
  ETH: Math.round(2400 * 26200),
  ASTER: Math.round(0.5702 * 26200),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const extraCoins =
      searchParams.get("extra")?.toUpperCase().split(",").filter(Boolean) ?? [];
    const cacheKey = extraCoins.join(",");

    if (
      ratesCache &&
      Date.now() - ratesCache.timestamp < CACHE_DURATION &&
      ratesCache.cacheKey === cacheKey
    ) {
      return NextResponse.json({
        ...ratesCache.rates,
        cached: true,
        lastUpdate: new Date(ratesCache.timestamp).toISOString(),
      });
    }

    const rates = await fetchExchangeRates(extraCoins);
    ratesCache = { rates, timestamp: Date.now(), cacheKey };

    return NextResponse.json({
      ...rates,
      cached: false,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/exchange-rates error:", error);
    return NextResponse.json({
      ...getSampleRates(),
      cached: false,
      lastUpdate: new Date().toISOString(),
      error: "Using fallback rates",
    });
  }
}

export async function POST() {
  try {
    const rates = await fetchExchangeRates();
    ratesCache = { rates, timestamp: Date.now(), cacheKey: "" };
    return NextResponse.json({
      ...rates,
      message: "Rates refreshed successfully",
      lastUpdate: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to refresh rates" }, { status: 500 });
  }
}