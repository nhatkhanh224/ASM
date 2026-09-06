import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { FinancialGoal } from '@/models/FinancialGoal';
import { getUserIdFromRequest } from '@/libs/auth';

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const goals = await FinancialGoal.find({ userId }).sort({ createdAt: -1 });
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const goal = await FinancialGoal.create({ userId, ...body });
  return NextResponse.json(goal);
}
