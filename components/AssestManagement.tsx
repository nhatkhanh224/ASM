"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Wallet, TrendingUp, Home, Coins, Smartphone,
  MoreHorizontal, Plus, Trash2, Edit2, PieChart,
  ArrowUpRight, ChevronDown, Search, LogOut, User,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Currency = string;
type AssetType = "cash" | "bank" | "investment" | "property" | "digital" | "other";

interface Asset {
  _id: string;
  name: string;
  type: AssetType;
  originalValue: number;
  currency: Currency;
  value: number;
  note?: string;
}

interface AssetWithRate extends Asset {
  currentValueInVND: number;
}

type ExchangeRates = Record<string, number>;

interface AssetTypeConfigItem {
  icon: React.ElementType;
  label: string;
  color: string;
  chartColor: string;
}

type AssetTypeConfig = Record<AssetType, AssetTypeConfigItem>;

// ─── Constants ────────────────────────────────────────────────────────────────

const POPULAR_CURRENCIES: { symbol: string; name: string }[] = [
  { symbol: "VND", name: "Việt Nam Đồng" },
  { symbol: "USD", name: "US Dollar" },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "Ripple" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "DOT", name: "Polkadot" },
  { symbol: "MATIC", name: "Polygon" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "LINK", name: "Chainlink" },
  { symbol: "UNI", name: "Uniswap" },
  { symbol: "ATOM", name: "Cosmos" },
  { symbol: "LTC", name: "Litecoin" },
  { symbol: "NEAR", name: "NEAR Protocol" },
  { symbol: "APT", name: "Aptos" },
  { symbol: "ARB", name: "Arbitrum" },
  { symbol: "OP", name: "Optimism" },
  { symbol: "SUI", name: "Sui" },
  { symbol: "TON", name: "Toncoin" },
  { symbol: "ASTER", name: "Aster" },
];

const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  VND: 1,
  USD: 26200,
  BTC: 77443.11 * 26200,
  ETH: 2400 * 26200,
  ASTER: 0.5702 * 26200,
};

