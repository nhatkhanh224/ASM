"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, TrendingUp, TrendingDown, ArrowDownCircle,
  ArrowUpCircle, DollarSign, BarChart2, List, X, ChevronDown,
  AlertCircle, CheckCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Asset {
  _id: string;
  name: string;
  currency: string;
  originalValue: number;
  value: number;
}

export interface Transaction {
  _id: string;
  assetId: string;
  assetName: string;
  type: "buy" | "sell" | "deposit" | "withdraw";
  currency: string;
  quantity: number;
  pricePerUnit: number;
  totalValueVND: number;
  note?: string;
  transactedAt: string;
}

interface CostBasisRow {
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
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TX_TYPE_CONFIG = {
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

// Tính Average Cost Basis từ danh sách transactions (FIFO)
function calcCostBasis(
  transactions: Transaction[],
  exchangeRates: Record<string, number>
): CostBasisRow[] {
  const usdRate = exchangeRates["USD"] || 26200;

  // Group by currency
  const byCurrency: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const c = tx.currency.toUpperCase();
    if (c === "VND") continue; // VND không có cost basis theo USD
    if (!byCurrency[c]) byCurrency[c] = [];
    byCurrency[c].push(tx);
  }

  const rows: CostBasisRow[] = [];

  for (const [currency, txs] of Object.entries(byCurrency)) {
    let totalQuantity = 0;
    let totalCostUSD = 0;
    let realizedPnlUSD = 0;

    // Sort by date ascending
    const sorted = [...txs].sort(
      (a, b) => new Date(a.transactedAt).getTime() - new Date(b.transactedAt).getTime()
    );

    for (const tx of sorted) {
      if (tx.type === "buy") {
        totalQuantity += tx.quantity;
        totalCostUSD += tx.quantity * tx.pricePerUnit;
      } else if (tx.type === "sell") {
        // Realized P&L = (sell price - avg cost) * quantity
        const avgCost = totalQuantity > 0 ? totalCostUSD / totalQuantity : 0;
        realizedPnlUSD += (tx.pricePerUnit - avgCost) * tx.quantity;
        totalQuantity = Math.max(0, totalQuantity - tx.quantity);
        totalCostUSD = totalQuantity * avgCost;
      }
      // deposit/withdraw không ảnh hưởng cost basis
    }

    if (totalQuantity <= 0) continue;

    const avgCostUSD = totalQuantity > 0 ? totalCostUSD / totalQuantity : 0;
    const currentPriceVND = exchangeRates[currency] || 0;
    const currentPriceUSD = currentPriceVND / usdRate;
    const currentValueUSD = totalQuantity * currentPriceUSD;
    const unrealizedPnlUSD = currentValueUSD - totalCostUSD;
    const unrealizedPnlPct = totalCostUSD > 0 ? (unrealizedPnlUSD / totalCostUSD) * 100 : 0;

    rows.push({
      currency,
      totalQuantity,
      totalCostUSD,
      avgCostUSD,
      currentPriceUSD,
      currentValueUSD,
      unrealizedPnlUSD,
      unrealizedPnlPct,
      realizedPnlUSD,
    });
  }

  return rows.sort((a, b) => Math.abs(b.currentValueUSD) - Math.abs(a.currentValueUSD));
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

  const [form, setForm] = useState({
    assetId: assets[0]?._id ?? "",
    type: "buy" as Transaction["type"],
    quantity: "",
    pricePerUnit: "",    // USD
    note: "",
    transactedAt: new Date().toISOString().slice(0, 16),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedAsset = assets.find((a) => a._id === form.assetId);
  const currency = selectedAsset?.currency?.toUpperCase() ?? "VND";
  const isVND = currency === "VND";

  // Auto-fill giá hiện tại khi chọn asset
  useEffect(() => {
    if (!selectedAsset) return;
    const c = selectedAsset.currency.toUpperCase();
    const rateVND = exchangeRates[c] || 0;
    const priceUSD = rateVND > 0 ? rateVND / usdRate : 0;
    setForm((f) => ({ ...f, pricePerUnit: priceUSD > 0 ? priceUSD.toFixed(6) : "" }));
  }, [form.assetId]);

  const qty = parseFloat(form.quantity) || 0;
  const price = parseFloat(form.pricePerUnit) || 0;
  const totalVND = isVND ? qty : qty * price * usdRate;

  const submit = async () => {
    setError("");
    if (!form.assetId) return setError("Chọn tài sản");
    if (qty <= 0) return setError("Số lượng phải > 0");
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
    } catch (e: any) {
      setError(e.message);
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
            onChange={(e) => setForm({ ...form, assetId: e.target.value })}
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
                onClick={() => setForm({ ...form, type: t })}
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

        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Số lượng ({currency}) *
          </label>
          <input
            type="number"
            step="any"
            placeholder="0"
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
          {(["buy", "sell", "deposit", "withdraw"] as const).map((t) => (
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

// ─── PnLView ──────────────────────────────────────────────────────────────────

function PnLView({
  transactions,
  exchangeRates,
  loading,
}: {
  transactions: Transaction[];
  exchangeRates: Record<string, number>;
  loading: boolean;
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
                <tr key={row.currency} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-700 font-bold text-xs">{row.currency.slice(0, 3)}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{row.currency}</span>
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
        * Giá vốn tính theo FIFO. Chỉ tính cho các giao dịch loại &quot;Mua&quot; và &quot;Bán&quot;.
      </p>
    </div>
  );
}

// ─── Main TransactionView ─────────────────────────────────────────────────────

export default function TransactionView({ assets, exchangeRates }: TransactionViewProps) {
  const [subTab, setSubTab] = useState<"log" | "pnl">("log");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      if (Array.isArray(data)) setTransactions(data);
    } catch (e) {
      console.error("fetchTransactions error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa giao dịch này?")) return;
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      setTransactions((prev) => prev.filter((t) => t._id !== id));
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

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />Thêm giao dịch
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <TransactionForm
          assets={assets}
          exchangeRates={exchangeRates}
          onSaved={() => { setShowForm(false); fetchTransactions(); }}
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
        />
      )}
    </div>
  );
}