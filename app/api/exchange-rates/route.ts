import { NextResponse } from "next/server";

let ratesCache: { rates: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

export async function GET() {
  try {
    if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        ...ratesCache.rates,
        cached: true,
        lastUpdate: new Date(ratesCache.timestamp).toISOString(),
      });
    }

    const rates = await fetchExchangeRates();
    ratesCache = { rates, timestamp: Date.now() };

    return NextResponse.json({
      ...rates,
      cached: false,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return NextResponse.json(getSampleRates());
  }
}

async function fetchUSDTtoVND(): Promise<number> {
  // Binance P2P API — trả về giá USDT/VND thực tế trên sàn
  // Đây là endpoint public, không cần API key
  try {
    const res = await fetch("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset: "USDT",
        fiat: "VND",
        merchantCheck: false,
        page: 1,
        payTypes: [],
        rows: 5,
        tradeType: "SELL",
      }),
    });
    console.log("🚀 ~ fetchUSDTtoVND ~ res:", res)

    if (!res.ok) throw new Error("Binance P2P failed");

    const data = await res.json();
    const prices: number[] = data?.data
      ?.map((item: any) => parseFloat(item.adv?.price))
      .filter((p: number) => !isNaN(p));

    if (!prices || prices.length === 0) throw new Error("No prices found");

    // Lấy median để tránh outlier
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 !== 0
      ? prices[mid]
      : (prices[mid - 1] + prices[mid]) / 2;

    console.log("✅ USDT/VND from Binance P2P:", median, "| samples:", prices);
    return Math.round(median);
  } catch (err) {
    console.error("Binance P2P failed, trying Bybit...", err);
  }

  // Fallback: Bybit P2P (cũng public, không cần key)
  try {
    const res = await fetch("https://api2.bybit.com/fiat/otc/item/online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenId: "USDT",
        currencyId: "VND",
        payment: "0",
        side: "0", // 0 = BUY
        size: "5",
        page: "1",
      }),
    });

    if (!res.ok) throw new Error("Bybit failed");

    const data = await res.json();
    const prices: number[] = data?.result?.items
      ?.map((item: any) => parseFloat(item.price))
      .filter((p: number) => !isNaN(p));

    if (!prices || prices.length === 0) throw new Error("No Bybit prices");

    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 !== 0
      ? prices[mid]
      : (prices[mid - 1] + prices[mid]) / 2;

    console.log("✅ USDT/VND from Bybit P2P:", median);
    return Math.round(median);
  } catch (err) {
    console.error("Bybit P2P also failed:", err);
  }

  // Fallback cuối: exchangerate-api
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await res.json();
    if (data.rates?.VND) {
      console.warn("⚠️ Using exchangerate-api fallback:", data.rates.VND);
      return Math.round(data.rates.VND);
    }
  } catch (err) {
    console.error("exchangerate-api also failed:", err);
  }

  console.warn("⚠️ All USD/VND sources failed, using hardcoded 26200");
  return 26200;
}

async function fetchExchangeRates() {
  const rates: any = { VND: 1 };

  // Lấy giá USDT/VND thực tế từ P2P sàn (USDT ≈ USD về mặt crypto)
  const usdtToVND = await fetchUSDTtoVND();
  rates.USD = usdtToVND;

  try {
    // CoinGecko: lấy giá BTC/ETH/ASTER theo USD, rồi nhân với USDT/VND
    const cryptoRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,aster-2&vs_currencies=usd",
      { cache: "no-store" },
    );

    if (!cryptoRes.ok) throw new Error("Failed to fetch crypto rates");

    const cryptoData = await cryptoRes.json();
    console.log("🚀 cryptoData (USD):", cryptoData);

    if (cryptoData.bitcoin?.usd) {
      rates.BTC = Math.round(cryptoData.bitcoin.usd * usdtToVND);
    }
    if (cryptoData.ethereum?.usd) {
      rates.ETH = Math.round(cryptoData.ethereum.usd * usdtToVND);
    }
    if (cryptoData["aster-2"]?.usd) {
      rates.ASTER = Math.round(cryptoData["aster-2"].usd * usdtToVND);
    }
  } catch (error) {
    console.error("Error fetching crypto rates:", error);
    rates.BTC = Math.round(77443.11 * usdtToVND);
    rates.ETH = Math.round(2400 * usdtToVND);
    rates.ASTER = Math.round(0.5702 * usdtToVND);
  }

  return {
    VND: rates.VND,
    USD: rates.USD,
    BTC: rates.BTC,
    ETH: rates.ETH,
    ASTER: rates.ASTER,
  };
}

function getSampleRates() {
  return {
    VND: 1,
    USD: 26200,
    BTC: Math.round(77443.11 * 26200),
    ETH: Math.round(2400 * 26200),
    ASTER: Math.round(0.5702 * 26200),
    cached: false,
    lastUpdate: new Date().toISOString(),
    error: "Using fallback rates",
  };
}

export async function POST() {
  try {
    const rates = await fetchExchangeRates();
    ratesCache = { rates, timestamp: Date.now() };

    return NextResponse.json({
      ...rates,
      message: "Rates refreshed successfully",
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to refresh rates" },
      { status: 500 },
    );
  }
}