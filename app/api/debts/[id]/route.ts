import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { Debt } from '@/models/Debt';
import { getUserIdFromRequest } from '@/libs/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const debt = await Debt.findOneAndUpdate({ _id: id, userId }, body, { new: true });
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
