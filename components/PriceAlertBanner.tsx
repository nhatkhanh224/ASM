"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { ExchangeRates } from "@/types/asset";

interface AlertItem {
  coin: string;
  threshold: number;
  direction: "up" | "down" | "both";
  enabled: boolean;
}

interface TriggeredAlert {
  coin: string;
  change: number;
  message: string;
}

interface PriceAlertBannerProps {
  exchangeRates: ExchangeRates;
}

export default function PriceAlertBanner({ exchangeRates }: PriceAlertBannerProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(() => {
    try {
      const saved = localStorage.getItem("kvault_price_alerts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
  const prevRatesRef = useRef<ExchangeRates>({});

  useEffect(() => {
    localStorage.setItem("kvault_price_alerts", JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    const prev = prevRatesRef.current;
    if (Object.keys(prev).length === 0) {
      prevRatesRef.current = exchangeRates;
      return;
    }
    const newTriggered: TriggeredAlert[] = [];
    for (const alert of alerts) {
      if (!alert.enabled) continue;
      const prevRate = prev[alert.coin];
      const currRate = exchangeRates[alert.coin];
      if (!prevRate || !currRate) continue;
      const usdRate = exchangeRates["USD"] || 26200;
      const prevUSD = prevRate / usdRate;
      const currUSD = currRate / usdRate;
      const changePct = ((currUSD - prevUSD) / prevUSD) * 100;
      const shouldTrigger =
        (alert.direction === "both" && Math.abs(changePct) >= alert.threshold) ||
        (alert.direction === "up" && changePct >= alert.threshold) ||
        (alert.direction === "down" && changePct <= -alert.threshold);
      if (shouldTrigger) {
        newTriggered.push({
          coin: alert.coin,
          change: changePct,
          message: `${alert.coin} ${changePct >= 0 ? "tăng" : "giảm"} ${Math.abs(changePct).toFixed(2)}%`,
        });
      }
    }
    if (newTriggered.length > 0) {
      setTriggered((prevList) => [...prevList, ...newTriggered]);
    }
    prevRatesRef.current = exchangeRates;
  }, [exchangeRates, alerts]);

  if (triggered.length === 0) return null;
  return (
    <div className="space-y-2">
      {triggered.map((t, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
            t.change >= 0
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell
              className={`w-4 h-4 ${
                t.change >= 0 ? "text-green-600" : "text-red-500"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                t.change >= 0 ? "text-green-700" : "text-red-600"
              }`}
            >
              🔔 Alert: {t.message}
            </span>
          </div>
          <button
            onClick={() => setTriggered((prevList) => prevList.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
