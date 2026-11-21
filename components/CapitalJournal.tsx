"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownCircle, ArrowUpCircle, BarChart3,
  CircleDollarSign, Edit2, PauseCircle, Plus, Target,
  Trash2, Trophy, Wallet, XCircle,
} from "lucide-react";
import type { BetResult, CapitalEntry, CapitalFund, CashflowType } from "@/types/capital";
import { calculateBetPayout, calculateFundSummary } from "@/libs/capitalCalculator";

type FundForm = {
  name: string;
  currency: "VND" | "USD";
  initialCapital: string;
  note: string;
};
type BetForm = {
  matchName: string;
  odds: string;
  stakeMode: "amount" | "percentage";
  stake: string;
  stakePercent: string;
  result: BetResult;
  payout: string;
  occurredAt: string;
  note: string;
};
type CashForm = { cashflowType: CashflowType; amount: string; occurredAt: string; note: string };

const nowInput = () => new Date().toISOString().slice(0, 16);
const emptyFund = (): FundForm => ({
  name: "",
  currency: "VND",
  initialCapital: "",
  note: "",
});
const emptyBet = (): BetForm => ({ matchName: "", odds: "", stakeMode: "amount", stake: "", stakePercent: "", result: "pending", payout: "", occurredAt: nowInput(), note: "" });
const emptyCash = (): CashForm => ({ cashflowType: "deposit", amount: "", occurredAt: nowInput(), note: "" });

const resultLabels: Record<BetResult, string> = {
  pending: "Chờ kết quả",
  win: "Thắng",
  half_win: "Thắng nửa",
  push: "Huề",
  half_loss: "Thua nửa",
  loss: "Thua",
};

