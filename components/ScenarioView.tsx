"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  RotateCcw,
  DollarSign,
} from "lucide-react";
import { Asset, ExchangeRates } from "@/types/asset";
import {
  SCENARIO_STORAGE_KEY,
  formatVND,
  formatUSD,
} from "@/libs/assetHelpers";

interface ScenarioPrice {
  [currency: string]: number;
}

interface ScenarioViewProps {
  assets: Asset[];
  exchangeRates: ExchangeRates;
}

export default function ScenarioView({
  assets,
  exchangeRates,
}: ScenarioViewProps) {
  const [scenarioPrices, setScenarioPrices] = useState<ScenarioPrice>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const cryptoCurrencies = Array.from(
    new Set(
      assets
        .filter((a) => a.currency !== "VND" && a.currency)
        .map((a) => a.currency.toUpperCase())
    )
  );
  const usdtVnd = exchangeRates["USD"] || 26200;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCENARIO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScenarioPrice;
        setScenarioPrices(parsed);
        const inputs: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          inputs[k] = v.toString();
        }
        setInputValues(inputs);
      }
    } catch {}
  }, []);

  const savePrices = useCallback((prices: ScenarioPrice) => {
    localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(prices));
    setScenarioPrices(prices);
  }, []);

  const handlePriceChange = (currency: string, raw: string) => {
    setInputValues((prev) => ({ ...prev, [currency]: raw }));
    const parsed = parseFloat(raw.replace(/,/g, ""));
    if (!isNaN(parsed) && parsed > 0) {
      savePrices({ ...scenarioPrices, [currency]: parsed });
    }
  };

  const handleReset = (currency: string) => {
    const newPrices = { ...scenarioPrices };
    delete newPrices[currency];
    savePrices(newPrices);
    setInputValues((prev) => {
      const n = { ...prev };
      delete n[currency];
      return n;
    });
  };

  const currentTotalVND = assets.reduce(
    (sum, a) =>
      sum + (a.originalValue ?? a.value) * (exchangeRates[a.currency] ?? 1),
    0
  );
  let scenarioTotalVND = 0;

  const assetScenarios = assets.map((asset) => {
    const currency = asset.currency?.toUpperCase();
    const currentPriceUSD = (exchangeRates[currency] ?? 1) / usdtVnd;
    const scenarioPriceUSD = scenarioPrices[currency];
    const currentValueVND =
      (asset.originalValue ?? asset.value) * (exchangeRates[currency] ?? 1);
    let scenarioValueVND = currentValueVND;
    if (scenarioPriceUSD && currentPriceUSD > 0 && currency !== "VND") {
      const amountInCoin = currentValueVND / (currentPriceUSD * usdtVnd);
      scenarioValueVND = amountInCoin * scenarioPriceUSD * usdtVnd;
    }
    scenarioTotalVND += scenarioValueVND;
    const gain = scenarioValueVND - currentValueVND;
    const gainPct = currentValueVND > 0 ? (gain / currentValueVND) * 100 : 0;
    return {
      ...asset,
      currentValueVND,
      scenarioValueVND,
      gain,
      gainPct,
      hasScenario: !!scenarioPriceUSD,
      currentPriceUSD,
      scenarioPriceUSD: scenarioPriceUSD || null,
    };
  });

  const totalGain = scenarioTotalVND - currentTotalVND;
  const totalGainPct =
    currentTotalVND > 0 ? (totalGain / currentTotalVND) * 100 : 0;
  const hasAnyScenario = Object.keys(scenarioPrices).length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-indigo-200" />
          <span className="text-indigo-200 text-sm font-medium">
            Kịch bản kỳ vọng
          </span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-indigo-300 mb-1">Danh mục kỳ vọng</p>
            <p className="text-3xl font-bold tracking-tight">
              {formatVND(scenarioTotalVND)}{" "}
              <span className="text-lg font-normal text-indigo-200">VND</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-300 mb-1">Tăng thêm</p>
            <div
              className={`flex items-center gap-1 text-xl font-bold ${
                totalGain >= 0 ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {totalGain >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              {totalGain >= 0 ? "+" : ""}
              {formatVND(totalGain)} VND
            </div>
            <p
              className={`text-sm font-medium ${
                totalGainPct >= 0 ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {totalGainPct >= 0 ? "+" : ""}
              {totalGainPct.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="mt-4 bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(
                100,
                scenarioTotalVND > 0
                  ? (currentTotalVND / scenarioTotalVND) * 100
                  : 100
              )}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-indigo-300 mt-1">
          <span>Hiện tại: {formatVND(currentTotalVND)}</span>
          <span>Kỳ vọng: {formatVND(scenarioTotalVND)}</span>
        </div>
      </div>
      {cryptoCurrencies.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-gray-800 text-sm">
              Nhập giá kỳ vọng (USD)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cryptoCurrencies.map((currency) => {
              const currentPriceUSD = (exchangeRates[currency] ?? 0) / usdtVnd;
              const scenarioPrice = scenarioPrices[currency];
              const multiplier =
                scenarioPrice && currentPriceUSD > 0
                  ? scenarioPrice / currentPriceUSD
                  : null;
              return (
                <div
                  key={currency}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-700 font-bold text-xs">
                      {currency.slice(0, 4)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">
                        {currency}
                      </span>
                      {multiplier !== null && (
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                            multiplier >= 1
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {multiplier >= 1
                            ? `×${multiplier.toFixed(1)}`
                            : `÷${(1 / multiplier).toFixed(1)}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        placeholder={
                          currentPriceUSD > 0
                            ? `Hiện tại: ${currentPriceUSD.toLocaleString(
                                "en-US",
                                { maximumFractionDigits: 2 }
                              )}`
                            : "Nhập giá kỳ vọng..."
                        }
                        value={inputValues[currency] || ""}
                        onChange={(e) =>
                          handlePriceChange(currency, e.target.value)
                        }
                        className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {scenarioPrice && (
                        <button
                          onClick={() => handleReset(currency)}
                          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {currentPriceUSD > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Giá hiện tại: {formatUSD(currentPriceUSD)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-500" />
            Chi tiết từng tài sản
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {assetScenarios.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              Chưa có tài sản nào
            </div>
          )}
          {assetScenarios.map((asset) => (
            <div
              key={asset._id}
              className="px-5 py-3.5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 text-sm truncate">
                  {asset.name}
                </p>
                <p className="text-xs text-gray-400">
                  {asset.currency.toUpperCase()}
                  {asset.hasScenario && asset.scenarioPriceUSD && (
                    <span className="ml-1 text-indigo-400">
                      → {formatUSD(asset.scenarioPriceUSD)}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-800">
                  {formatVND(asset.scenarioValueVND)} VND
                </p>
                {asset.hasScenario ? (
                  <p
                    className={`text-xs font-medium ${
                      asset.gain >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {asset.gain >= 0 ? "+" : ""}
                    {formatVND(asset.gain)} (
                    {asset.gainPct >= 0 ? "+" : ""}
                    {asset.gainPct.toFixed(1)}%)
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    {formatVND(asset.currentValueVND)} hiện tại
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Tổng kỳ vọng
          </span>
          <div className="text-right">
            <p className="text-base font-bold text-indigo-700">
              {formatVND(scenarioTotalVND)} VND
            </p>
            {hasAnyScenario && (
              <p
                className={`text-xs font-semibold ${
                  totalGain >= 0 ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {totalGain >= 0 ? "+" : ""}
                {formatVND(totalGain)} (
                {totalGainPct >= 0 ? "+" : ""}
                {totalGainPct.toFixed(1)}%)
              </p>
            )}
          </div>
        </div>
      </div>
      {!hasAnyScenario && (
        <p className="text-center text-xs text-gray-400 pb-2">
          Nhập giá kỳ vọng cho từng coin ở trên để xem kết quả ✨
        </p>
      )}
    </div>
  );
}
