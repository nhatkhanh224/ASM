"use client";

import React from "react";
import { AssetTypeConfigItem, AssetType, AssetWithRate } from "@/types/asset";
import { ASSET_TYPE_CONFIG } from "@/libs/assetHelpers";

interface ChartDataItem {
  type: string;
  value: number;
  count: number;
  percentage: string;
  config: AssetTypeConfigItem;
}

interface AssetChartProps {
  assetsWithRate: AssetWithRate[];
}

export default function AssetChart({ assetsWithRate }: AssetChartProps) {
  const total = assetsWithRate.reduce((sum, a) => sum + a.currentValueInVND, 0);
  const byType = assetsWithRate.reduce<
    Record<string, { value: number; count: number }>
  >((acc, asset) => {
    if (!acc[asset.type]) acc[asset.type] = { value: 0, count: 0 };
    acc[asset.type].value += asset.currentValueInVND;
    acc[asset.type].count += 1;
    return acc;
  }, {});

  const chartData: ChartDataItem[] = Object.entries(byType)
    .map(([type, data]) => ({
      type,
      ...data,
      percentage: total > 0 ? ((data.value / total) * 100).toFixed(1) : "0",
      config: ASSET_TYPE_CONFIG[type as AssetType],
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        Phân bổ tài sản theo loại
      </h2>
      <div className="space-y-4">
        {chartData.map((item) => {
          const Icon = item.config.icon;
          return (
            <div key={item.type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-gray-700">
                    {item.config.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({item.count} tài sản)
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">
                    {item.value.toLocaleString()} VND
                  </p>
                  <p className="text-sm text-gray-500">{item.percentage}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.config.chartColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
