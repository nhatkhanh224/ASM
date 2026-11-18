import { NextResponse } from "next/server";

type BinanceTicker = {
  symbol?: string;
  price?: string;
};

const PRICE_SOURCES = [
  { name: "Binance Futures", url: "https://fapi.binance.com/fapi/v1/ticker/price" },
  { name: "Binance Spot", url: "https://api.binance.com/api/v3/ticker/price" },
];

export async function GET(request: Request) {
  const rawSymbol = new URL(request.url).searchParams.get("symbol")?.trim().toUpperCase() || "";
  const baseSymbol = rawSymbol.endsWith("USDT") ? rawSymbol.slice(0, -4) : rawSymbol;

  if (!/^[A-Z0-9]{2,15}$/.test(baseSymbol)) {
    return NextResponse.json({ error: "Mã tài sản không hợp lệ" }, { status: 400 });
  }

  const pair = `${baseSymbol}USDT`;
  for (const source of PRICE_SOURCES) {
    try {
      const response = await fetch(`${source.url}?symbol=${pair}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) continue;

      const ticker = await response.json() as BinanceTicker;
      const price = Number(ticker.price);
      if (Number.isFinite(price) && price > 0) {
        return NextResponse.json({ symbol: baseSymbol, pair, price, source: source.name });
      }
    } catch {
      // Try the next public market source.
    }
  }

  return NextResponse.json(
    { error: `Chưa tìm thấy giá tự động cho ${pair}. Bạn có thể nhập giá thủ công.` },
    { status: 404 },
  );
}
