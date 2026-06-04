"use client";

import React from "react";
import { Wallet, Edit2, Trash2 } from "lucide-react";
import { Asset, AssetWithRate } from "@/types/asset";
import { ASSET_TYPE_CONFIG } from "@/libs/assetHelpers";

interface AssetListProps {
  assetsWithRate: AssetWithRate[];
  onDelete: (id: string) => void;
  onEdit: (asset: Asset) => void;
}

export default function AssetList({
  assetsWithRate,
  onDelete,
  onEdit,
}: AssetListProps) {
  const total = assetsWithRate.reduce((sum, a) => sum + a.currentValueInVND, 0);
  const sorted = [...assetsWithRate].sort(
    (a, b) => b.currentValueInVND - a.currentValueInVND
  );

  if (assetsWithRate.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
        <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Chưa có tài sản nào</p>
        <p className="text-gray-400 text-sm mt-2">
          Nhấn &quot;Thêm tài sản&quot; để bắt đầu
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Danh sách tài sản</h2>
        <p className="text-sm text-gray-500 mt-1">{assetsWithRate.length} tài sản</p>
      </div>
      <div className="divide-y divide-gray-100">
        {sorted.map((asset) => {
          const config = ASSET_TYPE_CONFIG[asset.type];
          const Icon = config.icon;
          const percentage =
            total > 0
              ? ((asset.currentValueInVND / total) * 100).toFixed(1)
              : "0";
          const hasRateChanged = Math.abs(asset.currentValueInVND - asset.value) > 1;

          return (
            <div
              key={asset._id}
              className="p-6 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${config.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{asset.name}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-sm text-gray-500">{config.label}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{percentage}%</span>
                      {asset.note && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400 max-w-xs truncate">
                            {asset.note}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">
                      {(asset.originalValue ?? asset.value).toLocaleString()}{" "}
                      {asset.currency}
                    </p>
                    <p className="text-sm text-gray-500">
                      ≈ {asset.currentValueInVND.toLocaleString()} VND
                    </p>
                    {hasRateChanged && (
                      <p className="text-xs text-blue-600 mt-1">
                        Đã cập nhật tỷ giá
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(asset)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(asset._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-6 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-700">Tổng cộng</span>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">
              {total.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">VND (theo tỷ giá hiện tại)</p>
          </div>
        </div>
      </div>
    </div>
  );
}