import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { FinancialGoal } from '@/models/FinancialGoal';
import { getUserIdFromRequest } from '@/libs/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const goal = await FinancialGoal.findOneAndUpdate({ _id: id, userId }, body, { new: true });
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(goal);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const goal = await FinancialGoal.findOneAndDelete({ _id: id, userId });
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
