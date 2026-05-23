import { NextResponse } from "next/server";
import { connectDB } from "@/libs/db";
import { ExchangeRateCache } from "@/models/ExchangeRateCache";

// ─── In-memory cache (warm instances) ────────────────────────────────────────
// Vẫn giữ in-memory để giảm MongoDB reads, nhưng MongoDB là source of truth

let memCache: {
  rates: Record<string, number>;
  timestamp: number;
  cacheKey: string;
} | null = null;

const MEM_CACHE_TTL  = 3 * 60 * 1000;   // 3 phút
const DB_CACHE_TTL   = 8 * 60 * 1000;   // 8 phút — MongoDB cache
const STALE_TTL      = 60 * 60 * 1000;  // 1 giờ — stale nhưng vẫn dùng được khi API fail

// ─── Coin maps ────────────────────────────────────────────────────────────────

const BINANCE_PAIRS: Record<string, string> = {
  BTC: "BTCUSDT", ETH: "ETHUSDT", BNB: "BNBUSDT", SOL: "SOLUSDT",
  XRP: "XRPUSDT", ADA: "ADAUSDT", DOGE: "DOGEUSDT", DOT: "DOTUSDT",
  MATIC: "MATICUSDT", AVAX: "AVAXUSDT", LINK: "LINKUSDT", UNI: "UNIUSDT",
  ATOM: "ATOMUSDT", LTC: "LTCUSDT", NEAR: "NEARUSDT", APT: "APTUSDT",
  ARB: "ARBUSDT", OP: "OPUSDT", SUI: "SUIUSDT", TON: "TONUSDT",
  ASTER: "ASTERUSDT",
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
  XRP: "ripple", ADA: "cardano", DOGE: "dogecoin", DOT: "polkadot",
  MATIC: "matic-network", AVAX: "avalanche-2", LINK: "chainlink",
  UNI: "uniswap", ATOM: "cosmos", LTC: "litecoin", NEAR: "near",
  APT: "aptos", ARB: "arbitrum", OP: "optimism", SUI: "sui",
  TON: "the-open-network", ASTER: "aster-2",
};

// Hardcoded fallback — last resort, never returns 1 VND
const HARDCODED_USD: Record<string, number> = {
  BTC: 104000, ETH: 3800, BNB: 650, SOL: 180, XRP: 0.55,
  ADA: 0.45, DOGE: 0.12, DOT: 7.5, MATIC: 0.7, AVAX: 35,
  LINK: 14, UNI: 8, ATOM: 9, LTC: 90, NEAR: 5,
  APT: 8, ARB: 0.9, OP: 1.8, SUI: 3.5, TON: 5.5,
  ASTER: 0.57,
};

const HARDCODED_VND = 26200;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeJson = async (res: Response): Promise<any | null> => {
  try {
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch { return null; }
};

const fetchWithTimeout = async (url: string, options?: RequestInit, ms = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally { clearTimeout(timer); }
};

// ─── MongoDB cache helpers ────────────────────────────────────────────────────

async function loadFromDB(cacheKey: string): Promise<{ rates: Record<string, number>; age: number } | null> {
  try {
    await connectDB();
    const doc = await ExchangeRateCache.findOne({ key: cacheKey }).lean();
    if (!doc) return null;
    const age = Date.now() - new Date(doc.updatedAt).getTime();
    return { rates: doc.rates as Record<string, number>, age };
  } catch (e) {
    console.error("DB cache read error:", e);
    return null;
  }
}

async function saveToDB(cacheKey: string, rates: Record<string, number>) {
  try {
    await connectDB();
    await ExchangeRateCache.findOneAndUpdate(
      { key: cacheKey },
      { rates, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("DB cache write error:", e);
  }
}

// ─── USDT/VND ─────────────────────────────────────────────────────────────────

const fetchUSDTtoVND = async (): Promise<number> => {
  // 1. Binance P2P
  try {
    const res = await fetchWithTimeout(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: "USDT", fiat: "VND", merchantCheck: false, page: 1, payTypes: [], rows: 5, tradeType: "SELL" }),
      }
    );
    if (res.ok) {
      const data = await safeJson(res);
      const prices: number[] = (data?.data ?? []).map((i: any) => parseFloat(i?.adv?.price)).filter((p: number) => !isNaN(p) && p > 0);
      if (prices.length) {
        prices.sort((a, b) => a - b);
        const mid = Math.floor(prices.length / 2);
        const median = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
        console.log("✅ USDT/VND P2P:", Math.round(median));
        return Math.round(median);
      }
    }
  } catch {}

  // 2. ExchangeRate API
  try {
    const res = await fetchWithTimeout("https://api.exchangerate-api.com/v4/latest/USD", {}, 5000);
    const data = await safeJson(res);
    if (data?.rates?.VND) return Math.round(data.rates.VND);
  } catch {}

  // 3. Open ER API
  try {
    const res = await fetchWithTimeout("https://open.er-api.com/v6/latest/USD", {}, 5000);
    const data = await safeJson(res);
    if (data?.rates?.VND) return Math.round(data.rates.VND);
  } catch {}

  return HARDCODED_VND;
};

