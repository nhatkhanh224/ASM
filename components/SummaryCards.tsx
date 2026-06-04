"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { AssetType, AssetWithRate } from "@/types/asset";
import { ASSET_TYPE_CONFIG } from "@/libs/assetHelpers";

interface SummaryCardsProps {
  assetsWithRate: AssetWithRate[];
  ratesReady: boolean;
}

export default function SummaryCards({
  assetsWithRate,
  ratesReady,
}: SummaryCardsProps) {
  const total = assetsWithRate.reduce((sum, a) => sum + a.currentValueInVND, 0);
  const byType = assetsWithRate.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.type] = (acc[asset.type] ?? 0) + asset.currentValueInVND;
    return acc;
  }, {});
  const sortedTypes = Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Skeleton shimmer khi rates chưa ready
  if (!ratesReady) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-100">Tổng tài sản</span>
            <ArrowUpRight className="w-5 h-5 text-indigo-200" />
          </div>
          <div className="h-9 w-36 bg-indigo-400/50 rounded-lg animate-pulse mb-1" />
          <div className="h-4 w-12 bg-indigo-400/40 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-indigo-100">Tổng tài sản</span>
          <ArrowUpRight className="w-5 h-5 text-indigo-200" />
        </div>
        <p className="text-3xl font-bold">{total.toLocaleString()}</p>
        <p className="text-sm text-indigo-100 mt-1">VND</p>
      </div>
      {sortedTypes.map(([type, value]) => {
        const config = ASSET_TYPE_CONFIG[type as AssetType];
        const Icon = config.icon;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
        return (
          <div key={type} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm">{config.label}</span>
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {value.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {percentage}% tổng tài sản
            </p>
          </div>
        );
      })}
    </div>
  );
}
