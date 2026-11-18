import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { Debt } from '@/models/Debt';
import { getUserIdFromRequest } from '@/libs/auth';
import { generateInstallments } from '@/libs/debtCalculator';
import { DebtCalculationMethod, DebtInstallment, RepaymentMode } from '@/types/debt';
import { Asset } from '@/models/Asset';

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const debts = await Debt.find({ userId }).sort({ createdAt: -1 });
  return NextResponse.json(debts);
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const amount = Number(body.amount);
  const repaymentMode: RepaymentMode = ['installment', 'interest_only'].includes(body.repaymentMode) ? body.repaymentMode : 'single';
  const calculationMethod: DebtCalculationMethod = ['equal_payment', 'equal_principal', 'no_interest'].includes(body.calculationMethod)
    ? body.calculationMethod
    : 'equal_payment';

  if (!body.name?.trim() || !['borrowed', 'lent'].includes(body.type) || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Thông tin khoản nợ không hợp lệ' }, { status: 400 });
  }

  const interestRate = Number(body.interestRate) || 0;
  const interestRateUnit = body.interestRateUnit === 'monthly' ? 'monthly' : 'annual';
  const purpose = body.type === 'borrowed' && body.purpose === 'investment' ? 'investment' : 'general';
  const investmentFee = Math.max(0, Number(body.investmentFee) || 0);
  let linkedAsset = null;
  if (purpose === 'investment') {
    linkedAsset = await Asset.findOne({ _id: body.linkedAssetId, userId }).select('name');
    if (!linkedAsset) return NextResponse.json({ error: 'Vui lòng chọn tài sản đầu tư hợp lệ' }, { status: 400 });
  }

  let installments: DebtInstallment[] = [];
  if (repaymentMode !== 'single') {
    installments = generateInstallments({
      principal: amount,
      annualInterestRate: interestRateUnit === 'monthly' ? interestRate * 12 : interestRate,
      termMonths: Number(body.termMonths),
      firstPaymentDate: body.firstPaymentDate,
      calculationMethod: repaymentMode === 'interest_only' ? 'equal_payment' : calculationMethod,
      currency: body.currency || 'VND',
      repaymentMode,
    });
    if (installments.length === 0) {
      return NextResponse.json({ error: 'Thông tin lịch trả góp không hợp lệ' }, { status: 400 });
    }
  }

  const debt = await Debt.create({
    userId,
    name: body.name.trim(),
    type: body.type,
    amount,
    currency: body.currency || 'VND',
    interestRate,
    interestRateUnit,
    purpose,
    linkedAssetId: linkedAsset?._id.toString(),
    linkedAssetName: linkedAsset?.name,
    investmentFee,
    dueDate: repaymentMode === 'single' && body.dueDate ? new Date(body.dueDate) : installments.at(-1)?.dueDate,
    status: repaymentMode !== 'single' ? 'active' : body.status === 'paid' ? 'paid' : 'active',
    note: body.note?.trim() || '',
    repaymentMode,
    calculationMethod: repaymentMode === 'installment' ? calculationMethod : undefined,
    firstPaymentDate: repaymentMode !== 'single' ? new Date(body.firstPaymentDate) : undefined,
    termMonths: repaymentMode !== 'single' ? Number(body.termMonths) : undefined,
    installments,
  });
  return NextResponse.json(debt, { status: 201 });
}
