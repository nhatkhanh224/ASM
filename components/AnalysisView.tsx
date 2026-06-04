"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  BarChart2,
  Bell,
  BellOff,
  ShieldAlert,
} from "lucide-react";
import { Asset, AssetWithRate, ExchangeRates, AssetType } from "@/types/asset";
import {
  ASSET_TYPE_CONFIG,
  RISK_CONFIG,
  ALERTABLE_COINS,
} from "@/libs/assetHelpers";

interface AlertItem {
  coin: string;
  threshold: number;
  direction: "up" | "down" | "both";
  enabled: boolean;
}

interface AnalysisViewProps {
  assetsWithRate: AssetWithRate[];
  exchangeRates: ExchangeRates;
  totalVND: number;
}

export default function AnalysisView({
  assetsWithRate,
  exchangeRates,
  totalVND,
}: AnalysisViewProps) {
  return (
    <div className="space-y-6">
      <GoalSection totalVND={totalVND} />
      <MultiCurrencySection totalVND={totalVND} exchangeRates={exchangeRates} />
      <PriceAlertSection exchangeRates={exchangeRates} />
      <PortfolioRiskSection assetsWithRate={assetsWithRate} totalVND={totalVND} />
    </div>
  );
}

function GoalSection({ totalVND }: { totalVND: number }) {
  const [goal, setGoal] = useState<{ targetVND: number; label: string } | null>(
    null
  );
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ targetVND: "", label: "Mục tiêu tài sản" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/goal")
      .then((r) => r.json())
      .then((d) => {
        if (d?._id) {
          setGoal(d);
          setForm({ targetVND: String(d.targetVND), label: d.label });
        } else {
          setEditing(true);
        }
      });
  }, []);

  const save = async () => {
    if (!form.targetVND || Number(form.targetVND) <= 0) return;
    setSaving(true);
    const res = await fetch("/api/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetVND: Number(form.targetVND),
        label: form.label,
      }),
    });
    const data = await res.json();
    setGoal(data);
    setEditing(false);
    setSaving(false);
  };

  const progress = goal ? Math.min((totalVND / goal.targetVND) * 100, 100) : 0;
  const remaining = goal ? Math.max(goal.targetVND - totalVND, 0) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Target className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Mục tiêu tài sản</h3>
        </div>
        {goal && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-indigo-600 hover:underline"
          >
            Chỉnh sửa
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên mục tiêu
            </label>
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="VD: Mua nhà, Nghỉ hưu sớm..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target (VND)
            </label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              value={form.targetVND}
              onChange={(e) => setForm({ ...form, targetVND: e.target.value })}
              placeholder="VD: 500000000"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu mục tiêu"}
            </button>
            {goal && (
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Hủy
              </button>
            )}
          </div>
        </div>
      ) : goal ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-gray-500">{goal.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {totalVND.toLocaleString()}{" "}
                <span className="text-base text-gray-400 font-normal">
                  / {goal.targetVND.toLocaleString()} VND
                </span>
              </p>
            </div>
            <p
              className={`text-3xl font-bold ${
                progress >= 100 ? "text-green-600" : "text-indigo-600"
              }`}
            >
              {progress.toFixed(1)}%
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progress >= 100
                  ? "bg-green-500"
                  : progress >= 75
                  ? "bg-indigo-500"
                  : progress >= 50
                  ? "bg-blue-400"
                  : "bg-indigo-300"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress < 100 ? (
            <p className="text-sm text-gray-500">
              Còn thiếu{" "}
              <span className="font-semibold text-gray-700">
                {remaining.toLocaleString()} VND
              </span>{" "}
              để đạt mục tiêu
            </p>
          ) : (
            <p className="text-sm text-green-600 font-semibold">
              🎉 Bạn đã đạt mục tiêu!
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

const DISPLAY_CURRENCIES = [
  { symbol: "VND", label: "VND", decimals: 0 },
  { symbol: "USD", label: "USD", decimals: 2 },
  { symbol: "BTC", label: "BTC", decimals: 6 },
  { symbol: "ETH", label: "ETH", decimals: 4 },
];

function MultiCurrencySection({
  totalVND,
  exchangeRates,
}: {
  totalVND: number;
  exchangeRates: ExchangeRates;
}) {
  const [selected, setSelected] = useState("VND");
  const convert = (symbol: string) => {
    const rate = exchangeRates[symbol] ?? 1;
    return totalVND / rate;
  };
  const cfg =
    DISPLAY_CURRENCIES.find((c) => c.symbol === selected) ??
    DISPLAY_CURRENCIES[0];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <BarChart2 className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">
          Tổng tài sản theo đơn vị
        </h3>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {DISPLAY_CURRENCIES.map((c) => (
          <button
            key={c.symbol}
            onClick={() => setSelected(c.symbol)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              selected === c.symbol
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="text-center py-4">
        <p className="text-4xl font-bold text-gray-800">
          {convert(selected).toLocaleString("vi-VN", {
            maximumFractionDigits: cfg.decimals,
          })}
        </p>
        <p className="text-lg text-gray-400 mt-1">{cfg.symbol}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
        {DISPLAY_CURRENCIES.map((c) => (
          <div
            key={c.symbol}
            onClick={() => setSelected(c.symbol)}
            className={`p-3 rounded-xl cursor-pointer transition-all ${
              selected === c.symbol
                ? "bg-blue-50 border border-blue-200"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <p className="text-xs text-gray-400">{c.symbol}</p>
            <p className="text-sm font-bold text-gray-800 mt-1">
              {convert(c.symbol).toLocaleString("vi-VN", {
                maximumFractionDigits: c.decimals,
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceAlertSection({ exchangeRates }: { exchangeRates: ExchangeRates }) {
  const [alerts, setAlerts] = useState<AlertItem[]>(() => {
    try {
      const saved = localStorage.getItem("kvault_price_alerts");
      return saved
        ? JSON.parse(saved)
        : ALERTABLE_COINS.map((coin) => ({
            coin,
            threshold: 5,
            direction: "both" as const,
            enabled: false,
          }));
    } catch {
      return ALERTABLE_COINS.map((coin) => ({
        coin,
        threshold: 5,
        direction: "both" as const,
        enabled: false,
      }));
    }
  });

  useEffect(() => {
    localStorage.setItem("kvault_price_alerts", JSON.stringify(alerts));
  }, [alerts]);

  const toggle = (coin: string) =>
    setAlerts((prev) =>
      prev.map((a) => (a.coin === coin ? { ...a, enabled: !a.enabled } : a))
    );

  const updateThreshold = (coin: string, threshold: number) =>
    setAlerts((prev) =>
      prev.map((a) => (a.coin === coin ? { ...a, threshold } : a))
    );

  const updateDirection = (
    coin: string,
    direction: "up" | "down" | "both"
  ) =>
    setAlerts((prev) =>
      prev.map((a) => (a.coin === coin ? { ...a, direction } : a))
    );

  const getUSDPrice = (coin: string) => {
    const rate = exchangeRates[coin];
    const usdRate = exchangeRates["USD"] || 26200;
    if (!rate) return null;
    return rate / usdRate;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <Bell className="w-5 h-5 text-yellow-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Alert tỷ giá</h3>
        <span className="text-xs text-gray-400 ml-1">
          (so sánh mỗi lần refresh tỷ giá)
        </span>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const price = getUSDPrice(alert.coin);
          return (
            <div
              key={alert.coin}
              className={`p-4 rounded-xl border transition-all ${
                alert.enabled
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggle(alert.coin)}
                    className={`w-10 h-6 rounded-full transition-all ${
                      alert.enabled ? "bg-yellow-400" : "bg-gray-300"
                    } relative flex-shrink-0`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        alert.enabled ? "left-5" : "left-1"
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{alert.coin}</p>
                    {price && (
                      <p className="text-xs text-gray-400">
                        ${price.toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={alert.direction}
                    onChange={(e) =>
                      updateDirection(alert.coin, e.target.value as any)
                    }
                    disabled={!alert.enabled}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-lg disabled:opacity-40 outline-none"
                  >
                    <option value="both">Tăng hoặc giảm</option>
                    <option value="up">Chỉ tăng</option>
                    <option value="down">Chỉ giảm</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      max="50"
                      step="0.5"
                      value={alert.threshold}
                      onChange={(e) =>
                        updateThreshold(alert.coin, Number(e.target.value))
                      }
                      disabled={!alert.enabled}
                      className="w-16 text-xs px-2 py-1 border border-gray-200 rounded-lg text-center disabled:opacity-40 outline-none"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  {alert.enabled ? (
                    <Bell className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <BellOff className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Alert hiện lên banner ở đầu trang khi tỷ giá thay đổi vượt ngưỡng.
      </p>
    </div>
  );
}

function PortfolioRiskSection({
  assetsWithRate,
  totalVND,
}: {
  assetsWithRate: AssetWithRate[];
  totalVND: number;
}) {
  const riskGroups = { low: 0, medium: 0, high: 0 };
  for (const asset of assetsWithRate) {
    const risk = ASSET_TYPE_CONFIG[asset.type].risk;
    riskGroups[risk] += asset.currentValueInVND;
  }
  const lowPct = totalVND > 0 ? (riskGroups.low / totalVND) * 100 : 0;
  const medPct = totalVND > 0 ? (riskGroups.medium / totalVND) * 100 : 0;
  const highPct = totalVND > 0 ? (riskGroups.high / totalVND) * 100 : 0;

  const suggestions: string[] = [];
  if (highPct > 40)
    suggestions.push(
      "⚠️ Tài sản rủi ro cao chiếm hơn 40% — cân nhắc giảm crypto/digital."
    );
  if (lowPct < 20)
    suggestions.push(
      "💡 Tài sản an toàn (tiền mặt, ngân hàng) dưới 20% — nên tăng để có thanh khoản."
    );
  if (highPct < 10 && totalVND > 100_000_000)
    suggestions.push(
      "📈 Danh mục rất an toàn — có thể thêm một phần nhỏ crypto để tăng lợi nhuận tiềm năng."
    );
  if (suggestions.length === 0)
    suggestions.push("✅ Danh mục đang cân bằng tốt giữa rủi ro và an toàn.");

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-red-100 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">
          Phân tích rủi ro danh mục
        </h3>
      </div>
      <div className="space-y-3 mb-6">
        {(["low", "medium", "high"] as const).map((risk) => {
          const cfg = RISK_CONFIG[risk];
          const pct =
            risk === "low" ? lowPct : risk === "medium" ? medPct : highPct;
          const val = riskGroups[risk];
          return (
            <div key={risk}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {Object.entries(ASSET_TYPE_CONFIG)
                      .filter(([, v]) => v.risk === risk)
                      .map(([, v]) => v.label)
                      .join(", ")}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-800">
                    {pct.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {val.toLocaleString()} VND
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: cfg.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700 mb-2">Gợi ý:</p>
        {suggestions.map((s, i) => (
          <p key={i} className="text-sm text-gray-600 bg-gray-50 px-4 py-2.5 rounded-xl">
            {s}
          </p>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Chi tiết theo loại:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(ASSET_TYPE_CONFIG).map(([type, cfg]) => {
            const val = assetsWithRate
              .filter((a) => a.type === type)
              .reduce((s, a) => s + a.currentValueInVND, 0);
            const pct = totalVND > 0 ? (val / totalVND) * 100 : 0;
            if (val === 0) return null;
            const Icon = cfg.icon;
            return (
              <div
                key={type}
                className="p-3 bg-gray-50 rounded-xl flex items-center gap-2"
              >
                <div className={`p-1.5 rounded-lg ${cfg.color}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{cfg.label}</p>
                  <p className="text-sm font-bold text-gray-800">
                    {pct.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
