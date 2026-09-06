"use client";

import React, { useState, useEffect } from "react";
import { Plus, CreditCard, ArrowUpRight, ArrowDownRight, Edit2, Trash2 } from "lucide-react";
import { Debt } from "@/types/debt";
import { formatCurrency } from "@/libs/assetHelpers";

export default function DebtManagement() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<"borrowed" | "lent">("borrowed");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"active" | "paid">("active");
  const [note, setNote] = useState("");

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      const res = await fetch("/api/debts");
      if (res.ok) {
        const data = await res.json();
        setDebts(data);
      }
    } catch (error) {
      console.error("Error fetching debts", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      type,
      amount: Number(amount),
      currency,
      interestRate: interestRate ? Number(interestRate) : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      status,
      note,
    };

    try {
      const url = editingDebt ? `/api/debts/${editingDebt._id}` : "/api/debts";
      const method = editingDebt ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingDebt(null);
        resetForm();
        fetchDebts();
      }
    } catch (error) {
      console.error("Error saving debt", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa khoản nợ này?")) return;
    try {
      const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDebts();
      }
    } catch (error) {
      console.error("Error deleting debt", error);
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setName(debt.name);
    setType(debt.type);
    setAmount(debt.amount.toString());
    setCurrency(debt.currency);
    setInterestRate(debt.interestRate?.toString() || "");
    setDueDate(debt.dueDate ? new Date(debt.dueDate).toISOString().split("T")[0] : "");
    setStatus(debt.status);
    setNote(debt.note || "");
    setShowForm(true);
  };

  const resetForm = () => {
    setName("");
    setType("borrowed");
    setAmount("");
    setCurrency("VND");
    setInterestRate("");
    setDueDate("");
    setStatus("active");
    setNote("");
  };

  const totalBorrowed = debts
    .filter((d) => d.type === "borrowed" && d.status === "active")
    .reduce((sum, d) => sum + d.amount, 0);

  const totalLent = debts
    .filter((d) => d.type === "lent" && d.status === "active")
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <ArrowDownRight className="w-16 h-16" />
          </div>
          <p className="text-rose-100 font-medium mb-1">Tổng Nợ Phải Trả</p>
          <h2 className="text-3xl font-bold">{formatCurrency(totalBorrowed, "VND")}</h2>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <ArrowUpRight className="w-16 h-16" />
          </div>
          <p className="text-emerald-100 font-medium mb-1">Tổng Tiền Cho Mượn</p>
          <h2 className="text-3xl font-bold">{formatCurrency(totalLent, "VND")}</h2>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-600" />
          Danh sách khoản nợ
        </h3>
        <button
          onClick={() => {
            resetForm();
            setEditingDebt(null);
            setShowForm(!showForm);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm khoản nợ</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h4 className="font-semibold text-lg mb-4">{editingDebt ? "Sửa khoản nợ" : "Thêm khoản nợ mới"}</h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên / Người liên quan</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="VD: Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="borrowed">Đi vay (Phải trả)</option>
                <option value="lent">Cho mượn (Phải thu)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền</label>
              <input
                required
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tiền tệ</label>
              <input
                required
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                placeholder="VND"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lãi suất (% / năm) (Tùy chọn)</label>
              <input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày đáo hạn (Tùy chọn)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="active">Đang mở</option>
                <option value="paid">Đã thanh toán</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ghi chú thêm..."
              />
            </div>
            <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
              >
                Lưu khoản nợ
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="p-4 font-medium">Tên khoản nợ</th>
              <th className="p-4 font-medium">Loại</th>
              <th className="p-4 font-medium text-right">Số tiền</th>
              <th className="p-4 font-medium">Đáo hạn</th>
              <th className="p-4 font-medium">Trạng thái</th>
              <th className="p-4 font-medium text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {debts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Chưa có dữ liệu khoản nợ.
                </td>
              </tr>
            ) : (
              debts.map((debt) => (
                <tr key={debt._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{debt.name}</div>
                    {debt.note && <div className="text-xs text-slate-500 mt-1">{debt.note}</div>}
                  </td>
                  <td className="p-4">
                    {debt.type === "borrowed" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        Đi vay
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Cho mượn
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right font-semibold">
                    <span className={debt.type === "borrowed" ? "text-rose-600" : "text-emerald-600"}>
                      {debt.type === "borrowed" ? "-" : "+"}{formatCurrency(debt.amount, debt.currency)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("vi-VN") : "—"}
                  </td>
                  <td className="p-4">
                    {debt.status === "active" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Đang mở
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Đã thanh toán
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(debt)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(debt._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
