import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { Debt } from '@/models/Debt';
import { getUserIdFromRequest } from '@/libs/auth';
import { generateInstallments } from '@/libs/debtCalculator';
import { DebtCalculationMethod, DebtInstallment, RepaymentMode } from '@/types/debt';
import { Asset } from '@/models/Asset';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const existing = await Debt.findOne({ _id: id, userId });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const hasPaidInstallment = existing.installments?.some((item: { status: string }) => item.status === 'paid');
  const requestedMode: RepaymentMode = ['installment', 'interest_only'].includes(body.repaymentMode) ? body.repaymentMode : 'single';
  const calculationMethod: DebtCalculationMethod = ['equal_payment', 'equal_principal', 'no_interest'].includes(body.calculationMethod)
    ? body.calculationMethod
    : 'equal_payment';
  const amount = hasPaidInstallment ? Number(existing.amount) : Number(body.amount);
  const repaymentMode: RepaymentMode = hasPaidInstallment && existing.repaymentMode !== 'single' ? existing.repaymentMode : requestedMode;
  const currency = hasPaidInstallment ? existing.currency : (body.currency || 'VND');
  const interestRate = hasPaidInstallment ? Number(existing.interestRate || 0) : (Number(body.interestRate) || 0);
  const interestRateUnit = hasPaidInstallment ? (existing.interestRateUnit || 'annual') : (body.interestRateUnit === 'monthly' ? 'monthly' : 'annual');
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
  if (!hasPaidInstallment && repaymentMode !== 'single') {
    installments = generateInstallments({
      principal: amount,
      annualInterestRate: interestRateUnit === 'monthly' ? interestRate * 12 : interestRate,
      termMonths,
      firstPaymentDate,
      calculationMethod: repaymentMode === 'interest_only' ? 'equal_payment' : method,
      currency,
      repaymentMode,
    });
    if (installments.length === 0) {
      return NextResponse.json({ error: 'Thông tin lịch trả góp không hợp lệ' }, { status: 400 });
    }
  } else if (!hasPaidInstallment && repaymentMode === 'single') {
    installments = [];
  }

  const purpose = body.type === 'borrowed' && body.purpose === 'investment' ? 'investment' : 'general';
  let linkedAsset = null;
  if (purpose === 'investment') {
    linkedAsset = await Asset.findOne({ _id: body.linkedAssetId, userId }).select('name');
    if (!linkedAsset) return NextResponse.json({ error: 'Vui lòng chọn tài sản đầu tư hợp lệ' }, { status: 400 });
  }

  const update = {
    name: body.name.trim(),
    type: body.type,
    amount,
    currency,
    interestRate,
    interestRateUnit,
    purpose,
    linkedAssetId: linkedAsset?._id.toString() || null,
    linkedAssetName: linkedAsset?.name || null,
    investmentFee: Math.max(0, Number(body.investmentFee) || 0),
    dueDate: repaymentMode === 'single'
      ? (body.dueDate ? new Date(body.dueDate) : null)
      : installments.at(-1)?.dueDate,
    status: repaymentMode !== 'single'
      ? (installments.length > 0 && installments.every((item: { status: string }) => item.status === 'paid') ? 'paid' : 'active')
      : (body.status === 'paid' ? 'paid' : 'active'),
    note: body.note?.trim() || '',
    repaymentMode,
    calculationMethod: repaymentMode === 'installment' ? method : null,
    firstPaymentDate: repaymentMode !== 'single' ? firstPaymentDate : null,
    termMonths: repaymentMode !== 'single' ? termMonths : null,
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
  if (debt.repaymentMode === 'single') {
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
