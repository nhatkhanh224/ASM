"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Calculator, CheckCircle2, Circle, RotateCcw } from "lucide-react";

interface CompoundResult {
  period: number;
  principal: number;
  interest: number;
  total: number;
}

export default function CompoundInterestView() {
  const [principal, setPrincipal] = useState<string>("10000000");
  const [rate, setRate] = useState<string>("10");
  const [periods, setPeriods] = useState<string>("10");
  const [currency, setCurrency] = useState<"VND" | "USD">("VND");
  const [results, setResults] = useState<CompoundResult[]>([]);
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [actualTotals, setActualTotals] = useState<Record<number, string>>({});
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null);

  // Load progress from localStorage
  useEffect(() => {
    const loadProgress = async () => {
      const saved = localStorage.getItem("compound_interest_progress");
      if (saved) {
        try {
          setProgress(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing saved progress", e);
        }
      }
      
      let parsedActuals: Record<number, string> = {};
      const savedActuals = localStorage.getItem("compound_interest_actual_totals");
      if (savedActuals) {
        try {
          parsedActuals = JSON.parse(savedActuals);
          setActualTotals(parsedActuals);
        } catch (e) {
          console.error("Error parsing saved actual totals", e);
        }
      }
      
      const savedConfig = localStorage.getItem("compound_interest_config");
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          if (parsed.principal) setPrincipal(parsed.principal);
          if (parsed.rate) setRate(parsed.rate);
          if (parsed.periods) setPeriods(parsed.periods);
          if (parsed.currency) setCurrency(parsed.currency);
          
          calculateResults(parsed.principal, parsed.rate, parsed.periods, false, parsedActuals);
        } catch (e) {
          console.error("Error parsing saved config", e);
        }
      } else {
        calculateResults("10000000", "10", "10", false, parsedActuals);
      }
    };
    loadProgress();
  }, []);

  const calculateResults = (pStr: string, rStr: string, nStr: string, showAlert: boolean = true, totalsOverride: Record<number, string> = actualTotals) => {
    const p = parseFloat(pStr);
    const r = parseFloat(rStr) / 100;
    const n = parseInt(nStr);

    if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || r <= 0 || n <= 0) {
      if (showAlert) alert("Vui lòng nhập số hợp lệ lớn hơn 0");
      return;
    }

    let currentPrincipal = p;
    const newResults: CompoundResult[] = [];

    for (let i = 1; i <= n; i++) {
      const interest = currentPrincipal * r;
      const total = currentPrincipal + interest;
      newResults.push({
        period: i,
        principal: currentPrincipal,
        interest,
        total,
      });
      
      if (totalsOverride && totalsOverride[i] !== undefined && totalsOverride[i] !== "") {
         const overriddenValue = parseFloat(totalsOverride[i]);
         currentPrincipal = isNaN(overriddenValue) ? total : overriddenValue;
      } else {
         currentPrincipal = total;
      }
    }

    setResults(newResults);
  };

  const handleCalculate = () => {
    calculateResults(principal, rate, periods, true, actualTotals);
    localStorage.setItem("compound_interest_config", JSON.stringify({
      principal,
      rate,
      periods,
      currency
    }));
  };

  const handleReset = () => {
    if (confirm("Bạn có chắc muốn đặt lại tất cả dữ liệu lãi kép?")) {
      setPrincipal("10000000");
      setRate("10");
      setPeriods("10");
      setCurrency("VND");
      setProgress({});
      setActualTotals({});
      setEditingPeriod(null);
      localStorage.removeItem("compound_interest_config");
      localStorage.removeItem("compound_interest_progress");
      localStorage.removeItem("compound_interest_actual_totals");
      calculateResults("10000000", "10", "10", false, {});
    }
  };

  const toggleProgress = (period: number) => {
    setProgress((prev) => {
      const newProgress = { ...prev, [period]: !prev[period] };
      localStorage.setItem("compound_interest_progress", JSON.stringify(newProgress));
      return newProgress;
    });
  };

  const handleActualTotalChange = (period: number, value: string) => {
    setActualTotals((prev) => {
      const newTotals = { ...prev, [period]: value };
      localStorage.setItem("compound_interest_actual_totals", JSON.stringify(newTotals));
      calculateResults(principal, rate, periods, false, newTotals);
      return newTotals;
    });
  };

  const formatCurrency = (value: number) => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    }
    return new Intl.NumberFormat("vi-VN").format(Math.round(value)) + " ₫";
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 border border-slate-200/50 space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Công cụ tính lãi kép</h2>
          <p className="text-sm text-slate-500">Lên kế hoạch gia tăng tài sản theo thời gian</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="block text-sm font-medium text-slate-700">
              Số tiền ban đầu
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "VND" | "USD")}
              className="text-xs font-semibold bg-slate-100 text-slate-600 rounded px-2 py-0.5 border-none focus:ring-1 focus:ring-emerald-500 cursor-pointer outline-none"
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="relative">
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-slate-800"
              placeholder="VD: 10000000"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Lãi suất mỗi kỳ (%)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-slate-800"
              placeholder="VD: 10"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Số lần tính (Kỳ)
          </label>
          <div className="relative">
            <input
              type="number"
              value={periods}
              onChange={(e) => setPeriods(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-slate-800"
              placeholder="VD: 12"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleReset}
          className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow cursor-pointer font-semibold"
        >
          <RotateCcw className="w-5 h-5" />
          Đặt lại
        </button>
        <button
          onClick={handleCalculate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer font-semibold"
        >
          <Calculator className="w-5 h-5" />
          Tính toán
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-sm font-semibold text-slate-600 w-24 text-center">Kỳ</th>
                  <th className="py-4 px-6 text-sm font-semibold text-slate-600 text-right">Số tiền gốc</th>
                  <th className="py-4 px-6 text-sm font-semibold text-slate-600 text-right">Tiền lãi</th>
                  <th className="py-4 px-6 text-sm font-semibold text-slate-600 text-right">Tổng cộng</th>
                  <th className="py-4 px-6 text-sm font-semibold text-slate-600 text-center">Đạt được</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((row) => (
                  <tr 
                    key={row.period} 
                    className={`hover:bg-slate-50 transition-colors ${progress[row.period] ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="py-3 px-6 text-center font-medium text-slate-700">
                      {row.period}
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-slate-600">
                      {formatCurrency(row.principal)}
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-emerald-600">
                      +{formatCurrency(row.interest)}
                    </td>
                    <td 
                      className="py-3 px-6 text-right font-mono text-slate-800 relative group cursor-pointer"
                      onClick={() => {
                         if (editingPeriod !== row.period) {
                            setEditingPeriod(row.period);
                         }
                      }}
                    >
                      {editingPeriod === row.period ? (
                        <input
                          type="number"
                          autoFocus
                          className="w-full min-w-[120px] text-right px-2 py-1 border border-emerald-500 rounded outline-none font-semibold text-emerald-700 bg-white"
                          value={actualTotals[row.period] !== undefined ? actualTotals[row.period] : Math.round(row.total).toString()}
                          onChange={(e) => handleActualTotalChange(row.period, e.target.value)}
                          onBlur={() => setEditingPeriod(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingPeriod(null)}
                        />
                      ) : (
                        <div className="flex flex-col items-end" title="Nhấn để chỉnh sửa số tiền thực tế">
                          <span className={`font-semibold ${actualTotals[row.period] ? 'text-emerald-600' : ''}`}>
                            {actualTotals[row.period] ? formatCurrency(parseFloat(actualTotals[row.period]) || 0) : formatCurrency(row.total)}
                          </span>
                          {actualTotals[row.period] && (
                            <span className="text-[10px] text-slate-400 font-normal leading-tight">
                              Kế hoạch: {formatCurrency(row.total)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => toggleProgress(row.period)}
                        className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center justify-center focus:outline-none"
                        title={progress[row.period] ? "Bỏ đánh dấu" : "Đánh dấu đã đạt được"}
                      >
                        {progress[row.period] ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-300 hover:text-emerald-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