// ─── Source 1: Binance ────────────────────────────────────────────────────────

const fetchFromBinance = async (symbols: string[]): Promise<Record<string, number>> => {
  const result: Record<string, number> = {};
  try {
    const res = await fetchWithTimeout("https://api.binance.com/api/v3/ticker/price", {}, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await safeJson(res);
    if (!Array.isArray(data)) throw new Error("bad response");
    const pm: Record<string, number> = {};
    for (const item of data) { const p = parseFloat(item.price); if (item.symbol && !isNaN(p) && p > 0) pm[item.symbol] = p; }
    for (const sym of symbols) {
      const pair = BINANCE_PAIRS[sym] ?? `${sym}USDT`;
      if (pm[pair]) { result[sym] = pm[pair]; continue; }
      if (pm[`${sym}BTC`] && pm["BTCUSDT"]) result[sym] = pm[`${sym}BTC`] * pm["BTCUSDT"];
      else if (pm[`${sym}ETH`] && pm["ETHUSDT"]) result[sym] = pm[`${sym}ETH`] * pm["ETHUSDT"];
    }
    console.log("✅ Binance:", Object.keys(result).length, "coins");
  } catch (e) { console.error("❌ Binance:", e instanceof Error ? e.message : e); }
  return result;
};

// ─── Source 2: CoinGecko ──────────────────────────────────────────────────────

const fetchFromCoinGecko = async (symbols: string[]): Promise<Record<string, number>> => {
  const result: Record<string, number> = {};
  try {
    const symbolToId: Record<string, string> = {};
    for (const sym of symbols) { if (COINGECKO_IDS[sym]) symbolToId[sym] = COINGECKO_IDS[sym]; }
    const unknowns = symbols.filter(s => !COINGECKO_IDS[s]);
    await Promise.all(unknowns.map(async (sym) => {
      try {
        const res = await fetchWithTimeout(`https://api.coingecko.com/api/v3/search?query=${sym.toLowerCase()}`, {}, 5000);
        if (!res.ok) return;
        const data = await safeJson(res);
        const exact = data?.coins?.find((c: any) => c.symbol?.toUpperCase() === sym);
        if (exact?.id) symbolToId[sym] = exact.id;
      } catch {}
    }));
    const allIds = [...new Set(Object.values(symbolToId))].join(",");
    if (!allIds) return result;
    const res = await fetchWithTimeout(`https://api.coingecko.com/api/v3/simple/price?ids=${allIds}&vs_currencies=usd`, {}, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await safeJson(res);
    if (!data) throw new Error("empty");
    for (const [sym, id] of Object.entries(symbolToId)) {
      const p = (data as any)[id]?.usd;
      if (p && p > 0) result[sym] = p;
    }
    console.log("✅ CoinGecko:", Object.keys(result).length, "coins");
  } catch (e) { console.error("❌ CoinGecko:", e instanceof Error ? e.message : e); }
  return result;
};

// ─── Source 3: CryptoCompare ──────────────────────────────────────────────────

const fetchFromCryptoCompare = async (symbols: string[]): Promise<Record<string, number>> => {
  const result: Record<string, number> = {};
  try {
    const res = await fetchWithTimeout(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symbols.join(",")}&tsyms=USD`, {}, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await safeJson(res);
    if (!data) throw new Error("empty");
    for (const sym of symbols) { const p = data[sym]?.USD; if (p && p > 0) result[sym] = p; }
    console.log("✅ CryptoCompare:", Object.keys(result).length, "coins");
  } catch (e) { console.error("❌ CryptoCompare:", e instanceof Error ? e.message : e); }
  return result;
};

// ─── Source 4: DexScreener (meme/micro cap) ──────────────────────────────────

const fetchFromDexScreener = async (symbols: string[]): Promise<Record<string, number>> => {
  const result: Record<string, number> = {};
  if (!symbols.length) return result;
  await Promise.all(symbols.map(async (sym) => {
    try {
      const res = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(sym)}`, {}, 6000);
      if (!res.ok) return;
      const data = await safeJson(res);
      if (!data?.pairs?.length) return;
      const exactPairs = data.pairs.filter((p: any) => p.baseToken?.symbol?.toUpperCase() === sym);
      const candidates = exactPairs.length > 0 ? exactPairs : data.pairs;
      candidates.sort((a: any, b: any) => parseFloat(b.volume?.h24 ?? "0") - parseFloat(a.volume?.h24 ?? "0"));
      const price = parseFloat(candidates[0]?.priceUsd ?? "0");
      if (price > 0) {
        result[sym] = price;
        console.log(`✅ DexScreener ${sym}: $${price} (${candidates[0].dexId}/${candidates[0].chainId})`);
      }
    } catch (e) { console.error(`❌ DexScreener ${sym}:`, e instanceof Error ? e.message : e); }
  }));
  return result;
};

// ─── Fetch fresh rates from all sources ──────────────────────────────────────

