"use client";

import React, { useState, useEffect } from "react";
import { Calculator, TrendingUp, DollarSign, Activity, RefreshCw } from "lucide-react";

interface TickerPrice {
  symbol: string;
  price: string;
}

const DEFAULT_COINS = [
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "XRP",
  "ADA",
  "DOGE"
];

export default function FuturesCalculator() {
  const [margin, setMargin] = useState<string>("100");
  const [leverage, setLeverage] = useState<string>("10");
  const [coinSymbol, setCoinSymbol] = useState<string>("BTC");
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [positionSide, setPositionSide] = useState<"LONG" | "SHORT">("LONG");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const fetchPrice = async (coin: string) => {
    if (!coin) return;
    setIsLoadingPrice(true);
    setPriceError(null);
    try {
      const apiSymbol = coin.toUpperCase().endsWith('USDT') ? coin.toUpperCase() : coin.toUpperCase() + 'USDT';
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${apiSymbol}`);
      if (!res.ok) throw new Error("Network response was not ok");
      const data: TickerPrice = await res.json();
      setEntryPrice(parseFloat(data.price).toString());
    } catch (error) {
      console.error("Error fetching price:", error);
      setPriceError("Không tìm thấy giá tự động. Bạn vẫn có thể nhập giá thủ công.");
    } finally {
      setIsLoadingPrice(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPrice(coinSymbol);
    }, 500); // Debounce to prevent too many API calls while typing
    return () => clearTimeout(timeoutId);
  }, [coinSymbol]);

  // Calculations
  const marginNum = parseFloat(margin) || 0;
  const leverageNum = parseFloat(leverage) || 1;
  const entryPriceNum = parseFloat(entryPrice) || 0;
  const targetPriceNum = parseFloat(targetPrice) || 0;

  const notionalSize = marginNum * leverageNum; // Total position size in USDT
  const coinSize = entryPriceNum > 0 ? notionalSize / entryPriceNum : 0; // Size in Coin

  // PNL Calculation
  let pnl = 0;
  let roe = 0; // Return on Equity (%)
  if (entryPriceNum > 0 && targetPriceNum > 0) {
    const priceDiff = positionSide === "LONG" 
      ? targetPriceNum - entryPriceNum 
      : entryPriceNum - targetPriceNum;
    
    pnl = priceDiff * coinSize;
    roe = marginNum > 0 ? (pnl / marginNum) * 100 : 0;
  }

  // Estimated Liquidation Price (Simplified for isolated margin)
  // Long Liquidation = Entry - (Margin / Size)
  // Short Liquidation = Entry + (Margin / Size)
  let liqPrice = 0;
  if (entryPriceNum > 0 && coinSize > 0) {
    if (positionSide === "LONG") {
      liqPrice = entryPriceNum - (marginNum / coinSize);
    } else {
      liqPrice = entryPriceNum + (marginNum / coinSize);
    }
    // Prevent negative liquidation price
    if (liqPrice < 0) liqPrice = 0;
  }

  const formatUSDT = (value: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value).replace("$", "") + " USDT";
  };

  const formatCoin = (value: number) => {
    const symbol = coinSymbol.toUpperCase().replace("USDT", "");
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 }).format(value) + " " + symbol;
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-slate-200/50 space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Công cụ tính toán Futures</h2>
          <p className="text-sm text-slate-500">Tính vị thế, đòn bẩy và thanh lý dựa trên giá thực tế</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cột Trái: Inputs */}
        <div className="space-y-5">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setPositionSide("LONG")}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${
                positionSide === "LONG" ? "bg-emerald-500 text-white shadow" : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              LONG (Mua lên)
            </button>
            <button
              onClick={() => setPositionSide("SHORT")}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${
                positionSide === "SHORT" ? "bg-rose-500 text-white shadow" : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              SHORT (Bán khống)
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Đồng coin (VD: BTC, ETH, PEPE)</label>
            <input
              type="text"
              list="default-coins"
              value={coinSymbol}
              onChange={(e) => setCoinSymbol(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium text-slate-800 outline-none uppercase"
              placeholder="VD: BTC, PEPE"
            />
            <datalist id="default-coins">
              {DEFAULT_COINS.map(coin => (
                <option key={coin} value={coin} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ký quỹ (Margin - USDT)</label>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium text-slate-800"
                placeholder="VD: 100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Đòn bẩy (Leverage - x)</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium text-slate-800"
                placeholder="VD: 10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">Giá vào (Entry Price)</label>
                <button 
                  onClick={() => fetchPrice(coinSymbol)}
                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  title="Cập nhật giá mới nhất"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingPrice ? 'animate-spin' : ''}`} /> Cập nhật
                </button>
              </div>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium text-slate-800"
                placeholder="Đang tải..."
              />
              {priceError && <p className="text-xs text-rose-500 mt-1">{priceError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Giá mục tiêu (Target Price)</label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium text-slate-800"
                placeholder="Tùy chọn..."
              />
            </div>
          </div>
        </div>

        {/* Cột Phải: Kết quả */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col justify-center space-y-6">
          <div className="grid grid-cols-2 gap-6 border-b border-slate-200 pb-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Tổng quy mô (Notional)</p>
              <p className="text-xl font-bold text-slate-800">{formatUSDT(notionalSize)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Khối lượng ({coinSymbol.toUpperCase().replace("USDT", "") || "Coin"})</p>
              <p className="text-xl font-bold text-indigo-600">{formatCoin(coinSize)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-b border-slate-200 pb-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1">
                Ký quỹ ban đầu
              </p>
              <p className="text-lg font-bold text-slate-700">{formatUSDT(marginNum)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1 text-rose-500">Giá thanh lý (Ước tính)*</p>
              <p className="text-lg font-bold text-rose-600">{liqPrice > 0 ? formatUSDT(liqPrice) : "---"}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500 mb-2">Lợi nhuận ước tính (PNL)</p>
            <div className="flex items-end gap-3">
              <span className={`text-3xl font-black ${pnl > 0 ? 'text-emerald-500' : pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                {pnl > 0 ? "+" : ""}{pnl.toFixed(2)} USDT
              </span>
              {roe !== 0 && (
                <span className={`text-lg font-bold mb-1 ${roe > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ({roe > 0 ? "+" : ""}{roe.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
          
          <p className="text-xs text-slate-400 italic">
            * Giá thanh lý chỉ mang tính chất tham khảo cho Isolated Margin và chưa bao gồm phí giao dịch, funding rate.
          </p>
        </div>
      </div>
    </div>
  );
}
