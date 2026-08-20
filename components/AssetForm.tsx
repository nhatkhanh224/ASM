"use client";

import React, { useState } from "react";
import { Asset, AssetType, ExchangeRates } from "@/types/asset";
import {
  ASSET_TYPE_CONFIG,
  getErrorMessage,
  safeParseJson,
} from "@/libs/assetHelpers";
import CurrencyCombobox from "@/components/CurrencyCombobox";

interface AssetFormProps {
  onCreated: () => void;
  onCancel: () => void;
  editingAsset: Asset | null;
  exchangeRates: ExchangeRates;
  onNewCurrency: (symbol: string) => void;
}

export default function AssetForm({
  onCreated,
  onCancel,
  editingAsset,
  exchangeRates,
  onNewCurrency,
}: AssetFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: editingAsset?.name ?? "",
    type: (editingAsset?.type ?? "cash") as AssetType,
    originalValue: editingAsset?.originalValue !== undefined ? String(editingAsset.originalValue) : "",
    currency: editingAsset?.currency ?? "VND",
    value: editingAsset?.value ?? 0,
    note: editingAsset?.note ?? "",
    isFutures: editingAsset?.isFutures ?? false,
    coinSymbol: editingAsset?.coinSymbol ?? "BTC",
    leverage: editingAsset?.leverage ?? 10,
    positionType: editingAsset?.positionType ?? "long",
    entryPrice: editingAsset?.entryPrice ?? "",
    liquidationPrice: editingAsset?.liquidationPrice ?? "",
  });

  const handleCurrencyChange = (symbol: string) => {
    const rate = exchangeRates[symbol] ?? 1;
    setForm((f) => {
      const numOriginal = Number(f.originalValue) || 0;
      return {
        ...f,
        currency: symbol,
        value: numOriginal * rate,
      };
    });
    if (!exchangeRates[symbol]) onNewCurrency(symbol);
  };

  const submit = async () => {
    const numOriginalValue = Number(form.originalValue);
    if (!form.name || isNaN(numOriginalValue) || numOriginalValue <= 0) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingAsset ? `/api/assets/${editingAsset._id}` : "/api/assets";
      const method = editingAsset ? "PUT" : "POST";
      const payload = {
        ...form,
        originalValue: numOriginalValue,
        value: numOriginalValue * currentRate,
        leverage: form.isFutures ? Number(form.leverage) : undefined,
        entryPrice: form.isFutures ? Number(form.entryPrice) : undefined,
        liquidationPrice: form.isFutures ? Number(form.liquidationPrice) : undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tên tài sản *
          </label>
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="VD: Tài khoản Techcombank"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại tài sản *
          </label>
          <select
            value={form.type}
            onChange={(e) => {
              const newType = e.target.value as AssetType;
              let newCurrency = form.currency;
              if (newType === "gold" && form.currency !== "SJC" && form.currency !== "SJ9999") {
                newCurrency = "SJC";
              }
              const rate = exchangeRates[newCurrency] ?? 1;
              setForm((f) => ({
                ...f,
                type: newType,
                currency: newCurrency,
                value: (Number(f.originalValue) || 0) * rate,
              }));
              if (!exchangeRates[newCurrency]) onNewCurrency(newCurrency);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            disabled={submitting}
          >
            {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
          {form.type === "digital" && (
            <div className="mt-3 flex items-center">
              <input
                type="checkbox"
                id="isFutures"
                checked={form.isFutures}
                onChange={(e) => setForm({ ...form, isFutures: e.target.checked, currency: "USD" })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isFutures" className="ml-2 block text-sm text-gray-700 font-medium">
                Đây là lệnh Futures (có đòn bẩy)
              </label>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {form.isFutures ? "Đồng tiền ký quỹ *" : "Đơn vị tiền *"}
          </label>
          {form.type === "gold" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { symbol: "SJC", label: "SJC 9999" },
                  { symbol: "SJ9999", label: "Nhẫn 9999" },
                  { symbol: "CUSTOM", label: "Khác" }
                ].map((opt) => {
                  const isSelected = opt.symbol === "CUSTOM" 
                    ? (form.currency !== "SJC" && form.currency !== "SJ9999")
                    : form.currency === opt.symbol;
                  return (
                    <button
                      key={opt.symbol}
                      type="button"
                      onClick={() => {
                        if (opt.symbol !== "CUSTOM") {
                          handleCurrencyChange(opt.symbol);
                        } else {
                          if (form.currency === "SJC" || form.currency === "SJ9999") {
                            handleCurrencyChange("VND");
                          }
                        }
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500 border-amber-600 text-white shadow-sm scale-[1.02]"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {(form.currency !== "SJC" && form.currency !== "SJ9999") && (
                <div className="mt-2 animate-in fade-in duration-200">
                  <CurrencyCombobox
                    value={form.currency}
                    onChange={handleCurrencyChange}
                    disabled={submitting}
                  />
                </div>
              )}
            </div>
          ) : (
            <CurrencyCombobox
              value={form.currency}
              onChange={handleCurrencyChange}
              disabled={submitting}
            />
          )}
        </div>
        {form.isFutures && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coin Giao Dịch *
            </label>
            <CurrencyCombobox
              value={form.coinSymbol}
              onChange={(symbol) => {
                setForm({ ...form, coinSymbol: symbol });
                if (!exchangeRates[symbol]) onNewCurrency(symbol);
              }}
              disabled={submitting}
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {form.isFutures ? "Số tiền ký quỹ (Margin) *" : "Giá trị *"}
          </label>
          <input
            type="number"
            step="any"
            value={form.originalValue}
            onChange={(e) => {
              const valStr = e.target.value;
              const numValue = Number(valStr);
              setForm({
                ...form,
                originalValue: valStr,
                value: isNaN(numValue) ? 0 : numValue * currentRate,
              });
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="0"
            disabled={submitting}
          />
          {(form.currency === "SJC" || form.currency === "SJ9999") && (
            <p className="text-xs text-amber-600 mt-1.5 font-medium flex items-center gap-1">
              <span>💡</span> Đơn vị tính: lượng (1 lượng = 10 chỉ). Ví dụ: nhập 2.5 cho 2 lượng 5 chỉ.
            </p>
          )}
        </div>
        {form.isFutures && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vị thế & Đòn bẩy *
              </label>
              <div className="flex gap-2">
                <select
                  value={form.positionType}
                  onChange={(e) => setForm({ ...form, positionType: e.target.value })}
                  className="w-1/2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
                <div className="relative w-1/2">
                  <input
                    type="number"
                    value={form.leverage}
                    onChange={(e) => setForm({ ...form, leverage: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="VD: 10"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 font-semibold">x</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá vào lệnh (USD) *
              </label>
              <input
                type="number"
                value={form.entryPrice}
                onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="VD: 60000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giá thanh lý (USD)
              </label>
              <input
                type="number"
                value={form.liquidationPrice}
                onChange={(e) => setForm({ ...form, liquidationPrice: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="VD: 55000"
              />
            </div>
          </>
        )}
        {form.currency !== "VND" && Number(form.originalValue) > 0 && !form.isFutures && (
          <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  Giá trị quy đổi sang VND
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Tỷ giá: 1 {form.currency} = {currentRate.toLocaleString()} VND{" "}
                  {!exchangeRates[form.currency] && (
                    <span className="ml-2 text-orange-500">
                      (đang tải tỷ giá...)
                    </span>
                  )}
                </p>
              </div>
              <p className="text-lg font-bold text-blue-900">
                ≈ {form.value.toLocaleString()} VND
              </p>
            </div>
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ghi chú
          </label>
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
          {submitting
            ? "Đang xử lý..."
            : editingAsset
            ? "Cập nhật"
            : "Thêm tài sản"}
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
