"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, CreditCard, ArrowUpRight, ArrowDownRight, Edit2, Trash2,
  CalendarDays, ChevronDown, ChevronUp, Check, RotateCcw,
} from "lucide-react";
import { Debt, DebtCalculationMethod, DebtInstallment, RepaymentMode } from "@/types/debt";
import { ExchangeRates } from "@/types/asset";
import { DEFAULT_EXCHANGE_RATES, fetchRatesWithRetry, formatCurrency } from "@/libs/assetHelpers";
import { generateInstallments, getDebtScheduleSummary } from "@/libs/debtCalculator";

type DebtForm = {
  name: string;
  type: "borrowed" | "lent";
  amount: string;
  currency: "VND" | "USD";
  interestRate: string;
  dueDate: string;
  status: "active" | "paid";
  note: string;
  repaymentMode: RepaymentMode;
  calculationMethod: DebtCalculationMethod;
  firstPaymentDate: string;
  termMonths: string;
};

const toDateInput = (value?: string) => value ? new Date(value).toISOString().split("T")[0] : "";

const nextMonthDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split("T")[0];
};

const makeInitialForm = (): DebtForm => ({
  name: "",
  type: "borrowed",
  amount: "",
  currency: "VND",
  interestRate: "",
  dueDate: "",
  status: "active",
  note: "",
  repaymentMode: "single",
  calculationMethod: "equal_payment",
  firstPaymentDate: nextMonthDate(),
  termMonths: "12",
});

