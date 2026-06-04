"use client";

import React, { useState, useEffect } from "react";
import { History, Edit2 } from "lucide-react";
import { Asset } from "@/types/asset";
import { formatTime } from "@/libs/assetHelpers";

export interface HistoryEntry {
  _id: string;
  assetId: string;
  originalValue: number;
  valueInVND: number;
  currency: string;
  note: string;
  changedAt: string;
}

interface AssetHistoryListProps {
  assets: Asset[];
}

export default function AssetHistoryList({ assets }: AssetHistoryListProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    if (selectedAsset === "all") {
      Promise.all(
        assets.map((a) =>
          fetch(`/api/assets/${a._id}/history`)
            .then((r) => r.json())
            .then((data) => (Array.isArray(data) ? data : []))
        )
      )
        .then((results) => {
          const all = results
            .flat()
            .sort(
              (a, b) =>
                new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
            );
          setHistory(all);
        })
        .finally(() => setLoading(false));
    } else {
      fetch(`/api/assets/${selectedAsset}/history`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setHistory(data);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedAsset, assets]);

  const getAssetName = (assetId: string) =>
    assets.find((a) => a._id === assetId)?.name ?? assetId.slice(-6);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Lịch sử thay đổi</h2>
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="all">Tất cả tài sản</option>
          {assets.map((a) => (
            <option key={a._id} value={a._id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <History className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>Chưa có lịch sử thay đổi.</p>
          <p className="text-sm mt-1">
            Sửa giá trị tài sản để tạo bản ghi đầu tiên.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {history.map((entry) => (
            <div
              key={entry._id}
              className="py-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Edit2 className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {getAssetName(entry.assetId)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatTime(entry.changedAt)}
                  </p>
                  {entry.note && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">
                      &quot;{entry.note}&quot;
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-800">
                  {entry.originalValue.toLocaleString()} {entry.currency}
                </p>
                <p className="text-xs text-gray-400">
                  ≈ {entry.valueInVND.toLocaleString()} VND
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
