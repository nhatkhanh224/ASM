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
    originalValue: editingAsset?.originalValue ?? 0,
    currency: editingAsset?.currency ?? "VND",
    value: editingAsset?.value ?? 0,
    note: editingAsset?.note ?? "",
  });

  const handleCurrencyChange = (symbol: string) => {
    const rate = exchangeRates[symbol] ?? 1;
    setForm((f) => ({
      ...f,
      currency: symbol,
      value: f.originalValue * rate,
    }));
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
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as AssetType })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            disabled={submitting}
          >
            {Object.entries(ASSET_TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Đơn vị tiền *
          </label>
          <CurrencyCombobox
            value={form.currency}
            onChange={handleCurrencyChange}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Giá trị *
          </label>
          <input
            type="number"
            step="any"
            value={form.originalValue}
            onChange={(e) => {
              const originalValue = Number(e.target.value);
              setForm({
                ...form,
                originalValue,
                value: originalValue * currentRate,
              });
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
