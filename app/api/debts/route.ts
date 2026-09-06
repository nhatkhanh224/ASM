import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { Debt } from '@/models/Debt';
import { getUserIdFromRequest } from '@/libs/auth';

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
  const debt = await Debt.create({ userId, ...body });
  return NextResponse.json(debt);
}
