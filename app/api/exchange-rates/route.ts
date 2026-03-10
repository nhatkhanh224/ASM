import { NextResponse } from "next/server";

// Cache để tránh gọi API quá nhiều
let ratesCache: { rates: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

export async function GET() {
  try {
    // Kiểm tra cache
    if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        ...ratesCache.rates,
        cached: true,
        lastUpdate: new Date(ratesCache.timestamp).toISOString(),
      });
    }

    // Fetch tỷ giá mới
    const rates = await fetchExchangeRates();

    // Lưu cache
    ratesCache = {
      rates,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      ...rates,
      cached: false,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching exchange rates:", error);

    // Trả về rates mẫu nếu API fail
    return NextResponse.json(getSampleRates());
  }
}

async function fetchExchangeRates() {
  const rates: any = { VND: 1 };

  try {
    // 1. Fetch USD/VND từ ExchangeRate-API (miễn phí)
    const fiatRes = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
    );
    const fiatData = await fiatRes.json();

    if (fiatData.rates && fiatData.rates.VND) {
      rates.USD = Math.round(fiatData.rates.VND);
    }
  } catch (error) {
    console.error("Error fetching USD rate:", error);
    rates.USD = 26200; // Fallback
  }

  try {
    const cryptoRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,aster-2&vs_currencies=vnd",
      { cache: "no-store" }, // tránh cache sai giá
    );

    if (!cryptoRes.ok) throw new Error("Failed to fetch crypto rates");

    const cryptoData = await cryptoRes.json();
    console.log("🚀 cryptoData:", cryptoData);

    if (cryptoData.bitcoin?.vnd) {
      rates.BTC = Math.round(cryptoData.bitcoin.vnd);
    }

    if (cryptoData.ethereum?.vnd) {
      rates.ETH = Math.round(cryptoData.ethereum.vnd);
    }

    if (cryptoData["aster-2"]?.vnd) {
      rates.ASTER = Math.round(cryptoData["aster-2"].vnd);
    }
  } catch (error) {
    console.error("Error fetching crypto rates:", error);

    // fallback (USD → VND)
    const usd = rates.USD || 26200;
    rates.BTC = Math.round(77443.11 * usd);
    rates.ETH = Math.round(2400 * usd);
    rates.ASTER = Math.round(0.5702 * usd);
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
    BTC: 77443.11 * 26200,
    ETH: 2400 * 26200,
    ASTER: 0.5702 * 26200,
    cached: false,
    lastUpdate: new Date().toISOString(),
    error: "Using fallback rates",
  };
}

// Endpoint để force refresh cache
export async function POST() {
  try {
    const rates = await fetchExchangeRates();

    ratesCache = {
      rates,
      timestamp: Date.now(),
    };

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
