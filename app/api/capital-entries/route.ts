import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { getUserIdFromRequest } from '@/libs/auth';
import { CapitalFund } from '@/models/CapitalFund';
import { CapitalEntry } from '@/models/CapitalEntry';
import { calculateBetPayout } from '@/libs/capitalCalculator';

async function getCurrentCapital(userId: string, fundId: string, initialCapital: number) {
  const entries = await CapitalEntry.find({ userId, fundId }).select('kind cashflowType amount result profitLoss').lean();
  return entries.reduce((capital, entry) => {
    if (entry.kind === 'cashflow') return capital + (entry.cashflowType === 'deposit' ? entry.amount || 0 : -(entry.amount || 0));
    return capital + (entry.result === 'pending' ? 0 : entry.profitLoss || 0);
  }, initialCapital);
}

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const fundId = new URL(request.url).searchParams.get('fundId');
  const query = fundId ? { userId, fundId } : { userId };
  return NextResponse.json(await CapitalEntry.find(query).sort({ occurredAt: -1, createdAt: -1 }).limit(1000));
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await request.json();
  const fund = await CapitalFund.findOne({ _id: body.fundId, userId });
  if (!fund) return NextResponse.json({ error: 'Không tìm thấy quỹ' }, { status: 404 });
  if (fund.status === 'paused' && body.kind === 'bet') return NextResponse.json({ error: 'Quỹ đang tạm dừng, không thể tạo phiếu Bet mới' }, { status: 400 });
  const currentCapital = await getCurrentCapital(userId, fund._id.toString(), fund.initialCapital);
  const pendingStakeResult = await CapitalEntry.aggregate([
    { $match: { userId: fund.userId, fundId: fund._id, kind: 'bet', result: 'pending' } },
    { $group: { _id: null, total: { $sum: '$stake' } } },
  ]);
  const pendingStake = pendingStakeResult[0]?.total || 0;
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: 'Ngày ghi nhận không hợp lệ' }, { status: 400 });

  if (body.kind === 'cashflow') {
    const amount = Number(body.amount);
    if (!['deposit', 'withdrawal'].includes(body.cashflowType) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Dòng tiền không hợp lệ' }, { status: 400 });
    }
    if (body.cashflowType === 'withdrawal' && amount > currentCapital - pendingStake) {
      return NextResponse.json({ error: 'Số tiền rút vượt vốn khả dụng sau các phiếu đang chờ' }, { status: 400 });
    }
    const entry = await CapitalEntry.create({ userId, fundId: fund._id, kind: 'cashflow', cashflowType: body.cashflowType, amount, occurredAt, note: typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '' });
    return NextResponse.json(entry, { status: 201 });
  }

  const stake = Number(body.stake);
  const odds = Number(body.odds);
  const result = ['pending', 'win', 'half_win', 'push', 'half_loss', 'loss'].includes(body.result) ? body.result : 'pending';
  if (!body.matchName?.trim() || !Number.isFinite(stake) || stake <= 0 || !Number.isFinite(odds) || odds < 1) {
    return NextResponse.json({ error: 'Thông tin phiếu Bet không hợp lệ' }, { status: 400 });
  }
  if (stake > currentCapital - pendingStake) {
    return NextResponse.json({ error: 'Tiền cược vượt vốn khả dụng' }, { status: 400 });
  }
  const customPayout = body.payout === '' || body.payout == null ? undefined : Number(body.payout);
  const calculated = calculateBetPayout(stake, odds, result, customPayout);
  const entry = await CapitalEntry.create({
    userId, fundId: fund._id, kind: 'bet', matchName: body.matchName.trim(), bankrollBefore: currentCapital,
    odds, stake, result, payout: calculated.payout, profitLoss: calculated.profitLoss, occurredAt,
    note: typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '',
  });
  return NextResponse.json(entry, { status: 201 });
}
