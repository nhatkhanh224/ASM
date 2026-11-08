import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { Debt } from '@/models/Debt';
import { getUserIdFromRequest } from '@/libs/auth';
import { generateInstallments } from '@/libs/debtCalculator';
import { DebtCalculationMethod, DebtInstallment, RepaymentMode } from '@/types/debt';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const existing = await Debt.findOne({ _id: id, userId });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const hasPaidInstallment = existing.installments?.some((item: { status: string }) => item.status === 'paid');
  const requestedMode: RepaymentMode = body.repaymentMode === 'installment' ? 'installment' : 'single';
  const calculationMethod: DebtCalculationMethod = ['equal_payment', 'equal_principal', 'no_interest'].includes(body.calculationMethod)
    ? body.calculationMethod
    : 'equal_payment';
  const amount = hasPaidInstallment ? Number(existing.amount) : Number(body.amount);
  const repaymentMode: RepaymentMode = hasPaidInstallment && existing.repaymentMode === 'installment' ? 'installment' : requestedMode;
  const currency = hasPaidInstallment ? existing.currency : (body.currency || 'VND');
  const interestRate = hasPaidInstallment ? Number(existing.interestRate || 0) : (Number(body.interestRate) || 0);
  const firstPaymentDate = hasPaidInstallment ? existing.firstPaymentDate : body.firstPaymentDate;
  const termMonths = hasPaidInstallment ? Number(existing.termMonths || 0) : Number(body.termMonths);
  const method: DebtCalculationMethod = hasPaidInstallment && ['equal_payment', 'equal_principal', 'no_interest'].includes(existing.calculationMethod || '')
    ? existing.calculationMethod as DebtCalculationMethod
    : calculationMethod;

  if (!body.name?.trim() || !['borrowed', 'lent'].includes(body.type) || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Thông tin khoản nợ không hợp lệ' }, { status: 400 });
  }

  let installments: DebtInstallment[] = (existing.installments || []).map((item) => ({
    id: item.id,
    installmentNumber: item.installmentNumber,
    dueDate: item.dueDate.toISOString(),
    principalAmount: item.principalAmount,
    interestAmount: item.interestAmount,
    totalAmount: item.totalAmount,
    paidAmount: item.paidAmount,
    status: item.status,
    paidAt: item.paidAt?.toISOString(),
    note: item.note || undefined,
  }));
  if (!hasPaidInstallment && repaymentMode === 'installment') {
    installments = generateInstallments({
      principal: amount,
      annualInterestRate: interestRate,
      termMonths,
      firstPaymentDate,
      calculationMethod: method,
      currency,
    });
    if (installments.length === 0) {
      return NextResponse.json({ error: 'Thông tin lịch trả góp không hợp lệ' }, { status: 400 });
    }
  } else if (!hasPaidInstallment && repaymentMode === 'single') {
    installments = [];
  }

  const update = {
    name: body.name.trim(),
    type: body.type,
    amount,
    currency,
    interestRate,
    dueDate: repaymentMode === 'single'
      ? (body.dueDate ? new Date(body.dueDate) : null)
      : installments.at(-1)?.dueDate,
    status: repaymentMode === 'installment'
      ? (installments.length > 0 && installments.every((item: { status: string }) => item.status === 'paid') ? 'paid' : 'active')
      : (body.status === 'paid' ? 'paid' : 'active'),
    note: body.note?.trim() || '',
    repaymentMode,
    calculationMethod: repaymentMode === 'installment' ? method : null,
    firstPaymentDate: repaymentMode === 'installment' ? firstPaymentDate : null,
    termMonths: repaymentMode === 'installment' ? termMonths : null,
    installments,
  };
  const debt = await Debt.findOneAndUpdate({ _id: id, userId }, update, { new: true, runValidators: true });
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(debt);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { installmentId, paid } = await req.json();
  const debt = await Debt.findOne({ _id: id, userId });
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (debt.repaymentMode !== 'installment') {
    return NextResponse.json({ error: 'Khoản nợ này không phải trả góp' }, { status: 400 });
  }

  const installment = debt.installments?.find((item: { id: string }) => item.id === installmentId);
  if (!installment) return NextResponse.json({ error: 'Không tìm thấy kỳ thanh toán' }, { status: 404 });

  installment.status = paid ? 'paid' : 'pending';
  installment.paidAmount = paid ? installment.totalAmount : 0;
  installment.paidAt = paid ? new Date() : undefined;
  debt.status = debt.installments.every((item: { status: string }) => item.status === 'paid') ? 'paid' : 'active';
  await debt.save();
  return NextResponse.json(debt);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const debt = await Debt.findOneAndDelete({ _id: id, userId });
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
