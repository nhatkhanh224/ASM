"use client";

import React, { useState } from "react";
import AssetManagementApp from "@/components/AssestManagement";
import DebtManagement from "@/components/DebtManagement";
import GoalManagement from "@/components/GoalManagement";
import { Wallet, CreditCard, Target } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"asset" | "debt" | "goal">("asset");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/70 via-slate-50 to-blue-50/70 text-slate-800">
      {/* Global Top Navigation */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-center sm:justify-start overflow-x-auto no-scrollbar">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("asset")}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-200 ${
                activeTab === "asset"
                  ? "bg-indigo-600 text-white shadow-md scale-105"
                  : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span>Quản lý tài sản</span>
            </button>
            <button
              onClick={() => setActiveTab("debt")}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-200 ${
                activeTab === "debt"
                  ? "bg-rose-600 text-white shadow-md scale-105"
                  : "text-slate-600 hover:bg-slate-100 hover:text-rose-600"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Quản lý nợ</span>
            </button>
            <button
              onClick={() => setActiveTab("goal")}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all duration-200 ${
                activeTab === "goal"
                  ? "bg-emerald-600 text-white shadow-md scale-105"
                  : "text-slate-600 hover:bg-slate-100 hover:text-emerald-600"
              }`}
            >
              <Target className="w-5 h-5" />
              <span>Mục tiêu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "asset" && (
        <div className="-mt-0">
          <AssetManagementApp />
        </div>
      )}
      
      {activeTab === "debt" && (
        <div className="max-w-6xl mx-auto p-6 pt-8">
          <DebtManagement />
        </div>
      )}

      {activeTab === "goal" && (
        <div className="max-w-6xl mx-auto p-6 pt-8">
          <GoalManagement />
        </div>
      )}
    </div>
  );
}
