import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { Debt } from '@/models/Debt';
import { getUserIdFromRequest } from '@/libs/auth';
import { generateInstallments } from '@/libs/debtCalculator';
import { DebtCalculationMethod, DebtInstallment, RepaymentMode } from '@/types/debt';

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
  const repaymentMode: RepaymentMode = body.repaymentMode === 'installment' ? 'installment' : 'single';
  const calculationMethod: DebtCalculationMethod = ['equal_payment', 'equal_principal', 'no_interest'].includes(body.calculationMethod)
    ? body.calculationMethod
    : 'equal_payment';

  if (!body.name?.trim() || !['borrowed', 'lent'].includes(body.type) || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Thông tin khoản nợ không hợp lệ' }, { status: 400 });
  }

  let installments: DebtInstallment[] = [];
  if (repaymentMode === 'installment') {
    installments = generateInstallments({
      principal: amount,
      annualInterestRate: Number(body.interestRate) || 0,
      termMonths: Number(body.termMonths),
      firstPaymentDate: body.firstPaymentDate,
      calculationMethod,
      currency: body.currency || 'VND',
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
    interestRate: Number(body.interestRate) || 0,
    dueDate: repaymentMode === 'single' && body.dueDate ? new Date(body.dueDate) : installments.at(-1)?.dueDate,
    status: repaymentMode === 'installment' ? 'active' : body.status === 'paid' ? 'paid' : 'active',
    note: body.note?.trim() || '',
    repaymentMode,
    calculationMethod: repaymentMode === 'installment' ? calculationMethod : undefined,
    firstPaymentDate: repaymentMode === 'installment' ? new Date(body.firstPaymentDate) : undefined,
    termMonths: repaymentMode === 'installment' ? Number(body.termMonths) : undefined,
    installments,
  });
  return NextResponse.json(debt, { status: 201 });
}
