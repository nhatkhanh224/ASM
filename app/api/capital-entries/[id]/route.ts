import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { getUserIdFromRequest } from '@/libs/auth';
import { CapitalEntry } from '@/models/CapitalEntry';
import { calculateBetPayout } from '@/libs/capitalCalculator';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  await connectDB();
  const existing = await CapitalEntry.findOne({ _id: id, userId, kind: 'bet' });
  if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu Bet' }, { status: 404 });
  const body = await request.json();
  const stake = Number(body.stake);
  const odds = Number(body.odds);
  const result = ['pending', 'win', 'half_win', 'push', 'half_loss', 'loss'].includes(body.result) ? body.result : 'pending';
  if (!body.matchName?.trim() || !Number.isFinite(stake) || stake <= 0 || !Number.isFinite(odds) || odds < 1) {
    return NextResponse.json({ error: 'Thông tin phiếu Bet không hợp lệ' }, { status: 400 });
  }
  const customPayout = body.payout === '' || body.payout == null ? undefined : Number(body.payout);
  const calculated = calculateBetPayout(stake, odds, result, customPayout);
  existing.matchName = body.matchName.trim();
  existing.odds = odds;
  existing.stake = stake;
  existing.result = result;
  existing.payout = calculated.payout;
  existing.profitLoss = calculated.profitLoss;
  existing.occurredAt = body.occurredAt ? new Date(body.occurredAt) : existing.occurredAt;
  existing.note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
  await existing.save();
  return NextResponse.json(existing);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  await connectDB();
  const entry = await CapitalEntry.findOneAndDelete({ _id: id, userId });
  if (!entry) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
  return NextResponse.json({ success: true });
}
