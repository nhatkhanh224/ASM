"use client";

import React, { useState, useEffect } from "react";
import { Plus, Target, Edit2, Trash2 } from "lucide-react";
import { FinancialGoal } from "@/types/financialGoal";
import { Asset, ExchangeRates } from "@/types/asset";
import { formatCurrency, applyRates, DEFAULT_EXCHANGE_RATES, fetchRatesWithRetry } from "@/libs/assetHelpers";

export default function GoalManagement() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");
  const [linkType, setLinkType] = useState<"NONE" | "ALL" | "SPECIFIC">("NONE");
  const [linkedAssetIds, setLinkedAssetIds] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);

  useEffect(() => {
    fetchGoals();
    fetchAssetsAndRates();
  }, []);

  const fetchAssetsAndRates = async () => {
    try {
      const res = await fetch("/api/assets");
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
      const fetchedRates = await fetchRatesWithRetry([]);
      if (fetchedRates) {
        setRates(fetchedRates);
      }
    } catch (error) {
      console.error("Error fetching assets", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/financial-goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (error) {
      console.error("Error fetching goals", error);
    }
  };

  const calculateLinkedAmount = (linkAll: boolean, assetIds: string[], targetCurrency: string) => {
    if (!linkAll && assetIds.length === 0) return 0;
    
    const assetsWithRate = applyRates(assets, rates);
    let totalVND = 0;
    
    if (linkAll) {
      totalVND = assetsWithRate.reduce((sum, a) => sum + (a.currentValueInVND || 0), 0);
    } else {
      const linked = assetsWithRate.filter(a => assetIds.includes(a._id));
      totalVND = linked.reduce((sum, a) => sum + (a.currentValueInVND || 0), 0);
    }
    
    if (targetCurrency === "VND") return totalVND;
    if (targetCurrency === "USD") return totalVND / (rates["USD"] || 26200);
    
    const rate = rates[targetCurrency];
    if (rate) return totalVND / rate;
    
    return totalVND;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCurrentAmount = Number(currentAmount) || 0;
    if (linkType !== "NONE") {
      finalCurrentAmount = calculateLinkedAmount(linkType === "ALL", linkType === "SPECIFIC" ? linkedAssetIds : [], currency);
    }

    const payload = {
      name,
      targetAmount: Number(targetAmount),
      currentAmount: finalCurrentAmount,
      currency,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      note,
      linkAllAssets: linkType === "ALL",
      linkedAssetIds: linkType === "SPECIFIC" ? linkedAssetIds : [],
    };

    try {
      const url = editingGoal ? `/api/financial-goals/${editingGoal._id}` : "/api/financial-goals";
      const method = editingGoal ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingGoal(null);
        resetForm();
        fetchGoals();
      }
    } catch (error) {
      console.error("Error saving goal", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa mục tiêu này?")) return;
    try {
      const res = await fetch(`/api/financial-goals/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchGoals();
      }
    } catch (error) {
      console.error("Error deleting goal", error);
    }
  };

  const handleEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setCurrency(goal.currency);
    setDeadline(goal.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : "");
    setNote(goal.note || "");
    if (goal.linkAllAssets) {
      setLinkType("ALL");
      setLinkedAssetIds([]);
    } else if (goal.linkedAssetIds && goal.linkedAssetIds.length > 0) {
      setLinkType("SPECIFIC");
      setLinkedAssetIds(goal.linkedAssetIds);
    } else {
      setLinkType("NONE");
      setLinkedAssetIds([]);
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setCurrency("VND");
    setDeadline("");
    setNote("");
    setLinkType("NONE");
    setLinkedAssetIds([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-600" />
            Mục tiêu tài chính
          </h3>
          <p className="text-slate-500 text-sm mt-1">Theo dõi tiến độ đạt được các mục tiêu tài chính của bạn</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingGoal(null);
            setShowForm(!showForm);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm mục tiêu</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h4 className="font-semibold text-lg mb-4">{editingGoal ? "Sửa mục tiêu" : "Thêm mục tiêu mới"}</h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên mục tiêu</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="VD: Mua nhà, Mua xe..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền mục tiêu</label>
              <input
                required
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền hiện tại đã có</label>
              <input
                type="number"
                value={linkType !== "NONE" ? calculateLinkedAmount(linkType === "ALL", linkType === "SPECIFIC" ? linkedAssetIds : [], currency).toFixed(0) : currentAmount}
                onChange={(e) => linkType === "NONE" && setCurrentAmount(e.target.value)}
                disabled={linkType !== "NONE"}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="0"
              />
              {linkType !== "NONE" && <p className="text-xs text-indigo-600 mt-1">Được tính tự động từ tài sản liên kết</p>}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày mục tiêu (Tùy chọn)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
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
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Liên kết tài sản</label>
              <select
                value={linkType}
                onChange={(e) => {
                  const newType = e.target.value as "NONE" | "ALL" | "SPECIFIC";
                  if (newType === "NONE" && linkType !== "NONE") {
                    const computed = calculateLinkedAmount(linkType === "ALL", linkType === "SPECIFIC" ? linkedAssetIds : [], currency);
                    setCurrentAmount(computed.toFixed(0));
                  }
                  setLinkType(newType);
                }}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="NONE">Không liên kết (Nhập thủ công)</option>
                <option value="ALL">Liên kết tất cả tài sản</option>
                <option value="SPECIFIC">Chọn tài sản cụ thể</option>
              </select>
            </div>
            {linkType === "SPECIFIC" && (
              <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn tài sản để liên kết</label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {assets.map(asset => (
                    <label key={asset._id} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={linkedAssetIds.includes(asset._id)}
                        onChange={(e) => {
                          if (e.target.checked) setLinkedAssetIds([...linkedAssetIds, asset._id]);
                          else setLinkedAssetIds(linkedAssetIds.filter(id => id !== asset._id));
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">{asset.name} - {formatCurrency(asset.value, asset.currency)}</span>
                    </label>
                  ))}
                  {assets.length === 0 && <p className="text-sm text-slate-500 italic">Không có tài sản nào.</p>}
                </div>
              </div>
            )}
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
                Lưu mục tiêu
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            Bạn chưa có mục tiêu tài chính nào.
          </div>
        ) : (
          goals.map((goal) => {
            let displayAmount = goal.currentAmount;
            if (goal.linkAllAssets || (goal.linkedAssetIds && goal.linkedAssetIds.length > 0)) {
               displayAmount = calculateLinkedAmount(!!goal.linkAllAssets, goal.linkedAssetIds || [], goal.currency);
            }
            const progress = Math.min(100, Math.max(0, (displayAmount / goal.targetAmount) * 100));
            
            return (
              <div key={goal._id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative group overflow-hidden transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">{goal.name}</h4>
                    {goal.deadline && (
                      <p className="text-xs text-slate-500 mt-1">
                        Mục tiêu đến: {new Date(goal.deadline).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(goal)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-white shadow-sm border border-slate-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    Đã đạt: {formatCurrency(displayAmount, goal.currency)}
                    {(goal.linkAllAssets || (goal.linkedAssetIds && goal.linkedAssetIds.length > 0)) && (
                       <span className="text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-semibold" title="Liên kết tự động">🔗 Auto</span>
                    )}
                  </span>
                  <span className="font-medium text-slate-700">Mục tiêu: {formatCurrency(goal.targetAmount, goal.currency)}</span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-end text-xs font-semibold text-indigo-600">
                  {progress.toFixed(1)}% hoàn thành
                </div>
                
                {goal.note && (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 italic">
                    {goal.note}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
