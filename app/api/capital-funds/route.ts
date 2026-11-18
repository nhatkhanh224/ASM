import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { getUserIdFromRequest } from '@/libs/auth';
import { CapitalFund } from '@/models/CapitalFund';

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  return NextResponse.json(await CapitalFund.find({ userId }).sort({ createdAt: -1 }));
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await request.json();
  const initialCapital = Number(body.initialCapital);
  if (!body.name?.trim() || !['VND', 'USD'].includes(body.currency) || !Number.isFinite(initialCapital) || initialCapital < 0) {
    return NextResponse.json({ error: 'Thông tin quỹ không hợp lệ' }, { status: 400 });
  }
  const fund = await CapitalFund.create({
    userId,
    name: body.name.trim(),
    currency: body.currency,
    initialCapital,
    status: body.status === 'paused' ? 'paused' : 'active',
    note: typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '',
  });
  return NextResponse.json(fund, { status: 201 });
}
