"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Wallet,
  Plus,
  PieChart,
  History,
  BarChart2,
  Sparkles,
  Share2,
  DollarSign,
} from "lucide-react";
import { takeSnapshot } from "@/libs/snapshot";
import { Asset, ExchangeRates } from "@/types/asset";
import {
  DEFAULT_EXCHANGE_RATES,
  getErrorMessage,
  safeParseJson,
  fetchExchangeRatesFromAPI,
  fetchRatesWithRetry,
  applyRates,
} from "@/libs/assetHelpers";

// Components
import ShareCard from "@/components/ShareCard";
import PriceAlertBanner from "@/components/PriceAlertBanner";
import UserMenu from "@/components/UserMenu";
import SummaryCards from "@/components/SummaryCards";
import AssetForm from "@/components/AssetForm";
import AssetList from "@/components/AssetList";
import AssetChart from "@/components/AssetChart";
import HistoryView from "@/components/HistoryView";
import AnalysisView from "@/components/AnalysisView";
import ScenarioView from "@/components/ScenarioView";
import TransactionView from "@/components/TransactionView";

export default function AssetManagementApp() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(
    DEFAULT_EXCHANGE_RATES
  );
  const [ratesReady, setRatesReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [view, setView] = useState<
    "list" | "chart" | "history" | "analysis" | "scenario" | "transactions"
  >("list");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      });
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await fetch("/api/assets");
      if (!res.ok) return;
      const data = await safeParseJson(res);
      if (Array.isArray(data)) setAssets(data);
    } catch (e) {
      console.error("fetchAssets error:", e);
    }
  };

  const getExtraCoins = (currentAssets: Asset[]) => {
    const defaultCoins = new Set([
      "VND",
      "USD",
      "BTC",
      "ETH",
      "BNB",
      "SOL",
      "ASTER",
    ]);
    return [...new Set(currentAssets.map((a) => a.currency))].filter(
      (c) => !defaultCoins.has(c)
    );
  };

  // 1. Load assets + rates khi mount, dùng retry
  useEffect(() => {
    fetchAssets();
    fetchRatesWithRetry([]).then((rates) => {
      if (rates) {
        setExchangeRates(rates);
        setRatesReady(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Khi assets load xong, fetch rates kèm extra coins (retry)
  useEffect(() => {
    if (assets.length === 0) return;
    const extraCoins = getExtraCoins(assets);
    fetchRatesWithRetry(extraCoins).then((rates) => {
      if (rates) {
        setExchangeRates(rates);
        setRatesReady(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  // 3. Nếu rates vẫn là default sau khi assets đã có → retry thêm
  useEffect(() => {
    if (assets.length === 0) return;
    const isStillDefault = Object.keys(exchangeRates).length <= 5;
    if (!isStillDefault) return;
    const extraCoins = getExtraCoins(assets);
    fetchRatesWithRetry(extraCoins).then((rates) => {
      if (rates) {
        setExchangeRates(rates);
        setRatesReady(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  // 4. Auto refresh mỗi 10 phút (không cần retry)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchExchangeRatesFromAPI(getExtraCoins(assets)).then((rates) => {
        if (rates) setExchangeRates(rates);
      });
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  const assetsWithRate = applyRates(assets, exchangeRates);
  const totalVND = assetsWithRate.reduce(
    (sum, a) => sum + a.currentValueInVND,
    0
  );

  const refreshAndSnapshot = async (currentRates: ExchangeRates) => {
    const res = await fetch("/api/assets");
    const latest = await safeParseJson(res);
    if (Array.isArray(latest) && latest.length > 0)
      await takeSnapshot(latest, currentRates);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa tài sản này?")) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData?.error || "Delete failed");
      }
      await fetchAssets();
      await refreshAndSnapshot(exchangeRates);
      alert("Xóa tài sản thành công!");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowForm(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/70 via-slate-50 to-blue-50/70 text-slate-800">
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <PriceAlertBanner exchangeRates={exchangeRates} />

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-slate-200/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="w-8 h-8 text-indigo-600" />
                KVault
              </h1>
              <p className="text-gray-500 mt-1">
                Theo dõi và quản lý tài sản của bạn một cách hiệu quả
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowShareCard(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm cursor-pointer"
              >
                <Share2 className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">
                  Chia sẻ
                </span>
              </button>
              <button
                onClick={() => {
                  setEditingAsset(null);
                  setShowForm(!showForm);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Thêm tài sản</span>
                <span className="sm:hidden">Thêm</span>
              </button>
              {user && <UserMenu user={user} />}
            </div>
          </div>
          <SummaryCards
            assetsWithRate={assetsWithRate}
            ratesReady={ratesReady}
          />
        </div>

        {showForm && (
          <div ref={formRef} className="scroll-mt-6">
            <AssetForm
              exchangeRates={exchangeRates}
              onCreated={async () => {
                await fetchAssets();
                await refreshAndSnapshot(exchangeRates);
                setShowForm(false);
                setEditingAsset(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingAsset(null);
              }}
              editingAsset={editingAsset}
              onNewCurrency={(symbol) => {
                fetchRatesWithRetry([symbol]).then((r) => {
                  if (r) setExchangeRates((prev) => ({ ...prev, ...r }));
                });
              }}
            />
          </div>
        )}

        {/* View tabs */}
        <div className="flex justify-end p-1 bg-slate-100/70 backdrop-blur-sm rounded-xl border border-slate-200/50 gap-1 flex-wrap self-end max-w-fit ml-auto">
          {(
            [
              { key: "list", label: "Danh sách", icon: <Wallet className="w-4 h-4" /> },
              {
                key: "transactions",
                label: "Giao dịch",
                icon: <DollarSign className="w-4 h-4" />,
              },
              {
                key: "chart",
                label: "Biểu đồ",
                icon: <PieChart className="w-4 h-4" />,
              },
              {
                key: "history",
                label: "Lịch sử",
                icon: <History className="w-4 h-4" />,
              },
              {
                key: "analysis",
                label: "Phân tích",
                icon: <BarChart2 className="w-4 h-4" />,
              },
              {
                key: "scenario",
                label: "Kỳ vọng",
                icon: <Sparkles className="w-4 h-4" />,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-semibold cursor-pointer ${
                view === tab.key
                  ? "bg-white text-indigo-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/20 scale-[1.02]"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-white/40"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {view === "list" && (
          <AssetList
            assetsWithRate={assetsWithRate}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
        {view === "transactions" && (
          <TransactionView assets={assets} exchangeRates={exchangeRates} />
        )}
        {view === "chart" && <AssetChart assetsWithRate={assetsWithRate} />}
        {view === "history" && <HistoryView assets={assets} />}
        {view === "analysis" && (
          <AnalysisView
            assetsWithRate={assetsWithRate}
            exchangeRates={exchangeRates}
            totalVND={totalVND}
          />
        )}
        {view === "scenario" && (
          <ScenarioView assets={assets} exchangeRates={exchangeRates} />
        )}

        {showShareCard && (
          <ShareCard
            assetsWithRate={assetsWithRate}
            exchangeRates={exchangeRates}
            onClose={() => setShowShareCard(false)}
          />
        )}
      </div>
    </div>
  );
}