export default function DebtManagement() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [form, setForm] = useState<DebtForm>(makeInitialForm);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingInstallment, setUpdatingInstallment] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);

  const fetchDebts = async () => {
    try {
      const res = await fetch("/api/debts");
      if (res.ok) setDebts(await res.json());
    } catch (fetchError) {
      console.error("Error fetching debts", fetchError);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDebts();
    fetchRatesWithRetry([], 2).then((freshRates) => {
      if (freshRates) setRates(freshRates);
    });
  }, []);

  const previewInstallments = useMemo(() => {
    if (form.repaymentMode !== "installment") return [];
    return generateInstallments({
      principal: Number(form.amount),
      annualInterestRate: Number(form.interestRate) || 0,
      termMonths: Number(form.termMonths),
      firstPaymentDate: form.firstPaymentDate,
      calculationMethod: form.calculationMethod,
      currency: form.currency,
    });
  }, [form.amount, form.calculationMethod, form.currency, form.firstPaymentDate, form.interestRate, form.repaymentMode, form.termMonths]);

  const previewSummary = useMemo(
    () => getDebtScheduleSummary(previewInstallments),
    [previewInstallments],
  );

  const updateForm = <K extends keyof DebtForm>(key: K, value: DebtForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDebt(null);
    setForm(makeInitialForm());
    setError("");
  };

  const openCreateForm = () => {
    setEditingDebt(null);
    setForm(makeInitialForm());
    setError("");
    setShowForm(true);
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setForm({
      name: debt.name,
      type: debt.type,
      amount: debt.amount.toString(),
      currency: debt.currency === "USD" ? "USD" : "VND",
      interestRate: debt.interestRate?.toString() || "",
      dueDate: toDateInput(debt.dueDate),
      status: debt.status,
      note: debt.note || "",
      repaymentMode: debt.repaymentMode || "single",
      calculationMethod: debt.calculationMethod || "equal_payment",
      firstPaymentDate: toDateInput(debt.firstPaymentDate) || nextMonthDate(),
      termMonths: debt.termMonths?.toString() || "12",
    });
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasPaidInstallment = Boolean(editingDebt?.installments?.some((item) => item.status === "paid"));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.repaymentMode === "installment" && previewInstallments.length === 0 && !hasPaidInstallment) {
      setError("Vui lòng kiểm tra số tiền, số tháng và ngày trả kỳ đầu.");
      return;
    }

    setSaving(true);
    try {
      const url = editingDebt ? `/api/debts/${editingDebt._id}` : "/api/debts";
      const res = await fetch(url, {
        method: editingDebt ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          interestRate: Number(form.interestRate) || 0,
          termMonths: Number(form.termMonths),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể lưu khoản nợ");
      await fetchDebts();
      closeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu khoản nợ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa khoản nợ và toàn bộ lịch trả góp này?")) return;
    const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
    if (res.ok) fetchDebts();
  };

  const toggleInstallment = async (debt: Debt, installment: DebtInstallment) => {
    setUpdatingInstallment(installment.id);
    try {
      const res = await fetch(`/api/debts/${debt._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentId: installment.id, paid: installment.status !== "paid" }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật kỳ thanh toán");
      const updatedDebt = await res.json();
      setDebts((current) => current.map((item) => item._id === debt._id ? updatedDebt : item));
    } catch (updateError) {
      alert(updateError instanceof Error ? updateError.message : "Không thể cập nhật kỳ thanh toán");
    } finally {
      setUpdatingInstallment(null);
    }
  };

  const convertToVND = (value: number, currency: string) => value * (rates[currency] || 1);
  const getRemainingPrincipal = (debt: Debt) => {
    if (debt.status === "paid") return 0;
    if (debt.repaymentMode !== "installment") return debt.amount;
    return getDebtScheduleSummary(debt.installments || []).remainingPrincipal;
  };

  const totalBorrowed = debts
    .filter((debt) => debt.type === "borrowed")
    .reduce((sum, debt) => sum + convertToVND(getRemainingPrincipal(debt), debt.currency), 0);
  const totalLent = debts
    .filter((debt) => debt.type === "lent")
    .reduce((sum, debt) => sum + convertToVND(getRemainingPrincipal(debt), debt.currency), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-6 text-white shadow-lg">
          <ArrowDownRight className="absolute right-4 top-4 h-16 w-16 opacity-20" />
          <p className="mb-1 font-medium text-rose-100">Dư nợ phải trả</p>
          <h2 className="text-3xl font-bold">{formatCurrency(totalBorrowed, "VND")}</h2>
          <p className="mt-2 text-xs text-rose-100">Đã quy đổi VND theo tỷ giá hiện tại</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
          <ArrowUpRight className="absolute right-4 top-4 h-16 w-16 opacity-20" />
          <p className="mb-1 font-medium text-emerald-100">Dư nợ cần thu</p>
          <h2 className="text-3xl font-bold">{formatCurrency(totalLent, "VND")}</h2>
          <p className="mt-2 text-xs text-emerald-100">Đã quy đổi VND theo tỷ giá hiện tại</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <CreditCard className="h-6 w-6 text-indigo-600" />
          Danh sách khoản nợ
        </h3>
        <button onClick={openCreateForm} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-md transition-all hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Thêm khoản nợ
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-md">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h4 className="text-lg font-semibold">{editingDebt ? "Sửa khoản nợ" : "Thêm khoản nợ mới"}</h4>
              <p className="mt-1 text-sm text-slate-500">Chọn trả một lần hoặc tạo lịch trả góp tự động.</p>
            </div>
            <button type="button" onClick={closeForm} className="text-sm text-slate-500 hover:text-slate-800">Đóng</button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tên / Người liên quan">
              <input required value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="input-field" placeholder="VD: Khoản vay mua xe" />
            </Field>
            <Field label="Loại">
              <select value={form.type} onChange={(e) => updateForm("type", e.target.value as DebtForm["type"])} className="input-field">
                <option value="borrowed">Đi vay (phải trả)</option>
                <option value="lent">Cho mượn (phải thu)</option>
              </select>
            </Field>
            <Field label="Số tiền gốc">
              <input required type="number" min="1" disabled={hasPaidInstallment} value={form.amount} onChange={(e) => updateForm("amount", e.target.value)} className="input-field disabled:bg-slate-100" placeholder="0" />
            </Field>
            <Field label="Đơn vị tiền tệ">
              <select disabled={hasPaidInstallment} value={form.currency} onChange={(e) => updateForm("currency", e.target.value as DebtForm["currency"])} className="input-field disabled:bg-slate-100">
                <option value="VND">Việt Nam Đồng (VND)</option>
                <option value="USD">Đô la Mỹ (USD)</option>
              </select>
            </Field>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Hình thức thanh toán</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                {(["single", "installment"] as RepaymentMode[]).map((mode) => (
                  <button key={mode} type="button" disabled={hasPaidInstallment} onClick={() => updateForm("repaymentMode", mode)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed ${form.repaymentMode === mode ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>
                    {mode === "single" ? "Trả một lần" : "Trả góp hàng tháng"}
                  </button>
                ))}
              </div>
            </div>

            {form.repaymentMode === "installment" ? (
              <>
                {hasPaidInstallment && (
                  <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 md:col-span-2">
                    Khoản này đã phát sinh thanh toán. Các điều khoản tài chính được khóa để bảo toàn lịch sử.
                  </div>
                )}
                <Field label="Ngày trả kỳ đầu">
                  <input required type="date" disabled={hasPaidInstallment} value={form.firstPaymentDate} onChange={(e) => updateForm("firstPaymentDate", e.target.value)} className="input-field disabled:bg-slate-100" />
                </Field>
                <Field label="Số tháng trả góp">
                  <input required type="number" min="1" max="600" disabled={hasPaidInstallment} value={form.termMonths} onChange={(e) => updateForm("termMonths", e.target.value)} className="input-field disabled:bg-slate-100" />
                </Field>
                <Field label="Cách tính trả góp">
                  <select disabled={hasPaidInstallment} value={form.calculationMethod} onChange={(e) => updateForm("calculationMethod", e.target.value as DebtCalculationMethod)} className="input-field disabled:bg-slate-100">
                    <option value="equal_payment">Trả đều hàng tháng</option>
                    <option value="equal_principal">Gốc cố định, lãi giảm dần</option>
                    <option value="no_interest">Không lãi suất</option>
                  </select>
                </Field>
                <Field label="Lãi suất (%/năm)">
                  <input type="number" min="0" step="0.01" disabled={hasPaidInstallment || form.calculationMethod === "no_interest"} value={form.calculationMethod === "no_interest" ? "0" : form.interestRate} onChange={(e) => updateForm("interestRate", e.target.value)} className="input-field disabled:bg-slate-100" placeholder="0" />
                </Field>

                {!hasPaidInstallment && previewInstallments.length > 0 && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 md:col-span-2">
                    <div className="mb-3 flex items-center gap-2 font-semibold text-indigo-800"><CalendarDays className="h-4 w-4" /> Xem trước kế hoạch trả góp</div>
                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <PreviewStat label="Kỳ đầu" value={formatCurrency(previewInstallments[0].totalAmount, form.currency)} />
                      <PreviewStat label="Tổng tiền lãi" value={formatCurrency(previewSummary.totalInterest, form.currency)} />
                      <PreviewStat label="Tổng phải trả" value={formatCurrency(previewSummary.totalPayable, form.currency)} />
                      <PreviewStat label="Kết thúc dự kiến" value={new Date(previewInstallments.at(-1)!.dueDate).toLocaleDateString("vi-VN")} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Field label="Lãi suất (%/năm) (tùy chọn)">
                  <input type="number" min="0" step="0.01" value={form.interestRate} onChange={(e) => updateForm("interestRate", e.target.value)} className="input-field" placeholder="0" />
                </Field>
                <Field label="Ngày đáo hạn (tùy chọn)">
                  <input type="date" value={form.dueDate} onChange={(e) => updateForm("dueDate", e.target.value)} className="input-field" />
                </Field>
                <Field label="Trạng thái">
                  <select value={form.status} onChange={(e) => updateForm("status", e.target.value as DebtForm["status"])} className="input-field">
                    <option value="active">Đang mở</option>
                    <option value="paid">Đã thanh toán</option>
                  </select>
                </Field>
              </>
            )}

            <Field label="Ghi chú">
              <input value={form.note} onChange={(e) => updateForm("note", e.target.value)} className="input-field" placeholder="Ghi chú thêm..." />
            </Field>
            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 md:col-span-2">{error}</div>}
            <div className="flex justify-end gap-2 md:col-span-2">
              <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Hủy</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-6 py-2 text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu khoản nợ"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {debts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Chưa có dữ liệu khoản nợ.</div>
        ) : debts.map((debt) => {
          const installments = debt.installments || [];
          const schedule = getDebtScheduleSummary(installments);
          const paidCount = installments.filter((item) => item.status === "paid").length;
          const nextInstallment = installments.find((item) => item.status !== "paid");
          const progress = installments.length ? paidCount / installments.length * 100 : (debt.status === "paid" ? 100 : 0);
          const isExpanded = expandedDebtId === debt._id;
          const remaining = getRemainingPrincipal(debt);
          const overdueCount = installments.filter(isOverdue).length;

          return (
            <div key={debt._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-800">{debt.name}</h4>
                      <Badge color={debt.type === "borrowed" ? "rose" : "emerald"}>{debt.type === "borrowed" ? "Đi vay" : "Cho mượn"}</Badge>
                      <Badge color={debt.status === "paid" ? "slate" : "blue"}>{debt.status === "paid" ? "Đã hoàn tất" : "Đang mở"}</Badge>
                      {debt.repaymentMode === "installment" && <Badge color="indigo">Trả góp</Badge>}
                      {overdueCount > 0 && <Badge color="rose">{overdueCount} kỳ quá hạn</Badge>}
                    </div>
                    {debt.note && <p className="mt-1 text-sm text-slate-500">{debt.note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(debt)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" title="Sửa khoản nợ"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(debt._id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Xóa khoản nợ"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <DebtStat label="Tiền gốc" value={formatCurrency(debt.amount, debt.currency)} />
                  <DebtStat label="Dư nợ gốc" value={formatCurrency(remaining, debt.currency)} highlight />
                  {debt.repaymentMode === "installment" ? (
                    <>
                      <DebtStat label={debt.type === "borrowed" ? "Đã trả" : "Đã thu"} value={`${paidCount}/${installments.length} kỳ`} />
                      <DebtStat label="Kỳ tiếp theo" value={nextInstallment ? `${formatCurrency(nextInstallment.totalAmount, debt.currency)} · ${new Date(nextInstallment.dueDate).toLocaleDateString("vi-VN")}` : "Đã hoàn tất"} />
                    </>
                  ) : (
                    <>
                      <DebtStat label="Lãi suất" value={debt.interestRate ? `${debt.interestRate}%/năm` : "Không có"} />
                      <DebtStat label="Đáo hạn" value={debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("vi-VN") : "Chưa đặt"} />
                    </>
                  )}
                </div>

                {debt.repaymentMode === "installment" && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>Tiến độ thanh toán</span><span>{progress.toFixed(0)}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
                    <button onClick={() => setExpandedDebtId(isExpanded ? null : debt._id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isExpanded ? "Ẩn lịch trả góp" : "Xem lịch trả góp"}
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && debt.repaymentMode === "installment" && (
                <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                  <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <PreviewStat label="Tổng tiền lãi" value={formatCurrency(schedule.totalInterest, debt.currency)} />
                    <PreviewStat label="Tổng phải thanh toán" value={formatCurrency(schedule.totalPayable, debt.currency)} />
                    <PreviewStat label={debt.type === "borrowed" ? "Đã thanh toán" : "Đã thu"} value={formatCurrency(schedule.paidTotal, debt.currency)} />
                    <PreviewStat label="Phương thức" value={methodLabel(debt.calculationMethod)} />
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Kỳ</th><th className="p-3">Hạn thanh toán</th><th className="p-3 text-right">Tiền gốc</th><th className="p-3 text-right">Tiền lãi</th><th className="p-3 text-right">Tổng</th><th className="p-3">Trạng thái</th><th className="p-3 text-right">Thao tác</th></tr></thead>
                      <tbody>
                        {installments.map((item) => {
                          const overdue = isOverdue(item);
                          return (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="p-3 font-medium">#{item.installmentNumber}</td>
                              <td className="p-3">{new Date(item.dueDate).toLocaleDateString("vi-VN")}</td>
                              <td className="p-3 text-right">{formatCurrency(item.principalAmount, debt.currency)}</td>
                              <td className="p-3 text-right">{formatCurrency(item.interestAmount, debt.currency)}</td>
                              <td className="p-3 text-right font-semibold">{formatCurrency(item.totalAmount, debt.currency)}</td>
                              <td className="p-3">
                                {item.status === "paid" ? <Badge color="emerald">{debt.type === "borrowed" ? "Đã trả" : "Đã thu"}</Badge> : overdue ? <Badge color="rose">Quá hạn</Badge> : <Badge color="amber">Chờ thanh toán</Badge>}
                              </td>
                              <td className="p-3 text-right">
                                <button disabled={updatingInstallment === item.id} onClick={() => toggleInstallment(debt, item)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${item.status === "paid" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                                  {item.status === "paid" ? <><RotateCcw className="h-3.5 w-3.5" /> Hoàn tác</> : <><Check className="h-3.5 w-3.5" /> {debt.type === "borrowed" ? "Đã trả" : "Đã thu"}</>}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isOverdue(item: DebtInstallment) {
  if (item.status === "paid") return false;
  const dueDate = new Date(item.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function methodLabel(method?: DebtCalculationMethod) {
  if (method === "equal_principal") return "Gốc cố định";
  if (method === "no_interest") return "Không lãi";
  return "Trả đều hàng tháng";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>{children}</div>;
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/80 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>;
}

function DebtStat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-sm font-bold ${highlight ? "text-indigo-700" : "text-slate-800"}`}>{value}</p></div>;
}

function Badge({ color, children }: { color: "rose" | "emerald" | "slate" | "blue" | "indigo" | "amber"; children: React.ReactNode }) {
  const colors = {
    rose: "bg-rose-100 text-rose-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-100 text-blue-700",
    indigo: "bg-indigo-100 text-indigo-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[color]}`}>{children}</span>;
}