const ASSET_TYPE_CONFIG: AssetTypeConfig = {
  cash:       { icon: Wallet,         label: "Tiền mặt",     color: "bg-green-100 text-green-700",   chartColor: "#10b981" },
  bank:       { icon: Coins,          label: "Ngân hàng",    color: "bg-blue-100 text-blue-700",     chartColor: "#3b82f6" },
  investment: { icon: TrendingUp,     label: "Đầu tư",       color: "bg-purple-100 text-purple-700", chartColor: "#a855f7" },
  property:   { icon: Home,           label: "Bất động sản", color: "bg-orange-100 text-orange-700", chartColor: "#f97316" },
  digital:    { icon: Smartphone,     label: "Tài sản số",   color: "bg-cyan-100 text-cyan-700",     chartColor: "#06b6d4" },
  other:      { icon: MoreHorizontal, label: "Khác",         color: "bg-gray-100 text-gray-700",     chartColor: "#6b7280" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Có lỗi xảy ra!";
}

async function safeParseJson(res: Response): Promise<any | null> {
  try {
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchExchangeRatesFromAPI(extraCoins: string[] = []): Promise<ExchangeRates | null> {
  try {
    const params = extraCoins.length ? `?extra=${extraCoins.join(",")}` : "";
    const res = await fetch(`/api/exchange-rates${params}`);
    if (!res.ok) return null;
    const data = await safeParseJson(res);
    if (!data) return null;
    const rates: ExchangeRates = { VND: 1 };
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "number") rates[key] = val;
    }
    return Object.keys(rates).length > 1 ? rates : null;
  } catch (e) {
    console.error("fetchExchangeRatesFromAPI error:", e);
    return null;
  }
}

function applyRates(assets: Asset[], rates: ExchangeRates): AssetWithRate[] {
  return assets.map((asset) => {
    const rate = rates[asset.currency] ?? 1;
    const currentValueInVND = (asset.originalValue ?? asset.value) * rate;
    return { ...asset, currentValueInVND };
  });
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

interface UserMenuProps {
  user: { name: string; email: string };
}

function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // Lấy chữ cái đầu tên để làm avatar
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-gray-700 leading-tight">{user.name}</p>
          <p className="text-xs text-gray-400 leading-tight">{user.email}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform hidden sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
          {/* Profile info */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CurrencyCombobox ─────────────────────────────────────────────────────────

interface CurrencyComboboxProps {
  value: string;
  onChange: (symbol: string) => void;
  disabled?: boolean;
}

function CurrencyCombobox({ value, onChange, disabled }: CurrencyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = POPULAR_CURRENCIES.filter(
    (c) =>
      c.symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const showCustomOption =
    search.trim() !== "" &&
    !POPULAR_CURRENCIES.some((c) => c.symbol.toLowerCase() === search.trim().toLowerCase());

  const handleSelect = (symbol: string) => {
    onChange(symbol.toUpperCase());
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 flex items-center justify-between bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="font-medium text-gray-800">{value}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                placeholder="Tìm hoặc nhập tên coin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim()) handleSelect(search.trim());
                }}
              />
            </div>
          </div>

          <ul className="max-h-56 overflow-y-auto py-1">
            {showCustomOption && (
              <li
                onClick={() => handleSelect(search.trim())}
                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-center gap-3"
              >
                <span className="w-10 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 text-xs font-bold rounded">
                  {search.trim().toUpperCase().slice(0, 5)}
                </span>
                <span className="text-sm text-gray-700">
                  Dùng <span className="font-semibold text-indigo-600">{search.trim().toUpperCase()}</span>
                  <span className="text-gray-400 ml-1">(tùy chỉnh)</span>
                </span>
              </li>
            )}

            {filtered.map((c) => (
              <li
                key={c.symbol}
                onClick={() => handleSelect(c.symbol)}
                className={`px-4 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-center gap-3 ${value === c.symbol ? "bg-indigo-50" : ""}`}
              >
                <span className="w-10 h-6 flex items-center justify-center bg-gray-100 text-gray-700 text-xs font-bold rounded">
                  {c.symbol.slice(0, 5)}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.symbol}</p>
                  <p className="text-xs text-gray-400">{c.name}</p>
                </div>
                {value === c.symbol && (
                  <span className="ml-auto text-indigo-600 text-xs font-medium">✓</span>
                )}
              </li>
            ))}

            {filtered.length === 0 && !showCustomOption && (
              <li className="px-4 py-3 text-sm text-gray-400 text-center">
                Không tìm thấy. Nhấn Enter để dùng &quot;{search.toUpperCase()}&quot;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function AssetManagementApp() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [view, setView] = useState<"list" | "chart">("list");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); });
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

  const refreshRates = async (currentAssets: Asset[]) => {
    const defaultCoins = new Set(["VND", "USD", "BTC", "ETH", "BNB", "SOL", "ASTER"]);
    const extraCoins = [...new Set(currentAssets.map((a) => a.currency))]
      .filter((c) => !defaultCoins.has(c));
    const rates = await fetchExchangeRatesFromAPI(extraCoins);
    if (rates) setExchangeRates(rates);
  };

  useEffect(() => {
    fetchAssets();
    fetchExchangeRatesFromAPI([]).then((rates) => {
      if (rates) setExchangeRates(rates);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (assets.length > 0) refreshRates(assets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.length]);

  const assetsWithRate = applyRates(assets, exchangeRates);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa tài sản này?")) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData?.error || "Delete failed");
      }
      await fetchAssets();
      alert("Xóa tài sản thành công!");
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            {/* Logo */}
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="w-8 h-8 text-indigo-600" />
                KVault
              </h1>
              <p className="text-gray-500 mt-1">Theo dõi và quản lý tài sản của bạn một cách hiệu quả</p>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setEditingAsset(null); setShowForm(!showForm); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Thêm tài sản</span>
                <span className="sm:hidden">Thêm</span>
              </button>

              {user && <UserMenu user={user} />}
            </div>
          </div>
          <SummaryCards assetsWithRate={assetsWithRate} />
        </div>

        {showForm && (
          <AssetForm
            exchangeRates={exchangeRates}
            onCreated={async () => {
              await fetchAssets();
              setShowForm(false);
              setEditingAsset(null);
            }}
            onCancel={() => { setShowForm(false); setEditingAsset(null); }}
            editingAsset={editingAsset}
            onNewCurrency={(symbol) => {
              fetchExchangeRatesFromAPI([symbol]).then((r) => {
                if (r) setExchangeRates((prev) => ({ ...prev, ...r }));
              });
            }}
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-lg transition-all ${view === "list" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            Danh sách
          </button>
          <button
            onClick={() => setView("chart")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${view === "chart" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <PieChart className="w-4 h-4" />
            Biểu đồ
          </button>
        </div>

        {view === "list" ? (
          <AssetList assetsWithRate={assetsWithRate} onDelete={handleDelete} onEdit={handleEdit} />
        ) : (
          <AssetChart assetsWithRate={assetsWithRate} />
        )}
      </div>
    </div>
  );
}

// ─── SummaryCards ─────────────────────────────────────────────────────────────

function SummaryCards({ assetsWithRate }: { assetsWithRate: AssetWithRate[] }) {
  const total = assetsWithRate.reduce((sum, a) => sum + a.currentValueInVND, 0);
  const byType = assetsWithRate.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.type] = (acc[asset.type] ?? 0) + asset.currentValueInVND;
    return acc;
  }, {});
  const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b - a).slice(0, 3);

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
              <div className={`p-2 rounded-lg ${config.color}`}><Icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">{percentage}% tổng tài sản</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── AssetForm ────────────────────────────────────────────────────────────────

interface AssetFormProps {
  onCreated: () => void;
  onCancel: () => void;
  editingAsset: Asset | null;
  exchangeRates: ExchangeRates;
  onNewCurrency: (symbol: string) => void;
}

function AssetForm({ onCreated, onCancel, editingAsset, exchangeRates, onNewCurrency }: AssetFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: editingAsset?.name ?? "",
    type: (editingAsset?.type ?? "cash") as AssetType,
    originalValue: editingAsset?.originalValue ?? 0,
    currency: editingAsset?.currency ?? "VND",
    value: editingAsset?.value ?? 0,
    note: editingAsset?.note ?? "",
  });

  const handleCurrencyChange = (symbol: string) => {
    const rate = exchangeRates[symbol] ?? 1;
    setForm((f) => ({ ...f, currency: symbol, value: f.originalValue * rate }));
    if (!exchangeRates[symbol]) onNewCurrency(symbol);
  };

  const submit = async () => {
    if (!form.name || form.originalValue <= 0) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingAsset ? `/api/assets/${editingAsset._id}` : "/api/assets";
      const method = editingAsset ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }
      onCreated();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const currentRate = exchangeRates[form.currency] ?? 1;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {editingAsset ? "Chỉnh sửa tài sản" : "Thêm tài sản mới"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tên tài sản *</label>
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="VD: Tài khoản Techcombank"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Loại tài sản *</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as AssetType })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            disabled={submitting}
          >
            {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị tiền *</label>
          <CurrencyCombobox
            value={form.currency}
            onChange={handleCurrencyChange}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Giá trị *</label>
          <input
            type="number"
            step="any"
            value={form.originalValue}
            onChange={(e) => {
              const originalValue = Number(e.target.value);
              setForm({ ...form, originalValue, value: originalValue * currentRate });
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="0"
            disabled={submitting}
          />
        </div>

        {form.currency !== "VND" && form.originalValue > 0 && (
          <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800 font-medium">Giá trị quy đổi sang VND</p>
                <p className="text-xs text-blue-600 mt-1">
                  Tỷ giá: 1 {form.currency} = {currentRate.toLocaleString()} VND
                  {!exchangeRates[form.currency] && (
                    <span className="ml-2 text-orange-500">(đang tải tỷ giá...)</span>
                  )}
                </p>
              </div>
              <p className="text-lg font-bold text-blue-900">≈ {form.value.toLocaleString()} VND</p>
            </div>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Ghi chú thêm về tài sản..."
            rows={3}
            disabled={submitting}
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={submit}
          disabled={submitting}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-all shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Đang xử lý..." : editingAsset ? "Cập nhật" : "Thêm tài sản"}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

// ─── AssetList ────────────────────────────────────────────────────────────────

interface AssetListProps {
  assetsWithRate: AssetWithRate[];
  onDelete: (id: string) => void;
  onEdit: (asset: Asset) => void;
}

function AssetList({ assetsWithRate, onDelete, onEdit }: AssetListProps) {
  const total = assetsWithRate.reduce((sum, a) => sum + a.currentValueInVND, 0);
  const sorted = [...assetsWithRate].sort((a, b) => b.currentValueInVND - a.currentValueInVND);
  if (assetsWithRate.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
        <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Chưa có tài sản nào</p>
        <p className="text-gray-400 text-sm mt-2">Nhấn &quot;Thêm tài sản&quot; để bắt đầu</p>
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
          const percentage = total > 0 ? ((asset.currentValueInVND / total) * 100).toFixed(1) : "0";
          const hasRateChanged = Math.abs(asset.currentValueInVND - asset.value) > 1;

          return (
            <div key={asset._id} className="p-6 hover:bg-gray-50 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${config.color}`}><Icon className="w-6 h-6" /></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{asset.name}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-sm text-gray-500">{config.label}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{percentage}%</span>
                      {asset.note && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400 max-w-xs truncate">{asset.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">
                      {(asset.originalValue ?? asset.value).toLocaleString()} {asset.currency}
                    </p>
                    <p className="text-sm text-gray-500">≈ {asset.currentValueInVND.toLocaleString()} VND</p>
                    {hasRateChanged && <p className="text-xs text-blue-600 mt-1">Đã cập nhật tỷ giá</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(asset)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(asset._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
            <p className="text-2xl font-bold text-indigo-600">{total.toLocaleString()}</p>
            <p className="text-sm text-gray-500">VND (theo tỷ giá hiện tại)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AssetChart ───────────────────────────────────────────────────────────────

interface ChartDataItem {
  type: string;
  value: number;
  count: number;
  percentage: string;
  config: AssetTypeConfigItem;
}

function AssetChart({ assetsWithRate }: { assetsWithRate: AssetWithRate[] }) {
  const total = assetsWithRate.reduce((sum, a) => sum + a.currentValueInVND, 0);
  const byType = assetsWithRate.reduce<Record<string, { value: number; count: number }>>(
    (acc, asset) => {
      if (!acc[asset.type]) acc[asset.type] = { value: 0, count: 0 };
      acc[asset.type].value += asset.currentValueInVND;
      acc[asset.type].count += 1;
      return acc;
    },
    {}
  );

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
      <h2 className="text-xl font-bold text-gray-800 mb-6">Phân bổ tài sản theo loại</h2>
      <div className="space-y-4">
        {chartData.map((item) => {
          const Icon = item.config.icon;
          return (
            <div key={item.type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.config.color}`}><Icon className="w-4 h-4" /></div>
                  <span className="font-medium text-gray-700">{item.config.label}</span>
                  <span className="text-sm text-gray-500">({item.count} tài sản)</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{item.value.toLocaleString()} VND</p>
                  <p className="text-sm text-gray-500">{item.percentage}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%`, backgroundColor: item.config.chartColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}