const fetchFreshRates = async (extraSymbols: string[]): Promise<Record<string, number>> => {
  const usdtToVND = await fetchUSDTtoVND();
  const knownSymbols = [...new Set([...Object.keys(BINANCE_PAIRS), ...Object.keys(COINGECKO_IDS)])];
  const allSymbols   = [...new Set([...knownSymbols, ...extraSymbols.map(s => s.toUpperCase())])];
  const extraUpper   = extraSymbols.map(s => s.toUpperCase());

  const [binance, gecko, cryptoCompare, dex] = await Promise.allSettled([
    fetchFromBinance(allSymbols),
    fetchFromCoinGecko(allSymbols),
    fetchFromCryptoCompare(allSymbols),
    fetchFromDexScreener(extraUpper), // always DexScreener for extra coins
  ]);

  // Merge: hardcode (lowest) → CryptoCompare → CoinGecko → Binance → DexScreener for extras (highest for extras)
  let usdPrices: Record<string, number> = { ...HARDCODED_USD };
  if (cryptoCompare.status === "fulfilled") usdPrices = { ...usdPrices, ...cryptoCompare.value };
  if (gecko.status === "fulfilled")         usdPrices = { ...usdPrices, ...gecko.value };
  if (binance.status === "fulfilled")       usdPrices = { ...usdPrices, ...binance.value };
  // DexScreener overrides everything for extra coins
  if (dex.status === "fulfilled")           usdPrices = { ...usdPrices, ...dex.value };

  const rates: Record<string, number> = { VND: 1, USD: usdtToVND };
  for (const [sym, p] of Object.entries(usdPrices)) { if (p > 0) rates[sym] = Math.round(p * usdtToVND); }

  const notFound = extraSymbols.filter(s => !rates[s.toUpperCase()]);
  if (notFound.length > 0) console.warn("⚠️ No price:", notFound.join(", "));
  console.log(`✅ Rates ready: ${Object.keys(rates).length} coins, USD/VND=${usdtToVND}`);
  return rates;
};

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const extraCoins = searchParams.get("extra")?.toUpperCase().split(",").filter(Boolean) ?? [];
  const cacheKey = "rates:" + [...extraCoins].sort().join(",");

  // 1. In-memory cache (fastest, warm instances)
  if (memCache && memCache.cacheKey === cacheKey && Date.now() - memCache.timestamp < MEM_CACHE_TTL) {
    return NextResponse.json({ ...memCache.rates, cached: "memory", lastUpdate: new Date(memCache.timestamp).toISOString() });
  }

  // 2. MongoDB cache (survives cold starts)
  const dbCache = await loadFromDB(cacheKey);
  if (dbCache && dbCache.age < DB_CACHE_TTL) {
    // Warm up memory cache
    memCache = { rates: dbCache.rates, timestamp: Date.now() - dbCache.age, cacheKey };
    console.log(`✅ Served from MongoDB cache (age: ${Math.round(dbCache.age / 1000)}s)`);
    return NextResponse.json({ ...dbCache.rates, cached: "db", lastUpdate: new Date(Date.now() - dbCache.age).toISOString() });
  }

  // 3. Fetch fresh — but if it fails, return stale DB cache rather than wrong data
  try {
    const rates = await fetchFreshRates(extraCoins);

    // Validate: make sure we got real data (not just VND+USD)
    const hasRealData = Object.keys(rates).length > 5;
    if (!hasRealData) throw new Error("Insufficient rates data");

    // Save to both caches
    memCache = { rates, timestamp: Date.now(), cacheKey };
    saveToDB(cacheKey, rates); // fire and forget

    return NextResponse.json({ ...rates, cached: false, lastUpdate: new Date().toISOString() });

  } catch (error) {
    console.error("fetchFreshRates failed:", error);

    // 4. Stale DB cache is better than wrong data
    if (dbCache && dbCache.age < STALE_TTL) {
      console.warn(`⚠️ Using stale DB cache (age: ${Math.round(dbCache.age / 1000)}s)`);
      memCache = { rates: dbCache.rates, timestamp: Date.now(), cacheKey };
      return NextResponse.json({ ...dbCache.rates, cached: "stale", lastUpdate: new Date(Date.now() - dbCache.age).toISOString() });
    }

    // 5. Last resort: hardcoded
    console.warn("⚠️ Using hardcoded fallback");
    const fallback: Record<string, number> = { VND: 1, USD: HARDCODED_VND };
    for (const [sym, p] of Object.entries(HARDCODED_USD)) fallback[sym] = Math.round(p * HARDCODED_VND);
    return NextResponse.json({ ...fallback, cached: "hardcoded", lastUpdate: new Date().toISOString() });
  }
}

export async function POST() {
  try {
    memCache = null; // clear memory cache
    const rates = await fetchFreshRates([]);
    memCache = { rates, timestamp: Date.now(), cacheKey: "rates:" };
    saveToDB("rates:", rates);
    return NextResponse.json({ ...rates, message: "Rates refreshed", lastUpdate: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Failed to refresh rates" }, { status: 500 });
  }
}