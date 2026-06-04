"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface Snapshot {
  month: string;
  totalVND: number;
  byType: Record<string, number>;
}

export default function SnapshotChart() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/snapshots")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSnapshots(data.reverse());
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-48" />
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center py-12 text-gray-400">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p>Chưa có dữ liệu snapshot.</p>
        <p className="text-sm mt-1">
          Thêm hoặc sửa tài sản để tạo snapshot đầu tiên.
        </p>
      </div>
    );
  }

  const max = Math.max(...snapshots.map((s) => s.totalVND));
  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const diff = prev ? latest.totalVND - prev.totalVND : 0;
  const diffPct = prev ? ((diff / prev.totalVND) * 100).toFixed(1) : null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Snapshot hàng tháng</h2>
        {diffPct && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              diff >= 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {diff > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : diff < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            {diff >= 0 ? "+" : ""}
            {diffPct}% so với tháng trước
          </div>
        )}
      </div>
      <div className="flex items-end gap-2 h-40">
        {snapshots.map((s, i) => {
          const height = max > 0 ? (s.totalVND / max) * 100 : 0;
          const isLatest = i === snapshots.length - 1;
          return (
            <div
              key={s.month}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {s.totalVND.toLocaleString()} VND
              </div>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  isLatest ? "bg-indigo-500" : "bg-indigo-200 group-hover:bg-indigo-300"
                }`}
                style={{ height: `${Math.max(height, 20)}%` }}
              />
              <span className="text-xs text-gray-400 mt-1 hidden sm:block">
                {s.month.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {snapshots
          .slice(-6)
          .reverse()
          .map((s) => {
            const idx = snapshots.indexOf(s);
            const prevSnap = idx > 0 ? snapshots[idx - 1] : null;
            const change = prevSnap ? s.totalVND - prevSnap.totalVND : null;
            return (
              <div key={s.month} className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400">{s.month}</p>
                <p className="text-sm font-bold text-gray-800 mt-1">
                  {(s.totalVND / 1_000_000).toFixed(1)}M
                </p>
                {change !== null && (
                  <p
                    className={`text-xs mt-0.5 ${
                      change >= 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {change >= 0 ? "+" : ""}
                    {(change / 1_000_000).toFixed(1)}M
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