function formatMoney(value: number, currency: string) {
  return currency === "VND"
    ? `${Math.round(value).toLocaleString("vi-VN")} ₫`
    : `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CapitalJournal() {
  const [funds, setFunds] = useState<CapitalFund[]>([]);
  const [entries, setEntries] = useState<CapitalEntry[]>([]);
  const [selectedFundId, setSelectedFundId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFundForm, setShowFundForm] = useState(false);
  const [showBetForm, setShowBetForm] = useState(false);
  const [showCashForm, setShowCashForm] = useState(false);
  const [fundForm, setFundForm] = useState<FundForm>(emptyFund);
  const [betForm, setBetForm] = useState<BetForm>(emptyBet);
  const [cashForm, setCashForm] = useState<CashForm>(emptyCash);
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<"all" | BetResult>("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fundResponse, entryResponse] = await Promise.all([fetch("/api/capital-funds"), fetch("/api/capital-entries")]);
      const fundData = await fundResponse.json();
      const entryData = await entryResponse.json();
      if (Array.isArray(fundData)) {
        setFunds(fundData);
        setSelectedFundId((current) => current && fundData.some((fund: CapitalFund) => fund._id === current) ? current : fundData[0]?._id || "");
      }
      if (Array.isArray(entryData)) setEntries(entryData);
    } catch (fetchError) {
      console.error("Capital journal fetch error", fetchError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const selectedFund = funds.find((fund) => fund._id === selectedFundId);
  const fundEntries = useMemo(() => entries.filter((entry) => entry.fundId === selectedFundId), [entries, selectedFundId]);
  const summary = calculateFundSummary(selectedFund?.initialCapital || 0, fundEntries);
  const filteredBets = fundEntries.filter((entry) => entry.kind === "bet" && (resultFilter === "all" || entry.result === resultFilter));

  const closeForms = () => {
    setShowFundForm(false); setShowBetForm(false); setShowCashForm(false);
    setFundForm(emptyFund()); setBetForm(emptyBet()); setCashForm(emptyCash());
    setEditingBetId(null); setError("");
  };

  const saveFund = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const response = await fetch("/api/capital-funds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fundForm, initialCapital: Number(fundForm.initialCapital) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo quỹ");
      await fetchData(); closeForms(); setSelectedFundId(data._id);
    } catch (saveError: unknown) { setError(saveError instanceof Error ? saveError.message : "Không thể tạo quỹ"); }
    finally { setSaving(false); }
  };

  const saveBet = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFund) return;
    setError(""); setSaving(true);
    try {
      const calculatedStake = betForm.stakeMode === "percentage"
        ? (selectedFund.initialCapital || 0) * Number(betForm.stakePercent) / 100
        : Number(betForm.stake);
      const payload = { ...betForm, fundId: selectedFund._id, kind: "bet", odds: Number(betForm.odds), stake: calculatedStake, payout: betForm.payout === "" ? undefined : Number(betForm.payout), occurredAt: new Date(betForm.occurredAt).toISOString() };
      const response = await fetch(editingBetId ? `/api/capital-entries/${editingBetId}` : "/api/capital-entries", { method: editingBetId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu phiếu Bet");
      await fetchData(); closeForms();
    } catch (saveError: unknown) { setError(saveError instanceof Error ? saveError.message : "Không thể lưu phiếu Bet"); }
    finally { setSaving(false); }
  };

  const saveCashflow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFund) return;
    setError(""); setSaving(true);
    try {
      const response = await fetch("/api/capital-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cashForm, fundId: selectedFund._id, kind: "cashflow", amount: Number(cashForm.amount), occurredAt: new Date(cashForm.occurredAt).toISOString() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu dòng tiền");
      await fetchData(); closeForms();
    } catch (saveError: unknown) { setError(saveError instanceof Error ? saveError.message : "Không thể lưu dòng tiền"); }
    finally { setSaving(false); }
  };

  const editBet = (entry: CapitalEntry) => {
    setEditingBetId(entry._id);
    setBetForm({ matchName: entry.matchName || "", odds: String(entry.odds || ""), stakeMode: "amount", stake: String(entry.stake || ""), stakePercent: "", result: entry.result || "pending", payout: entry.result === "pending" ? "" : String(entry.payout ?? ""), occurredAt: new Date(entry.occurredAt).toISOString().slice(0, 16), note: entry.note || "" });
    setShowBetForm(true); setShowCashForm(false); setShowFundForm(false); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Xóa phiếu này khỏi nhật ký?")) return;
    const response = await fetch(`/api/capital-entries/${id}`, { method: "DELETE" });
    if (response.ok) fetchData();
  };

  const deleteFund = async () => {
    if (!selectedFund || !confirm(`Xóa quỹ “${selectedFund.name}”?`)) return;
    const response = await fetch(`/api/capital-funds/${selectedFund._id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return alert(data.error || "Không thể xóa quỹ");
    await fetchData();
  };

  const stake = betForm.stakeMode === "percentage"
    ? (selectedFund?.initialCapital || 0) * (Number(betForm.stakePercent) || 0) / 100
    : Number(betForm.stake) || 0;
  const odds = Number(betForm.odds) || 0;
  const customPayout = betForm.payout === "" ? undefined : Number(betForm.payout);
  const preview = calculateBetPayout(stake, odds, betForm.result, customPayout);
  const riskPercent = selectedFund?.initialCapital ? stake / selectedFund.initialCapital * 100 : 0;

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800"><Activity className="h-7 w-7 text-violet-600" />Nhật ký quản lý vốn</h1><p className="mt-1 text-sm text-slate-500">Theo dõi từng phiếu Bet, dòng tiền và tăng trưởng quỹ.</p></div>
        <button onClick={() => { closeForms(); setShowFundForm(true); }} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-violet-700"><Plus className="h-4 w-4" />Tạo quỹ</button>
      </div>

      {showFundForm && <FundFormPanel form={fundForm} setForm={setFundForm} onSubmit={saveFund} onCancel={closeForms} saving={saving} error={error} />}

      {funds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-12 text-center"><Wallet className="mx-auto h-14 w-14 text-violet-200" /><h2 className="mt-3 font-bold text-slate-700">Chưa có quỹ vốn</h2><p className="mt-1 text-sm text-slate-500">Tạo quỹ Bet đầu tiên để bắt đầu ghi nhật ký.</p></div>
      ) : selectedFund && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3"><select value={selectedFundId} onChange={(event) => { setSelectedFundId(event.target.value); closeForms(); }} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500">{funds.map((fund) => <option key={fund._id} value={fund._id}>{fund.name} · {fund.currency}</option>)}</select>{selectedFund.status === "paused" && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"><PauseCircle className="h-3.5 w-3.5" />Tạm dừng</span>}</div>
              <div className="flex flex-wrap gap-2"><button onClick={() => { closeForms(); setShowCashForm(true); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Nạp / Rút vốn</button><button disabled={selectedFund.status === "paused"} onClick={() => { closeForms(); setShowBetForm(true); }} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40"><Plus className="h-4 w-4" />Phiếu Bet</button><button onClick={deleteFund} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Xóa quỹ"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          </div>

          {showBetForm && <BetFormPanel form={betForm} setForm={setBetForm} currency={selectedFund.currency} initialCapital={selectedFund.initialCapital} currentCapital={summary.currentCapital} availableCapital={summary.availableCapital} preview={preview} riskPercent={riskPercent} editing={Boolean(editingBetId)} onSubmit={saveBet} onCancel={closeForms} saving={saving} error={error} />}
          {showCashForm && <CashflowFormPanel form={cashForm} setForm={setCashForm} currency={selectedFund.currency} onSubmit={saveCashflow} onCancel={closeForms} saving={saving} error={error} />}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric icon={<Wallet />} label="Vốn hiện tại" value={formatMoney(summary.currentCapital, selectedFund.currency)} color="violet" />
            <Metric icon={<CircleDollarSign />} label="Vốn khả dụng" value={formatMoney(summary.availableCapital, selectedFund.currency)} color="blue" />
            <Metric icon={<Target />} label="Đang cược" value={formatMoney(summary.pendingStake, selectedFund.currency)} color="amber" />
            <Metric icon={<Trophy />} label="Lãi/lỗ" value={`${summary.settledProfitLoss >= 0 ? "+" : ""}${formatMoney(summary.settledProfitLoss, selectedFund.currency)}`} color={summary.settledProfitLoss >= 0 ? "emerald" : "rose"} />
            <Metric icon={<BarChart3 />} label="ROI / Win rate" value={`${summary.roi.toFixed(1)}% · ${summary.winRate.toFixed(1)}%`} color="slate" />
          </div>

          <CapitalGrowthChart fund={selectedFund} entries={fundEntries} />

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center"><div><h2 className="font-bold text-slate-800">Nhật ký Bet</h2><p className="text-xs text-slate-500">{filteredBets.length} phiếu đang hiển thị</p></div><select value={resultFilter} onChange={(event) => setResultFilter(event.target.value as "all" | BetResult)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">Tất cả kết quả</option>{Object.entries(resultLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
            {filteredBets.length === 0 ? <div className="p-10 text-center text-sm text-slate-400">Chưa có phiếu Bet phù hợp.</div> : <div className="divide-y divide-slate-100">{filteredBets.map((entry) => <BetRow key={entry._id} entry={entry} currency={selectedFund.currency} onEdit={() => editBet(entry)} onDelete={() => deleteEntry(entry._id)} />)}</div>}
          </div>

          {fundEntries.some((entry) => entry.kind === "cashflow") && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-800">Lịch sử nạp/rút vốn</h2><div className="mt-3 space-y-2">{fundEntries.filter((entry) => entry.kind === "cashflow").map((entry) => <div key={entry._id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2">{entry.cashflowType === "deposit" ? <ArrowDownCircle className="h-4 w-4 text-emerald-600" /> : <ArrowUpCircle className="h-4 w-4 text-rose-600" />}<div><p className="text-sm font-semibold text-slate-700">{entry.cashflowType === "deposit" ? "Nạp vốn" : "Rút vốn"}</p><p className="text-xs text-slate-400">{new Date(entry.occurredAt).toLocaleString("vi-VN")} {entry.note ? `· ${entry.note}` : ""}</p></div></div><div className="flex items-center gap-3"><span className={`font-bold ${entry.cashflowType === "deposit" ? "text-emerald-600" : "text-rose-600"}`}>{entry.cashflowType === "deposit" ? "+" : "-"}{formatMoney(entry.amount || 0, selectedFund.currency)}</span><button onClick={() => deleteEntry(entry._id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div></div>)}</div></div>}
        </>
      )}
    </div>
  );
}

function FundFormPanel({ form, setForm, onSubmit, onCancel, saving, error }: { form: FundForm; setForm: React.Dispatch<React.SetStateAction<FundForm>>; onSubmit: (event: React.FormEvent) => void; onCancel: () => void; saving: boolean; error: string }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:grid-cols-2">
      <div className="flex justify-between sm:col-span-2">
        <div>
          <h2 className="font-bold text-slate-800">Tạo quỹ vốn</h2>
          <p className="text-xs text-slate-500">Quỹ Bet được tách khỏi tài sản dài hạn.</p>
        </div>
        <button type="button" onClick={onCancel}><XCircle className="h-5 w-5 text-slate-400" /></button>
      </div>

      <Field label="Tên quỹ">
        <input required className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Quỹ Bet bóng đá" />
      </Field>
      <Field label="Tiền tệ">
        <select className="input-field" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "VND" | "USD" })}>
          <option value="VND">VND</option>
          <option value="USD">USD</option>
        </select>
      </Field>

      <Field label="Vốn ban đầu">
        <input required type="number" min="0" step="any" className="input-field" value={form.initialCapital} onChange={(e) => setForm({ ...form, initialCapital: e.target.value })} />
      </Field>

      <Field label="Ghi chú">
        <input className="input-field" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>
      {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2">Hủy</button>
        <button disabled={saving} className="rounded-lg bg-violet-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Tạo quỹ"}</button>
      </div>
    </form>
  );
}

