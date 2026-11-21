"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, TrendingUp, ArrowDownCircle,
  ArrowUpCircle, BarChart2, List, X,
  AlertCircle, CheckCircle, SlidersHorizontal, RotateCcw, Target,
  CalendarDays, Save, LineChart,
} from "lucide-react";
import { calculatePortfolioPnl } from "@/libs/portfolioCalculator";
import type { TransactionRecord } from "@/types/transaction";
import type { Debt } from "@/types/debt";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Asset {
  _id: string;
  name: string;
  currency: string;
  originalValue: number;
  value: number;
  type?: string;
  trackingMode?: "manual" | "transactions";
  monthlyDcaBudgetVND?: number;
  monthlyDcaBudgetAmount?: number;
  dcaBudgetCurrency?: "VND" | "USD";
  dcaDayOfMonth?: number;
}

export type Transaction = TransactionRecord & { transactedAt: string };

interface CostBasisRow {
  assetId: string;
  assetName: string;
  currency: string;
  totalQuantity: number;
  totalCostUSD: number;
  avgCostUSD: number;
  currentPriceUSD: number;
  currentValueUSD: number;
  unrealizedPnlUSD: number;
  unrealizedPnlPct: number;
  realizedPnlUSD: number;
}

interface TransactionViewProps {
  assets: Asset[];
  exchangeRates: Record<string, number>; // e.g. { BTC: 2_500_000_000, USD: 26200 }
  onTransactionsChanged?: () => void | Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TX_TYPE_CONFIG = {
  opening:  { label: "Số dư đầu", color: "bg-violet-100 text-violet-700", icon: CheckCircle, dotColor: "bg-violet-500" },
  buy:      { label: "Mua",   color: "bg-emerald-100 text-emerald-700", icon: ArrowDownCircle, dotColor: "bg-emerald-500" },
  sell:     { label: "Bán",   color: "bg-red-100 text-red-600",         icon: ArrowUpCircle,   dotColor: "bg-red-500" },
  deposit:  { label: "Nạp",   color: "bg-blue-100 text-blue-700",       icon: ArrowDownCircle, dotColor: "bg-blue-500" },
  withdraw: { label: "Rút",   color: "bg-orange-100 text-orange-700",   icon: ArrowUpCircle,   dotColor: "bg-orange-500" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(v: number) {
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} tr`;
  return v.toLocaleString("vi-VN");
}

function formatUSD(v: number, decimals = 2) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: decimals })}`;
}

function formatQty(v: number, currency: string) {
  const isVnd = currency === "VND";
  if (isVnd) return v.toLocaleString("vi-VN");
  return v.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Tính giá vốn trung bình gia quyền, tách riêng theo từng tài sản.
function calcCostBasis(
  transactions: Transaction[],
  exchangeRates: Record<string, number>
): CostBasisRow[] {
  const usdRate = exchangeRates["USD"] || 26200;
  return calculatePortfolioPnl(transactions, exchangeRates)
    .filter((row) => row.currency !== "VND" && row.totalQuantity > 0)
    .map((row) => ({
      assetId: row.assetId,
      assetName: row.assetName,
      currency: row.currency,
      totalQuantity: row.totalQuantity,
      totalCostUSD: row.totalCostVND / usdRate,
      avgCostUSD: row.avgCostVND / usdRate,
      currentPriceUSD: row.currentPriceVND / usdRate,
      currentValueUSD: row.currentValueVND / usdRate,
      unrealizedPnlUSD: row.unrealizedPnlVND / usdRate,
      unrealizedPnlPct: row.unrealizedPnlPct,
      realizedPnlUSD: row.realizedPnlVND / usdRate,
    }));
}

// ─── Quick DCA / Opening Balance ─────────────────────────────────────────────

function QuickDcaForm({ assets, exchangeRates, transactions, debts, onSaved, onCancel }: TransactionFormProps & { transactions: Transaction[]; debts: Debt[] }) {
  const cryptoAssets = assets.filter((asset) => asset.currency.toUpperCase() !== "VND" && !asset.type?.includes("property"));
  const [assetId, setAssetId] = useState(cryptoAssets[0]?._id ?? "");
  const [mode, setMode] = useState<"opening" | "buy">(
    transactions.some((tx) => tx.assetId === cryptoAssets[0]?._id && tx.type === "opening") ? "buy" : "opening",
  );
  const [amountVND, setAmountVND] = useState("");
  const [quantity, setQuantity] = useState("");
  const [transactedAt, setTransactedAt] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fundingSource, setFundingSource] = useState<"personal" | "debt">("personal");
  const [debtId, setDebtId] = useState("");
  const selectedAsset = cryptoAssets.find((asset) => asset._id === assetId);
  const amount = Number(amountVND) || 0;
  const qty = Number(quantity) || 0;
  const usdRate = exchangeRates.USD || 26200;
  const entryPriceVND = qty > 0 ? amount / qty : 0;
  const hasOpening = transactions.some((tx) => tx.assetId === assetId && tx.type === "opening");
  const availableDebts = debts.filter((debt) => debt.type === "borrowed" && debt.status === "active" && debt.purpose === "investment" && debt.linkedAssetId === assetId);

  const submit = async () => {
    setError("");
    if (!selectedAsset) return setError("Bạn chưa có tài sản crypto để theo dõi");
    if (amount <= 0 || qty <= 0) return setError("Số tiền và số lượng nhận được phải lớn hơn 0");
    if (mode === "buy" && fundingSource === "debt" && !debtId) return setError("Chọn khoản vay dùng cho lần mua này");
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          type: mode,
          currency: selectedAsset.currency,
          quantity: qty,
          pricePerUnit: entryPriceVND / usdRate,
          totalValueVND: amount,
          note: mode === "opening" ? "Số dư DCA ban đầu" : "DCA nhanh",
          transactedAt: new Date(transactedAt).toISOString(),
          enableTracking: true,
          fundingSource: mode === "buy" ? fundingSource : "personal",
          debtId: mode === "buy" && fundingSource === "debt" ? debtId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu giao dịch");
      onSaved();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Không thể lưu giao dịch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-800">Theo dõi DCA nhanh</h3>
          <p className="text-xs text-gray-500 mt-1">Mỗi lần mua chỉ cần nhập số tiền đã chi và lượng coin thực nhận.</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>
      {cryptoAssets.length === 0 ? (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700">Hãy thêm tài sản BTC hoặc crypto trước.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tài sản</label>
              <select value={assetId} onChange={(e) => { setAssetId(e.target.value); setMode(transactions.some((tx) => tx.assetId === e.target.value && tx.type === "opening") ? "buy" : "opening"); setFundingSource("personal"); setDebtId(""); }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                {cryptoAssets.map((asset) => <option key={asset._id} value={asset._id}>{asset.name} ({asset.currency})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Loại cập nhật</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode("buy")} className={`py-2.5 rounded-lg text-xs font-semibold ${mode === "buy" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>Lần mua DCA</button>
                <button disabled={hasOpening} onClick={() => setMode("opening")} className={`py-2.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${mode === "opening" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600"}`}>Số dư ban đầu</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{mode === "opening" ? "Tổng vốn đã bỏ (VND)" : "Số tiền đã chi (VND)"}</label>
              <input type="number" min="0" step="any" value={amountVND} onChange={(e) => setAmountVND(e.target.value)} placeholder="Ví dụ: 5.000.000" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{mode === "opening" ? `Tổng ${selectedAsset?.currency ?? "coin"} đang có` : `${selectedAsset?.currency ?? "Coin"} thực nhận`}</label>
              <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Ví dụ: 0.00125" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Thời gian</label>
              <input type="datetime-local" value={transactedAt} onChange={(e) => setTransactedAt(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            {mode === "buy" && <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nguồn tiền</label>
              <select value={fundingSource} onChange={(e) => { setFundingSource(e.target.value as "personal" | "debt"); setDebtId(""); }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
                <option value="personal">Tiền cá nhân</option>
                <option value="debt" disabled={availableDebts.length === 0}>Tiền vay {availableDebts.length === 0 ? "(chưa có khoản phù hợp)" : ""}</option>
              </select>
            </div>}
            {mode === "buy" && fundingSource === "debt" && <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Khoản vay đầu tư</label>
              <select value={debtId} onChange={(e) => setDebtId(e.target.value)} className="w-full px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-lg text-sm">
                <option value="">Chọn khoản vay</option>
                {availableDebts.map((debt) => <option key={debt._id} value={debt._id}>{debt.name} · {debt.amount.toLocaleString()} {debt.currency}</option>)}
              </select>
            </div>}
            {entryPriceVND > 0 && <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p className="text-xs text-emerald-700">Giá mua quy đổi</p><p className="font-bold text-emerald-800">{formatVND(entryPriceVND)} VND/{selectedAsset?.currency}</p><p className="text-xs text-emerald-600">≈ {formatUSD(entryPriceVND / usdRate)}</p></div>}
          </div>
          {mode === "opening" && <p className="text-xs text-violet-600 mt-3">Chỉ khai báo một lần để làm mốc tính giá vốn. Số lượng tài sản sẽ được đồng bộ theo giao dịch từ đây.</p>}
          {error && <div className="mt-3 flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div className="flex gap-3 mt-4"><button onClick={submit} disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{submitting ? "Đang lưu..." : mode === "opening" ? "Lưu số dư ban đầu" : "Ghi nhận DCA"}</button><button onClick={onCancel} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm">Hủy</button></div>
        </>
      )}
    </div>
  );
}

// ─── TransactionForm ──────────────────────────────────────────────────────────

interface TransactionFormProps {
  assets: Asset[];
  exchangeRates: Record<string, number>;
  onSaved: () => void;
  onCancel: () => void;
}

function TransactionForm({ assets, exchangeRates, onSaved, onCancel }: TransactionFormProps) {
  const usdRate = exchangeRates["USD"] || 26200;
  const initialCurrency = assets[0]?.currency?.toUpperCase();
  const initialPrice = initialCurrency ? (exchangeRates[initialCurrency] || 0) / usdRate : 0;

  const [form, setForm] = useState({
    assetId: assets[0]?._id ?? "",
    type: "buy" as Transaction["type"],
    quantity: "",
    pricePerUnit: initialPrice > 0 ? initialPrice.toFixed(6) : "",    // USD
    note: "",
    transactedAt: new Date().toISOString().slice(0, 16),
  });
  const [buyInputMode, setBuyInputMode] = useState<"quantity" | "usdt">("quantity");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedAsset = assets.find((a) => a._id === form.assetId);
  const currency = selectedAsset?.currency?.toUpperCase() ?? "VND";
  const isVND = currency === "VND";

  const enteredQuantity = parseFloat(form.quantity) || 0;
  const price = parseFloat(form.pricePerUnit) || 0;
  const canEnterUsdt = !isVND && form.type === "buy";
  const qty = canEnterUsdt && buyInputMode === "usdt"
    ? (price > 0 ? enteredQuantity / price : 0)
    : enteredQuantity;
  const totalVND = isVND ? qty : (canEnterUsdt && buyInputMode === "usdt" ? enteredQuantity : qty * price) * usdRate;

  const submit = async () => {
    setError("");
    if (!form.assetId) return setError("Chọn tài sản");
    if (enteredQuantity <= 0) return setError(buyInputMode === "usdt" && canEnterUsdt ? "Số USDT phải > 0" : "Số lượng phải > 0");
    if (!isVND && price <= 0) return setError("Nhập giá tại thời điểm giao dịch");

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: form.assetId,
          assetName: selectedAsset?.name ?? "",
          type: form.type,
          currency,
          quantity: qty,
          pricePerUnit: isVND ? 1 / usdRate : price, // VND: 1 VND = 1/usdRate USD
          totalValueVND: totalVND,
          note: form.note,
          transactedAt: new Date(form.transactedAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi tạo giao dịch");
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể lưu giao dịch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Thêm giao dịch mới</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Asset */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tài sản *</label>
          <select
            value={form.assetId}
            onChange={(e) => {
              const nextAsset = assets.find((asset) => asset._id === e.target.value);
              const rateVND = nextAsset ? exchangeRates[nextAsset.currency.toUpperCase()] || 0 : 0;
              const priceUSD = rateVND > 0 ? rateVND / usdRate : 0;
              setForm({ ...form, assetId: e.target.value, pricePerUnit: priceUSD > 0 ? priceUSD.toFixed(6) : "" });
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {assets.map((a) => (
              <option key={a._id} value={a._id}>{a.name} ({a.currency})</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Loại giao dịch *</label>
          <div className="grid grid-cols-4 gap-1">
            {(["buy", "sell", "deposit", "withdraw"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setForm({ ...form, type: t }); if (t !== "buy") setBuyInputMode("quantity"); }}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  form.type === t
                    ? TX_TYPE_CONFIG[t].color + " ring-2 ring-offset-1 ring-current"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {TX_TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity / USDT input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-600">
              {canEnterUsdt && buyInputMode === "usdt" ? "Số tiền mua (USDT) *" : `Số lượng (${currency}) *`}
            </label>
            {canEnterUsdt && (
              <div className="flex rounded-lg bg-gray-100 p-0.5 text-[11px]">
                <button type="button" onClick={() => setBuyInputMode("quantity")} className={`px-2 py-1 rounded-md ${buyInputMode === "quantity" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>Coin</button>
                <button type="button" onClick={() => setBuyInputMode("usdt")} className={`px-2 py-1 rounded-md ${buyInputMode === "usdt" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"}`}>USDT</button>
              </div>
            )}
          </div>
          <input
            type="number"
            step="any"
            placeholder={buyInputMode === "usdt" && canEnterUsdt ? "0 USDT" : "0"}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Price per unit (chỉ hiện với non-VND) */}
        {!isVND && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Giá lúc giao dịch (USD/{currency}) *
            </label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={form.pricePerUnit}
              onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Thời gian *</label>
          <input
            type="datetime-local"
            value={form.transactedAt}
            onChange={(e) => setForm({ ...form, transactedAt: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {canEnterUsdt && buyInputMode === "usdt" && enteredQuantity > 0 && price > 0 && (
          <div className="sm:col-span-2 -mt-2 text-xs text-gray-500">
            Dự kiến nhận: <span className="font-semibold text-gray-700">{formatQty(qty, currency)} {currency}</span>
          </div>
        )}

        {/* Note */}
        <div className={!isVND ? "" : "sm:col-span-2"}>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
          <input
            type="text"
            placeholder="VD: Mua BTC lúc thị trường xuống..."
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Total preview */}
      {qty > 0 && (
        <div className="mt-4 px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
          <span className="text-sm text-indigo-700">Tổng giá trị giao dịch</span>
          <span className="font-bold text-indigo-800">≈ {formatVND(totalVND)} VND</span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
        >
          {submitting ? "Đang lưu..." : "Lưu giao dịch"}
        </button>
        <button onClick={onCancel} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-all">
          Hủy
        </button>
      </div>
    </div>
  );
}

// ─── TransactionList ──────────────────────────────────────────────────────────

function TransactionList({
  transactions,
  onDelete,
  loading,
}: {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  loading: boolean;
}) {
  const [filterAsset, setFilterAsset] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const assetNames = Array.from(new Set(transactions.map((t) => t.assetName)));

  const filtered = transactions.filter((t) => {
    if (filterAsset !== "all" && t.assetName !== filterAsset) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    return true;
  });

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterAsset}
          onChange={(e) => setFilterAsset(e.target.value)}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg outline-none bg-white"
        >
          <option value="all">Tất cả tài sản</option>
          {assetNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg outline-none bg-white"
        >
          <option value="all">Tất cả loại</option>
          {(["opening", "buy", "sell", "deposit", "withdraw"] as const).map((t) => (
            <option key={t} value={t}>{TX_TYPE_CONFIG[t].label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 self-center ml-1">{filtered.length} giao dịch</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <List className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Chưa có giao dịch nào.</p>
          <p className="text-xs mt-1">Nhấn &quot;+ Thêm giao dịch&quot; để bắt đầu ghi lại lịch sử.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.map((tx) => {
            const cfg = TX_TYPE_CONFIG[tx.type];
            const Icon = cfg.icon;
            const isOut = tx.type === "sell" || tx.type === "withdraw";
            return (
              <div key={tx._id} className="px-5 py-4 flex items-center gap-4 group hover:bg-gray-50 transition-colors">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 truncate">{tx.assetName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(tx.transactedAt)}
                    {tx.note && <span className="ml-2 italic">&quot;{tx.note}&quot;</span>}
                    {tx.fundingSource === "debt" && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">Vốn vay</span>}
                  </p>
                </div>

                {/* Amounts */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${isOut ? "text-red-600" : "text-emerald-600"}`}>
                    {isOut ? "-" : "+"}{formatQty(tx.quantity, tx.currency)} {tx.currency}
                  </p>
                  {tx.pricePerUnit > 0 && tx.currency !== "VND" && (
                    <p className="text-xs text-gray-400">@ {formatUSD(tx.pricePerUnit, 4)}</p>
                  )}
                  <p className="text-xs text-gray-400">≈ {formatVND(tx.totalValueVND)} VND</p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => onDelete(tx._id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Monthly DCA plan ───────────────────────────────────────────────────────

function MonthlyDcaPlan({
  rows,
  assets,
  transactions,
  usdRate,
  onPlanSaved,
}: {
  rows: CostBasisRow[];
  assets: Asset[];
  transactions: Transaction[];
  usdRate: number;
  onPlanSaved?: () => void | Promise<void>;
}) {
  const firstAsset = assets.find((asset) => asset._id === rows[0]?.assetId);
  const firstCurrency = firstAsset?.dcaBudgetCurrency ?? "VND";
  const firstBudget = firstAsset?.monthlyDcaBudgetAmount
    ?? (firstCurrency === "USD" ? (firstAsset?.monthlyDcaBudgetVND || 0) / usdRate : firstAsset?.monthlyDcaBudgetVND || 0);
  const [selectedAssetId, setSelectedAssetId] = useState(rows[0]?.assetId ?? "");
  const [budgetCurrency, setBudgetCurrency] = useState<"VND" | "USD">(firstCurrency);
  const [budgetInput, setBudgetInput] = useState(String(firstBudget || ""));
  const [dayInput, setDayInput] = useState(String(firstAsset?.dcaDayOfMonth || 1));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const row = rows.find((item) => item.assetId === selectedAssetId) ?? rows[0];
  const asset = assets.find((item) => item._id === row?.assetId);

  if (!row || !asset) return null;

  const now = new Date();
  const monthlyTransactions = transactions.filter((tx) => {
    const date = new Date(tx.transactedAt);
    return tx.assetId === row.assetId && tx.type === "buy"
      && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const spentVND = monthlyTransactions.reduce((sum, tx) => sum + tx.totalValueVND, 0);
  const boughtQuantity = monthlyTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
  const budgetAmount = Number(budgetInput) || 0;
  const budgetVND = budgetCurrency === "USD" ? budgetAmount * usdRate : budgetAmount;
  const remainingVND = Math.max(0, budgetVND - spentVND);
  const progress = budgetVND > 0 ? (spentVND / budgetVND) * 100 : 0;
  const currentPriceVND = row.currentPriceUSD * usdRate;
  const estimatedMore = currentPriceVND > 0 ? remainingVND / currentPriceVND : 0;
  const displayMoney = (valueVND: number) => budgetCurrency === "USD"
    ? formatUSD(valueVND / usdRate)
    : `${formatVND(valueVND)} VND`;
  const day = Math.min(28, Math.max(1, Number(dayInput) || 1));
  const nextDcaDate = new Date(now.getFullYear(), now.getMonth(), day);
  if (nextDcaDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    nextDcaDate.setMonth(nextDcaDate.getMonth() + 1);
  }

  const chooseAsset = (assetId: string) => {
    const nextAsset = assets.find((item) => item._id === assetId);
    const nextCurrency = nextAsset?.dcaBudgetCurrency ?? "VND";
    const nextBudget = nextAsset?.monthlyDcaBudgetAmount
      ?? (nextCurrency === "USD" ? (nextAsset?.monthlyDcaBudgetVND || 0) / usdRate : nextAsset?.monthlyDcaBudgetVND || 0);
    setSelectedAssetId(assetId);
    setBudgetCurrency(nextCurrency);
    setBudgetInput(String(nextBudget || ""));
    setDayInput(String(nextAsset?.dcaDayOfMonth || 1));
    setMessage("");
  };

  const changeBudgetCurrency = (currency: "VND" | "USD") => {
    if (currency === budgetCurrency) return;
    const currentAmount = Number(budgetInput) || 0;
    setBudgetInput(String(currency === "USD" ? Number((currentAmount / usdRate).toFixed(2)) : Math.round(currentAmount * usdRate)));
    setBudgetCurrency(currency);
  };

  const save = async () => {
    setMessage("");
    if (budgetAmount <= 0) return setMessage("Nhập ngân sách DCA lớn hơn 0");
    setSaving(true);
    try {
      const response = await fetch(`/api/assets/${row.assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyDcaBudgetVND: budgetVND,
          monthlyDcaBudgetAmount: budgetAmount,
          dcaBudgetCurrency: budgetCurrency,
          dcaDayOfMonth: day,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu kế hoạch");
      setMessage("Đã lưu kế hoạch DCA tháng");
      await onPlanSaved?.();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu kế hoạch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-emerald-50 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-emerald-600" />Kế hoạch DCA tháng</h3>
          <p className="text-xs text-gray-400 mt-1">Theo dõi ngân sách và tổng các lệnh mua trong tháng hiện tại.</p>
        </div>
        {rows.length > 1 && <select value={row.assetId} onChange={(event) => chooseAsset(event.target.value)} className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white">{rows.map((item) => <option key={item.assetId} value={item.assetId}>{item.assetName} ({item.currency})</option>)}</select>}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-5">
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-xs font-medium text-gray-600">Ngân sách mỗi tháng</label>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(["VND", "USD"] as const).map((currency) => <button key={currency} type="button" onClick={() => changeBudgetCurrency(currency)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${budgetCurrency === currency ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"}`}>{currency}</button>)}
              </div>
            </div>
            <input type="number" min="0" step={budgetCurrency === "USD" ? "10" : "100000"} value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} placeholder={budgetCurrency === "USD" ? "Ví dụ: 200" : "Ví dụ: 5.000.000"} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            {budgetAmount > 0 && <p className="text-[11px] text-gray-400 mt-1">≈ {budgetCurrency === "USD" ? `${formatVND(budgetVND)} VND` : formatUSD(budgetVND / usdRate)}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ngày dự kiến DCA hằng tháng</label>
            <input type="number" min="1" max="28" value={dayInput} onChange={(event) => setDayInput(event.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <button onClick={save} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? "Đang lưu..." : "Lưu kế hoạch"}</button>
          {message && <p className={`text-xs ${message.startsWith("Đã") ? "text-emerald-600" : "text-red-600"}`}>{message}</p>}
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
          <div className="flex justify-between items-start gap-3">
            <div><p className="text-xs text-gray-500">Tiến độ tháng {now.getMonth() + 1}/{now.getFullYear()}</p><p className="text-xl font-bold text-gray-800 mt-1">{displayMoney(spentVND)} / {budgetVND > 0 ? displayMoney(budgetVND) : "Chưa đặt"}</p></div>
            <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${progress >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-4"><div className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${Math.min(100, progress)}%` }} /></div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white rounded-xl p-3 border border-gray-100"><p className="text-[11px] text-gray-400">Đã mua tháng này</p><p className="text-sm font-bold text-gray-700 mt-1">{formatQty(boughtQuantity, row.currency)} {row.currency}</p><p className="text-[11px] text-gray-400">{monthlyTransactions.length} giao dịch</p></div>
            <div className="bg-white rounded-xl p-3 border border-gray-100"><p className="text-[11px] text-gray-400">Ngân sách còn lại</p><p className="text-sm font-bold text-gray-700 mt-1">{displayMoney(remainingVND)}</p><p className="text-[11px] text-gray-400">≈ {formatQty(estimatedMore, row.currency)} {row.currency}</p></div>
          </div>
          <p className="text-xs text-gray-500 mt-4 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Lần DCA kế tiếp dự kiến: <strong>{nextDcaDate.toLocaleDateString("vi-VN")}</strong></p>
          {progress > 100 && <p className="text-xs text-amber-600 mt-2">Bạn đã vượt ngân sách {displayMoney(spentVND - budgetVND)} trong tháng này.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Cost basis history chart ───────────────────────────────────────────────

function CostBasisChart({ rows, transactions, usdRate }: { rows: CostBasisRow[]; transactions: Transaction[]; usdRate: number }) {
  const [selectedAssetId, setSelectedAssetId] = useState(rows[0]?.assetId ?? "");
  const row = rows.find((item) => item.assetId === selectedAssetId) ?? rows[0];
  if (!row) return null;

  let quantity = 0;
  let costUSD = 0;
  const history: Array<{ date: Date; average: number; buyPrice: number }> = [];
  const sorted = transactions.filter((tx) => tx.assetId === row.assetId).sort((a, b) => new Date(a.transactedAt).getTime() - new Date(b.transactedAt).getTime());
  for (const tx of sorted) {
    const fallbackPrice = tx.quantity > 0 ? (tx.totalValueVND / usdRate) / tx.quantity : 0;
    const transactionPrice = tx.pricePerUnit > 0 ? tx.pricePerUnit : fallbackPrice;
    if (tx.type === "opening" || tx.type === "buy") {
      quantity += tx.quantity;
      costUSD += tx.quantity * transactionPrice;
      history.push({ date: new Date(tx.transactedAt), average: quantity > 0 ? costUSD / quantity : 0, buyPrice: transactionPrice });
    } else if (tx.type === "sell") {
      const sold = Math.min(quantity, tx.quantity);
      const average = quantity > 0 ? costUSD / quantity : 0;
      quantity -= sold;
      costUSD -= sold * average;
    }
  }

  if (history.length === 0) return null;
  const points = [...history, { date: new Date(), average: history.at(-1)?.average ?? 0, buyPrice: 0 }];
  const allValues = [...history.flatMap((point) => [point.average, point.buyPrice]), row.currentPriceUSD].filter((value) => value > 0);
  const minValue = Math.min(...allValues) * 0.85;
  const maxValue = Math.max(...allValues) * 1.15;
  const width = 800;
  const height = 280;
  const padX = 62;
  const padTop = 24;
  const padBottom = 42;
  const plotWidth = width - padX - 24;
  const plotHeight = height - padTop - padBottom;
  const x = (index: number) => padX + (index / Math.max(1, points.length - 1)) * plotWidth;
  const y = (value: number) => padTop + ((maxValue - value) / Math.max(1, maxValue - minValue)) * plotHeight;
  const line = points.map((point, index) => `${x(index)},${y(point.average)}`).join(" ");
  const currentY = y(row.currentPriceUSD);

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-blue-50 flex items-center justify-between gap-3 flex-wrap">
        <div><h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2"><LineChart className="w-4 h-4 text-blue-600" />Biểu đồ giá vốn</h3><p className="text-xs text-gray-400 mt-1">Đường giá vốn trung bình thay đổi sau mỗi lần mua.</p></div>
        {rows.length > 1 && <select value={row.assetId} onChange={(event) => setSelectedAssetId(event.target.value)} className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white">{rows.map((item) => <option key={item.assetId} value={item.assetId}>{item.assetName} ({item.currency})</option>)}</select>}
      </div>
      <div className="p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[650px] h-auto" role="img" aria-label="Biểu đồ lịch sử giá vốn">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = maxValue - (maxValue - minValue) * ratio;
            const lineY = padTop + plotHeight * ratio;
            return <g key={ratio}><line x1={padX} x2={width - 24} y1={lineY} y2={lineY} stroke="#e5e7eb" strokeDasharray="4 4" /><text x={padX - 8} y={lineY + 4} textAnchor="end" fontSize="11" fill="#9ca3af">{formatUSD(value, 0)}</text></g>;
          })}
          <line x1={padX} x2={width - 24} y1={currentY} y2={currentY} stroke="#10b981" strokeWidth="2" strokeDasharray="7 5" />
          <text x={width - 24} y={currentY - 7} textAnchor="end" fontSize="11" fontWeight="600" fill="#059669">Hiện tại {formatUSD(row.currentPriceUSD, 0)}</text>
          <polyline points={line} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {history.map((point, index) => <g key={`${point.date.toISOString()}-${index}`}><line x1={x(index)} x2={x(index)} y1={y(point.average)} y2={y(point.buyPrice)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" /><circle cx={x(index)} cy={y(point.buyPrice)} r="5" fill="#f59e0b" stroke="white" strokeWidth="2"><title>{point.date.toLocaleDateString("vi-VN")}: mua {formatUSD(point.buyPrice, 2)}, giá vốn còn {formatUSD(point.average, 2)}</title></circle><circle cx={x(index)} cy={y(point.average)} r="4" fill="#4f46e5" stroke="white" strokeWidth="2" /></g>)}
          <text x={padX} y={height - 12} fontSize="11" fill="#9ca3af">{points[0].date.toLocaleDateString("vi-VN")}</text>
          <text x={width - 24} y={height - 12} textAnchor="end" fontSize="11" fill="#9ca3af">Hiện tại</text>
        </svg>
        <div className="flex items-center justify-center gap-5 text-xs text-gray-500 pb-2 flex-wrap"><span className="flex items-center gap-1.5"><span className="w-5 h-1 rounded bg-indigo-600" />Giá vốn trung bình</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Giá từng lần mua</span><span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-emerald-500" />Giá hiện tại</span></div>
      </div>
    </div>
  );
}

// ─── Price scenario simulator ────────────────────────────────────────────────

function PriceScenarioSimulator({ rows, usdRate }: { rows: CostBasisRow[]; usdRate: number }) {
  const [selectedAssetId, setSelectedAssetId] = useState(rows[0]?.assetId ?? "");
  const [priceRatio, setPriceRatio] = useState(100);
  const row = rows.find((item) => item.assetId === selectedAssetId) ?? rows[0];

  if (!row) return null;

  const scenarioPriceUSD = row.currentPriceUSD * (priceRatio / 100);
  const scenarioValueUSD = row.totalQuantity * scenarioPriceUSD;
  const scenarioPnlUSD = scenarioValueUSD - row.totalCostUSD;
  const scenarioPnlPct = row.totalCostUSD > 0 ? (scenarioPnlUSD / row.totalCostUSD) * 100 : 0;
  const changeFromNowUSD = scenarioValueUSD - row.currentValueUSD;
  const breakEvenRatio = row.currentPriceUSD > 0 ? (row.avgCostUSD / row.currentPriceUSD) * 100 : 100;
  const sliderMin = Math.min(25, Math.floor(breakEvenRatio / 10) * 10);
  const sliderMax = Math.max(250, Math.ceil(breakEvenRatio / 10) * 10 + 20);
  const positive = scenarioPnlUSD >= 0;

  const setPriceFromInput = (value: string) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0 || row.currentPriceUSD <= 0) return;
    setPriceRatio((price / row.currentPriceUSD) * 100);
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-indigo-50 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            Mô phỏng giá và lãi/lỗ
          </h3>
          <p className="text-xs text-gray-400 mt-1">Kéo giá hoặc nhập mức giá bạn kỳ vọng.</p>
        </div>
        {rows.length > 1 && (
          <select
            value={row.assetId}
            onChange={(event) => { setSelectedAssetId(event.target.value); setPriceRatio(100); }}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white"
          >
            {rows.map((item) => <option key={item.assetId} value={item.assetId}>{item.assetName} ({item.currency})</option>)}
          </select>
        )}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <div>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Giá {row.currency} giả định</p>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-semibold">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={Math.round(scenarioPriceUSD)}
                  onChange={(event) => setPriceFromInput(event.target.value)}
                  className="w-44 text-2xl font-bold text-gray-800 border-b-2 border-indigo-200 focus:border-indigo-500 outline-none bg-transparent"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">≈ {formatVND(scenarioPriceUSD * usdRate)} VND/{row.currency}</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${priceRatio >= 100 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {priceRatio >= 100 ? "+" : ""}{(priceRatio - 100).toFixed(1)}% so với hiện tại
            </span>
          </div>

          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step="0.25"
            value={Math.min(sliderMax, Math.max(sliderMin, priceRatio))}
            onChange={(event) => setPriceRatio(Number(event.target.value))}
            className="w-full h-2 rounded-lg cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] text-gray-400 mt-1">
            <span>{formatUSD(row.currentPriceUSD * sliderMin / 100, 0)}</span>
            <span>Hiện tại: {formatUSD(row.currentPriceUSD, 0)}</span>
            <span>{formatUSD(row.currentPriceUSD * sliderMax / 100, 0)}</span>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => setPriceRatio(100)} className="text-xs px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Giá hiện tại
            </button>
            <button onClick={() => setPriceRatio(breakEvenRatio)} className="text-xs px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Hòa vốn: {formatUSD(row.avgCostUSD, 0)}
            </button>
            {[80, 120, 150, 200].map((ratio) => (
              <button key={ratio} onClick={() => setPriceRatio(ratio)} className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300">
                {ratio}% giá hiện tại
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${positive ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <p className="text-xs text-gray-500">Nếu {row.currency} ở mức giá này, bạn sẽ</p>
          <p className={`text-2xl font-bold mt-1 ${positive ? "text-emerald-700" : "text-red-600"}`}>
            {positive ? "Lãi " : "Lỗ "}{formatUSD(Math.abs(scenarioPnlUSD))}
          </p>
          <p className={`text-sm font-semibold mt-1 ${positive ? "text-emerald-600" : "text-red-500"}`}>
            {positive ? "+" : "-"}{formatVND(Math.abs(scenarioPnlUSD * usdRate))} VND ({scenarioPnlPct >= 0 ? "+" : ""}{scenarioPnlPct.toFixed(1)}%)
          </p>
          <div className="border-t border-black/5 mt-4 pt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-3"><span className="text-gray-500">Giá trị tài sản</span><span className="font-semibold text-gray-700">{formatUSD(scenarioValueUSD)} · {formatVND(scenarioValueUSD * usdRate)} VND</span></div>
            <div className="flex justify-between gap-3"><span className="text-gray-500">So với hiện tại</span><span className={`font-semibold ${changeFromNowUSD >= 0 ? "text-emerald-700" : "text-red-600"}`}>{changeFromNowUSD >= 0 ? "+" : ""}{formatUSD(changeFromNowUSD)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-gray-500">Số lượng đang giữ</span><span className="font-semibold text-gray-700">{formatQty(row.totalQuantity, row.currency)} {row.currency}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PnLView ──────────────────────────────────────────────────────────────────

function PnLView({
  transactions,
  exchangeRates,
  loading,
  assets,
  onPlanSaved,
}: {
  transactions: Transaction[];
  exchangeRates: Record<string, number>;
  loading: boolean;
  assets: Asset[];
  onPlanSaved?: () => void | Promise<void>;
}) {
  const usdRate = exchangeRates["USD"] || 26200;
  const rows = calcCostBasis(transactions, exchangeRates);

  const totalUnrealized = rows.reduce((s, r) => s + r.unrealizedPnlUSD, 0);
  const totalRealized = rows.reduce((s, r) => s + r.realizedPnlUSD, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCostUSD, 0);
  const totalCurrentValue = rows.reduce((s, r) => s + r.currentValueUSD, 0);

  if (loading) return <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />;

  if (rows.length === 0) return (
    <div className="text-center py-16 text-gray-400">
      <BarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
      <p className="text-sm">Chưa có dữ liệu P&L.</p>
      <p className="text-xs mt-1">Thêm giao dịch &quot;Mua&quot; để tính giá vốn trung bình.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Tổng vốn đã bỏ</p>
          <p className="text-base font-bold text-gray-800">{formatUSD(totalCost)}</p>
          <p className="text-xs text-gray-400 mt-0.5">≈ {formatVND(totalCost * usdRate)} VND</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Giá trị hiện tại</p>
          <p className="text-base font-bold text-gray-800">{formatUSD(totalCurrentValue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">≈ {formatVND(totalCurrentValue * usdRate)} VND</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${totalUnrealized >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <p className="text-xs text-gray-500 mb-1">Lãi/Lỗ chưa chốt</p>
          <p className={`text-base font-bold ${totalUnrealized >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {totalUnrealized >= 0 ? "+" : ""}{formatUSD(totalUnrealized)}
          </p>
          <p className={`text-xs mt-0.5 ${totalUnrealized >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {totalCost > 0 ? `${totalUnrealized >= 0 ? "+" : ""}${((totalUnrealized / totalCost) * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${totalRealized >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
          <p className="text-xs text-gray-500 mb-1">Lãi/Lỗ đã chốt</p>
          <p className={`text-base font-bold ${totalRealized >= 0 ? "text-blue-700" : "text-orange-600"}`}>
            {totalRealized >= 0 ? "+" : ""}{formatUSD(totalRealized)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">từ các lệnh Bán</p>
        </div>
      </div>

      <MonthlyDcaPlan rows={rows} assets={assets} transactions={transactions} usdRate={usdRate} onPlanSaved={onPlanSaved} />

      <PriceScenarioSimulator rows={rows} usdRate={usdRate} />

      <CostBasisChart rows={rows} transactions={transactions} usdRate={usdRate} />

      {/* Cost basis table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm">Giá vốn trung bình theo coin</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="text-left px-5 py-3 font-medium">Coin</th>
                <th className="text-right px-4 py-3 font-medium">Số lượng</th>
                <th className="text-right px-4 py-3 font-medium">Giá vốn TB</th>
                <th className="text-right px-4 py-3 font-medium">Giá hiện tại</th>
                <th className="text-right px-4 py-3 font-medium">Giá trị hiện tại</th>
                <th className="text-right px-5 py-3 font-medium">Lãi/Lỗ chưa chốt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.assetId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-700 font-bold text-xs">{row.currency.slice(0, 3)}</span>
                      </div>
                      <div><span className="font-semibold text-gray-800">{row.currency}</span><p className="text-xs text-gray-400">{row.assetName}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-gray-700">
                    {row.totalQuantity.toLocaleString("en-US", { maximumFractionDigits: 8 })}
                  </td>
                  <td className="px-4 py-4 text-right text-gray-700">{formatUSD(row.avgCostUSD, 4)}</td>
                  <td className="px-4 py-4 text-right">
                    <span className={row.currentPriceUSD >= row.avgCostUSD ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                      {formatUSD(row.currentPriceUSD, 4)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-gray-700">{formatUSD(row.currentValueUSD)}</td>
                  <td className="px-5 py-4 text-right">
                    <div>
                      <p className={`font-semibold ${row.unrealizedPnlUSD >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {row.unrealizedPnlUSD >= 0 ? "+" : ""}{formatUSD(row.unrealizedPnlUSD)}
                      </p>
                      <p className={`text-xs ${row.unrealizedPnlPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {row.unrealizedPnlPct >= 0 ? "+" : ""}{row.unrealizedPnlPct.toFixed(1)}%
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        * Giá vốn được tính theo phương pháp trung bình gia quyền từ số dư ban đầu và các lần mua DCA.
      </p>
    </div>
  );
}

// ─── Main TransactionView ─────────────────────────────────────────────────────

export default function TransactionView({ assets, exchangeRates, onTransactionsChanged }: TransactionViewProps) {
  const [subTab, setSubTab] = useState<"log" | "pnl">("log");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showQuickDca, setShowQuickDca] = useState(false);
  const [investmentDebts, setInvestmentDebts] = useState<Debt[]>([]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const [res, debtResponse] = await Promise.all([fetch("/api/transactions"), fetch("/api/debts")]);
      const data = await res.json();
      if (Array.isArray(data)) setTransactions(data);
      if (debtResponse.ok) {
        const debtData = await debtResponse.json();
        if (Array.isArray(debtData)) setInvestmentDebts(debtData);
      }
    } catch (e) {
      console.error("fetchTransactions error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa giao dịch này?")) return;
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      await fetchTransactions();
      await onTransactionsChanged?.();
    } catch (e) {
      console.error("delete error:", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
          <button
            onClick={() => setSubTab("log")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${subTab === "log" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <List className="w-4 h-4" />Lịch sử
          </button>
          <button
            onClick={() => setSubTab("pnl")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${subTab === "pnl" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <BarChart2 className="w-4 h-4" />P&L / Giá vốn
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => { setShowQuickDca(!showQuickDca); setShowForm(false); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md"><TrendingUp className="w-4 h-4" />DCA nhanh</button>
          <button onClick={() => { setShowForm(!showForm); setShowQuickDca(false); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md"><Plus className="w-4 h-4" />Thêm giao dịch</button>
        </div>
      </div>

      {/* Form */}
      {showQuickDca && (
        <QuickDcaForm
          assets={assets}
          exchangeRates={exchangeRates}
          transactions={transactions}
          debts={investmentDebts}
          onSaved={async () => { setShowQuickDca(false); await fetchTransactions(); await onTransactionsChanged?.(); }}
          onCancel={() => setShowQuickDca(false)}
        />
      )}
      {showForm && (
        <TransactionForm
          assets={assets}
          exchangeRates={exchangeRates}
          onSaved={async () => { setShowForm(false); await fetchTransactions(); await onTransactionsChanged?.(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Content */}
      {subTab === "log" && (
        <TransactionList
          transactions={transactions}
          onDelete={handleDelete}
          loading={loading}
        />
      )}
      {subTab === "pnl" && (
        <PnLView
          transactions={transactions}
          exchangeRates={exchangeRates}
          loading={loading}
          assets={assets}
          onPlanSaved={onTransactionsChanged}
        />
      )}
    </div>
  );
}
