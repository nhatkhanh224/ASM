"use client";

import React, { useState } from "react";
import { TrendingUp, History } from "lucide-react";
import { Asset } from "@/types/asset";
import SnapshotChart from "@/components/SnapshotChart";
import AssetHistoryList from "@/components/AssetHistoryList";

interface HistoryViewProps {
  assets: Asset[];
}

export default function HistoryView({ assets }: HistoryViewProps) {
  const [subTab, setSubTab] = useState<"snapshot" | "changes">("snapshot");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => setSubTab("snapshot")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            subTab === "snapshot"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Snapshot tháng
        </button>
        <button
          onClick={() => setSubTab("changes")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            subTab === "changes"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <History className="w-4 h-4" />
          Thay đổi tài sản
        </button>
      </div>
      {subTab === "snapshot" && <SnapshotChart />}
      {subTab === "changes" && <AssetHistoryList assets={assets} />}
    </div>
  );
}