function BetFormPanel({ form, setForm, currency, initialCapital, currentCapital, availableCapital, preview, riskPercent, editing, onSubmit, onCancel, saving, error }: { form: BetForm; setForm: React.Dispatch<React.SetStateAction<BetForm>>; currency: string; initialCapital: number; currentCapital: number; availableCapital: number; preview: { payout: number; profitLoss: number }; riskPercent: number; editing: boolean; onSubmit: (event: React.FormEvent) => void; onCancel: () => void; saving: boolean; error: string }) {
  const calculatedStake = form.stakeMode === "percentage"
    ? initialCapital * (Number(form.stakePercent) || 0) / 100
    : Number(form.stake) || 0;

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:grid-cols-2">
      <div className="flex justify-between sm:col-span-2">
        <div>
          <h2 className="font-bold text-slate-800">{editing ? "Cập nhật phiếu Bet" : "Phiếu Bet mới"}</h2>
          <p className="text-xs text-slate-500">Vốn ban đầu: {formatMoney(initialCapital, currency)} · Vốn hiện tại: {formatMoney(currentCapital, currency)} · Khả dụng: {formatMoney(availableCapital, currency)}</p>
        </div>
        <button type="button" onClick={onCancel}><XCircle className="h-5 w-5 text-slate-400" /></button>
      </div>

      <Field label="Tên trận">
        <input required className="input-field" value={form.matchName} onChange={(e) => setForm({ ...form, matchName: e.target.value })} placeholder="VD: Liverpool vs Arsenal" />
      </Field>
      <Field label="Thời gian">
        <input required type="datetime-local" className="input-field" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} />
      </Field>
      <Field label="Odds">
        <input required type="number" min="1" step="0.01" className="input-field" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} placeholder="1.90" />
      </Field>

      <div>
        <p className="mb-1 block text-sm font-medium text-slate-700">Cách nhập tiền cược</p>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button type="button" onClick={() => setForm({ ...form, stakeMode: "amount" })} className={`rounded-md px-2 py-2 text-xs font-semibold ${form.stakeMode === "amount" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>Số tiền</button>
          <button type="button" onClick={() => setForm({ ...form, stakeMode: "percentage" })} className={`rounded-md px-2 py-2 text-xs font-semibold ${form.stakeMode === "percentage" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>% vốn</button>
        </div>
      </div>

      {form.stakeMode === "amount" ? (
        <Field label="Tiền cược">
          <input required type="number" min="0.01" step="any" className="input-field" value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} />
        </Field>
      ) : (
        <Field label="Tỷ lệ vốn ban đầu cho phiếu (%)">
          <input required type="number" min="0.01" max="100" step="0.01" className="input-field" value={form.stakePercent} onChange={(e) => setForm({ ...form, stakePercent: e.target.value })} placeholder="VD: 2" />
        </Field>
      )}

      <Field label="Kết quả">
        <select className="input-field" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as BetResult, payout: "" })}>{Object.entries(resultLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      </Field>
      <Field label="Tiền nhận về">
        <input type="number" min="0" step="any" disabled={form.result === "pending"} className="input-field disabled:bg-slate-100" value={form.payout} onChange={(e) => setForm({ ...form, payout: e.target.value })} placeholder={form.result === "pending" ? "Chờ kết quả" : formatMoney(preview.payout, currency)} />
      </Field>
      <Field label="Ghi chú">
        <input className="input-field" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </Field>

      <div className={`rounded-xl border p-3 ${riskPercent > 5 ? "border-rose-200 bg-rose-50" : "border-violet-100 bg-violet-50"}`}>
        <p className="text-xs text-slate-500">Xem trước · Tiền cược {formatMoney(calculatedStake, currency)}</p>
        <p className={`mt-1 font-bold ${preview.profitLoss >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{preview.profitLoss >= 0 ? "+" : ""}{formatMoney(preview.profitLoss, currency)} · Rủi ro {riskPercent.toFixed(1)}% vốn ban đầu</p>
        {calculatedStake > availableCapital && <p className="mt-1 text-xs text-rose-600">Tiền cược đang vượt vốn khả dụng.</p>}
        {riskPercent > 5 && <p className="mt-1 text-xs text-rose-600">Cảnh báo: phiếu này dùng hơn 5% vốn ban đầu.</p>}
      </div>
      {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2">Hủy</button>
        <button disabled={saving} className="rounded-lg bg-violet-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu phiếu"}</button>
      </div>
    </form>
  );
}

function CashflowFormPanel({ form, setForm, currency, onSubmit, onCancel, saving, error }: { form: CashForm; setForm: React.Dispatch<React.SetStateAction<CashForm>>; currency: string; onSubmit: (event: React.FormEvent) => void; onCancel: () => void; saving: boolean; error: string }) {
  return <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:grid-cols-2"><div className="sm:col-span-2 flex justify-between"><h2 className="font-bold text-slate-800">Nạp / Rút vốn ({currency})</h2><button type="button" onClick={onCancel}><XCircle className="h-5 w-5 text-slate-400" /></button></div><Field label="Loại"><select className="input-field" value={form.cashflowType} onChange={(e) => setForm({ ...form, cashflowType: e.target.value as CashflowType })}><option value="deposit">Nạp vốn</option><option value="withdrawal">Rút vốn</option></select></Field><Field label="Số tiền"><input required type="number" min="0" step="any" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field><Field label="Thời gian"><input required type="datetime-local" className="input-field" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} /></Field><Field label="Ghi chú"><input className="input-field" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>{error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2">Hủy</button><button disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50">Lưu dòng tiền</button></div></form>;
}

function BetRow({ entry, currency, onEdit, onDelete }: { entry: CapitalEntry; currency: string; onEdit: () => void; onDelete: () => void }) {
  const result = entry.result || "pending";
  const colors: Record<BetResult, string> = {
    pending: "bg-amber-100 text-amber-700",
    win: "bg-emerald-100 text-emerald-700",
    half_win: "bg-teal-100 text-teal-700",
    push: "bg-slate-100 text-slate-600",
    half_loss: "bg-orange-100 text-orange-700",
    loss: "bg-rose-100 text-rose-700",
  };
  const risk = entry.bankrollBefore && entry.stake ? entry.stake / entry.bankrollBefore * 100 : 0;
  return <div className="flex flex-col justify-between gap-4 p-4 hover:bg-slate-50 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-800">{entry.matchName}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${colors[result]}`}>{resultLabels[result]}</span></div><p className="mt-1 text-xs text-slate-400">{new Date(entry.occurredAt).toLocaleString("vi-VN")} · Odds {entry.odds?.toFixed(2)} · Rủi ro {risk.toFixed(1)}%{entry.note ? ` · ${entry.note}` : ""}</p></div><div className="flex items-center justify-between gap-5 sm:justify-end"><div className="text-right"><p className="text-sm text-slate-500">Cược {formatMoney(entry.stake || 0, currency)} · Nhận {formatMoney(entry.payout || 0, currency)}</p><p className={`font-bold ${(entry.profitLoss || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{result === "pending" ? "Chưa chốt" : `${(entry.profitLoss || 0) >= 0 ? "+" : ""}${formatMoney(entry.profitLoss || 0, currency)}`}</p></div><div className="flex gap-1"><button onClick={onEdit} className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-600"><Edit2 className="h-4 w-4" /></button><button onClick={onDelete} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div></div></div>;
}

function CapitalGrowthChart({ fund, entries }: { fund: CapitalFund; entries: CapitalEntry[] }) {
  const sorted = [...entries].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  let capital = fund.initialCapital;
  const points = [{ date: new Date(fund.createdAt), value: capital }];
  for (const entry of sorted) {
    if (entry.kind === "cashflow") capital += entry.cashflowType === "deposit" ? entry.amount || 0 : -(entry.amount || 0);
    else if (entry.result !== "pending") capital += entry.profitLoss || 0;
    points.push({ date: new Date(entry.occurredAt), value: capital });
  }
  if (points.length === 1) points.push({ date: new Date(), value: capital });
  const width = 900, height = 250, left = 70, right = 25, top = 20, bottom = 35;
  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values), rawMax = Math.max(...values);
  const padding = Math.max((rawMax - rawMin) * 0.15, Math.max(rawMax, 1) * 0.03);
  const min = Math.max(0, rawMin - padding), max = rawMax + padding;
  const x = (index: number) => left + index / Math.max(1, points.length - 1) * (width - left - right);
  const y = (value: number) => top + (max - value) / Math.max(1, max - min) * (height - top - bottom);
  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-violet-600" /><h2 className="font-bold text-slate-800">Tăng trưởng vốn</h2></div><div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[650px] w-full" role="img" aria-label="Biểu đồ tăng trưởng vốn">{[0, .25, .5, .75, 1].map((ratio) => { const value = max - (max - min) * ratio; const lineY = top + (height - top - bottom) * ratio; return <g key={ratio}><line x1={left} x2={width - right} y1={lineY} y2={lineY} stroke="#e2e8f0" strokeDasharray="4 4" /><text x={left - 8} y={lineY + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{fund.currency === "VND" ? `${(value / 1_000_000).toFixed(1)}tr` : `$${value.toFixed(0)}`}</text></g>; })}<polyline points={line} fill="none" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{points.map((point, index) => <circle key={`${point.date.toISOString()}-${index}`} cx={x(index)} cy={y(point.value)} r="4" fill="#7c3aed" stroke="white" strokeWidth="2"><title>{point.date.toLocaleString("vi-VN")}: {formatMoney(point.value, fund.currency)}</title></circle>)}<text x={left} y={height - 8} fontSize="10" fill="#94a3b8">{points[0].date.toLocaleDateString("vi-VN")}</text><text x={width - right} y={height - 8} textAnchor="end" fontSize="10" fill="#94a3b8">Hiện tại</text></svg></div></div>;
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: "violet" | "blue" | "amber" | "emerald" | "rose" | "slate" }) {
  const colors = { violet: "bg-violet-50 text-violet-700", blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", slate: "bg-slate-100 text-slate-700" };
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}>{React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-4 w-4" }) : icon}</div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>{children}</div>;
}
